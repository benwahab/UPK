import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Lieu } from "./upk";

const champsPropositionSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).optional().nullable(),
  categorieId: z.string().uuid(),
  adresse: z.string().trim().max(200).optional().nullable(),
  quartier: z.string().trim().max(100).optional().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  telephone: z.string().trim().max(30).optional().nullable(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  horaires: z.string().trim().max(200).optional().nullable(),
  siteWeb: z.string().trim().url().max(200).optional().nullable().or(z.literal("")),
});

/** Un utilisateur (pas forcément le propriétaire) propose un lieu qu'il connaît. */
/**
 * Un utilisateur — connecté ou non, sur demande explicite — propose un lieu
 * qu'il ne possède pas. Toujours a_verifier, jamais de owner_id (ça, c'est
 * réservé au flux "Espace pro" où le propriétaire prouve son identité).
 */
export const proposerLieu = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => champsPropositionSchema.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data: cree, error } = await clientPublic()
      .from("places")
      .insert({
        nom: data.nom,
        description: data.description || null,
        category_id: data.categorieId,
        adresse: data.adresse || null,
        quartier: data.quartier || null,
        latitude: data.latitude,
        longitude: data.longitude,
        telephone: data.telephone || null,
        whatsapp: data.whatsapp || null,
        horaires: data.horaires || null,
        site_web: data.siteWeb || null,
        submitted_by: null,
        owner_id: null,
        source: "soumission_utilisateur",
        statut_verification: "a_verifier",
        actif: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

/** true si l'utilisateur connecté est modérateur ou admin. */
export const estModerateur = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.role === "moderator" || data?.role === "admin";
  });

/** File d'attente : tout lieu pas encore vérifié, peu importe qui l'a créé. */
export const listerFileAttente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Lieu[]> => {
    const { data, error } = await context.supabase
      .from("places")
      .select(
        "id, nom, description, adresse, quartier, latitude, longitude, telephone, whatsapp, horaires, site_web, statut_verification, categories(nom, slug, icone)",
      )
      .eq("statut_verification", "a_verifier")
      .eq("actif", true)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map((lieu) => {
      const categorie = (lieu as unknown as { categories: { nom: string; slug: string; icone: string | null } | null })
        .categories;
      return {
        ...(lieu as unknown as Omit<Lieu, "categorie_nom" | "categorie_slug" | "categorie_icone" | "distance_m">),
        categorie_nom: categorie?.nom ?? null,
        categorie_slug: categorie?.slug ?? null,
        categorie_icone: categorie?.icone ?? null,
        distance_m: null,
      };
    });
  });

export const validerLieu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase
      .from("places")
      .update({ statut_verification: "verifie" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export const rejeterLieu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.from("places").update({ actif: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
  });
