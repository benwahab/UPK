import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Lieu } from "./upk";

const champsPropositionSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).optional().nullable(),
  categorieId: z.string().uuid(),
  adresse: z.string().trim().max(200).optional().nullable(),
  quartier: z.string().trim().max(100).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  telephone: z.string().trim().max(30).optional().nullable(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  horaires: z.string().trim().max(200).optional().nullable(),
  siteWeb: z.string().trim().url().max(200).optional().nullable().or(z.literal("")),
});

/** Un utilisateur (pas forcément le propriétaire) propose un lieu qu'il connaît. */
/**
 * Un utilisateur — connecté ou non, sur demande explicite — propose un lieu
 * qu'il ne possède pas. Toujours a_verifier, jamais de owner_id (ça, c'est
 * réservé au flux "Espace pro" où le propriétaire prouve son identité).
 */
export const proposerLieu = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => champsPropositionSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data: cree, error } = await clientPublic()
      .from("places")
      .insert({
        nom: data.nom,
        description: data.description || null,
        category_id: data.categorieId,
        adresse: data.adresse || null,
        quartier: data.quartier || null,
        latitude: data.latitude,
        longitude: data.longitude,
        telephone: data.telephone || null,
        whatsapp: data.whatsapp || null,
        horaires: data.horaires || null,
        site_web: data.siteWeb || null,
        submitted_by: null,
        owner_id: null,
        source: "soumission_utilisateur",
        statut_verification: "a_verifier",
        actif: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

/** true si l'utilisateur connecté est modérateur ou admin. */
export const estModerateur = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.role === "moderator" || data?.role === "admin";
  });

/** File d'attente : tout lieu pas encore vérifié, peu importe qui l'a créé. */
export const listerFileAttente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Lieu[]> => {
    const { data, error } = await context.supabase
      .from("places")
      .select(
        "id, nom, description, adresse, quartier, latitude, longitude, telephone, whatsapp, horaires, site_web, statut_verification, categories(nom, slug, icone)",
      )
      .eq("statut_verification", "a_verifier")
      .eq("actif", true)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map((lieu) => {
      const categorie = (
        lieu as unknown as {
          categories: { nom: string; slug: string; icone: string | null } | null;
        }
      ).categories;
      return {
        ...(lieu as unknown as Omit<
          Lieu,
          "categorie_nom" | "categorie_slug" | "categorie_icone" | "distance_m"
        >),
        categorie_nom: categorie?.nom ?? null,
        categorie_slug: categorie?.slug ?? null,
        categorie_icone: categorie?.icone ?? null,
        distance_m: null,
      };
    });
  });

// Seuil de tolérance pour la vérification de proximité (mètres). Un GPS de
// smartphone a une précision typique de 5 à 20 m (souvent pire en ville,
// près de bâtiments hauts) : une exigence "au mètre près" rendrait la
// validation quasiment impossible en pratique. 50 m est un compromis
// raisonnable entre "le modérateur est vraiment sur place" et une
// tolérance à l'imprécision GPS réelle.
const DISTANCE_MAX_METRES = 50;

function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const champsVerificationSchema = z.object({
  id: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Vérifie côté serveur (donc infalsifiable) que le modérateur se trouve
 * physiquement à proximité du lieu avant d'autoriser une validation ou un
 * rejet. Un contrôle uniquement côté client serait contournable via les
 * outils de développement du navigateur.
 */
async function verifierProximite(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  placeId: string,
  latModerateur: number,
  lngModerateur: number,
) {
  const { data: lieu, error } = await supabase
    .from("places")
    .select("latitude, longitude")
    .eq("id", placeId)
    .single();
  if (error) throw new Error(error.message);

  const distance = distanceMetres(latModerateur, lngModerateur, lieu.latitude, lieu.longitude);
  if (distance > DISTANCE_MAX_METRES) {
    throw new Error(
      `Vous êtes à ${Math.round(distance)} m du lieu (${DISTANCE_MAX_METRES} m maximum). Rapprochez-vous pour valider ou rejeter.`,
    );
  }
}

export const validerLieu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => champsVerificationSchema.parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProximite(context.supabase, data.id, data.latitude, data.longitude);

    const { error } = await context.supabase
      .from("places")
      .update({ statut_verification: "verifie" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Journal (best-effort) : ne bloque jamais la validation elle-même si
    // l'écriture du journal échoue pour une raison quelconque.
    await context.supabase
      .from("actions_moderation")
      .insert({ place_id: data.id, moderateur_id: context.userId, action: "validation" })
      .then(
        () => {},
        () => {},
      );
  });

export const rejeterLieu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => champsVerificationSchema.parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProximite(context.supabase, data.id, data.latitude, data.longitude);

    const { error } = await context.supabase
      .from("places")
      .update({ actif: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await context.supabase
      .from("actions_moderation")
      .insert({ place_id: data.id, moderateur_id: context.userId, action: "rejet" })
      .then(
        () => {},
        () => {},
      );
  });
