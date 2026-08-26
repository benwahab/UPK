import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Plat = {
  id: string;
  nom: string;
  description: string | null;
  categorie: string | null;
  prix: number | null;
  disponible: boolean;
  ordre: number;
};

const champsPlatSchema = z.object({
  placeId: z.string().uuid(),
  nom: z.string().trim().min(1).max(150),
  description: z.string().trim().max(300).optional().nullable(),
  categorie: z.string().trim().max(60).optional().nullable(),
  prix: z.number().min(0).max(10_000_000).optional().nullable(),
  disponible: z.boolean(),
});

async function verifierProprietaire(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  placeId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("places")
    .select("id")
    .eq("id", placeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Cet établissement ne vous appartient pas.");
}

export const listerMonMenu = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<Plat[]> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { data: rows, error } = await context.supabase
      .from("plats")
      .select("id, nom, description, categorie, prix, disponible, ordre")
      .eq("place_id", data.placeId)
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Plat[];
  });

export const ajouterPlat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => champsPlatSchema.parse(data))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { data: cree, error } = await context.supabase
      .from("plats")
      .insert({
        place_id: data.placeId,
        nom: data.nom,
        description: data.description || null,
        categorie: data.categorie || null,
        prix: data.prix ?? null,
        disponible: data.disponible,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

export const modifierPlat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => champsPlatSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error } = await context.supabase
      .from("plats")
      .update({
        nom: data.nom,
        description: data.description || null,
        categorie: data.categorie || null,
        prix: data.prix ?? null,
        disponible: data.disponible,
      })
      .eq("id", data.id)
      .eq("place_id", data.placeId);
    if (error) throw new Error(error.message);
  });

export const supprimerPlat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error } = await context.supabase
      .from("plats")
      .delete()
      .eq("id", data.id)
      .eq("place_id", data.placeId);
    if (error) throw new Error(error.message);
  });

export const importerPlats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        placeId: z.string().uuid(),
        lignes: z
          .array(
            z.object({
              nom: z.string().trim().min(1).max(150),
              categorie: z.string().trim().max(60).optional().nullable(),
              prix: z.number().min(0).max(10_000_000).optional().nullable(),
            }),
          )
          .min(1)
          .max(500),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<{ importes: number }> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error, count } = await context.supabase
      .from("plats")
      .insert(
        data.lignes.map((l) => ({
          place_id: data.placeId,
          nom: l.nom,
          categorie: l.categorie || null,
          prix: l.prix ?? null,
          disponible: true,
        })),
        { count: "exact" },
      );
    if (error) throw new Error(error.message);
    return { importes: count ?? data.lignes.length };
  });
