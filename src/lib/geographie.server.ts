import type { Lieu } from "./upk";

type Point = { latitude: number; longitude: number };

type GeoResult = Point & {
  nom: string;
  ville?: string | null;
  region?: string | null;
  pays?: string | null;
  identifiant: string;
  source: "nominatim" | "geonames" | "open-meteo";
  type: "localite" | "adresse";
};

const CACHE_TTL_MS = 1000 * 60 * 15;
const MAX_CACHE_ENTRIES = 200;
const cache = new Map<string, { expire: number; resultats: GeoResult[] }>();

function texte(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nombre(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dansLeNiger(point: Point): boolean {
  return point.latitude >= 11 && point.latitude <= 24 && point.longitude >= 0 && point.longitude <= 16;
}

function lireCache(cle: string): GeoResult[] | null {
  const entree = cache.get(cle);
  if (!entree) return null;
  if (entree.expire < Date.now()) {
    cache.delete(cle);
    return null;
  }
  return entree.resultats;
}

function ecrireCache(cle: string, resultats: GeoResult[]) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const premiereCle = cache.keys().next().value;
    if (premiereCle) cache.delete(premiereCle);
  }
  cache.set(cle, { expire: Date.now() + CACHE_TTL_MS, resultats });
}

async function fetchJson<T>(url: URL, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const userAgent = process.env["UPK_GEO_USER_AGENT"] ?? "UPK/1.0 (+https://upk.ne)";
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
        ...init?.headers,
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function rechercherNominatim(requete: string): Promise<GeoResult[]> {
  const endpoint = process.env["NOMINATIM_SEARCH_URL"] ?? "https://nominatim.openstreetmap.org/search";
  const url = new URL(endpoint);
  url.searchParams.set("q", requete);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "ne");
  const rows = await fetchJson<
    Array<{
      place_id?: number;
      osm_type?: string;
      osm_id?: number;
      display_name?: string;
      lat?: string;
      lon?: string;
      type?: string;
      address?: Record<string, string>;
    }>
  >(url);
  return (rows ?? [])
    .map((row) => {
      const latitude = nombre(row.lat);
      const longitude = nombre(row.lon);
      if (latitude === null || longitude === null || !dansLeNiger({ latitude, longitude })) return null;
      const address = row.address ?? {};
      return {
        nom: texte(row.display_name) ?? requete,
        latitude,
        longitude,
        ville: address.city ?? address.town ?? address.village ?? null,
        region: address.state ?? null,
        pays: address.country ?? "Niger",
        identifiant: `${row.osm_type ?? "place"}:${row.osm_id ?? row.place_id ?? row.display_name}`,
        source: "nominatim" as const,
        type: row.type === "house" || row.type === "road" ? ("adresse" as const) : ("localite" as const),
      };
    })
    .filter((row): row is GeoResult => row !== null);
}

async function rechercherOpenMeteo(requete: string): Promise<GeoResult[]> {
  const url = new URL(
    process.env["OPEN_METEO_GEOCODING_URL"] ?? "https://geocoding-api.open-meteo.com/v1/search",
  );
  url.searchParams.set("name", requete);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "fr");
  url.searchParams.set("countryCode", "NE");
  const payload = await fetchJson<{
    results?: Array<{
      id?: number;
      name?: string;
      latitude?: number;
      longitude?: number;
      country?: string;
      admin1?: string;
      admin2?: string;
      feature_code?: string;
    }>;
  }>(url);
  return (payload?.results ?? [])
    .map((row) => {
      const latitude = nombre(row.latitude);
      const longitude = nombre(row.longitude);
      if (latitude === null || longitude === null || !dansLeNiger({ latitude, longitude })) return null;
      return {
        nom: texte(row.name) ?? requete,
        latitude,
        longitude,
        ville: row.name ?? null,
        region: row.admin1 ?? row.admin2 ?? null,
        pays: row.country ?? "Niger",
        identifiant: String(row.id ?? `${row.name}:${row.latitude}:${row.longitude}`),
        source: "open-meteo" as const,
        type: "localite" as const,
      };
    })
    .filter((row): row is GeoResult => row !== null);
}

