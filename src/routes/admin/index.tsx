import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Flag,
  LayoutGrid,
  LoaderCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { useEffect } from "react";

import { AdminShell, StatCarte } from "@/components/upk/AdminShell";
import { estAdmin, obtenirStatistiquesAdmin } from "@/lib/moderateurs.functions";
import {
  demarrerImportOsmNational,
  listerImportsOsm,
  relancerBatchOsm,
} from "@/lib/osm-import.functions";
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

type ImportBatch = { id: string; region_slug: string; status: string; attempt: number };
type ImportJob = {
  id: string;
  created_at: string;
  status: string;
  places_upserted: number;
  places_failed: number;
  osm_import_batches: ImportBatch[];
};

function PageDashboard() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const verifierRole = useServerFn(estAdmin);
  const chercherStats = useServerFn(obtenirStatistiquesAdmin);
  const chercherImports = useServerFn(listerImportsOsm);
  const demarrerImport = useServerFn(demarrerImportOsmNational);
  const relancerBatch = useServerFn(relancerBatchOsm);
  const queryClient = useQueryClient();

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
  const imports = useQuery({
    queryKey: ["osm-imports"],
    queryFn: () => chercherImports(),
    enabled: role.data === true,
  });
  const demarrage = useMutation({
    mutationFn: () => demarrerImport(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["osm-imports"] }),
  });
  const relance = useMutation({
    mutationFn: (batchId: string) => relancerBatch({ data: { batchId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["osm-imports"] }),
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

      <section className="mt-8 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-card-foreground">Import national OSM</h2>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Lance les huit régions par batches suivis et réessayables. Aucun import n’est lancé
              automatiquement.
            </p>
          </div>
          <button
            type="button"
            onClick={() => demarrage.mutate()}
            disabled={demarrage.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-admin-primary px-3 text-xs font-medium text-white disabled:opacity-60"
          >
            {demarrage.isPending ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Démarrer les 8 régions
          </button>
        </div>
        {demarrage.error ? (
          <p className="mt-3 text-xs text-destructive">{demarrage.error.message}</p>
        ) : null}
        <div className="mt-4 space-y-2">
          {(imports.data ?? []).map((job: ImportJob) => (
            <div key={job.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-card-foreground">
                  Job du {new Date(job.created_at).toLocaleString("fr-FR")}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {job.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {job.places_upserted ?? 0} lieux importés · {job.places_failed ?? 0} batches échoués
              </p>
              {(job.osm_import_batches ?? [])
                .filter((batch) => batch.status === "failed")
                .map((batch) => (
                  <div
                    key={batch.id}
                    className="mt-2 flex items-center justify-between gap-2 rounded-md bg-destructive/5 px-2 py-1.5"
                  >
                    <span className="text-[11px] text-destructive">
                      {batch.region_slug} · tentative {batch.attempt}
                    </span>
                    <button
                      type="button"
                      onClick={() => relance.mutate(batch.id)}
                      disabled={relance.isPending}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-admin-primary disabled:opacity-60"
                    >
                      <RotateCcw className="size-3" /> Réessayer
                    </button>
                  </div>
                ))}
            </div>
          ))}
          {imports.isPending ? (
            <p className="text-xs text-muted-foreground">Chargement des imports…</p>
          ) : null}
          {!imports.isPending && (imports.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun import national enregistré.</p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
