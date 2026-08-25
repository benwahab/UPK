import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { CarteLieu } from "@/components/upk/CarteLieu";
import { listerMesFavoris } from "@/lib/favoris.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/mes-favoris")({
  head: () => ({ meta: [{ title: "Mes favoris — UPK" }] }),
  component: PageMesFavoris,
});

function PageMesFavoris() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const chercherFavoris = useServerFn(listerMesFavoris);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const favoris = useQuery({
    queryKey: ["mes-favoris"],
    queryFn: () => chercherFavoris(),
    enabled: !!utilisateur,
  });

  if (chargement || !utilisateur) return null;

  const liste = favoris.data ?? [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">Mes favoris</h1>

      <section className="mt-5 space-y-3" aria-live="polite">
        {favoris.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : liste.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucun favori pour l'instant. Touchez le cœur sur une fiche pour l'ajouter ici.
          </p>
        ) : (
          liste.map((lieu) => <CarteLieu key={lieu.id} lieu={lieu} />)
        )}
      </section>
    </main>
  );
}
