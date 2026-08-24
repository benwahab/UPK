import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { FormulaireLieu, type ValeursFormulaireLieu } from "@/components/upk/FormulaireLieu";
import { proposerLieu } from "@/lib/moderation.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/proposer")({
  head: () => ({ meta: [{ title: "Proposer un lieu — UPK" }] }),
  component: PageProposerLieu,
});

function PageProposerLieu() {
  const { utilisateur, chargement } = useSession();
  const proposer = useServerFn(proposerLieu);
  const [envoye, setEnvoye] = useState(false);

  if (chargement) return null;

  if (!utilisateur) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Proposer un lieu</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connectez-vous pour proposer un lieu — ça évite les faux ajouts et permet de vous
          recontacter si besoin.
        </p>
        <Link
          to="/connexion"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  if (envoye) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Merci !</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre proposition a été enregistrée avec le statut « À vérifier ». Elle sera visible
          dans la recherche dès maintenant, et confirmée après relecture.
        </p>
        <Link to="/" className="mt-4 text-sm font-medium text-primary">
          ← Retour à la recherche
        </Link>
      </main>
    );
  }

  async function onEnregistrer(valeurs: ValeursFormulaireLieu) {
    await proposer({
      data: {
        nom: valeurs.nom,
        description: valeurs.description || null,
        categorieId: valeurs.categorieId,
        adresse: valeurs.adresse || null,
        quartier: valeurs.quartier || null,
        latitude: valeurs.latitude as number,
        longitude: valeurs.longitude as number,
        telephone: valeurs.telephone || null,
        whatsapp: valeurs.whatsapp || null,
        horaires: valeurs.horaires || null,
        siteWeb: valeurs.siteWeb || null,
      },
    });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Retour à la recherche
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">Proposer un lieu</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Un lieu que vous connaissez mais qui n'est pas encore sur UPK ? Ajoutez-le — il sera
        visible avec le statut « À vérifier » le temps qu'un modérateur le confirme.
      </p>
      <FormulaireLieu
        onEnregistrer={onEnregistrer}
        libelleBouton="Proposer ce lieu"
        apresEnregistrement={() => setEnvoye(true)}
      />
    </main>
  );
}
