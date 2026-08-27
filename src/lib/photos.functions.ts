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

/**
 * Enregistre une photo sur une proposition en attente, sans exiger de
 * compte — cohérent avec /proposer qui n'en demande pas non plus. Le
 * serveur revérifie que la fiche est bien non revendiquée et en attente
 * (la RLS le garantit déjà, mais un message d'erreur clair vaut mieux
 * qu'une erreur SQL brute si quelqu'un rappelle cette fonction plus tard).
 */
export const ajouterPhotoProposition = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ placeId: z.string().uuid(), url: z.string().url(), ordre: z.number().int().min(0) })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { clientPublic } = await import("./supabase-public.server");
    const supabase = clientPublic();

    const { data: lieu, error: erreurLieu } = await supabase
      .from("places")
      .select("id, owner_id, statut_verification")
      .eq("id", data.placeId)
      .maybeSingle();
    if (erreurLieu) throw new Error(erreurLieu.message);
    if (!lieu || lieu.owner_id || lieu.statut_verification !== "a_verifier") {
      throw new Error("Cette fiche n'accepte plus de photo (déjà revendiquée ou déjà vérifiée).");
    }

    const { data: cree, error } = await supabase
      .from("place_photos")
      .insert({ place_id: data.placeId, url: data.url, ordre: data.ordre })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

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
    z
      .object({ placeId: z.string().uuid(), url: z.string().url(), ordre: z.number().int().min(0) })
      .parse(data),
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
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), placeId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error } = await context.supabase
      .from("place_photos")
      .delete()
      .eq("id", data.id)
      .eq("place_id", data.placeId);
    if (error) throw new Error(error.message);
  });
