import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Check, X } from "lucide-react";
import { useEffect } from "react";

import { AdminShell } from "@/components/upk/AdminShell";
import { Button } from "@/components/ui/button";
import {
  approuverDemandeModeration,
  estAdmin,
  listerDemandesModeration,
  listerModerateurs,
  listerStatistiquesModerateurs,
  rejeterDemandeModeration,
  revoquerModerateur,
} from "@/lib/moderateurs.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/moderateurs")({
  head: () => ({ meta: [{ title: "Modérateurs — UPK Admin" }] }),
  component: PageModerateurs,
});

function PageModerateurs() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const verifierRole = useServerFn(estAdmin);
  const chercherDemandes = useServerFn(listerDemandesModeration);
  const approuverDemande = useServerFn(approuverDemandeModeration);
  const rejeterDemande = useServerFn(rejeterDemandeModeration);
  const chercherModerateurs = useServerFn(listerModerateurs);
  const chercherStatsModerateurs = useServerFn(listerStatistiquesModerateurs);
  const revoquer = useServerFn(revoquerModerateur);

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

  const demandesModeration = useQuery({
    queryKey: ["demandes-moderation"],
    queryFn: () => chercherDemandes(),
    enabled: role.data === true,
  });

  const moderateurs = useQuery({
    queryKey: ["moderateurs"],
    queryFn: () => chercherModerateurs(),
    enabled: role.data === true,
  });

  const statsModerateurs = useQuery({
    queryKey: ["stats-moderateurs"],
    queryFn: () => chercherStatsModerateurs(),
    enabled: role.data === true,
  });

  async function onApprouverDemande(id: string) {
    await approuverDemande({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["demandes-moderation"] });
    queryClient.invalidateQueries({ queryKey: ["moderateurs"] });
  }

  async function onRejeterDemande(id: string) {
    await rejeterDemande({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["demandes-moderation"] });
  }

  async function onRevoquer(userId: string) {
    await revoquer({ data: { userId } });
    queryClient.invalidateQueries({ queryKey: ["moderateurs"] });
  }

  if (chargement || !utilisateur || role.isPending || role.data !== true) {
    return (
      <AdminShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="font-display text-xl font-semibold text-foreground">Modérateurs</h1>

      <p className="mt-5 text-sm font-medium text-muted-foreground">
        Demandes en attente ({(demandesModeration.data ?? []).length})
      </p>
      <div className="mt-2 space-y-2">
        {(demandesModeration.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Aucune demande en attente.
          </p>
        ) : (
          (demandesModeration.data ?? []).map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
            >
              <div>
                <p className="text-sm text-card-foreground">
                  {d.profiles?.prenom ?? ""} {d.profiles?.nom_complet ?? "Compte sans nom"}
                </p>
                {d.profiles?.telephone ? (
                  <p className="text-xs text-muted-foreground">{d.profiles.telephone}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="terrain"
                  size="sm"
                  onClick={() => onApprouverDemande(d.id)}
                >
                  <Check className="size-4" aria-hidden />
                  Approuver
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRejeterDemande(d.id)}
                >
                  <X className="size-4" aria-hidden />
                  Rejeter
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="mt-6 text-sm font-medium text-muted-foreground">
        Modérateurs actifs ({(moderateurs.data ?? []).length})
      </p>
      <div className="mt-2 space-y-2">
        {(moderateurs.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Aucun modérateur pour l'instant.
          </p>
        ) : (
          (moderateurs.data ?? []).map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
            >
              <div>
                <p className="text-sm text-card-foreground">
                  {m.prenom ?? ""} {m.nom_complet ?? "Compte sans nom"}
                </p>
                {m.telephone ? (
                  <p className="text-xs text-muted-foreground">{m.telephone}</p>
                ) : null}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onRevoquer(m.id)}>
                Retirer
              </Button>
            </div>
          ))
        )}
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <BarChart3 className="size-4" aria-hidden />
        Lieux traités par modérateur
      </p>
      {(statsModerateurs.data ?? []).length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
          Aucune action de modération enregistrée pour l'instant.
        </p>
      ) : (
        <div className="mt-2 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Modérateur</th>
                <th className="px-3 py-2 text-right font-medium">Validés</th>
                <th className="px-3 py-2 text-right font-medium">Rejetés</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(statsModerateurs.data ?? []).map((s) => (
                <tr key={s.moderateur_id} className="border-t border-border bg-card">
                  <td className="px-3 py-2 text-card-foreground">
                    {s.nom_complet ?? "Compte sans nom"}
                  </td>
                  <td className="px-3 py-2 text-right text-card-foreground">{s.validations}</td>
                  <td className="px-3 py-2 text-right text-card-foreground">{s.rejets}</td>
                  <td className="px-3 py-2 text-right font-medium text-card-foreground">
                    {s.validations + s.rejets}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
