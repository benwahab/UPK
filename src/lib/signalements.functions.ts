import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { error } = await clientPublic().from("signalements").insert({
      place_id: data.placeId,
      type_probleme: data.typeProbleme,
      description: data.description || null,
    });
    if (error) throw new Error(error.message);
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
