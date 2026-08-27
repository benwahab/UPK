import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Lieu } from "./upk";

export const basculerFavori = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ favori: boolean }> => {
    const { data: existant, error: erreurLecture } = await context.supabase
      .from("favoris")
      .select("id")
      .eq("user_id", context.userId)
      .eq("place_id", data.placeId)
      .maybeSingle();
    if (erreurLecture) throw new Error(erreurLecture.message);

    if (existant) {
      const { error } = await context.supabase.from("favoris").delete().eq("id", existant.id);
      if (error) throw new Error(error.message);
      return { favori: false };
    }

    const { error } = await context.supabase
      .from("favoris")
      .insert({ user_id: context.userId, place_id: data.placeId });
    if (error) throw new Error(error.message);
    return { favori: true };
  });

export const estFavori = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ placeId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<boolean> => {
    const { data: existant, error } = await context.supabase
      .from("favoris")
      .select("id")
      .eq("user_id", context.userId)
      .eq("place_id", data.placeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(existant);
  });

export const listerMesFavoris = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Lieu[]> => {
    const { data, error } = await context.supabase
      .from("favoris")
      .select(
        "created_at, places(id, nom, description, adresse, quartier, latitude, longitude, telephone, whatsapp, horaires, site_web, statut_verification, actif, categories(nom, slug, icone))",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((f) => (f as unknown as { places: Record<string, unknown> | null }).places)
      .filter((p): p is Record<string, unknown> => p !== null && p["actif"] === true)
      .map((p) => {
        const categorie = p["categories"] as {
          nom: string;
          slug: string;
          icone: string | null;
        } | null;
        return {
          ...(p as unknown as Omit<
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
