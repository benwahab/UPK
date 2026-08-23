import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { FormulaireLieu, type ValeursFormulaireLieu } from "@/components/upk/FormulaireLieu";
import { creerMonLieu } from "@/lib/business.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/pro/nouveau")({
  head: () => ({ meta: [{ title: "Ajouter un établissement — UPK Business" }] }),
  component: PageNouveauLieu,
});

function PageNouveauLieu() {
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const creer = useServerFn(creerMonLieu);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  if (chargement || !utilisateur) return null;

  async function onEnregistrer(valeurs: ValeursFormulaireLieu) {
    await creer({
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
        <Link to="/pro" className="text-sm font-medium text-primary">
          ← Mes établissements
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
        Ajouter un établissement
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Votre fiche sera visible immédiatement, avec le statut « À vérifier » jusqu'à
        validation.
      </p>
      <FormulaireLieu onEnregistrer={onEnregistrer} />
    </main>
  );
}
