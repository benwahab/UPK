import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { useEffect } from "react";

import { listerMesAlertes, supprimerAlerte } from "@/lib/alertes.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/mes-alertes")({
  head: () => ({ meta: [{ title: "Mes alertes — UPK" }] }),
  component: PageMesAlertes,
});

function PageMesAlertes() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const chercherAlertes = useServerFn(listerMesAlertes);
  const supprimer = useServerFn(supprimerAlerte);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const alertes = useQuery({
    queryKey: ["mes-alertes"],
    queryFn: () => chercherAlertes(),
    enabled: !!utilisateur,
  });

  async function onSupprimer(id: string) {
    await supprimer({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["mes-alertes"] });
  }

  if (chargement || !utilisateur) return null;

  const liste = alertes.data ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">Mes alertes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Médicaments en rupture que vous surveillez. Revenez ici pour voir s'ils sont disponibles.
      </p>

      <section className="mt-5 space-y-3" aria-live="polite">
        {alertes.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : liste.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucune alerte pour l'instant.
          </p>
        ) : (
          liste.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-card-foreground">
                    {a.medicaments?.nom_commercial ?? "Médicament supprimé"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {a.places?.nom}
                    {a.places?.quartier ? ` · ${a.places.quartier}` : ""}
                  </p>
                  <p className={a.notifie ? "mt-1 text-xs text-primary" : "mt-1 text-xs text-muted-foreground"}>
                    {a.notifie ? "✓ Disponible maintenant !" : "En attente de disponibilité"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSupprimer(a.id)}
                  aria-label="Supprimer cette alerte"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              {a.places ? (
                <Link
                  to="/lieu/$id"
                  params={{ id: a.places.id }}
                  className="mt-2 inline-block text-sm font-medium text-primary"
                >
                  Voir la pharmacie
                </Link>
              ) : null}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
