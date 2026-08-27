import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function verifierModerateur(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "moderator" && data?.role !== "admin") {
    throw new Error("Accès réservé aux modérateurs.");
  }
}

export type CategorieAdmin = {
  id: string;
  nom: string;
  slug: string;
  icone: string | null;
  ordre: number;
  parent_id: string | null;
};

export const listerCategoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CategorieAdmin[]> => {
    await verifierModerateur(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("categories")
      .select("id, nom, slug, icone, ordre, parent_id")
      .order("ordre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as CategorieAdmin[];
  });

function slugifier(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const creerCategorie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        nom: z.string().trim().min(2).max(80),
        icone: z.string().trim().max(10).optional().nullable(),
        parentId: z.string().uuid().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await verifierModerateur(context.supabase, context.userId);
    const { data: cree, error } = await context.supabase
      .from("categories")
      .insert({
        nom: data.nom,
        slug: slugifier(data.nom),
        icone: data.icone || null,
        parent_id: data.parentId || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: cree.id as string };
  });

export const modifierCategorie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        nom: z.string().trim().min(2).max(80),
        icone: z.string().trim().max(10).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await verifierModerateur(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("categories")
      .update({ nom: data.nom, icone: data.icone || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export const supprimerCategorie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    await verifierModerateur(context.supabase, context.userId);
    // category_id sur places est en ON DELETE SET NULL : la suppression
    // d'une categorie ne supprime jamais les lieux, elle les laisse
    // simplement sans categorie.
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
  });
