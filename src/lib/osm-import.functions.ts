/* Tables added by the pending Supabase migration are not in generated types yet. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { peut } from "./autorisations";

const OVERPASS_ENDPOINT = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 100;

const REGIONS = {
  agadez: [15.5, 6.5, 20.5, 10.5],
  diffa: [13, 10, 15.5, 15.5],
  dosso: [11.5, 2.5, 14, 4.5],
  maradi: [12, 6, 14.5, 9],
  niamey: [13.2, 1.8, 13.8, 2.5],
  tahoua: [13, 3.5, 17, 6.5],
  tillaberi: [12.5, 0, 15.5, 3.5],
  zinder: [13, 8.5, 15.5, 12.5],
} as const;

type RegionSlug = keyof typeof REGIONS;
type ImportRow = Record<string, unknown> & { aliases: string[] };
type AdminClient = any;

const regionSchema = z.enum([
  "agadez",
  "diffa",
  "dosso",
  "maradi",
  "niamey",
  "tahoua",
  "tillaberi",
  "zinder",
]);

function bboxText(bbox: readonly number[]) {
  return bbox.join(",");
}

function queryFor(bbox: string) {
  return `[out:json][timeout:120];(nwr["name"](${bbox}););out center tags;`;
}

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function categorySlug(tags: Record<string, string>) {
  const mappings: [string, string, string][] = [
    ["amenity", "pharmacy", "pharmacie"],
    ["amenity", "restaurant", "restaurant"],
    ["amenity", "fast_food", "restaurant"],
    ["tourism", "hotel", "hotel"],
    ["amenity", "school", "ecole"],
    ["amenity", "college", "ecole"],
    ["amenity", "fuel", "station-service"],
    ["shop", "supermarket", "marche"],
    ["amenity", "marketplace", "marche"],
    ["shop", "market", "marche"],
    ["shop", "car", "garage"],
    ["amenity", "car_wash", "garage"],
  ];
  return mappings.find(([key, value]) => tags[key] === value)?.[2] ?? "point-geographique";
}

async function overpass(bbox: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "UPK/1.0 (national importer)",
        },
        body: new URLSearchParams({ data: queryFor(bbox) }),
        signal: AbortSignal.timeout(150_000),
      });
      if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
      return (await response.json()) as { elements?: unknown[] };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS)
        await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function assertImportPermission(context: { supabase: any }) {
  const { data, error } = await context.supabase.rpc("mes_autorisations");
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  const authorisations = {
    roles: (row?.roles ?? []) as never[],
    permissions: (row?.permissions ?? []) as string[],
    suspendu: Boolean(row?.suspendu),
  };
  if (!peut(authorisations, "parametres") && !peut(authorisations, "etablissements")) {
    throw new Error("Réservé aux administrateurs autorisés.");
  }
}

async function adminClient(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function loadLookups(supabase: AdminClient) {
  const [regions, categories, departments, communes, cities] = await Promise.all([
    supabase.from("regions").select("id, slug"),
    supabase.from("categories").select("id, slug"),
    supabase.from("departements").select("id, region_id"),
    supabase.from("communes").select("id, departement_id"),
    supabase
      .from("villes_zones")
      .select("id, commune_id, latitude, longitude, communes(departements(id, region_id))"),
  ]);
  for (const result of [regions, categories, departments, communes, cities]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    regions: new Map((regions.data ?? []).map((row: any) => [row.slug, row.id])),
    categories: new Map((categories.data ?? []).map((row: any) => [row.slug, row.id])),
    cities: cities.data ?? [],
    departments: departments.data ?? [],
    communes: communes.data ?? [],
  };
}

function normalize(
  element: any,
  regionId: string,
  lookups: Awaited<ReturnType<typeof loadLookups>>,
): ImportRow | null {
  const tags = (element.tags ?? {}) as Record<string, string>;
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  const nom = clean(tags.name);
  if (!nom || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const niameyRegionId = lookups.regions.get("niamey");
  const regionForCoordinates =
    niameyRegionId &&
    latitude >= REGIONS.niamey[0] &&
    latitude <= REGIONS.niamey[2] &&
    longitude >= REGIONS.niamey[1] &&
    longitude <= REGIONS.niamey[3]
      ? niameyRegionId
      : regionId;
  const city = lookups.cities
    .filter(
      (candidate: any) => candidate.communes?.departements?.region_id === regionForCoordinates,
    )
    .map((candidate: any) => ({
      candidate,
      distance: (candidate.latitude - latitude) ** 2 + (candidate.longitude - longitude) ** 2,
    }))
    .sort((a: any, b: any) => a.distance - b.distance)[0]?.candidate;
  const communeId = lookups.communes.find((row: any) => row.id === city?.commune_id)?.id ?? null;
  const departmentId =
    city?.communes?.departements?.id ??
    lookups.departments.find((row: any) => row.id === city?.communes?.departements?.id)?.id ??
    null;
  const slug = categorySlug(tags);
  return {
    nom,
    category_id:
      lookups.categories.get(slug) ?? lookups.categories.get("point-geographique") ?? null,
    adresse: clean(tags["addr:street"]) ?? clean(tags["addr:full"]),
    quartier: clean(tags["addr:suburb"]) ?? clean(tags["addr:neighbourhood"]),
    latitude,
    longitude,
    telephone: clean(tags.phone) ?? clean(tags["contact:phone"]),
    site_web: clean(tags.website) ?? clean(tags["contact:website"]),
    osm_id: String(element.id),
    osm_type: element.type,
    licence_source: "ODbL",
    importe_le: new Date().toISOString(),
    derniere_sync: new Date().toISOString(),
    source: "web_public",
    statut_verification: "a_verifier",
    actif: true,
    region_id: regionForCoordinates,
    departement_id: departmentId,
    commune_id: communeId,
    ville_zone_id: city?.id ?? null,
    metadata: { osm_tags: tags, import_category_slug: slug },
    aliases: [tags.alt_name, tags["name:fr"], tags.official_name]
      .map(clean)
      .filter(
        (alias): alias is string =>
          Boolean(alias) && alias.toLocaleLowerCase() !== nom.toLocaleLowerCase(),
      ),
  };
}

async function processBatch(
  supabase: AdminClient,
  batch: any,
  lookups: Awaited<ReturnType<typeof loadLookups>>,
) {
  const payload = await overpass(batch.bbox);
  const elements = Array.isArray(payload.elements) ? payload.elements : [];
  const rows = elements
    .map((element) => {
      const regionId = lookups.regions.get(batch.region_slug);
      return regionId ? normalize(element, regionId, lookups) : null;
    })
    .filter((row): row is ImportRow => Boolean(row));
  let upserted = 0;
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const chunk = rows.slice(offset, offset + BATCH_SIZE);
    const { error } = await supabase.from("places").upsert(
      chunk.map(({ aliases: _aliases, ...place }) => place),
      { onConflict: "osm_type,osm_id" },
    );
    if (error) throw new Error(error.message);
    const { data: places, error: lookupError } = await supabase
      .from("places")
      .select("id, osm_type, osm_id")
      .in(
        "osm_id",
        chunk.map((place) => place.osm_id),
      );
    if (lookupError) throw new Error(lookupError.message);
    const ids = new Map(
      (places ?? []).map((place: any) => [`${place.osm_type}:${place.osm_id}`, place.id]),
    );
    const aliases = chunk.flatMap((place) =>
      place.aliases
        .map((alias) => ({
          place_id: ids.get(`${place.osm_type}:${place.osm_id}`),
          alias,
          source: "osm",
        }))
        .filter((alias) => alias.place_id),
    );
    if (aliases.length) {
      const { error: aliasError } = await supabase
        .from("place_aliases")
        .upsert(aliases, { onConflict: "place_id,alias", ignoreDuplicates: true });
      if (aliasError) throw new Error(aliasError.message);
    }
    upserted += chunk.length;
  }
  return { elementsSeen: elements.length, placesUpserted: upserted };
}

async function runBatch(
  supabase: AdminClient,
  batch: any,
  lookups: Awaited<ReturnType<typeof loadLookups>>,
) {
  let lastError: unknown;
  const previousAttempts = batch.attempt ?? 0;
  for (let retry = 1; retry <= MAX_ATTEMPTS; retry += 1) {
    const attempt = previousAttempts + retry;
    await supabase
      .from("osm_import_batches")
      .update({
        status: "running",
        attempt,
        started_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", batch.id);
    try {
      const result = await processBatch(supabase, batch, lookups);
      await supabase
        .from("osm_import_batches")
        .update({
          status: "succeeded",
          elements_seen: result.elementsSeen,
          places_upserted: result.placesUpserted,
          finished_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", batch.id);
      return result;
    } catch (error) {
      lastError = error;
      await supabase
        .from("osm_import_batches")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: String(error),
        })
        .eq("id", batch.id);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export const listerImportsOsm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertImportPermission(context);
    const supabase = await adminClient();
    const { data, error } = await supabase
      .from("osm_import_jobs")
      .select(
        "id, status, requested_regions, places_seen, places_upserted, places_failed, created_at, finished_at, osm_import_batches(id, region_slug, bbox, status, attempt, elements_seen, places_upserted, error_message)",
      )
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const demarrerImportOsmNational = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertImportPermission(context);
    const supabase = await adminClient();
    const requested = Object.keys(REGIONS) as RegionSlug[];
    const lookups = await loadLookups(supabase);
    const missing = requested.filter((slug) => !lookups.regions.has(slug));
    if (missing.length) throw new Error(`Régions absentes de la base : ${missing.join(", ")}`);
    const { data: job, error: jobError } = await supabase
      .from("osm_import_jobs")
      .insert({
        requested_regions: requested,
        status: "running",
        overpass_endpoint: OVERPASS_ENDPOINT,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (jobError) throw new Error(jobError.message);
    const batches = requested.map((region_slug) => ({
      job_id: job.id,
      region_slug,
      bbox: bboxText(REGIONS[region_slug]),
      status: "queued",
    }));
    const { data: created, error: batchError } = await supabase
      .from("osm_import_batches")
      .insert(batches)
      .select("*");
    if (batchError) throw new Error(batchError.message);
    let seen = 0;
    let upserted = 0;
    let failed = 0;
    for (const batch of created ?? []) {
      try {
        const result = await runBatch(supabase, batch, lookups);
        seen += result.elementsSeen;
        upserted += result.placesUpserted;
      } catch {
        failed += 1;
      }
    }
    const status = failed ? (upserted ? "partial" : "failed") : "succeeded";
    await supabase
      .from("osm_import_jobs")
      .update({
        status,
        places_seen: seen,
        places_upserted: upserted,
        places_failed: failed,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return {
      id: job.id,
      status,
      placesSeen: seen,
      placesUpserted: upserted,
      batchesFailed: failed,
    };
  });

export const relancerBatchOsm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ batchId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertImportPermission(context);
    const supabase = await adminClient();
    const lookups = await loadLookups(supabase);
    const { data: batch, error } = await supabase
      .from("osm_import_batches")
      .select("*")
      .eq("id", data.batchId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!batch) throw new Error("Batch introuvable.");
    if (batch.status !== "failed") throw new Error("Seul un batch échoué peut être relancé.");
    const result = await runBatch(supabase, batch, lookups);
    const { data: siblings } = await supabase
      .from("osm_import_batches")
      .select("status, elements_seen, places_upserted")
      .eq("job_id", batch.job_id);
    const failed = (siblings ?? []).filter((row: any) => row.status === "failed").length;
    await supabase
      .from("osm_import_jobs")
      .update({
        status: failed ? "partial" : "succeeded",
        places_seen: (siblings ?? []).reduce(
          (sum: number, row: any) => sum + (row.elements_seen ?? 0),
          0,
        ),
        places_upserted: (siblings ?? []).reduce(
          (sum: number, row: any) => sum + (row.places_upserted ?? 0),
          0,
        ),
        places_failed: failed,
        ...(failed ? {} : { finished_at: new Date().toISOString() }),
      })
      .eq("id", batch.job_id);
    return result;
  });
