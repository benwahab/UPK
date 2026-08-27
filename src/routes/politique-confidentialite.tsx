import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/politique-confidentialite")({
  head: () => ({ meta: [{ title: "Politique de confidentialité — UPK" }] }),
  component: PagePolitique,
});

function PagePolitique() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
        Politique de confidentialité
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">Dernière mise à jour : août 2026</p>

      <div className="mt-5 space-y-5 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-semibold text-foreground">1. Ce que nous collectons</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              <span className="text-foreground">Compte</span> : email et mot de passe (le mot de
              passe n'est jamais stocké en clair), nom si vous le renseignez.
            </li>
            <li>
              <span className="text-foreground">Position</span> : uniquement si vous autorisez la
              géolocalisation de votre navigateur, pour trier les résultats par proximité. Jamais
              enregistrée, utilisée uniquement le temps de la recherche.
            </li>
            <li>
              <span className="text-foreground">Contenu que vous ajoutez</span> : fiches
              d'établissement, photos, avis, signalements, favoris, alertes.
            </li>
            <li>
              <span className="text-foreground">Statistiques d'usage</span> : pour les propriétaires
              d'établissement, un nombre de vues/appels/itinéraires générés par leur fiche — jamais
              qui a cliqué, seulement combien.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">2. Ce que nous ne faisons pas</h2>
          <p className="mt-2 text-muted-foreground">
            Nous ne vendons aucune donnée personnelle à des tiers. Nous n'utilisons pas vos données
            pour de la publicité ciblée. UPK n'affiche aucune publicité.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">3. Pourquoi nous les collectons</h2>
          <p className="mt-2 text-muted-foreground">
            Uniquement pour faire fonctionner le service : afficher les résultats les plus proches,
            permettre à un établissement de gérer sa fiche, vous prévenir quand un médicament
            redevient disponible, retrouver vos favoris.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">4. Vos droits</h2>
          <p className="mt-2 text-muted-foreground">
            Vous pouvez à tout moment demander la suppression de votre compte et des données
            associées en nous écrivant (voir la page Contact). Les fiches d'établissement restent
            visibles pour les autres utilisateurs tant qu'elles sont d'intérêt public, même après
            suppression du compte propriétaire.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">5. Questions</h2>
          <p className="mt-2 text-muted-foreground">
            Pour toute question sur cette politique, contactez-nous à{" "}
            <a href="mailto:universpk1@gmail.com" className="text-primary">
              universpk1@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