async function rechercherGeoNames(requete: string): Promise<GeoResult[]> {
  const username = process.env["GEONAMES_USERNAME"];
  if (!username) return [];
  const url = new URL(
    process.env["GEONAMES_SEARCH_URL"] ?? "https://secure.geonames.org/searchJSON",
  );
  url.searchParams.set("q", requete);
  url.searchParams.set("country", "NE");
  url.searchParams.set("maxRows", "5");
  url.searchParams.set("lang", "fr");
  url.searchParams.set("username", username);
  const payload = await fetchJson<{
    geonames?: Array<{
      geonameId?: number;
      name?: string;
      asciiName?: string;
      lat?: string;
      lng?: string;
      countryName?: string;
      adminName1?: string;
      adminName2?: string;
      fcode?: string;
    }>;
  }>(url);
  return (payload?.geonames ?? [])
    .map((row) => {
      const latitude = nombre(row.lat);
      const longitude = nombre(row.lng);
      if (latitude === null || longitude === null || !dansLeNiger({ latitude, longitude })) return null;
      return {
        nom: texte(row.name) ?? texte(row.asciiName) ?? requete,
        latitude,
        longitude,
        ville: row.name ?? null,
        region: row.adminName1 ?? row.adminName2 ?? null,
        pays: row.countryName ?? "Niger",
        identifiant: String(row.geonameId ?? `${row.name}:${row.lat}:${row.lng}`),
        source: "geonames" as const,
        type: "localite" as const,
      };
    })
    .filter((row): row is GeoResult => row !== null);
}

function distanceCarree(a: Point, b: Point): number {
  const latitude = (a.latitude + b.latitude) / 2;
  const dx = (a.longitude - b.longitude) * Math.cos((latitude * Math.PI) / 180);
  const dy = a.latitude - b.latitude;
  return dx * dx + dy * dy;
}

function distanceMetres(a: Point, b: Point): number {
  const rayonTerre = 6_371_000;
  const latitudeA = (a.latitude * Math.PI) / 180;
  const latitudeB = (b.latitude * Math.PI) / 180;
  const deltaLatitude = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLongitude = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinus =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * rayonTerre * Math.atan2(Math.sqrt(sinus), Math.sqrt(1 - sinus));
}

function dedoublonner(resultats: GeoResult[]): GeoResult[] {
  const uniques: GeoResult[] = [];
  for (const resultat of resultats) {
    const doublon = uniques.find(
      (existant) =>
        distanceCarree(existant, resultat) < 0.0000008 ||
        (existant.nom.toLocaleLowerCase() === resultat.nom.toLocaleLowerCase() &&
          distanceCarree(existant, resultat) < 0.0001),
    );
    if (!doublon) uniques.push(resultat);
  }
  return uniques;
}

export async function resoudreLocalites(requete: string): Promise<GeoResult[]> {
  const cle = requete.trim().toLocaleLowerCase();
  if (!cle) return [];
  const enCache = lireCache(cle);
  if (enCache) return enCache;

  const [nominatim, openMeteo, geonames] = await Promise.all([
    rechercherNominatim(requete),
    rechercherOpenMeteo(requete),
    rechercherGeoNames(requete),
  ]);
  const resultats = dedoublonner([...nominatim, ...geonames, ...openMeteo]).slice(0, 8);
  ecrireCache(cle, resultats);
  return resultats;
}

export function convertirLocaliteEnLieu(localite: GeoResult, position: Point | null): Lieu {
  return {
    id: `localite:${localite.source}:${localite.identifiant}`,
    nom: localite.nom,
    description: null,
    adresse: [localite.ville, localite.region, localite.pays].filter(Boolean).join(" · ") || null,
    quartier: null,
    latitude: localite.latitude,
    longitude: localite.longitude,
    telephone: null,
    whatsapp: null,
    horaires: null,
    site_web: null,
    statut_verification: "source_fiable",
    categorie_nom: localite.type === "adresse" ? "Adresse" : "Localité",
    categorie_slug: null,
    categorie_icone: null,
    distance_m: position ? distanceMetres(localite, position) : null,
    region_nom: localite.region ?? null,
    region_slug: null,
    ville_nom: localite.ville ?? null,
    ville_slug: null,
    score_pertinence: 1,
    estLocalite: true,
    provenance: [localite.source],
  };
}
