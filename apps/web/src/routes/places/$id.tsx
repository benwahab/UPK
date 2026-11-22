import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { t } from "@upk/i18n";
import { getTrpcClient } from "../../lib/trpc";
import { getPlace } from "../../server/places";

export const Route = createFileRoute("/places/$id")({
  loader: ({ params }) => getPlace({ data: params.id }),
  component: PlaceDetail,
});

function PlaceDetail() {
  const { id } = Route.useParams();
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
        <p className="text-[var(--upk-muted-fg)]">{t("fr", "common.loading")}</p>
      </main>
    );
  }

  if (query.error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p role="alert">{t("fr", "common.error")}</p>
      </main>
    );
  }

  const place = query.data;
  if (!place) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p>{t("fr", "search.empty")}</p>
        <Link to="/" className="mt-4 inline-block text-[var(--upk-primary)]">
          {t("fr", "nav.search")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-[var(--upk-muted-fg)]">
        ← {t("fr", "nav.search")}
      </Link>
      <h1 className="mt-4 text-4xl font-bold">{place.nom}</h1>
      <p className="mt-2 text-lg text-[var(--upk-muted-fg)]">
        {place.categorieNom}
        {place.quartier ? ` · ${place.quartier}` : place.ville ? ` · ${place.ville}` : ""}
      </p>
      {place.verifie && (
        <p className="mt-2 text-sm font-medium text-[var(--upk-primary)]">
          {t("fr", "place.verified")}
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {place.telephone && (
          <a
            href={`tel:${place.telephone}`}
            className="rounded-lg bg-[var(--upk-primary)] px-5 py-3 font-medium text-[var(--upk-primary-fg)]"
          >
            {t("fr", "place.call")} {place.telephone}
          </a>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[var(--upk-border)] px-5 py-3 font-medium"
        >
          {t("fr", "place.directions")}
        </a>
      </div>
    </main>
  );
}
