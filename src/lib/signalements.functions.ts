import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { distanceMetres, normaliserTelephone, similariteNoms } from "./dedoublonnage";

const TYPES_PROBLEME = [
  "ferme",
  "infos_incorrectes",
  "position_incorrecte",
  "doublon",
  "autre",
] as const;

export const LIBELLES_TYPE_PROBLEME: Record<(typeof TYPES_PROBLEME)[number], string> = {
  ferme: "Établissement fermé",
  infos_incorrectes: "Informations incorrectes",
  position_incorrecte: "Mauvaise position",
  doublon: "Doublon",
  autre: "Autre",
};

/** N'importe qui — avec ou sans compte — peut signaler un problème sur une fiche. */
export const signalerProbleme = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        placeId: z.string().uuid(),
        typeProbleme: z.enum(TYPES_PROBLEME),
        description: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<void> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { error } = await clientPublic()
      .from("signalements")
      .insert({
        place_id: data.placeId,
        type_probleme: data.typeProbleme,
        description: data.description || null,
      });
    if (error) throw new Error(error.message);
  });

export type CandidatDoublon = {
  place_id: string;
  nom: string;
  quartier: string | null;
  telephone: string | null;
  distance_m: number | null;
  meme_telephone: boolean;
  similarite_nom: number;
};

/**
 * Compare une fiche à toutes les autres fiches actives pour repérer des
 * doublons potentiels : même téléphone (fort indice), ou nom proche +
 * position proche (cf. cahier des charges section 41 — "Salon Awa" /
 * "Awa Coiffure" à 30 mètres avec le même téléphone).
 */
export const detecterDoublons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<CandidatDoublon[]> => {
    const { data: cible, error: erreurCible } = await context.supabase
      .from("places")
      .select("id, nom, telephone, latitude, longitude")
      .eq("id", data.placeId)
      .single();
    if (erreurCible) throw new Error(erreurCible.message);

    const { data: autres, error } = await context.supabase
      .from("places")
      .select("id, nom, quartier, telephone, latitude, longitude")
      .eq("actif", true)
      .neq("id", data.placeId)
      .limit(500);
    if (error) throw new Error(error.message);

    const telCible = normaliserTelephone(cible.telephone);

    const candidats: CandidatDoublon[] = [];
    for (const autre of autres ?? []) {
      const telAutre = normaliserTelephone(autre.telephone);
      const memeTelephone = Boolean(telCible && telAutre && telCible === telAutre);
      const distance = distanceMetres(
        cible.latitude,
        cible.longitude,
        autre.latitude,
        autre.longitude,
      );
      const similarite = similariteNoms(cible.nom, autre.nom);

      // Doublon probable si même téléphone, OU (noms proches ET moins de 300m).
      if (memeTelephone || (similarite >= 0.5 && distance < 300)) {
        candidats.push({
          place_id: autre.id,
          nom: autre.nom,
          quartier: autre.quartier,
          telephone: autre.telephone,
          distance_m: Math.round(distance),
          meme_telephone: memeTelephone,
          similarite_nom: similarite,
        });
      }
    }

    return candidats.sort(
      (a, b) =>
        Number(b.meme_telephone) - Number(a.meme_telephone) || b.similarite_nom - a.similarite_nom,
    );
  });

export type Signalement = {
  id: string;
  place_id: string;
  type_probleme: (typeof TYPES_PROBLEME)[number];
  description: string | null;
  created_at: string;
  places: { nom: string } | null;
};

export const listerSignalements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Signalement[]> => {
    const { data, error } = await context.supabase
      .from("signalements")
      .select("id, place_id, type_probleme, description, created_at, places(nom)")
      .eq("traite", false)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Signalement[];
  });

export const traiterSignalement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase
      .from("signalements")
      .update({ traite: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });
