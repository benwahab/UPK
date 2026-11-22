import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistance, localeSchema, type Locale, type PlaceSummary } from "@upk/domain";
import { t } from "@upk/i18n";
import { useState, type FormEvent } from "react";
import { getTrpcClient } from "../../lib/trpc";
import { listCategories, searchPlaces } from "../../server/places";

export const Route = createFileRoute("/$locale/")({
  validateSearch: (search: Record<string, unknown>) => {
    const q = typeof search.q === "string" ? search.q.trim() : "";
    const category = typeof search.category === "string" ? search.category.trim() : "";
    return {
      ...(q ? { q } : {}),
      ...(category ? { category } : {}),
    };
  },
  loaderDeps: ({ search }) => ({ q: search.q, category: search.category }),
  loader: ({ params, deps }) =>
    Promise.all([
      searchPlaces({ data: { q: deps.q, categorySlug: deps.category, limit: 20 } }),
      listCategories({ data: localeSchema.parse(params.locale) }),
    ]),
  component: Home,
});

function Home() {
  const { locale: rawLocale } = Route.useParams();
  const locale = localeSchema.parse(rawLocale);
  const { q, category } = Route.useSearch();
  const [initial, categories] = Route.useLoaderData();
  const navigate = useNavigate({ from: "/$locale/" });
  const [input, setInput] = useState(q ?? "");
  const results = useQuery({
    queryKey: ["search", q, category],
    queryFn: () =>
      getTrpcClient().search.places.query({
        q: q || undefined,
        categorySlug: category || undefined,
        limit: 20,
      }),
    initialData: initial,
    staleTime: 30_000,
    enabled: typeof window !== "undefined",
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = input.trim();
    void navigate({
      search: {
        ...(next ? { q: next } : {}),
        ...(category ? { category } : {}),
      },
    });
  }

  function changeCategory(value: string) {
    void navigate({
      search: {
        ...(q ? { q } : {}),
        ...(value ? { category: value } : {}),
      },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-[var(--upk-primary)]">UPK</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{t(locale, "home.title")}</h1>
      <p className="mt-4 text-lg text-[var(--upk-muted-fg)]">{t(locale, "home.subtitle")}</p>
      <nav className="mt-4 flex gap-3 text-sm" aria-label={t(locale, "nav.language")}>
        {(["fr", "en", "ar"] as const).map((code) => (
          <Link
            key={code}
            to="/$locale"
            params={{ locale: code }}
            search={{ ...(q ? { q } : {}), ...(category ? { category } : {}) }}
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
      <form className="mt-8 flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label={t(locale, "search.button")}
          placeholder={t(locale, "search.placeholder")}
          className="min-w-0 flex-1 rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--upk-primary)]"
        />
        <select
          value={category ?? ""}
          onChange={(event) => changeCategory(event.target.value)}
          aria-label={t(locale, "search.category")}
          className="rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--upk-primary)]"
        >
          <option value="">{t(locale, "search.allCategories")}</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.nom}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-[var(--upk-primary)] px-5 py-3 font-medium text-[var(--upk-primary-fg)]"
        >
          {t(locale, "search.button")}
        </button>
      </form>

      <section className="mt-10" aria-live="polite">
        {results.isPending && (
          <p className="text-[var(--upk-muted-fg)]">{t(locale, "common.loading")}</p>
        )}
        {results.error && <p role="alert">{t(locale, "common.error")}</p>}
        {results.data && (
          <>
            <p className="text-sm text-[var(--upk-muted-fg)]">
              {results.data.total} {t(locale, "search.results")}
            </p>
            {results.data.items.length === 0 ? (
              <p className="mt-4">{t(locale, "search.empty")}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {results.data.items.map((place) => (
                  <PlaceCard key={place.id} place={place} locale={locale} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <p className="mt-auto pt-10 text-xs text-[var(--upk-muted-fg)]">
        {t(locale, "footer.attribution")}
      </p>
    </main>
  );
}

function PlaceCard({ place, locale }: { place: PlaceSummary; locale: Locale }) {
  return (
    <li className="rounded-xl border border-[var(--upk-border)] p-4">
      <Link
        to="/$locale/places/$id"
        params={{ locale, id: place.id }}
        className="block"
      >
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
            {t(locale, "place.call")}
          </a>
        )}
        {place.verifie && <span>{t(locale, "place.verified")}</span>}
      </div>
    </li>
  );
}
