import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Flag, LayoutGrid, ShieldCheck, Store, Users } from "lucide-react";
import { useEffect } from "react";

import { AdminShell, StatCarte } from "@/components/upk/AdminShell";
import { estAdmin, obtenirStatistiquesAdmin } from "@/lib/moderateurs.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Vue d'ensemble — UPK Admin" }] }),
  component: PageDashboard,
});

const RACCOURCIS = [
  { to: "/admin/moderation", label: "File de modération", icone: Copy },
  { to: "/admin/signalements", label: "Signalements", icone: Flag },
  { to: "/admin/revendications", label: "Revendications", icone: Store },
  { to: "/admin/moderateurs", label: "Modérateurs", icone: Users },
  { to: "/admin/categories", label: "Catégories", icone: LayoutGrid },
  { to: "/admin/gardes", label: "Groupes de garde", icone: ShieldCheck },
] as const;

function PageDashboard() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const verifierRole = useServerFn(estAdmin);
  const chercherStats = useServerFn(obtenirStatistiquesAdmin);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const role = useQuery({
    queryKey: ["est-admin", utilisateur?.id],
    queryFn: () => verifierRole(),
    enabled: !!utilisateur,
  });

  useEffect(() => {
    if (role.data === false) navigate({ to: "/" });
  }, [role.data, navigate]);

  const stats = useQuery({
    queryKey: ["stats-admin"],
    queryFn: () => chercherStats(),
    enabled: role.data === true,
  });

  if (chargement || !utilisateur || role.isPending || role.data !== true) {
    return (
      <AdminShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="font-display text-xl font-semibold text-foreground">Vue d'ensemble</h1>
      <p className="mt-1 text-sm text-muted-foreground">État actuel de la plateforme UPK.</p>

      {stats.isPending ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Chargement des chiffres…</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatCarte icone={Store} valeur={stats.data?.lieuxActifs ?? 0} libelle="Lieux actifs" />
          <StatCarte
            icone={Copy}
            valeur={stats.data?.aVerifier ?? 0}
            libelle="À vérifier"
            couleur="attention"
          />
          <StatCarte
            icone={Flag}
            valeur={stats.data?.signalementsOuverts ?? 0}
            libelle="Signalements ouverts"
            couleur="alerte"
          />
          <StatCarte
            icone={ShieldCheck}
            valeur={stats.data?.revendicationsEnAttente ?? 0}
            libelle="Revendications en attente"
            couleur="attention"
          />
          <StatCarte
            icone={Users}
            valeur={stats.data?.moderateursActifs ?? 0}
            libelle="Modérateurs actifs"
            couleur="succes"
          />
        </div>
      )}

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">Accès rapide</h2>
      <div className="mt-3 space-y-2">
        {RACCOURCIS.map((r) => {
          const Icone = r.icone;
          return (
            <Link
              key={r.to}
              to={r.to}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-admin-primary-soft text-admin-primary">
                <Icone className="size-4" aria-hidden />
              </span>
              <span className="text-sm font-medium text-card-foreground">{r.label}</span>
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}
