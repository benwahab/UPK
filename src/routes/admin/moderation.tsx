import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { AdminShell } from "@/components/upk/AdminShell";
import { CarteLieuAVerifier } from "@/components/upk/CarteLieuAVerifier";
import { listerFileAttente, rejeterLieu, validerLieu } from "@/lib/moderation.functions";
import { detecterDoublons, fusionnerLieux } from "@/lib/signalements.functions";
import { estAdmin } from "@/lib/moderateurs.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/moderation")({
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
  const detecter = useServerFn(detecterDoublons);
  const fusionner = useServerFn(fusionnerLieux);

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

  const file = useQuery({
    queryKey: ["file-attente"],
    queryFn: () => chercherFile(),
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

  async function onFusionnerLieux(garderId: string, retirerId: string) {
    if (
      !window.confirm(
        "Fusionner ces deux fiches ? Le doublon sera désactivé, son contenu réattaché à celle-ci.",
      )
    )
      return;
    await fusionner({ data: { garderId, retirerId } });
    queryClient.invalidateQueries({ queryKey: ["file-attente"] });
  }

  if (chargement || !utilisateur || role.isPending || role.data !== true) {
    return (
      <AdminShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>
      </AdminShell>
    );
  }

  const lieux = file.data ?? [];

  return (
    <AdminShell>
      <h1 className="font-display text-xl font-semibold text-foreground">
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
              onFusionner={(idPerdant) => onFusionnerLieux(lieu.id, idPerdant)}
            />
          ))
        )}
      </section>
    </AdminShell>
  );
}
