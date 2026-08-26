import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const demanderRevendication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    // On vérifie côté serveur que la fiche est bien non revendiquée, pour
    // donner un message clair plutôt qu'une erreur de contrainte SQL.
    const { data: lieu, error: erreurLieu } = await context.supabase
      .from("places")
      .select("id, owner_id")
      .eq("id", data.placeId)
      .maybeSingle();
    if (erreurLieu) throw new Error(erreurLieu.message);
    if (!lieu) throw new Error("Ce lieu n'existe pas.");
    if (lieu.owner_id) throw new Error("Cette fiche appartient déjà à quelqu'un.");

    const { error } = await context.supabase
      .from("revendications")
      .insert({ place_id: data.placeId, user_id: context.userId });
    if (error) throw new Error(error.message);
  });

export type Revendication = {
  id: string;
  place_id: string;
  created_at: string;
  places: { nom: string; quartier: string | null } | null;
};

export const listerRevendications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Revendication[]> => {
    const { data, error } = await context.supabase
      .from("revendications")
      .select("id, place_id, created_at, places(nom, quartier)")
      .eq("statut", "en_attente")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Revendication[];
  });

export const approuverRevendication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    const { data: revendication, error: erreurLecture } = await context.supabase
      .from("revendications")
      .select("place_id, user_id")
      .eq("id", data.id)
      .single();
    if (erreurLecture) throw new Error(erreurLecture.message);

    // Deux écritures : attribuer le lieu, puis marquer la demande traitée.
    // Un moderateur a les droits d'ecriture sur les deux tables (policies
    // "moderateur" des Lots 2 et 17).
    const { error: erreurLieu } = await context.supabase
      .from("places")
      .update({ owner_id: revendication.user_id })
      .eq("id", revendication.place_id);
    if (erreurLieu) throw new Error(erreurLieu.message);

    const { error } = await context.supabase
      .from("revendications")
      .update({ statut: "approuvee" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export const rejeterRevendication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase
      .from("revendications")
      .update({ statut: "rejetee" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });
