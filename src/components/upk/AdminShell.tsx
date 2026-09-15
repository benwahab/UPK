import { Link, useRouterState } from "@tanstack/react-router";
import {
  Copy,
  Flag,
  History,
  LayoutDashboard,
  MapPinned,
  ShieldCheck,
  Store,
  Tag,
  UserCog,
  Users,
} from "lucide-react";

import { peut, roleLePlusEleve, LIBELLES_ROLE } from "@/lib/autorisations";
import { useAutorisations } from "@/lib/useAutorisations";

const ONGLETS = [
  { to: "/admin", label: "Vue d'ensemble", icone: LayoutDashboard, exact: true, permission: null },
  {
    to: "/admin/moderation",
    label: "Modération",
    icone: Copy,
    exact: false,
    permission: "validation_lieux",
  },
  {
    to: "/admin/signalements",
    label: "Signalements",
    icone: Flag,
    exact: false,
    permission: "etablissements",
  },
  {
    to: "/admin/revendications",
    label: "Revendications",
    icone: Store,
    exact: false,
    permission: "professionnels",
  },
  {
    to: "/admin/moderateurs",
    label: "Modérateurs",
    icone: Users,
    exact: false,
    permission: "moderateurs",
  },
  {
    to: "/admin/assignations",
    label: "Attributions",
    icone: MapPinned,
    exact: false,
    permission: "moderateurs",
  },
  { to: "/admin/comptes", label: "Comptes", icone: UserCog, exact: false, permission: "comptes" },
  {
    to: "/admin/activite",
    label: "Activité",
    icone: History,
    exact: false,
    permission: "activite",
  },
  {
    to: "/admin/categories",
    label: "Catégories",
    icone: Tag,
    exact: false,
    permission: "parametres",
  },
  { to: "/admin/gardes", label: "Garde", icone: ShieldCheck, exact: false, permission: "parametres" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { autorisations } = useAutorisations();
  const role = roleLePlusEleve(autorisations);

  const onglets = ONGLETS.filter((o) => !o.permission || peut(autorisations, o.permission));

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-admin-chrome text-admin-chrome-foreground">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-admin-primary text-xs font-bold text-admin-primary-foreground">
              U
            </span>
            <p className="font-display text-sm font-semibold tracking-tight">UPK Admin</p>
            {role ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium">
                {LIBELLES_ROLE[role]}
              </span>
            ) : null}
          </div>
          <Link
            to="/"
            className="text-xs font-medium text-admin-chrome-foreground/70 hover:text-admin-chrome-foreground"
          >
            Retour au site →
          </Link>
        </div>
        <nav aria-label="Sections admin" className="mx-auto max-w-2xl overflow-x-auto px-4 pb-2">
          <ul className="flex w-max gap-1">
            {onglets.map((onglet) => {
              const actif = onglet.exact ? pathname === onglet.to : pathname.startsWith(onglet.to);
              const Icone = onglet.icone;
              return (
                <li key={onglet.to}>
                  <Link
                    to={onglet.to}
                    className={
                      actif
                        ? "flex items-center gap-1.5 rounded-full bg-admin-primary px-3 py-1.5 text-xs font-medium text-admin-primary-foreground"
                        : "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-admin-chrome-foreground/70 hover:bg-white/10 hover:text-admin-chrome-foreground"
                    }
                  >
                    <Icone className="size-3.5" aria-hidden />
                    {onglet.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-5 pb-16">{children}</main>
    </div>
  );
}

export function StatCarte({
  icone: Icone,
  valeur,
  libelle,
  couleur = "neutre",
}: {
  icone: React.ComponentType<{ className?: string }>;
  valeur: number;
  libelle: string;
  couleur?: "neutre" | "attention" | "succes" | "alerte";
}) {
  const styles = {
    neutre: "bg-admin-primary-soft text-admin-primary",
    attention: "bg-[oklch(0.94_0.06_75)] text-[oklch(0.55_0.15_65)]",
    succes: "bg-[oklch(0.93_0.05_165)] text-[oklch(0.5_0.11_165)]",
    alerte: "bg-destructive/10 text-destructive",
  } as const;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span
        className={`inline-flex size-9 items-center justify-center rounded-lg ${styles[couleur]}`}
      >
        <Icone className="size-4.5" />
      </span>
      <p className="mt-3 text-2xl font-bold text-card-foreground">{valeur}</p>
      <p className="text-xs text-muted-foreground">{libelle}</p>
    </div>
  );
}
