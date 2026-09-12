import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { AdminShell } from "@/components/upk/AdminShell";
import { Button } from "@/components/ui/button";
import {
  approuverRevendication,
  listerRevendications,
  rejeterRevendication,
} from "@/lib/revendications.functions";
import { estAdmin } from "@/lib/moderateurs.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/admin/revendications")({
  head: () => ({ meta: [{ title: "Revendications — UPK Admin" }] }),
  component: PageRevendications,
});

function PageRevendications() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const queryClient = useQueryClient();
  const verifierRole = useServerFn(estAdmin);
  const chercherRevendications = useServerFn(listerRevendications);
  const approuver = useServerFn(approuverRevendication);
  const rejeterClaim = useServerFn(rejeterRevendication);

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

  const revendications = useQuery({
    queryKey: ["revendications"],
    queryFn: () => chercherRevendications(),
    enabled: role.data === true,
  });

  async function onApprouver(id: string) {
    await approuver({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["revendications"] });
  }

  async function onRejeter(id: string) {
    await rejeterClaim({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["revendications"] });
  }

  if (chargement || !utilisateur || role.isPending || role.data !== true) {
    return (
      <AdminShell>
        <p className="py-16 text-center text-sm text-muted-foreground">Chargement…</p>
      </AdminShell>
    );
  }

  const liste = revendications.data ?? [];

  return (
    <AdminShell>
      <h1 className="font-display text-xl font-semibold text-foreground">Revendications</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {liste.length} demande{liste.length > 1 ? "s" : ""} en attente.
      </p>

      <section className="mt-5 space-y-3" aria-live="polite">
        {revendications.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : liste.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucune revendication en attente.
          </p>
        ) : (
          liste.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium text-card-foreground">{r.places?.nom ?? "Lieu supprimé"}</p>
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
                  onClick={() => onApprouver(r.id)}
                >
                  Approuver
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onRejeter(r.id)}
                >
                  Rejeter
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </AdminShell>
  );
}
