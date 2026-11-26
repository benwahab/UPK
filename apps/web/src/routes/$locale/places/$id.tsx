import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { localeSchema, type Locale } from "@upk/domain";
import { t } from "@upk/i18n";
import { ReportForm } from "../../../components/report-form";
import { absoluteUrl } from "../../../lib/site";
import { getTrpcClient } from "../../../lib/trpc";
import { useDocumentTitle } from "../../../lib/use-document-title";
import { getPlace } from "../../../server/places";

export const Route = createFileRoute("/$locale/places/$id")({
  loader: ({ params }) => getPlace({ data: params.id }),
  head: ({ params, loaderData }) => {
    const place = loaderData;
    if (!place) return {};
    const locale = localeSchema.parse(params.locale);
    const title = `${place.nom} — ${t(locale, "app.name")}`;
    const description = `${place.categorieNom}${place.quartier ? ` · ${place.quartier}` : ""} — ${t(locale, "home.subtitle")}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: absoluteUrl(`/${locale}/places/${place.id}`) },
        { property: "og:image", content: absoluteUrl("/og-default.png") },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: absoluteUrl("/og-default.png") },
      ],
      links: [
        { rel: "canonical", href: absoluteUrl(`/${locale}/places/${place.id}`) },
        { rel: "alternate", hrefLang: "fr", href: absoluteUrl(`/fr/places/${place.id}`) },
        { rel: "alternate", hrefLang: "en", href: absoluteUrl(`/en/places/${place.id}`) },
        { rel: "alternate", hrefLang: "ar", href: absoluteUrl(`/ar/places/${place.id}`) },
        { rel: "alternate", hrefLang: "x-default", href: absoluteUrl(`/fr/places/${place.id}`) },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: place.nom,
            description: `${place.categorieNom}${place.quartier ? ` · ${place.quartier}` : ""}`,
            address: {
              "@type": "PostalAddress",
              addressLocality: place.ville ?? "Niamey",
              addressCountry: "NE",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: place.latitude,
              longitude: place.longitude,
            },
            telephone: place.telephone ?? undefined,
            url: `/${locale}/places/${place.id}`,
          }),
        },
      ],
    };
  },
  component: PlaceDetail,
});

function PlaceDetail() {
  const { locale: rawLocale, id } = Route.useParams();
  const locale: Locale = localeSchema.parse(rawLocale);
  const initial = Route.useLoaderData();
  const query = useQuery({
    queryKey: ["place", id],
    queryFn: () => getTrpcClient().places.byId.query({ id }),
    initialData: initial,
    staleTime: 30_000,
    enabled: typeof window !== "undefined",
  });

  if (query.isPending) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-[var(--upk-muted-fg)]">{t(locale, "common.loading")}</p>
      </main>
    );
  }

  if (query.error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p role="alert">{t(locale, "common.error")}</p>
      </main>
    );
  }

  const place = query.data;
  useDocumentTitle(place ? `${place.nom} — ${t(locale, "app.name")}` : null);
  if (!place) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p>{t(locale, "search.empty")}</p>
        <Link
          to="/$locale"
          params={{ locale }}
          className="mt-4 inline-block text-[var(--upk-primary)]"
        >
          {t(locale, "nav.search")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        to="/$locale"
        params={{ locale }}
        className="text-sm text-[var(--upk-muted-fg)]"
      >
        {locale === "ar" ? "→" : "←"} {t(locale, "nav.search")}
      </Link>
      <h1 className="mt-4 text-4xl font-bold">{place.nom}</h1>
      <p className="mt-2 text-lg text-[var(--upk-muted-fg)]">
        {place.categorieNom}
        {place.quartier ? ` · ${place.quartier}` : place.ville ? ` · ${place.ville}` : ""}
      </p>
      <nav className="mt-4 flex gap-3 text-sm" aria-label={t(locale, "nav.language")}>
        {(["fr", "en", "ar"] as const).map((code) => (
          <Link
            key={code}
            to="/$locale/places/$id"
            params={{ locale: code, id }}
            className={
              code === locale
                ? "font-semibold text-[var(--upk-primary)]"
                : "text-[var(--upk-muted-fg)]"
            }
          >
            {code.toUpperCase()}
          </Link>
        ))}
      </nav>
      {place.verifie && (
        <p className="mt-2 text-sm font-medium text-[var(--upk-primary)]">
          {t(locale, "place.verified")}
        </p>
      )}
      {place.photos.length > 0 && (
        <section className="mt-8" aria-labelledby="place-photos">
          <h2 id="place-photos" className="text-xl font-semibold">
            {t(locale, "place.photos")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {place.photos.map((photo) => (
              <img
                key={photo.key}
                src={photo.url}
                alt={photo.alt ?? place.nom}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded-lg border border-[var(--upk-border)] object-cover"
              />
            ))}
          </div>
        </section>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {place.telephone && (
          <a
            href={`tel:${place.telephone}`}
            className="rounded-lg bg-[var(--upk-primary)] px-5 py-3 font-medium text-[var(--upk-primary-fg)]"
          >
            {t(locale, "place.call")} {place.telephone}
          </a>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[var(--upk-border)] px-5 py-3 font-medium"
        >
          {t(locale, "place.directions")}
        </a>
      </div>
      <ReportForm placeId={place.id} locale={locale} />
    </main>
  );
}
