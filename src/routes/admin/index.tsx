import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Check, Copy, Flag, Shield, Store, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CarteLieuAVerifier } from "@/components/upk/CarteLieuAVerifier";
import { listerFileAttente, rejeterLieu, validerLieu } from "@/lib/moderation.functions";
import {
  LIBELLES_TYPE_PROBLEME,
  listerSignalements,
  traiterSignalement,
  detecterDoublons,
  type CandidatDoublon,
} from "@/lib/signalements.functions";
import {
  approuverRevendication,
  listerRevendications,
  rejeterRevendication,
} from "@/lib/revendications.functions";
import {
  approuverDemandeModeration,
  estAdmin,
  listerDemandesModeration,
  listerModerateurs,
  listerStatistiquesModerateurs,
  rejeterDemandeModeration,
  revoquerModerateur,
} from "@/lib/moderateurs.functions";
import type { Lieu } from "@/lib/upk";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Modération — UPK Admin" }] }),
  component: PageModeration,
});

function PageModeration() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const verifierRole = useServerFn(estAdmin);
  const chercherFile = useServerFn(listerFileAttente);
  const valider = useServerFn(validerLieu);
  const rejeter = useServerFn(rejeterLieu);
  const chercherSignalements = useServerFn(listerSignalements);
  const traiter = useServerFn(traiterSignalement);
  const chercherRevendications = useServerFn(listerRevendications);
  const detecter = useServerFn(detecterDoublons);
  const approuver = useServerFn(approuverRevendication);
  const rejeterClaim = useServerFn(rejeterRevendication);
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
    queryKey: ["est-moderateur", utilisateur?.id],
    queryFn: () => verifierRole(),
    enabled: !!utilisateur,
  });

  useEffect(() => {
    if (role.data === false) navigate({ to: "/" });
  }, [role.data, navigate]);

  const file = useQuery({
    queryKey: ["file-attente"],
    queryFn: () => chercherFile(),
    enabled: role.data === true,
  });

  const signalements = useQuery({
    queryKey: ["signalements"],
    queryFn: () => chercherSignalements(),
    enabled: role.data === true,
  });

  const revendications = useQuery({
    queryKey: ["revendications"],
    queryFn: () => chercherRevendications(),
    enabled: role.data === true,
  });

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

  async function onValider(id: string, coords: { latitude: number; longitude: number }) {
    await valider({ data: { id, ...coords } });
    queryClient.invalidateQueries({ queryKey: ["file-attente"] });
  }

  async function onRejeter(id: string, coords: { latitude: number; longitude: number }) {
    await rejeter({ data: { id, ...coords } });
    queryClient.invalidateQueries({ queryKey: ["file-attente"] });
  }

  async function onTraiterSignalement(id: string) {
    await traiter({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["signalements"] });
  }

  async function onApprouverRevendication(id: string) {
    await approuver({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["revendications"] });
  }

  async function onRejeterRevendication(id: string) {
    await rejeterClaim({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["revendications"] });
  }

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
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  const lieux = file.data ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="flex items-center justify-between pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Retour à la recherche
        </Link>
        <Link to="/admin/categories" className="text-sm font-medium text-muted-foreground">
          Gérer les catégories
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
        Modération — À vérifier
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {lieux.length} lieu{lieux.length > 1 ? "x" : ""} en attente de validation.
      </p>

      <section className="mt-5 space-y-3" aria-live="polite">
        {file.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : lieux.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Rien en attente. Tout est à jour.
          </p>
        ) : (
          lieux.map((lieu) => (
            <CarteLieuAVerifier
              key={lieu.id}
              lieu={lieu}
              onValider={(coords) => onValider(lieu.id, coords)}
              onRejeter={(coords) => onRejeter(lieu.id, coords)}
              chercherDoublons={(placeId) => detecter({ data: { placeId } })}
            />
          ))
        )}
      </section>

      <section className="mt-8" aria-live="polite">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
          <Flag className="size-4" aria-hidden />
          Signalements ({(signalements.data ?? []).length})
        </h2>
        <div className="mt-3 space-y-3">
          {signalements.isPending ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>
          ) : (signalements.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Aucun signalement en attente.
            </p>
          ) : (
            (signalements.data ?? []).map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                <p className="font-medium text-card-foreground">
                  {s.places?.nom ?? "Lieu supprimé"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {LIBELLES_TYPE_PROBLEME[s.type_probleme]}
                </p>
                {s.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/lieu/$id"
                    params={{ id: s.place_id }}
                    className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground"
                  >
                    Voir la fiche
                  </Link>
                  <Button
                    type="button"
                    variant="terrain"
                    size="sm"
                    className="flex-1"
                    onClick={() => onTraiterSignalement(s.id)}
                  >
                    Marquer traité
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8" aria-live="polite">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
          <Store className="size-4" aria-hidden />
          Revendications ({(revendications.data ?? []).length})
        </h2>
        <div className="mt-3 space-y-3">
          {revendications.isPending ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>
          ) : (revendications.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Aucune revendication en attente.
            </p>
          ) : (
            (revendications.data ?? []).map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <p className="font-medium text-card-foreground">
                  {r.places?.nom ?? "Lieu supprimé"}
                </p>
                <p className="text-sm text-muted-foreground">{r.places?.quartier}</p>
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/lieu/$id"
                    params={{ id: r.place_id }}
                    className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground"
                  >
                    Voir la fiche
                  </Link>
                  <Button
                    type="button"
                    variant="terrain"
                    size="sm"
                    className="flex-1"
                    onClick={() => onApprouverRevendication(r.id)}
                  >
                    <Check className="size-4" aria-hidden />
                    Approuver
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onRejeterRevendication(r.id)}
                  >
                    <X className="size-4" aria-hidden />
                    Rejeter
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8" aria-live="polite">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
          <Shield className="size-4" aria-hidden />
          Modérateurs
        </h2>

        <p className="mt-3 text-sm font-medium text-muted-foreground">
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

        <p className="mt-5 text-sm font-medium text-muted-foreground">
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

        <p className="mt-5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
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
      </section>
    </main>
  );
}
