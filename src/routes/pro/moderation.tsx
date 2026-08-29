import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";

import { CarteLieuAVerifier } from "@/components/upk/CarteLieuAVerifier";
import { listerFileAttente, rejeterLieu, validerLieu } from "@/lib/moderation.functions";
import { detecterDoublons } from "@/lib/signalements.functions";
import { mesStatistiquesModeration, monStatutModeration } from "@/lib/moderateurs.functions";
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
  const detecter = useServerFn(detecterDoublons);

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

  async function onValider(id: string, coords: { latitude: number; longitude: number }) {
    await valider({ data: { id, ...coords } });
    queryClient.invalidateQueries({ queryKey: ["file-attente"] });
    queryClient.invalidateQueries({ queryKey: ["mes-stats-moderation"] });
  }

  async function onRejeter(id: string, coords: { latitude: number; longitude: number }) {
    await rejeter({ data: { id, ...coords } });
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
    </main>
  );
}
