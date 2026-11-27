import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import {
  formatDistance,
  isFuzzyMatch,
  localeSchema,
  type Locale,
  type PlaceSummary,
  type SearchResult,
} from "@upk/domain";
import { assistantText, t } from "@upk/i18n";
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { VoiceSearch } from "../../components/voice-search";
import { absoluteUrl } from "../../lib/site";
import { getTrpcClient } from "../../lib/trpc";
import { listCategories, searchPlaces } from "../../server/places";

const PlaceMap = lazy(createClientOnlyFn(() => import("../../components/place-map.client")));

const EMPTY_RESULTS: SearchResult = {
  items: [],
  total: 0,
  nextCursor: null,
  intent: "texte",
  label: null,
  exactNameMatch: true,
};

function coordinate(value: unknown, min: number, max: number): number | undefined {
  const parsed =
    typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

export const Route = createFileRoute("/$locale/")({
  validateSearch: (search: Record<string, unknown>) => {
    const q = typeof search.q === "string" ? search.q.trim() : "";
    const category = typeof search.category === "string" ? search.category.trim() : "";
    const lat = coordinate(search.lat, -90, 90);
    const lng = coordinate(search.lng, -180, 180);
    return {
      ...(q ? { q } : {}),
      ...(category ? { category } : {}),
      ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
    };
  },
  loaderDeps: ({ search }) => ({
    q: search.q,
    category: search.category,
    lat: search.lat,
    lng: search.lng,
  }),
  loader: ({ params, deps }) => {
    const hasQuery = Boolean(
      deps.q || deps.category || (deps.lat !== undefined && deps.lng !== undefined),
    );
    return Promise.all([
      hasQuery
        ? searchPlaces({
            data: {
              q: deps.q,
              categorySlug: deps.category,
              lat: deps.lat,
              lng: deps.lng,
              limit: 20,
            },
          })
        : Promise.resolve(EMPTY_RESULTS),
      listCategories({ data: localeSchema.parse(params.locale) }),
    ]);
  },
  head: ({ params }) => ({
    links: [
      { rel: "canonical", href: absoluteUrl(`/${params.locale}`) },
      { rel: "alternate", hrefLang: "fr", href: absoluteUrl("/fr") },
      { rel: "alternate", hrefLang: "en", href: absoluteUrl("/en") },
      { rel: "alternate", hrefLang: "ar", href: absoluteUrl("/ar") },
      { rel: "alternate", hrefLang: "x-default", href: absoluteUrl("/fr") },
    ],
  }),
  component: Home,
});

function Home() {
  const { locale: rawLocale } = Route.useParams();
  const locale = localeSchema.parse(rawLocale);
  const { q, category, lat, lng } = Route.useSearch();
  const [initial, categories] = Route.useLoaderData();
  const navigate = useNavigate({ from: "/$locale/" });
  const [input, setInput] = useState(q ?? "");
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [voiceError, setVoiceError] = useState(false);
  const hasPosition = lat !== undefined && lng !== undefined;
  const hasSearch = Boolean(q || category || hasPosition);
  const results = useQuery({
    queryKey: ["search", q, category, lat, lng],
    queryFn: () =>
      getTrpcClient().search.places.query({
        q: q || undefined,
        categorySlug: category || undefined,
        lat,
        lng,
        limit: 20,
      }),
    initialData: initial,
    staleTime: 30_000,
    enabled: typeof window !== "undefined" && hasSearch,
  });

  const suggestion =
    results.data && q && !results.data.exactNameMatch
      ? results.data.items.find((item) => isFuzzyMatch(q, item.nom))
      : undefined;

  const autoLocated = useRef(false);

  useEffect(() => {
    if (autoLocated.current || hasSearch || !("permissions" in navigator)) return;
    let cancelled = false;
    void navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (!cancelled && status.state === "granted") locate();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasSearch]);

  function navigateSearch(next: { q?: string; category?: string; lat?: number; lng?: number }) {
    void navigate({
      search: {
        ...(next.q ? { q: next.q } : {}),
        ...(next.category ? { category: next.category } : {}),
        ...(next.lat !== undefined && next.lng !== undefined
          ? { lat: next.lat, lng: next.lng }
          : {}),
      },
    });
  }

  function searchWithFreshPosition(next: { q?: string; category?: string }) {
    if (!hasPosition) {
      navigateSearch(next);
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocationError(true);
      navigateSearch(next);
      return;
    }
    setLocationError(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        navigateSearch({
          ...next,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocating(false);
        setLocationError(true);
        navigateSearch(next);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = input.trim();
    setVoiceError(false);
    searchWithFreshPosition({ q: next || undefined, category: category || undefined });
  }

  function changeCategory(value: string) {
    searchWithFreshPosition({
      q: input.trim() || undefined,
      category: value || undefined,
    });
  }

  function locate() {
    autoLocated.current = true;
    if (!("geolocation" in navigator)) {
      setLocationError(true);
      return;
    }
    setLocationError(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        navigateSearch({
          q: input.trim() || undefined,
          category: category || undefined,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocating(false);
        setLocationError(true);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  function clearPosition() {
    navigateSearch({
      q: input.trim() || undefined,
      category: category || undefined,
    });
  }

  function voiceResult(text: string) {
    setVoiceError(false);
    setInput(text);
    searchWithFreshPosition({ q: text, category: category || undefined });
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
            search={{
              ...(q ? { q } : {}),
              ...(category ? { category } : {}),
              ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
            }}
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
      <Link
        to="/$locale/contribuer"
        params={{ locale }}
        className="mt-4 text-sm font-medium text-[var(--upk-primary)]"
      >
        {t(locale, "nav.propose")}
      </Link>
      <form
        method="get"
        action={`/${locale}`}
        className="mt-8 flex flex-col gap-2"
        onSubmit={submit}
      >
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-label={t(locale, "search.button")}
            placeholder={t(locale, "search.placeholder")}
            className="min-w-0 flex-1 rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--upk-primary)]"
          />
          <VoiceSearch locale={locale} onResult={voiceResult} onError={() => setVoiceError(true)} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            name="category"
            value={category ?? ""}
            onChange={(event) => changeCategory(event.target.value)}
            aria-label={t(locale, "search.category")}
            className="min-w-0 flex-1 rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--upk-primary)]"
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
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="rounded-lg border border-[var(--upk-border)] px-4 py-3 text-sm font-medium disabled:opacity-60"
          >
            {locating ? t(locale, "search.locating") : t(locale, "search.nearby")}
          </button>
        </div>
        {lat !== undefined && lng !== undefined && (
          <>
            <input type="hidden" name="lat" value={lat} />
            <input type="hidden" name="lng" value={lng} />
          </>
        )}
      </form>

      {locationError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {t(locale, "search.locationError")}
        </p>
      )}
      {voiceError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {t(locale, "search.voiceError")}
        </p>
      )}
      {hasPosition && (
        <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--upk-muted-fg)]">
          <span>{t(locale, "search.sortedByDistance")}</span>
          <button
            type="button"
            onClick={clearPosition}
            className="font-medium text-[var(--upk-primary)]"
          >
            {t(locale, "search.clearPosition")}
          </button>
        </p>
      )}

      <section className="mt-8" aria-live="polite">
        {!hasSearch && (
          <div className="rounded-xl border border-[var(--upk-border)] p-6">
            <h2 className="text-xl font-semibold">{t(locale, "search.startTitle")}</h2>
            <p className="mt-2 text-sm text-[var(--upk-muted-fg)]">
              {t(locale, "search.startHint")}
            </p>
          </div>
        )}
        {hasSearch && results.isPending && (
          <p className="text-[var(--upk-muted-fg)]">{t(locale, "common.loading")}</p>
        )}
        {hasSearch && results.error && <p role="alert">{t(locale, "common.error")}</p>}
        {hasSearch && results.data && (
          <>
            <p className="text-sm text-[var(--upk-muted-fg)]">
              {results.data.total} {t(locale, "search.results")}
            </p>
            {results.data.label && results.data.intent !== "nom" && (
              <p className="mt-1 text-sm font-medium text-[var(--upk-primary)]">
                {results.data.intent === "quartier"
                  ? t(locale, "search.intent.quartier").replace("{name}", results.data.label)
                  : results.data.intent === "ville"
                    ? t(locale, "search.intent.ville").replace("{name}", results.data.label)
                    : t(locale, "search.intent.categorie").replace("{name}", results.data.label)}
              </p>
            )}
            {results.data.intent === "texte" && q && !results.data.exactNameMatch && (
              <p role="status" className="mt-2 text-sm text-amber-800">
                {t(locale, "search.approximate").replace("{query}", q)}
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => {
                      setInput(suggestion.nom);
                      searchWithFreshPosition({
                        q: suggestion.nom,
                        category: category || undefined,
                      });
                    }}
                    className="ms-1 font-medium underline"
                  >
                    {t(locale, "search.didYouMean").replace("{name}", suggestion.nom)}
                  </button>
                )}
              </p>
            )}
            {results.data.items.length === 0 ? (
              <div className="mt-4 space-y-3">
                <p className="whitespace-pre-line">{assistantText(locale, "assistant.notFound")}</p>
                <Link
                  to="/$locale/contribuer"
                  params={{ locale }}
                  className="inline-block font-medium text-[var(--upk-primary)] underline"
                >
                  {assistantText(locale, "assistant.contribute")}
                </Link>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowMap((value) => !value)}
                  aria-expanded={showMap}
                  className="mt-4 rounded-lg border border-[var(--upk-border)] px-4 py-2 text-sm font-medium"
                >
                  {t(locale, showMap ? "search.hideMap" : "search.showMap")}
                </button>
                <div
                  className={
                    showMap ? "mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" : "mt-4"
                  }
                >
                  <ul className="flex flex-col gap-3">
                    {results.data.items.map((place) => (
                      <PlaceCard key={place.id} place={place} locale={locale} />
                    ))}
                  </ul>
                  {showMap && (
                    <div className="lg:sticky lg:top-4">
                      <Suspense
                        fallback={
                          <p className="text-[var(--upk-muted-fg)]">
                            {t(locale, "search.mapLoading")}
                          </p>
                        }
                      >
                        <PlaceMap
                          places={results.data.items}
                          locale={locale}
                          label={t(locale, "search.map")}
                          className="h-80 w-full rounded-xl lg:h-[480px]"
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function PlaceCard({ place, locale }: { place: PlaceSummary; locale: Locale }) {
  return (
    <li className="rounded-xl border border-[var(--upk-border)] p-4">
      <Link to="/$locale/places/$id" params={{ locale, id: place.id }} className="block">
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
