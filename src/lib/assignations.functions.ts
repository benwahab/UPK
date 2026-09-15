import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Lieu } from "./upk";

/** Rayon maximal d'un lot : au-delà, les lieux sont trop éloignés entre eux. */
export const RAYON_MAX_METRES = 5000;
/** Tolérance de présence sur place (identique à la modération classique). */
const DISTANCE_MAX_METRES = 20;

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

async function exigerGestionModerateurs(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase.rpc("a_permission", {
    _user_id: userId,
    _permission: "moderateurs",
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Vous n'avez pas la permission de gérer les modérateurs.");
}

export type LieuAAssigner = {
  id: string;
  nom: string;
  quartier: string | null;
  adresse: string | null;
  categorie_nom: string | null;
  latitude: number;
  longitude: number;
  distance_m: number;
};

/** Lieux à vérifier, non encore attribués, situés dans le rayon choisi. */
export const lieuxAAssigner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        rayonM: z.number().int().min(100).max(RAYON_MAX_METRES),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<LieuAAssigner[]> => {
    await exigerGestionModerateurs(context.supabase, context.userId);
    const { data: lieux, error } = await context.supabase.rpc("lieux_a_assigner", {
      p_lat: data.latitude,
      p_lng: data.longitude,
      p_rayon_m: data.rayonM,
    });
    if (error) throw new Error(error.message);
    return (lieux ?? []) as LieuAAssigner[];
  });

/** Crée un lot : un modérateur, un centre, un rayon, une liste de lieux proches. */
export const creerLotAssignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        moderateurId: z.string().uuid(),
        nom: z.string().trim().min(2).max(120),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        rayonM: z.number().int().min(100).max(RAYON_MAX_METRES),
        placeIds: z.array(z.string().uuid()).min(1).max(60),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<{ lotId: string; lieux: number }> => {
    await exigerGestionModerateurs(context.supabase, context.userId);

    // Contrôle serveur : chaque lieu doit vraiment être dans le rayon annoncé.
    const { data: lieux, error: erreurLieux } = await context.supabase
      .from("places")
      .select("id, latitude, longitude")
      .in("id", data.placeIds);
    if (erreurLieux) throw new Error(erreurLieux.message);
    if ((lieux ?? []).length !== data.placeIds.length) {
      throw new Error("Certains lieux sélectionnés n'existent plus.");
    }
    for (const lieu of lieux ?? []) {
      const d = distanceMetres(data.latitude, data.longitude, lieu.latitude, lieu.longitude);
      if (d > data.rayonM) {
        throw new Error(
          `Un lieu sélectionné est à ${Math.round(d)} m du centre, hors du rayon de ${data.rayonM} m.`,
        );
      }
    }

    const { data: lot, error: erreurLot } = await context.supabase
      .from("lots_assignation")
      .insert({
        nom: data.nom,
        moderateur_id: data.moderateurId,
        assigne_par: context.userId,
        centre_lat: data.latitude,
        centre_lng: data.longitude,
        rayon_m: data.rayonM,
      })
      .select("id")
      .single();
    if (erreurLot) throw new Error(erreurLot.message);

    const { error: erreurAssignations } = await context.supabase
      .from("assignations_moderation")
      .insert(
        data.placeIds.map((placeId) => ({
          lot_id: lot.id as string,
          place_id: placeId,
          moderateur_id: data.moderateurId,
        })),
      );
    if (erreurAssignations) {
      throw new Error(
        erreurAssignations.code === "23505"
          ? "Un des lieux vient d'être attribué à un autre modérateur. Actualisez la liste."
          : erreurAssignations.message,
      );
    }

    return { lotId: lot.id as string, lieux: data.placeIds.length };
  });

export type LotAssignation = {
  id: string;
  nom: string;
  moderateur_id: string;
  moderateur_nom: string | null;
  centre_lat: number;
  centre_lng: number;
  rayon_m: number;
  created_at: string;
  total: number;
  restants: number;
  valides: number;
  refuses: number;
};

/** Tous les lots, avec l'avancement de chaque modérateur. */
export const listerLotsAssignation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LotAssignation[]> => {
    await exigerGestionModerateurs(context.supabase, context.userId);

    const { data: lots, error } = await context.supabase
      .from("lots_assignation")
      .select("id, nom, moderateur_id, centre_lat, centre_lng, rayon_m, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    if (!lots || lots.length === 0) return [];

    const ids = lots.map((l) => l.id as string);
    const { data: assignations, error: erreurA } = await context.supabase
      .from("assignations_moderation")
      .select("lot_id, statut")
      .in("lot_id", ids);
    if (erreurA) throw new Error(erreurA.message);

    const { data: profils, error: erreurP } = await context.supabase
      .from("profiles")
      .select("id, prenom, nom_complet")
      .in(
        "id",
        lots.map((l) => l.moderateur_id as string),
      );
    if (erreurP) throw new Error(erreurP.message);

    const nomParId = new Map(
      (profils ?? []).map((p) => [
        p.id as string,
        [p.prenom, p.nom_complet].filter(Boolean).join(" ") || null,
      ]),
    );

    return lots.map((lot) => {
      const lignes = (assignations ?? []).filter((a) => a.lot_id === lot.id);
      return {
        id: lot.id as string,
        nom: lot.nom as string,
        moderateur_id: lot.moderateur_id as string,
        moderateur_nom: nomParId.get(lot.moderateur_id as string) ?? null,
        centre_lat: lot.centre_lat as number,
        centre_lng: lot.centre_lng as number,
        rayon_m: lot.rayon_m as number,
        created_at: lot.created_at as string,
        total: lignes.length,
        restants: lignes.filter((l) => l.statut === "a_verifier").length,
        valides: lignes.filter((l) => l.statut === "valide").length,
        refuses: lignes.filter((l) => l.statut === "refuse").length,
      };
    });
  });

