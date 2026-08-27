import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/a-propos")({
  head: () => ({ meta: [{ title: "À propos — UPK" }] }),
  component: PageAPropos,
});

function PageAPropos() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">À propos d'UPK</h1>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-foreground">
        <p>
          UPK est un moteur de recherche local pour le Niger. Il aide à trouver rapidement un lieu,
          un établissement ou un service près de soi — pharmacie, restaurant, garage, hôtel, école,
          point géographique — en donnant la priorité à la proximité et à la pertinence, plutôt qu'à
          une recherche générale.
        </p>
        <p>
          UPK ne cherche pas à remplacer un moteur de recherche généraliste. Sa mission est plus
          ciblée : permettre à une personne de trouver, en quelques secondes, où se trouve ce dont
          elle a besoin, et d'agir immédiatement (appeler, obtenir un itinéraire, vérifier une
          disponibilité).
        </p>
        <p>
          La plateforme s'appuie sur plusieurs sources : les établissements qui créent et gèrent
          eux-mêmes leur fiche, les contributions des utilisateurs, et des données vérifiées par une
          équipe de modération avant d'être validées.
        </p>
        <p className="text-muted-foreground">
          UPK est un projet en développement actif. Des fonctionnalités supplémentaires sont
          ajoutées progressivement.
        </p>
      </div>
    </main>
  );
}
