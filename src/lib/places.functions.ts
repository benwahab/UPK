import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Categorie, Lieu, LieuDetail } from "./upk";

const rechercheSchema = z.object({
  requete: z.string().max(120).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  categorieSlug: z.string().max(80).optional().nullable(),
  limite: z.number().int().min(1).max(60).optional(),
});

export const listerCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<Categorie[]> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data, error } = await clientPublic()
      .from("categories")
      .select("id, nom, slug, icone, parent_id")
      .order("ordre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Categorie[];
  },
);

export const rechercherLieux = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => rechercheSchema.parse(data))
  .handler(async ({ data }): Promise<Lieu[]> => {
    const { clientPublic } = await import("./supabase-public.server");
    const { data: rows, error } = await clientPublic().rpc("rechercher_lieux", {
      requete: data.requete?.trim() || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      categorie_slug: data.categorieSlug || null,
      rayon_km: null,
      limite: data.limite ?? 40,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Lieu[];
  });

export const obtenirLieu = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<LieuDetail | null> => {
    const { clientPublic } = await import("./supabase-public.server");
    const supabase = clientPublic();

    const { data: lieu, error } = await supabase
      .from("places")
      .select(
        "id, nom, description, adresse, quartier, latitude, longitude, telephone, whatsapp, horaires, site_web, statut_verification, categories(nom, slug, icone)",
      )
      .eq("id", data.id)
      .eq("actif", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lieu) return null;

    const { data: photos } = await supabase
      .from("place_photos")
      .select("id, url")
      .eq("place_id", data.id)
      .order("ordre", { ascending: true });

    const categorie = (lieu as unknown as { categories: Categorie | null }).categories;

    return {
      ...(lieu as unknown as Omit<
        LieuDetail,
        "categorie_nom" | "categorie_slug" | "categorie_icone" | "distance_m" | "photos"
      >),
      categorie_nom: categorie?.nom ?? null,
      categorie_slug: categorie?.slug ?? null,
      categorie_icone: categorie?.icone ?? null,
      distance_m: null,
      photos: (photos ?? []) as { id: string; url: string }[],
    };
  });
