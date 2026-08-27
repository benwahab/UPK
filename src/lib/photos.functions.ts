import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export type PhotoLieu = { id: string; url: string; ordre: number };

export const listerMesPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<PhotoLieu[]> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { data: rows, error } = await context.supabase
      .from("place_photos")
      .select("id, url, ordre")
      .eq("place_id", data.placeId)
      .order("ordre", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PhotoLieu[];
  });

/** Enregistre la ligne place_photos une fois le fichier déjà téléversé côté client. */
export const ajouterPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ placeId: z.string().uuid(), url: z.string().url(), ordre: z.number().int().min(0) }).parse(data),
  )
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { data: cree, error } = await context.supabase
      .from("place_photos")
      .insert({ place_id: data.placeId, url: data.url, ordre: data.ordre })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

export const supprimerPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error } = await context.supabase
      .from("place_photos")
      .delete()
      .eq("id", data.id)
      .eq("place_id", data.placeId);
    if (error) throw new Error(error.message);
  });