export type LieuAssigne = Lieu & { assignation_id: string; lot_nom: string };

/**
 * Les lieux confiés au modérateur connecté. Tant qu'aucun lot ne lui a été
 * attribué, la liste est vide : il ne voit rien d'autre.
 */
export const mesLieuxAssignes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LieuAssigne[]> => {
    const { data, error } = await context.supabase
      .from("assignations_moderation")
      .select(
        "id, lots_assignation(nom), places(id, nom, description, adresse, quartier, latitude, longitude, telephone, whatsapp, horaires, site_web, statut_verification, categories(nom, slug, icone))",
      )
      .eq("moderateur_id", context.userId)
      .eq("statut", "a_verifier")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).flatMap((ligne) => {
      const l = ligne as unknown as {
        id: string;
        lots_assignation: { nom: string } | null;
        places:
          | (Omit<
              Lieu,
              "categorie_nom" | "categorie_slug" | "categorie_icone" | "distance_m"
            > & {
              categories: { nom: string; slug: string; icone: string | null } | null;
            })
          | null;
      };
      if (!l.places) return [];
      const { categories, ...lieu } = l.places;
      return [
        {
          ...lieu,
          categorie_nom: categories?.nom ?? null,
          categorie_slug: categories?.slug ?? null,
          categorie_icone: categories?.icone ?? null,
          distance_m: null,
          assignation_id: l.id,
          lot_nom: l.lots_assignation?.nom ?? "Lot",
        },
      ];
    });
  });

async function fermerAssignation(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  assignationId: string,
  statut: "valide" | "refuse",
  extra: { motif_refus?: string; latitude_corrigee?: number; longitude_corrigee?: number } = {},
) {
  const { data, error } = await supabase
    .from("assignations_moderation")
    .update({ statut, traite_le: new Date().toISOString(), ...extra })
    .eq("id", assignationId)
    .eq("moderateur_id", userId)
    .eq("statut", "a_verifier")
    .select("place_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Cette tâche ne vous est plus attribuée ou est déjà traitée.");
  return data.place_id as string;
}

/** Validation d'une tâche attribuée : présence sur place obligatoire. */
export const validerAssignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        assignationId: z.string().uuid(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    const { data: assignation, error } = await context.supabase
      .from("assignations_moderation")
      .select("place_id, places(latitude, longitude)")
      .eq("id", data.assignationId)
      .eq("moderateur_id", context.userId)
      .eq("statut", "a_verifier")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!assignation) throw new Error("Cette tâche ne vous est plus attribuée.");

    const lieu = (assignation as unknown as { places: { latitude: number; longitude: number } })
      .places;
    const d = distanceMetres(data.latitude, data.longitude, lieu.latitude, lieu.longitude);
    if (d > DISTANCE_MAX_METRES) {
      throw new Error(
        `Vous êtes à ${Math.round(d)} m du lieu (${DISTANCE_MAX_METRES} m maximum). Rapprochez-vous pour valider.`,
      );
    }

    const placeId = await fermerAssignation(
      context.supabase,
      context.userId,
      data.assignationId,
      "valide",
    );

    const { error: erreurLieu } = await context.supabase
      .from("places")
      .update({ statut_verification: "verifie" })
      .eq("id", placeId);
    if (erreurLieu) throw new Error(erreurLieu.message);

    await context.supabase
      .rpc("definir_statut_soumission", { p_place_id: placeId, p_statut: "valide" })
      .then(
        () => {},
        () => {},
      );

    await context.supabase
      .from("actions_moderation")
      .insert({ place_id: placeId, moderateur_id: context.userId, action: "validation" })
      .then(
        () => {},
        () => {},
      );
  });

/**
 * Rejet d'une tâche attribuée. Le modérateur doit indiquer un motif ET
 * confirmer la bonne localité (sa position relevée sur le terrain), sans quoi
 * la tâche reste ouverte.
 */
export const rejeterAssignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        assignationId: z.string().uuid(),
        motif: z.string().trim().min(5).max(400),
        latitudeCorrigee: z.number().min(-90).max(90),
        longitudeCorrigee: z.number().min(-180).max(180),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    const placeId = await fermerAssignation(
      context.supabase,
      context.userId,
      data.assignationId,
      "refuse",
      {
        motif_refus: data.motif,
        latitude_corrigee: data.latitudeCorrigee,
        longitude_corrigee: data.longitudeCorrigee,
      },
    );

    const { error } = await context.supabase
      .from("places")
      .update({ actif: false })
      .eq("id", placeId);
    if (error) throw new Error(error.message);

    await context.supabase
      .rpc("definir_statut_soumission", {
        p_place_id: placeId,
        p_statut: "refuse",
        p_motif: data.motif,
      })
      .then(
        () => {},
        () => {},
      );

    await context.supabase
      .from("actions_moderation")
      .insert({ place_id: placeId, moderateur_id: context.userId, action: "rejet" })
      .then(
        () => {},
        () => {},
      );
  });
