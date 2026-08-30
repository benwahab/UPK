import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function verifierAdmin(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "admin") throw new Error("Réservé aux administrateurs.");
}

export type GroupeGarde = { id: string; nom: string; nombre_membres: number };

export const listerGroupesGarde = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GroupeGarde[]> => {
    await verifierAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("groupes_garde")
      .select("id, nom, groupe_garde_membres(count)")
      .order("nom", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((g) => {
      const ligne = g as unknown as {
        id: string;
        nom: string;
        groupe_garde_membres: { count: number }[];
      };
      return {
        id: ligne.id,
        nom: ligne.nom,
        nombre_membres: ligne.groupe_garde_membres?.[0]?.count ?? 0,
      };
    });
  });

export const creerGroupeGarde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ nom: z.string().trim().min(2).max(80) }).parse(data),
  )
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await verifierAdmin(context.supabase, context.userId);
    const { data: cree, error } = await context.supabase
      .from("groupes_garde")
      .insert({ nom: data.nom })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

export const supprimerGroupeGarde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    await verifierAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("groupes_garde").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export type MembreGroupe = { id: string; place_id: string; nom: string; quartier: string | null };

export const listerMembresGroupe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ groupeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<MembreGroupe[]> => {
    await verifierAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("groupe_garde_membres")
      .select("id, place_id, places(nom, quartier)")
      .eq("groupe_id", data.groupeId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const ligne = r as unknown as {
        id: string;
        place_id: string;
        places: { nom: string; quartier: string | null } | null;
      };
      return {
        id: ligne.id,
        place_id: ligne.place_id,
        nom: ligne.places?.nom ?? "Lieu supprimé",
        quartier: ligne.places?.quartier ?? null,
      };
    });
  });

export type PharmacieOption = { id: string; nom: string; quartier: string | null };

/** Toutes les pharmacies actives, pour peupler le sélecteur d'ajout de membre. */
export const listerToutesLesPharmacies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PharmacieOption[]> => {
    await verifierAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("places")
      .select("id, nom, quartier, categories!inner(slug)")
      .eq("categories.slug", "pharmacie")
      .eq("actif", true)
      .order("nom", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id as string,
      nom: p.nom as string,
      quartier: p.quartier as string | null,
    }));
  });

export const ajouterMembreGroupe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ groupeId: z.string().uuid(), placeId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await verifierAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("groupe_garde_membres")
      .insert({ groupe_id: data.groupeId, place_id: data.placeId });
    if (error) throw new Error(error.message);
  });

export const retirerMembreGroupe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    await verifierAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("groupe_garde_membres")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export const assignerPeriodeGardeGroupe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        groupeId: z.string().uuid(),
        dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        horaires: z.string().trim().max(100).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<{ creees: number }> => {
    const { data: nombre, error } = await context.supabase.rpc("assigner_periode_garde_groupe", {
      p_groupe_id: data.groupeId,
      p_date_debut: data.dateDebut,
      p_date_fin: data.dateFin,
      p_horaires: data.horaires || undefined,
    });
    if (error) throw new Error(error.message);
    return { creees: (nombre as number) ?? 0 };
  });
