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

export type MonProfil = {
  prenom: string | null;
  nomComplet: string | null;
  telephone: string | null;
};

export const monProfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MonProfil> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("prenom, nom_complet, telephone")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      prenom: data?.prenom ?? null,
      nomComplet: data?.nom_complet ?? null,
      telephone: data?.telephone ?? null,
    };
  });

/**
 * Complète le profil (prénom, nom, téléphone) — exigé avant de pouvoir
 * demander à devenir modérateur, pour que l'admin puisse identifier et
 * contacter la personne.
 */
export const completerProfilModeration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        prenom: z.string().trim().min(1).max(80),
        nom: z.string().trim().min(1).max(80),
        telephone: z.string().trim().min(6).max(30),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ prenom: data.prenom, nom_complet: data.nom, telephone: data.telephone })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
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
  profiles: { nom_complet: string | null; prenom: string | null; telephone: string | null } | null;
};

export const listerDemandesModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DemandeModeration[]> => {
    const { data, error } = await context.supabase
      .from("demandes_moderation")
      .select("id, user_id, created_at, profiles(nom_complet, prenom, telephone)")
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

export type MesStatsModeration = { validations: number; rejets: number };

/** Compteur personnel du modérateur connecté (pas les autres). */
export const mesStatistiquesModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MesStatsModeration> => {
    const { data, error } = await context.supabase
      .from("actions_moderation")
      .select("action")
      .eq("moderateur_id", context.userId);
    if (error) throw new Error(error.message);

    let validations = 0;
    let rejets = 0;
    for (const ligne of data ?? []) {
      if (ligne.action === "validation") validations += 1;
      else rejets += 1;
    }
    return { validations, rejets };
  });

export type StatistiquesAdmin = {
  lieuxActifs: number;
  aVerifier: number;
  signalementsOuverts: number;
  revendicationsEnAttente: number;
  moderateursActifs: number;
};

/** Chiffres clés pour la vue d'ensemble du tableau de bord admin. */
export const obtenirStatistiquesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StatistiquesAdmin> => {
    const { data: profil, error: erreurProfil } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (erreurProfil) throw new Error(erreurProfil.message);
    if (profil?.role !== "admin") throw new Error("Réservé aux administrateurs.");

    const [
      lieuxActifs,
      aVerifier,
      signalementsOuverts,
      revendicationsEnAttente,
      moderateursActifs,
    ] = await Promise.all([
      context.supabase
        .from("places")
        .select("id", { count: "exact", head: true })
        .eq("actif", true),
      context.supabase
        .from("places")
        .select("id", { count: "exact", head: true })
        .eq("actif", true)
        .eq("statut_verification", "a_verifier"),
      context.supabase
        .from("signalements")
        .select("id", { count: "exact", head: true })
        .eq("traite", false),
      context.supabase
        .from("revendications")
        .select("id", { count: "exact", head: true })
        .eq("statut", "en_attente"),
      context.supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "moderator"),
    ]);

    return {
      lieuxActifs: lieuxActifs.count ?? 0,
      aVerifier: aVerifier.count ?? 0,
      signalementsOuverts: signalementsOuverts.count ?? 0,
      revendicationsEnAttente: revendicationsEnAttente.count ?? 0,
      moderateursActifs: moderateursActifs.count ?? 0,
    };
  });

export type StatistiqueModerateur = {
  moderateur_id: string;
  nom_complet: string | null;
  validations: number;
  rejets: number;
};

/** Nombre de lieux validés/rejetés par chaque modérateur (historique complet). */
export const listerStatistiquesModerateurs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StatistiqueModerateur[]> => {
    const { data, error } = await context.supabase
      .from("actions_moderation")
      .select("moderateur_id, action, profiles(nom_complet)");
    if (error) throw new Error(error.message);

    const parModerateur = new Map<string, StatistiqueModerateur>();
    for (const ligne of data ?? []) {
      const l = ligne as unknown as {
        moderateur_id: string;
        action: "validation" | "rejet";
        profiles: { nom_complet: string | null } | null;
      };
      const existant = parModerateur.get(l.moderateur_id) ?? {
        moderateur_id: l.moderateur_id,
        nom_complet: l.profiles?.nom_complet ?? null,
        validations: 0,
        rejets: 0,
      };
      if (l.action === "validation") existant.validations += 1;
      else existant.rejets += 1;
      parModerateur.set(l.moderateur_id, existant);
    }

    return Array.from(parModerateur.values()).sort(
      (a, b) => b.validations + b.rejets - (a.validations + a.rejets),
    );
  });

export type Moderateur = {
  id: string;
  nom_complet: string | null;
  prenom: string | null;
  telephone: string | null;
};

export const listerModerateurs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Moderateur[]> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, nom_complet, prenom, telephone")
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
