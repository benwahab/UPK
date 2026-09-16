import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";

import { CarteTacheAssignee } from "@/components/upk/CarteTacheAssignee";
import {
  mesLieuxAssignes,
  mesStatistiquesModeration,
  rejeterAssignation,
  validerAssignation,
  type LieuAssigne,
} from "@/lib/assignations.functions";
import { monStatutModeration } from "@/lib/moderateurs.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/pro/moderation")({
  head: () => ({ meta: [{ title: "Mes lieux à vérifier — UPK" }] }),
  component: PageModerationPro,
});

function PageModerationPro() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const chercherStatut = useServerFn(monStatutModeration);
  const chercherMesLieux = useServerFn(mesLieuxAssignes);
  const chercherMesStats = useServerFn(mesStatistiquesModeration);
  const valider = useServerFn(validerAssignation);
  const rejeter = useServerFn(rejeterAssignation);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const statut = useQuery({
    queryKey: ["mon-statut-moderation", utilisateur?.id],
    queryFn: () => chercherStatut(),
    enabled: !!utilisateur,
  });

  useEffect(() => {
    if (statut.data && statut.data.role !== "moderator" && statut.data.role !== "admin") {
      navigate({ to: "/pro" });
    }
  }, [statut.data, navigate]);

  const autorise = statut.data?.role === "moderator" || statut.data?.role === "admin";

  const lieux = useQuery({
    queryKey: ["mes-lieux-assignes", utilisateur?.id],
    queryFn: () => chercherMesLieux(),
    enabled: autorise,
  });

  const mesStats = useQuery({
    queryKey: ["mes-stats-moderation", utilisateur?.id],
    queryFn: () => chercherMesStats(),
    enabled: autorise,
  });

  async function onValider(assignationId: string, coords: { latitude: number; longitude: number }) {
    await valider({ data: { assignationId, ...coords } });
    queryClient.invalidateQueries({ queryKey: ["mes-lieux-assignes"] });
    queryClient.invalidateQueries({ queryKey: ["mes-stats-moderation"] });
  }

  async function onRejeter(
    assignationId: string,
    donnees: { motif: string; latitudeCorrigee: number; longitudeCorrigee: number },
  ) {
    await rejeter({ data: { assignationId, ...donnees } });
    queryClient.invalidateQueries({ queryKey: ["mes-lieux-assignes"] });
    queryClient.invalidateQueries({ queryKey: ["mes-stats-moderation"] });
  }

  if (chargement || !utilisateur || statut.isPending || !autorise) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  const mesLieux = (lieux.data ?? []) as LieuAssigne[];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="flex items-center gap-3 pt-6">
        <Link to="/pro" className="text-sm font-medium text-primary">
          ← Espace pro
        </Link>
        <Link to="/" className="text-sm font-medium text-muted-foreground">
          Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
        Mes lieux à vérifier
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mesLieux.length} lieu{mesLieux.length > 1 ? "x" : ""} à vérifier.
      </p>

      {mesStats.data ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          Vous avez traité {mesStats.data.validations + mesStats.data.rejets} lieu
          {mesStats.data.validations + mesStats.data.rejets > 1 ? "x" : ""} au total (
          {mesStats.data.validations} validé{mesStats.data.validations > 1 ? "s" : ""},{" "}
          {mesStats.data.rejets} rejeté{mesStats.data.rejets > 1 ? "s" : ""}).
        </div>
      ) : null}

      <section className="mt-5 space-y-3" aria-live="polite">
        {lieux.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : mesLieux.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucun lieu ne vous est attribué pour l'instant. Votre responsable vous en affectera un
            groupe dès qu'il en aura sélectionné un.
          </p>
        ) : (
          mesLieux.map((lieu) => (
            <CarteTacheAssignee
              key={lieu.assignation_id}
              lieu={lieu}
              onValider={(coords) => onValider(lieu.assignation_id, coords)}
              onRejeter={(donnees) => onRejeter(lieu.assignation_id, donnees)}
            />
          ))
        )}
      </section>
    </main>
  );
}
