import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/conditions-utilisation")({
  head: () => ({ meta: [{ title: "Conditions d'utilisation — UPK" }] }),
  component: PageConditions,
});

function PageConditions() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
        Conditions d'utilisation
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">Dernière mise à jour : août 2026</p>

      <div className="mt-5 space-y-5 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-semibold text-foreground">1. Le service</h2>
          <p className="mt-2 text-muted-foreground">
            UPK est un moteur de recherche local qui répertorie des lieux et établissements au
            Niger. L'accès à la recherche ne nécessite pas de compte ; certaines fonctionnalités
            (gérer un établissement, proposer un lieu, favoris, alertes) demandent la création
            d'un compte.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">2. Exactitude des informations</h2>
          <p className="mt-2 text-muted-foreground">
            Les informations affichées (horaires, disponibilité, prix, position) proviennent des
            établissements eux-mêmes ou de contributions d'utilisateurs, et peuvent contenir des
            erreurs ou être obsolètes. Chaque fiche affiche un niveau de vérification (🟢 vérifié,
            🔵 source fiable, 🟡 à vérifier). Nous encourageons à confirmer une information
            importante directement auprès de l'établissement avant de se déplacer.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">3. Contenu que vous publiez</h2>
          <p className="mt-2 text-muted-foreground">
            En créant une fiche, en proposant un lieu ou en signalant un problème, vous garantissez
            que les informations fournies sont exactes à votre connaissance et ne portent pas
            atteinte aux droits d'un tiers. UPK se réserve le droit de modifier, suspendre ou
            supprimer tout contenu inexact, frauduleux ou inapproprié, avec ou sans préavis.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">4. Revendication d'un établissement</h2>
          <p className="mt-2 text-muted-foreground">
            Toute demande de revendication de fiche est vérifiée par une équipe de modération
            avant d'être acceptée. Une revendication frauduleuse peut entraîner la suspension du
            compte.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">5. Limitation de responsabilité</h2>
          <p className="mt-2 text-muted-foreground">
            UPK met en relation des utilisateurs et des établissements mais n'est partie à aucune
            transaction entre eux. UPK ne peut être tenu responsable d'un préjudice résultant
            d'une information erronée fournie par un tiers, ou de l'indisponibilité temporaire du
            service.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">6. Évolution du service</h2>
          <p className="mt-2 text-muted-foreground">
            UPK est en développement actif. Ces conditions peuvent être mises à jour ; les
            changements importants seront indiqués sur cette page.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">7. Contact</h2>
          <p className="mt-2 text-muted-foreground">
            Pour toute question,{" "}
            <Link to="/contact" className="text-primary">
              contactez-nous
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
