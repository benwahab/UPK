import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { Autorisations, RoleUpk } from "./autorisations";

/** Rôles + permissions du compte connecté (source d'autorité côté serveur). */
export const mesAutorisations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Autorisations> => {
    const { data, error } = await context.supabase.rpc("mes_autorisations");
    if (error) throw new Error(error.message);
    const ligne = (data ?? [])[0];
    return {
      roles: ((ligne?.roles ?? []) as string[]) as RoleUpk[],
      permissions: (ligne?.permissions ?? []) as string[],
      suspendu: Boolean(ligne?.suspendu),
    };
  });

export type CompteAdmin = {
  id: string;
  email: string | null;
  prenom: string | null;
  nom_complet: string | null;
  telephone: string | null;
  cree_le: string;
  admin_suspendu: boolean;
  roles: RoleUpk[];
  permissions: string[];
};

export const rechercherComptes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ recherche: z.string().trim().max(120).optional() }).parse(data ?? {}),
  )
  .handler(async ({ context, data }): Promise<CompteAdmin[]> => {
    const { data: lignes, error } = await context.supabase.rpc("rechercher_comptes", {
      p_recherche: data.recherche ?? undefined,
    });
    if (error) throw new Error(error.message);
    return (lignes ?? []).map((l) => ({
      id: l.id as string,
      email: (l.email as string | null) ?? null,
      prenom: (l.prenom as string | null) ?? null,
      nom_complet: (l.nom_complet as string | null) ?? null,
      telephone: (l.telephone as string | null) ?? null,
      cree_le: l.cree_le as string,
      admin_suspendu: Boolean(l.admin_suspendu),
      roles: ((l.roles ?? []) as string[]) as RoleUpk[],
      permissions: (l.permissions ?? []) as string[],
    }));
  });

const roleSchema = z.enum(["professionnel", "moderateur", "administrateur", "super_admin"]);

export const accorderRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), role: roleSchema }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.rpc("accorder_role", {
      p_user_id: data.userId,
      p_role: data.role,
    });
    if (error) throw new Error(error.message);
  });

export const retirerRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), role: roleSchema }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.rpc("retirer_role", {
      p_user_id: data.userId,
      p_role: data.role,
    });
    if (error) throw new Error(error.message);
  });

export const definirPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ userId: z.string().uuid(), permissions: z.array(z.string().max(60)).max(30) })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.rpc("definir_permissions", {
      p_user_id: data.userId,
      p_permissions: data.permissions,
    });
    if (error) throw new Error(error.message);
  });

export const suspendreAccesAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), suspendu: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.rpc("suspendre_acces_admin", {
      p_user_id: data.userId,
      p_suspendu: data.suspendu,
    });
    if (error) throw new Error(error.message);
  });

export type LigneJournal = {
  id: string;
  acteur_id: string | null;
  acteur_nom: string | null;
  acteur_role: string;
  action: string;
  section: string;
  cible_type: string | null;
  cible_id: string | null;
  cible_libelle: string | null;
  resultat: string;
  avant: Json | null;
  apres: Json | null;
  created_at: string;
};

/** Journal des actions administratives — lecture réservée à la permission « activite ». */
export const listerJournalAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        acteurId: z.string().uuid().optional(),
        section: z.string().max(60).optional(),
        depuis: z.string().max(40).optional(),
        limite: z.number().int().min(1).max(300).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ context, data }): Promise<LigneJournal[]> => {
    let requete = context.supabase
      .from("journal_admin")
      .select(
        "id, acteur_id, acteur_nom, acteur_role, action, section, cible_type, cible_id, cible_libelle, resultat, avant, apres, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limite ?? 100);

    if (data.acteurId) requete = requete.eq("acteur_id", data.acteurId);
    if (data.section) requete = requete.eq("section", data.section);
    if (data.depuis) requete = requete.gte("created_at", data.depuis);

    const { data: lignes, error } = await requete;
    if (error) throw new Error(error.message);
    return (lignes ?? []) as LigneJournal[];
  });

/** Journalise une action sensible (connexion/déconnexion à l'administration, etc.). */
export const journaliserAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        action: z.string().trim().min(2).max(160),
        section: z.string().trim().min(2).max(60),
        cibleType: z.string().max(60).optional(),
        cibleId: z.string().max(80).optional(),
        cibleLibelle: z.string().max(160).optional(),
        resultat: z.string().max(40).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<void> => {
    await context.supabase
      .rpc("journaliser", {
        p_action: data.action,
        p_section: data.section,
        p_cible_type: data.cibleType ?? undefined,
        p_cible_id: data.cibleId ?? undefined,
        p_cible_libelle: data.cibleLibelle ?? undefined,
        p_resultat: data.resultat ?? "succes",
      })
      .then(
        () => {},
        () => {},
      );
  });
