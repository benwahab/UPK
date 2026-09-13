/** Rôles et permissions UPK — module client-safe (aucun accès base). */

export type RoleUpk = "professionnel" | "moderateur" | "administrateur" | "super_admin";

export const LIBELLES_ROLE: Record<RoleUpk, string> = {
  professionnel: "Professionnel",
  moderateur: "Modérateur",
  administrateur: "Administrateur",
  super_admin: "Super administrateur",
};

export const PERMISSIONS = [
  { cle: "etablissements", label: "Gérer les établissements" },
  { cle: "validation_lieux", label: "Valider les nouveaux lieux" },
  { cle: "professionnels", label: "Gérer les professionnels" },
  { cle: "statistiques", label: "Consulter les statistiques" },
  { cle: "comptes", label: "Gérer les comptes" },
  { cle: "moderateurs", label: "Gérer les modérateurs" },
  { cle: "administrateurs", label: "Gérer les administrateurs" },
  { cle: "activite", label: "Consulter l'activité administrative" },
  { cle: "parametres", label: "Modifier les paramètres" },
  { cle: "donnees_sensibles", label: "Accéder aux données sensibles" },
] as const;

export type PermissionUpk = (typeof PERMISSIONS)[number]["cle"];

export const LIBELLES_PERMISSION: Record<string, string> = Object.fromEntries(
  PERMISSIONS.map((p) => [p.cle, p.label]),
);

export type Autorisations = {
  roles: RoleUpk[];
  permissions: string[];
  suspendu: boolean;
};

export const AUTORISATIONS_VIDES: Autorisations = { roles: [], permissions: [], suspendu: false };

export function estSuperAdmin(a: Autorisations | undefined | null): boolean {
  return Boolean(a?.roles.includes("super_admin"));
}

/** Le super administrateur possède toujours toutes les permissions. */
export function peut(a: Autorisations | undefined | null, permission: string): boolean {
  if (!a) return false;
  if (estSuperAdmin(a)) return true;
  if (a.suspendu) return false;
  if (a.permissions.includes(permission)) return true;
  // Socle de travail du modérateur.
  return (
    a.roles.includes("moderateur") && ["validation_lieux", "etablissements"].includes(permission)
  );
}

/** Un compte a-t-il accès à l'espace d'administration ? */
export function accesAdmin(a: Autorisations | undefined | null): boolean {
  if (!a) return false;
  if (estSuperAdmin(a)) return true;
  if (a.suspendu) return false;
  return a.roles.includes("moderateur") || a.roles.includes("administrateur");
}

export function roleLePlusEleve(a: Autorisations | undefined | null): RoleUpk | null {
  if (!a || a.roles.length === 0) return null;
  const ordre: RoleUpk[] = ["super_admin", "administrateur", "moderateur", "professionnel"];
  return ordre.find((r) => a.roles.includes(r)) ?? null;
}

export const STATUTS_SOUMISSION = {
  en_attente: { label: "En attente de vérification", puce: "🟡" },
  en_examen: { label: "En cours d'examen", puce: "🔵" },
  valide: { label: "Validé", puce: "🟢" },
  refuse: { label: "Refusé", puce: "🔴" },
} as const;

export type StatutSoumission = keyof typeof STATUTS_SOUMISSION;
