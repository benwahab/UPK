import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock, Globe, MapPin, MessageCircle, Navigation, Phone, Pill } from "lucide-react";

import { BadgeVerification } from "@/components/upk/BadgeVerification";
import { SignalerProbleme } from "@/components/upk/SignalerProbleme";
import { Button } from "@/components/ui/button";
import { listerMedicamentsDuLieu, obtenirLieu } from "@/lib/places.functions";
import { lienItineraire, lienWhatsapp, telAffiche } from "@/lib/upk";

const optionsLieu = (id: string) =>
  queryOptions({
    queryKey: ["lieu", id],
    queryFn: async () => {
      const lieu = await obtenirLieu({ data: { id } });
      if (!lieu) throw notFound();
      return lieu;
    },
  });

export const Route = createFileRoute("/lieu/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(optionsLieu(params.id)),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Lieu indisponible — UPK" }, { name: "robots", content: "noindex" }],
      };
    }
    const titre = `${loaderData.nom} — ${loaderData.categorie_nom ?? "Lieu"} à ${loaderData.quartier ?? "Niamey"} | UPK`;
    const description =
      loaderData.description ??
      `Adresse, horaires et contact de ${loaderData.nom} au Niger, sur UPK.`;
    return {
      meta: [
        { title: titre },
        { name: "description", content: description },
        { property: "og:title", content: titre },
        { property: "og:description", content: description },
      ],
    };
  },
  component: PageLieu,
  errorComponent: () => (
    <Message titre="Cette fiche n'a pas pu être chargée" texte="Réessayez dans un instant." />
  ),
  notFoundComponent: () => (
    <Message titre="Lieu introuvable" texte="Ce lieu n'existe pas ou n'est plus référencé." />
  ),
});

function Message({ titre, texte }: { titre: string; texte: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold">{titre}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{texte}</p>
      <Button asChild variant="terrain" className="mt-6">
        <Link to="/">Retour à la recherche</Link>
      </Button>
    </main>
  );
}

function PageLieu() {
  const { id } = Route.useParams();
  const { data: lieu } = useSuspenseQuery(optionsLieu(id));
  const estPharmacie = lieu.categorie_slug === "pharmacie";

  const medicaments = useQuery({
    queryKey: ["medicaments-lieu", id],
    queryFn: () => listerMedicamentsDuLieu({ data: { placeId: id } }),
    enabled: estPharmacie,
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Retour à la recherche
        </Link>
      </div>

      <header className="mt-4">
        <p className="text-sm font-medium text-muted-foreground">
          {lieu.categorie_nom ?? "Lieu"}
          {lieu.quartier ? ` · ${lieu.quartier}` : ""}
        </p>
        <h1 className="mt-1 font-display text-2xl leading-tight font-bold text-foreground">
          {lieu.nom}
        </h1>
        <div className="mt-3">
          <BadgeVerification statut={lieu.statut_verification} avecAide />
        </div>
      </header>

      {lieu.description ? (
        <p className="mt-4 text-sm leading-relaxed text-foreground">{lieu.description}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="terrain" className="flex-1">
          <a href={lienItineraire(lieu.latitude, lieu.longitude)} target="_blank" rel="noreferrer">
            <Navigation className="size-4" aria-hidden />
            Itinéraire
          </a>
        </Button>
        {lieu.telephone ? (
          <Button asChild variant="outline" className="flex-1">
            <a href={`tel:${lieu.telephone}`}>
              <Phone className="size-4" aria-hidden />
              Appeler
            </a>
          </Button>
        ) : null}
      </div>

      <dl className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4">
        <Ligne icone={<MapPin className="size-4" aria-hidden />} intitule="Adresse">
          {[lieu.adresse, lieu.quartier].filter(Boolean).join(" · ") || "Non renseignée"}
        </Ligne>
        <Ligne icone={<Clock className="size-4" aria-hidden />} intitule="Horaires">
          {lieu.horaires ?? "Non renseignés"}
        </Ligne>
        <Ligne icone={<Phone className="size-4" aria-hidden />} intitule="Téléphone">
          {lieu.telephone ? (
            <a href={`tel:${lieu.telephone}`} className="text-primary">
              {telAffiche(lieu.telephone)}
            </a>
          ) : (
            "Non renseigné"
          )}
        </Ligne>
        <Ligne icone={<MessageCircle className="size-4" aria-hidden />} intitule="WhatsApp">
          {lieu.whatsapp ? (
            <a
              href={lienWhatsapp(lieu.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="text-primary"
            >
              Écrire sur WhatsApp
            </a>
          ) : (
            "Non renseigné"
          )}
        </Ligne>
        <Ligne icone={<Globe className="size-4" aria-hidden />} intitule="Site web">
          {lieu.site_web ? (
            <a href={lieu.site_web} target="_blank" rel="noreferrer" className="text-primary">
              {lieu.site_web.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            "Non renseigné"
          )}
        </Ligne>
      </dl>

      {estPharmacie ? (
        <section className="mt-6">
          <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
            <Pill className="size-4" aria-hidden />
            Médicaments disponibles
          </h2>
          {medicaments.isPending ? (
            <p className="mt-2 text-sm text-muted-foreground">Chargement…</p>
          ) : (medicaments.data ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Aucun médicament renseigné pour l'instant par cette pharmacie.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(medicaments.data ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {m.nom_commercial}
                      {m.dosage ? ` — ${m.dosage}` : ""}
                    </p>
                    {m.molecule ? (
                      <p className="text-xs text-muted-foreground">{m.molecule}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    {m.prix_vente ? (
                      <p className="text-sm font-medium text-card-foreground">
                        {m.prix_vente} FCFA
                      </p>
                    ) : null}
                    <p className={m.disponible ? "text-xs text-primary" : "text-xs text-destructive"}>
                      {m.disponible ? "Disponible" : "Rupture"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {lieu.photos.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-display text-lg font-semibold">Photos</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {lieu.photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt={`Photo de ${lieu.nom}`}
                loading="lazy"
                decoding="async"
                className="aspect-4/3 w-full rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6 border-t border-border pt-4">
        <SignalerProbleme placeId={lieu.id} />
      </div>
    </main>
  );
}

function Ligne({
  icone,
  intitule,
  children,
}: {
  icone: React.ReactNode;
  intitule: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted-foreground">{icone}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {intitule}
        </dt>
        <dd className="text-sm break-words text-card-foreground">{children}</dd>
      </div>
    </div>
  );
}
