import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import { FormulaireLieu, type ValeursFormulaireLieu } from "@/components/upk/FormulaireLieu";
import { modifierMonLieu, obtenirMonLieu } from "@/lib/business.functions";
import { useSession } from "@/lib/useSession";

export const Route = createFileRoute("/pro/$id")({
  head: () => ({ meta: [{ title: "Modifier mon établissement — UPK Business" }] }),
  component: PageModifierLieu,
});

function PageModifierLieu() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { utilisateur, chargement } = useSession();
  const chercherLieu = useServerFn(obtenirMonLieu);
  const modifier = useServerFn(modifierMonLieu);

  useEffect(() => {
    if (!chargement && !utilisateur) navigate({ to: "/connexion" });
  }, [chargement, utilisateur, navigate]);

  const lieu = useQuery({
    queryKey: ["mon-lieu", id],
    queryFn: () => chercherLieu({ data: { id } }),
    enabled: !!utilisateur,
  });

  if (chargement || !utilisateur || lieu.isPending) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Chargement…
      </main>
    );
  }

  if (!lieu.data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Cet établissement n'existe pas ou ne vous appartient pas.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link to="/pro" className="text-sm font-medium text-primary">
            ← Mes établissements
          </Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground">
            Accueil
          </Link>
        </div>
      </main>
    );
  }

  const valeursInitiales: ValeursFormulaireLieu = {
    nom: lieu.data.nom,
    description: lieu.data.description ?? "",
    categorieId: lieu.data.category_id ?? "",
    adresse: lieu.data.adresse ?? "",
    quartier: lieu.data.quartier ?? "",
    latitude: lieu.data.latitude,
    longitude: lieu.data.longitude,
    telephone: lieu.data.telephone ?? "",
    whatsapp: lieu.data.whatsapp ?? "",
    horaires: lieu.data.horaires ?? "",
    siteWeb: lieu.data.site_web ?? "",
  };

  async function onEnregistrer(valeurs: ValeursFormulaireLieu) {
    await modifier({
      data: {
        id,
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
      <div className="flex items-center gap-3 pt-6">
        <Link to="/pro" className="text-sm font-medium text-primary">
          ← Mes établissements
        </Link>
        <Link to="/" className="text-sm font-medium text-muted-foreground">
          Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">
        Modifier {lieu.data.nom}
      </h1>
      {(lieu.data as unknown as { categories: { slug: string } | null }).categories?.slug === "pharmacie" ? (
        <Link
          to="/pro/$id/pharmacie"
          params={{ id }}
          className="mt-3 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          Gérer mon stock et mes gardes
        </Link>
      ) : null}
      {(lieu.data as unknown as { categories: { slug: string } | null }).categories?.slug === "restaurant" ? (
        <Link
          to="/pro/$id/menu"
          params={{ id }}
          className="mt-3 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          Gérer mon menu
        </Link>
      ) : null}
      {(lieu.data as unknown as { categories: { slug: string } | null }).categories?.slug === "hotel" ? (
        <Link
          to="/pro/$id/chambres"
          params={{ id }}
          className="mt-3 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          Gérer mes chambres
        </Link>
      ) : null}
      <FormulaireLieu
        valeursInitiales={valeursInitiales}
        onEnregistrer={onEnregistrer}
        libelleBouton="Enregistrer les modifications"
      />
    </main>
  );
}
