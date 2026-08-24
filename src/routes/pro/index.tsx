import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { useEffect } from "react";

import { BadgeVerification } from "@/components/upk/BadgeVerification";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listerMesLieux } from "@/lib/business.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/pro/")({
  head: () => ({ meta: [{ title: "Mes établissements — UPK Business" }] }),
  component: PageDashboardPro,
});

function PageDashboardPro() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const chercherMesLieux = useServerFn(listerMesLieux);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const mesLieux = useQuery({
    queryKey: ["mes-lieux", utilisateur?.id],
    queryFn: () => chercherMesLieux(),
    enabled: !!utilisateur,
  });

  if (chargement || !utilisateur) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  const lieux = mesLieux.data ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Accueil
        </Link>
      </div>
      <div className="flex items-center justify-between pt-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            UPK Business
          </p>
          <h1 className="font-display text-xl font-semibold text-foreground">Mes établissements</h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
        >
          Déconnexion
        </Button>
      </div>

      <Button asChild variant="terrain" className="mt-5 w-full">
        <Link to="/pro/nouveau">
          <Plus className="size-4" aria-hidden />
          Ajouter un établissement
        </Link>
      </Button>

      <section className="mt-6 space-y-3" aria-live="polite">
        {mesLieux.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : lieux.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Vous n'avez pas encore d'établissement. Ajoutez-en un pour apparaître dans la recherche
            UPK.
          </p>
        ) : (
          lieux.map((lieu) => (
            <Link
              key={lieu.id}
              to="/pro/$id"
              params={{ id: lieu.id }}
              className="block rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-card-foreground">{lieu.nom}</p>
                  <p className="text-sm text-muted-foreground">
                    {lieu.categorie_nom}
                    {lieu.quartier ? ` · ${lieu.quartier}` : ""}
                  </p>
                </div>
                <BadgeVerification statut={lieu.statut_verification} />
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
