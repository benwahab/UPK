import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Flag, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  estModerateur,
  listerFileAttente,
  rejeterLieu,
  validerLieu,
} from "@/lib/moderation.functions";
import { LIBELLES_TYPE_PROBLEME, listerSignalements, traiterSignalement } from "@/lib/signalements.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Modération — UPK Admin" }] }),
  component: PageModeration,
});

function PageModeration() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const verifierRole = useServerFn(estModerateur);
  const chercherFile = useServerFn(listerFileAttente);
  const valider = useServerFn(validerLieu);
  const rejeter = useServerFn(rejeterLieu);
  const chercherSignalements = useServerFn(listerSignalements);
  const traiter = useServerFn(traiterSignalement);

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

  async function onValider(id: string) {
    await valider({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["file-attente"] });
  }

  async function onRejeter(id: string) {
    await rejeter({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["file-attente"] });
  }

  async function onTraiterSignalement(id: string) {
    await traiter({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["signalements"] });
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
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Retour à la recherche
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
            <div key={lieu.id} className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium text-card-foreground">{lieu.nom}</p>
              <p className="text-sm text-muted-foreground">
                {lieu.categorie_nom}
                {lieu.quartier ? ` · ${lieu.quartier}` : ""}
              </p>
              {lieu.adresse ? (
                <p className="mt-1 text-xs text-muted-foreground">{lieu.adresse}</p>
              ) : null}
              {lieu.telephone ? (
                <p className="mt-1 text-xs text-muted-foreground">{lieu.telephone}</p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="terrain"
                  size="sm"
                  className="flex-1"
                  onClick={() => onValider(lieu.id)}
                >
                  <Check className="size-4" aria-hidden />
                  Valider
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onRejeter(lieu.id)}
                >
                  <X className="size-4" aria-hidden />
                  Rejeter
                </Button>
              </div>
            </div>
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
                <p className="font-medium text-card-foreground">{s.places?.nom ?? "Lieu supprimé"}</p>
                <p className="text-sm text-muted-foreground">{LIBELLES_TYPE_PROBLEME[s.type_probleme]}</p>
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
    </main>
  );
}
