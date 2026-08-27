import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Medicament = {
  id: string;
  nom_commercial: string;
  molecule: string | null;
  dosage: string | null;
  forme: string | null;
  conditionnement: string | null;
  prix_vente: number | null;
  disponible: boolean;
};

const champsMedicamentSchema = z.object({
  placeId: z.string().uuid(),
  nomCommercial: z.string().trim().min(1).max(150),
  molecule: z.string().trim().max(150).optional().nullable(),
  dosage: z.string().trim().max(50).optional().nullable(),
  forme: z.string().trim().max(50).optional().nullable(),
  conditionnement: z.string().trim().max(80).optional().nullable(),
  prixVente: z.number().min(0).max(10_000_000).optional().nullable(),
  disponible: z.boolean(),
});

/** Vérifie que le lieu appartient bien à l'utilisateur, avant toute action sur son stock. */
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

export const listerMonStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<Medicament[]> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { data: rows, error } = await context.supabase
      .from("medicaments")
      .select(
        "id, nom_commercial, molecule, dosage, forme, conditionnement, prix_vente, disponible",
      )
      .eq("place_id", data.placeId)
      .order("nom_commercial", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Medicament[];
  });

export const ajouterMedicament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => champsMedicamentSchema.parse(data))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { data: cree, error } = await context.supabase
      .from("medicaments")
      .insert({
        place_id: data.placeId,
        nom_commercial: data.nomCommercial,
        molecule: data.molecule || null,
        dosage: data.dosage || null,
        forme: data.forme || null,
        conditionnement: data.conditionnement || null,
        prix_vente: data.prixVente ?? null,
        disponible: data.disponible,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

export const modifierMedicament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    champsMedicamentSchema.extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error } = await context.supabase
      .from("medicaments")
      .update({
        nom_commercial: data.nomCommercial,
        molecule: data.molecule || null,
        dosage: data.dosage || null,
        forme: data.forme || null,
        conditionnement: data.conditionnement || null,
        prix_vente: data.prixVente ?? null,
        disponible: data.disponible,
      })
      .eq("id", data.id)
      .eq("place_id", data.placeId);
    if (error) throw new Error(error.message);

    // Remis en stock : on bascule les alertes en attente pour ce médicament.
    // Notification interne à l'app (pas d'email/SMS) — l'utilisateur voit le
    // statut en revenant sur /mes-alertes.
    if (data.disponible) {
      await context.supabase
        .from("alertes_medicament")
        .update({ notifie: true })
        .eq("medicament_id", data.id)
        .eq("notifie", false);
    }
  });

export const supprimerMedicament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), placeId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error } = await context.supabase
      .from("medicaments")
      .delete()
      .eq("id", data.id)
      .eq("place_id", data.placeId);
    if (error) throw new Error(error.message);
  });

export const importerMedicaments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        placeId: z.string().uuid(),
        lignes: z
          .array(
            z.object({
              nomCommercial: z.string().trim().min(1).max(150),
              molecule: z.string().trim().max(150).optional().nullable(),
              dosage: z.string().trim().max(50).optional().nullable(),
              prixVente: z.number().min(0).max(10_000_000).optional().nullable(),
            }),
          )
          .min(1)
          .max(500),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<{ importes: number }> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error, count } = await context.supabase.from("medicaments").insert(
      data.lignes.map((l) => ({
        place_id: data.placeId,
        nom_commercial: l.nomCommercial,
        molecule: l.molecule || null,
        dosage: l.dosage || null,
        prix_vente: l.prixVente ?? null,
        disponible: true,
      })),
      { count: "exact" },
    );
    if (error) throw new Error(error.message);
    return { importes: count ?? data.lignes.length };
  });

export type JourGarde = { id: string; date_garde: string; horaires: string | null };

export const listerMesGardes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<JourGarde[]> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { data: rows, error } = await context.supabase
      .from("pharmacie_gardes")
      .select("id, date_garde, horaires")
      .eq("place_id", data.placeId)
      .gte("date_garde", new Date().toISOString().slice(0, 10))
      .order("date_garde", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as JourGarde[];
  });

export const ajouterGarde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        placeId: z.string().uuid(),
        dateGarde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        horaires: z.string().trim().max(100).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error } = await context.supabase.from("pharmacie_gardes").insert({
      place_id: data.placeId,
      date_garde: data.dateGarde,
      horaires: data.horaires || null,
    });
    if (error) throw new Error(error.message);
  });

export const retirerGarde = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), placeId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await verifierProprietaire(context.supabase, data.placeId, context.userId);
    const { error } = await context.supabase
      .from("pharmacie_gardes")
      .delete()
      .eq("id", data.id)
      .eq("place_id", data.placeId);
    if (error) throw new Error(error.message);
  });
