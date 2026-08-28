import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { listerFileAttente, rejeterLieu, validerLieu } from "@/lib/moderation.functions";
import { detecterDoublons, type CandidatDoublon } from "@/lib/signalements.functions";
import { mesStatistiquesModeration, monStatutModeration } from "@/lib/moderateurs.functions";
import type { Lieu } from "@/lib/upk";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/pro/moderation")({
  head: () => ({ meta: [{ title: "Vérification des lieux — UPK" }] }),
  component: PageModerationPro,
});

function PageModerationPro() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const chercherStatut = useServerFn(monStatutModeration);
  const chercherFile = useServerFn(listerFileAttente);
  const chercherMesStats = useServerFn(mesStatistiquesModeration);
  const valider = useServerFn(validerLieu);
  const rejeter = useServerFn(rejeterLieu);

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

  const file = useQuery({
    queryKey: ["file-attente"],
    queryFn: () => chercherFile(),
    enabled: statut.data?.role === "moderator" || statut.data?.role === "admin",
  });

  const mesStats = useQuery({
    queryKey: ["mes-stats-moderation", utilisateur?.id],
    queryFn: () => chercherMesStats(),
    enabled: statut.data?.role === "moderator" || statut.data?.role === "admin",
  });

  async function onValider(id: string) {
    await valider({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["file-attente"] });
    queryClient.invalidateQueries({ queryKey: ["mes-stats-moderation"] });
  }

  async function onRejeter(id: string) {
    await rejeter({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["file-attente"] });
    queryClient.invalidateQueries({ queryKey: ["mes-stats-moderation"] });
  }

  const autorise = statut.data?.role === "moderator" || statut.data?.role === "admin";

  if (chargement || !utilisateur || statut.isPending || !autorise) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  const lieux = file.data ?? [];

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
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">Lieux à vérifier</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {lieux.length} lieu{lieux.length > 1 ? "x" : ""} en attente de validation.
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
        {file.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : lieux.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Rien en attente. Tout est à jour.
          </p>
        ) : (
          lieux.map((lieu) => (
            <CarteAVerifier
              key={lieu.id}
              lieu={lieu}
              onValider={() => onValider(lieu.id)}
              onRejeter={() => onRejeter(lieu.id)}
            />
          ))
        )}
      </section>
    </main>
  );
}

function CarteAVerifier({
  lieu,
  onValider,
  onRejeter,
}: {
  lieu: Lieu;
  onValider: () => void;
  onRejeter: () => void;
}) {
  const detecter = useServerFn(detecterDoublons);
  const [doublons, setDoublons] = useState<CandidatDoublon[] | null>(null);
  const [recherche, setRecherche] = useState(false);

  async function onVerifierDoublons() {
    setRecherche(true);
    try {
      setDoublons(await detecter({ data: { placeId: lieu.id } }));
    } finally {
      setRecherche(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-medium text-card-foreground">{lieu.nom}</p>
      <p className="text-sm text-muted-foreground">
        {lieu.categorie_nom}
        {lieu.quartier ? ` · ${lieu.quartier}` : ""}
      </p>
      {lieu.adresse ? <p className="mt-1 text-xs text-muted-foreground">{lieu.adresse}</p> : null}
      {lieu.telephone ? (
        <p className="mt-1 text-xs text-muted-foreground">{lieu.telephone}</p>
      ) : null}

      <Link
        to="/lieu/$id"
        params={{ id: lieu.id }}
        className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        Voir la fiche et les photos
      </Link>

      <div className="mt-3 flex gap-2">
        <Button type="button" variant="terrain" size="sm" className="flex-1" onClick={onValider}>
          <Check className="size-4" aria-hidden />
          Valider
        </Button>
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onRejeter}>
          <X className="size-4" aria-hidden />
          Rejeter
        </Button>
      </div>

      {doublons === null ? (
        <button
          type="button"
          onClick={onVerifierDoublons}
          disabled={recherche}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          <Copy className="size-3.5" aria-hidden />
          {recherche ? "Recherche…" : "Vérifier les doublons"}
        </button>
      ) : doublons.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Aucun doublon potentiel détecté.</p>
      ) : (
        <div className="mt-2 rounded-lg bg-secondary p-2.5">
          <p className="text-xs font-medium text-secondary-foreground">
            {doublons.length} doublon{doublons.length > 1 ? "s" : ""} potentiel
            {doublons.length > 1 ? "s" : ""} :
          </p>
          <ul className="mt-1 space-y-1">
            {doublons.map((d) => (
              <li key={d.place_id} className="text-xs text-muted-foreground">
                <Link
                  to="/lieu/$id"
                  params={{ id: d.place_id }}
                  className="underline-offset-2 hover:underline"
                >
                  {d.nom}
                </Link>
                {d.quartier ? ` · ${d.quartier}` : ""}
                {d.meme_telephone ? " · même téléphone" : ""}
                {d.distance_m !== null ? ` · ${d.distance_m}m` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
