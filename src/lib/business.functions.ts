import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Lieu } from "./upk";

const champsLieuSchema = z.object({
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

/** Fiches (actives ou non) qui appartiennent à l'utilisateur connecté. */
export const listerMesLieux = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Lieu[]> => {
    const { data, error } = await context.supabase
      .from("places")
      .select(
        "id, nom, description, adresse, quartier, latitude, longitude, telephone, whatsapp, horaires, site_web, statut_verification, actif, categories(nom, slug, icone)",
      )
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? []).map((lieu) => {
      const categorie = (
        lieu as unknown as {
          categories: { nom: string; slug: string; icone: string | null } | null;
        }
      ).categories;
      return {
        ...(lieu as unknown as Omit<
          Lieu,
          "categorie_nom" | "categorie_slug" | "categorie_icone" | "distance_m"
        >),
        categorie_nom: categorie?.nom ?? null,
        categorie_slug: categorie?.slug ?? null,
        categorie_icone: categorie?.icone ?? null,
        distance_m: null,
      };
    });
  });

export const creerMonLieu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => champsLieuSchema.parse(data))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    const { data: cree, error } = await context.supabase
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
        owner_id: context.userId,
        source: "soumission_utilisateur",
        statut_verification: "a_verifier",
        actif: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

export const modifierMonLieu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => champsLieuSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    const { id, categorieId, siteWeb, ...reste } = data;
    const { error } = await context.supabase
      .from("places")
      .update({
        ...reste,
        description: reste.description || null,
        adresse: reste.adresse || null,
        quartier: reste.quartier || null,
        telephone: reste.telephone || null,
        whatsapp: reste.whatsapp || null,
        horaires: reste.horaires || null,
        site_web: siteWeb || null,
        category_id: categorieId,
      })
      .eq("id", id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { id };
  });

export const obtenirMonLieu = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: lieu, error } = await context.supabase
      .from("places")
      .select(
        "id, nom, description, category_id, adresse, quartier, latitude, longitude, telephone, whatsapp, horaires, site_web, statut_verification, actif, categories(slug)",
      )
      .eq("id", data.id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return lieu;
  });
