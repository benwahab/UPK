import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Chambre = {
  id: string;
  type: string;
  capacite: number | null;
  nombre: number;
  equipements: string | null;
  prix: number | null;
  description: string | null;
  disponible: boolean;
};

const champsChambreSchema = z.object({
  placeId: z.string().uuid(),
  type: z.string().trim().min(1).max(100),
  capacite: z.number().int().min(1).max(50).optional().nullable(),
  nombre: z.number().int().min(1).max(500),
  equipements: z.string().trim().max(300).optional().nullable(),
  prix: z.number().min(0).max(10_000_000).optional().nullable(),
  description: z.string().trim().max(300).optional().nullable(),
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

export const listerMesChambres = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<Chambre[]> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { data: rows, error } = await context.supabase
      .from("chambres")
      .select("id, type, capacite, nombre, equipements, prix, description, disponible")
      .eq("place_id", data.placeId)
      .order("type", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Chambre[];
  });

export const ajouterChambre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => champsChambreSchema.parse(data))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { data: cree, error } = await context.supabase
      .from("chambres")
      .insert({
        place_id: data.placeId,
        type: data.type,
        capacite: data.capacite ?? null,
        nombre: data.nombre,
        equipements: data.equipements || null,
        prix: data.prix ?? null,
        description: data.description || null,
        disponible: data.disponible,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

export const supprimerChambre = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), placeId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error } = await context.supabase
      .from("chambres")
      .delete()
      .eq("id", data.id)
      .eq("place_id", data.placeId);
    if (error) throw new Error(error.message);
  });

export const importerChambres = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        placeId: z.string().uuid(),
        lignes: z
          .array(
            z.object({
              type: z.string().trim().min(1).max(100),
              capacite: z.number().int().min(1).max(50).optional().nullable(),
              nombre: z.number().int().min(1).max(500),
              prix: z.number().min(0).max(10_000_000).optional().nullable(),
              equipements: z.string().trim().max(300).optional().nullable(),
            }),
          )
          .min(1)
          .max(500),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<{ importes: number }> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error, count } = await context.supabase.from("chambres").insert(
      data.lignes.map((l) => ({
        place_id: data.placeId,
        type: l.type,
        capacite: l.capacite ?? null,
        nombre: l.nombre,
        prix: l.prix ?? null,
        equipements: l.equipements || null,
        disponible: true,
      })),
      { count: "exact" },
    );
    if (error) throw new Error(error.message);
    return { importes: count ?? data.lignes.length };
  });
