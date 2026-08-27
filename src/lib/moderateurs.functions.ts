import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const estAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.role === "admin";
  });

export type StatutModeration = {
  role: "user" | "moderator" | "admin";
  demandeEnAttente: boolean;
};

/** Statut de modération de l'utilisateur connecté, pour l'espace pro. */
export const monStatutModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StatutModeration> => {
    const { data: profil, error: erreurProfil } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (erreurProfil) throw new Error(erreurProfil.message);

    const { data: demande, error: erreurDemande } = await context.supabase
      .from("demandes_moderation")
      .select("id")
      .eq("user_id", context.userId)
      .eq("statut", "en_attente")
      .maybeSingle();
    if (erreurDemande) throw new Error(erreurDemande.message);

    return {
      role: (profil?.role ?? "user") as StatutModeration["role"],
      demandeEnAttente: Boolean(demande),
    };
  });

export const demanderModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<void> => {
    const { error } = await context.supabase
      .from("demandes_moderation")
      .insert({ user_id: context.userId });
    if (error) throw new Error(error.message);
  });

export type DemandeModeration = {
  id: string;
  user_id: string;
  created_at: string;
  profiles: { nom_complet: string | null } | null;
};

export const listerDemandesModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DemandeModeration[]> => {
    const { data, error } = await context.supabase
      .from("demandes_moderation")
      .select("id, user_id, created_at, profiles(nom_complet)")
      .eq("statut", "en_attente")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as DemandeModeration[];
  });

export const approuverDemandeModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.rpc("approuver_moderateur", { p_demande_id: data.id });
    if (error) throw new Error(error.message);
  });

export const rejeterDemandeModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.rpc("rejeter_demande_moderation", {
      p_demande_id: data.id,
    });
    if (error) throw new Error(error.message);
  });

export type Moderateur = { id: string; nom_complet: string | null };

export const listerModerateurs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Moderateur[]> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, nom_complet")
      .eq("role", "moderator")
      .order("nom_complet", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Moderateur[];
  });

export const revoquerModerateur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.rpc("revoquer_moderateur", { p_user_id: data.userId });
    if (error) throw new Error(error.message);
  });
