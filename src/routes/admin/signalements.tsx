import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { AdminShell } from "@/components/upk/AdminShell";
import { Button } from "@/components/ui/button";
import {
  LIBELLES_TYPE_PROBLEME,
  listerSignalements,
  traiterSignalement,
} from "@/lib/signalements.functions";
import { estAdmin } from "@/lib/moderateurs.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/signalements")({
  head: () => ({ meta: [{ title: "Signalements — UPK Admin" }] }),
  component: PageSignalements,
});

function PageSignalements() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const verifierRole = useServerFn(estAdmin);
  const chercherSignalements = useServerFn(listerSignalements);
  const traiter = useServerFn(traiterSignalement);

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

  const signalements = useQuery({
    queryKey: ["signalements"],
    queryFn: () => chercherSignalements(),
    enabled: role.data === true,
  });

  async function onTraiter(id: string) {
    await traiter({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["signalements"] });
  }

  if (chargement || !utilisateur || role.isPending || role.data !== true) {
    return (
      <AdminShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>
      </AdminShell>
    );
  }

  const liste = signalements.data ?? [];

  return (
    <AdminShell>
      <h1 className="font-display text-xl font-semibold text-foreground">Signalements</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {liste.length} signalement{liste.length > 1 ? "s" : ""} non traité
        {liste.length > 1 ? "s" : ""}.
      </p>

      <section className="mt-5 space-y-3" aria-live="polite">
        {signalements.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : liste.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucun signalement en attente.
          </p>
        ) : (
          liste.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium text-card-foreground">{s.places?.nom ?? "Lieu supprimé"}</p>
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
                  onClick={() => onTraiter(s.id)}
                >
                  Marquer traité
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </AdminShell>
  );
}
