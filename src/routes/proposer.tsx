import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { EtapePhotosObligatoires } from "@/components/upk/EtapePhotosObligatoires";
import { FormulaireLieu, type ValeursFormulaireLieu } from "@/components/upk/FormulaireLieu";
import { ajouterPhotoProposition } from "@/lib/photos.functions";
import { proposerLieu } from "@/lib/moderation.functions";

export const Route = createFileRoute("/proposer")({
  head: () => ({ meta: [{ title: "Proposer un lieu — UPK" }] }),
  component: PageProposerLieu,
});

type Etape = "infos" | "photos" | "envoye";

function PageProposerLieu() {
  const proposer = useServerFn(proposerLieu);
  const ajouterPhoto = useServerFn(ajouterPhotoProposition);
  const [etape, setEtape] = useState<Etape>("infos");
  const [placeId, setPlaceId] = useState<string | null>(null);

  if (etape === "envoye") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">Merci !</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre proposition a été enregistrée avec le statut « À vérifier ». Elle sera visible dans
          la recherche dès maintenant, et confirmée après relecture des photos.
        </p>
        <Link to="/" className="mt-4 text-sm font-medium text-primary">
          ← Retour à la recherche
        </Link>
      </main>
    );
  }

  if (etape === "photos" && placeId) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
        <div className="pt-6">
          <Link to="/" className="text-sm font-medium text-primary">
            ← Retour à la recherche
          </Link>
        </div>
        <div className="mt-4">
          <EtapePhotosObligatoires
            placeId={placeId}
            ajouterPhoto={(params) => ajouterPhoto({ data: params })}
            onTerminer={() => setEtape("envoye")}
            libelleBouton="Envoyer la proposition"
          />
        </div>
      </main>
    );
  }

  async function onEnregistrer(valeurs: ValeursFormulaireLieu) {
    return proposer({
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
        Un lieu que vous connaissez mais qui n'est pas encore sur UPK ? Ajoutez-le — une photo sera
        ensuite demandée pour que la validation se fasse sans déplacement.
      </p>
      <FormulaireLieu
        onEnregistrer={onEnregistrer}
        libelleBouton="Continuer"
        apresEnregistrement={(id) => {
          setPlaceId(id);
          setEtape("photos");
        }}
      />
    </main>
  );
}
