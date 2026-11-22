import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistance, type PlaceSummary } from "@upk/domain";
import { t } from "@upk/i18n";
import { useState, type FormEvent } from "react";
import { getTrpcClient } from "../lib/trpc";
import { searchPlaces } from "../server/places";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const q = typeof search.q === "string" ? search.q.trim() : "";
    return q ? { q } : {};
  },
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => searchPlaces({ data: { q: deps.q, limit: 20 } }),
  component: Home,
});

function Home() {
  const { q } = Route.useSearch();
  const initial = Route.useLoaderData();
  const navigate = useNavigate({ from: "/" });
  const [input, setInput] = useState(q ?? "");
  const results = useQuery({
    queryKey: ["search", q],
    queryFn: () => getTrpcClient().search.places.query({ q: q || undefined, limit: 20 }),
    initialData: initial,
    staleTime: 30_000,
    enabled: typeof window !== "undefined",
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = input.trim();
    void navigate({ search: next ? { q: next } : {} });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-[var(--upk-primary)]">UPK</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{t("fr", "home.title")}</h1>
      <p className="mt-4 text-lg text-[var(--upk-muted-fg)]">{t("fr", "home.subtitle")}</p>
      <form className="mt-8 flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label={t("fr", "search.button")}
          placeholder={t("fr", "search.placeholder")}
          className="min-w-0 flex-1 rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--upk-primary)]"
        />
        <button
          type="submit"
          className="rounded-lg bg-[var(--upk-primary)] px-5 py-3 font-medium text-[var(--upk-primary-fg)]"
        >
          {t("fr", "search.button")}
        </button>
      </form>

      <section className="mt-10" aria-live="polite">
        {results.isPending && (
          <p className="text-[var(--upk-muted-fg)]">{t("fr", "common.loading")}</p>
        )}
        {results.error && <p role="alert">{t("fr", "common.error")}</p>}
        {results.data && (
          <>
            <p className="text-sm text-[var(--upk-muted-fg)]">
              {results.data.total} {t("fr", "search.results")}
            </p>
            {results.data.items.length === 0 ? (
              <p className="mt-4">{t("fr", "search.empty")}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {results.data.items.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <p className="mt-auto pt-10 text-xs text-[var(--upk-muted-fg)]">
        {t("fr", "footer.attribution")}
      </p>
    </main>
  );
}

function PlaceCard({ place }: { place: PlaceSummary }) {
  return (
    <li className="rounded-xl border border-[var(--upk-border)] p-4">
      <Link to="/places/$id" params={{ id: place.id }} className="block">
        <h2 className="text-lg font-semibold">{place.nom}</h2>
        <p className="text-sm text-[var(--upk-muted-fg)]">
          {place.categorieNom}
          {place.quartier ? ` · ${place.quartier}` : place.ville ? ` · ${place.ville}` : ""}
        </p>
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
        {place.distanceM !== null && <span>{formatDistance(place.distanceM)}</span>}
        {place.telephone && (
          <a href={`tel:${place.telephone}`} className="font-medium text-[var(--upk-primary)]">
            {t("fr", "place.call")}
          </a>
        )}
        {place.verifie && <span>{t("fr", "place.verified")}</span>}
      </div>
    </li>
  );
}
