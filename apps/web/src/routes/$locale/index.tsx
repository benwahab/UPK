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
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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

  const resultsData = results.data;
  const subtitle = t(locale, "home.title");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-4">
      <div className="mt-2 flex min-h-11 items-center">
        <nav
          aria-label={t(locale, "nav.shortcuts")}
          className="flex flex-wrap items-center gap-x-3 pe-11 text-xs font-medium text-[var(--upk-muted-fg)]"
        >
          <Link
            to="/$locale/connexion"
            params={{ locale }}
            className="py-3.5 hover:text-[var(--upk-fg)] hover:underline"
          >
            {t(locale, "nav.pro")}
          </Link>
          <Link
            to="/$locale/contribuer"
            params={{ locale }}
            className="py-3.5 hover:text-[var(--upk-fg)] hover:underline"
          >
            {t(locale, "nav.propose")}
          </Link>
          <Link
            to="/$locale"
            params={{ locale }}
            search={{ q: "pharmacie" }}
            className="py-3.5 hover:text-[var(--upk-fg)] hover:underline"
          >
            {t(locale, "nav.pharmacies")}
          </Link>
        </nav>
      </div>

      <header
        className={`flex flex-col items-center justify-center text-center ${
          hasSearch ? "py-3" : "min-h-[320px] py-4"
        }`}
      >
        <img
          src="/upk-logo.png"
          alt="UPK"
          width={432}
          height={183}
          className={`h-auto dark:drop-shadow-[0_8px_24px_rgba(255,107,53,0.3)] ${
            hasSearch ? "w-20" : "w-28"
          }`}
        />
        <h1 className={hasSearch ? "sr-only" : "mt-3 text-lg font-semibold leading-snug"}>
          {subtitle}
        </h1>
        {!hasSearch && (
          <div
            aria-hidden="true"
            className="mt-2.5 hidden h-1 w-11 rounded-full bg-[var(--upk-primary)] dark:block"
          />
        )}
      </header>

      <form method="get" action={`/${locale}`} role="search" onSubmit={submit} className="py-3">
        <label htmlFor="recherche" className="sr-only">
          {t(locale, "search.button")}
        </label>
        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute start-3 top-4 size-5 text-[var(--upk-muted-fg)] dark:text-[var(--upk-primary)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id="recherche"
            type="search"
            name="q"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t(locale, "search.placeholder")}
            className="h-[52px] w-full rounded-xl border border-[var(--upk-input)] bg-[var(--upk-card)] ps-10 pe-12 text-base shadow-sm outline-none placeholder:text-[var(--upk-muted-fg)] focus:ring-2 focus:ring-[var(--upk-ring)] dark:shadow-[0_8px_28px_rgba(255,107,53,0.1)]"
          />
          <div className="absolute end-1 top-1">
            <VoiceSearch
              locale={locale}
              onResult={voiceResult}
              onError={() => setVoiceError(true)}
            />
          </div>
        </div>
        {category && <input type="hidden" name="category" value={category} />}
        {lat !== undefined && lng !== undefined && (
          <>
            <input type="hidden" name="lat" value={lat} />
            <input type="hidden" name="lng" value={lng} />
          </>
        )}
        <button type="submit" className="sr-only">
          {t(locale, "search.button")}
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--upk-border)] bg-[var(--upk-card)] px-3 text-sm font-medium disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {locating ? t(locale, "search.locating") : t(locale, "search.nearby")}
          </button>
        </div>
      </form>

      {hasSearch && (
        <div
          role="group"
          aria-label={t(locale, "search.category")}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2"
        >
          <CategoryChip active={!category} onClick={() => changeCategory("")}>
            {t(locale, "search.all")}
          </CategoryChip>
          {categories.map((item) => (
            <CategoryChip
              key={item.id}
              active={category === item.slug}
              onClick={() => changeCategory(item.slug)}
            >
              {item.nom}
            </CategoryChip>
          ))}
        </div>
      )}

      {locationError && (
        <p role="alert" className="mt-3 text-sm text-[var(--upk-danger)]">
          {t(locale, "search.locationError")}
        </p>
      )}
      {voiceError && (
        <p role="alert" className="mt-3 text-sm text-[var(--upk-danger)]">
          {t(locale, "search.voiceError")}
        </p>
      )}
      {hasPosition && (
        <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--upk-muted-fg)]">
          <span>{t(locale, "search.sortedByDistance")}</span>
          <button
            type="button"
            onClick={clearPosition}
            className="font-medium text-[var(--upk-primary-text)]"
          >
            {t(locale, "search.clearPosition")}
          </button>
        </p>
      )}

      <section className="mt-4" aria-live="polite">
        {hasSearch && results.isPending && (
          <p className="text-[var(--upk-muted-fg)]">{t(locale, "common.loading")}</p>
        )}
        {hasSearch && results.error && <p role="alert">{t(locale, "common.error")}</p>}
        {hasSearch && resultsData && (
          <>
            <p className="text-sm text-[var(--upk-muted-fg)]">
              {resultsData.total} {t(locale, "search.results")}
            </p>
            {resultsData.label && resultsData.intent !== "nom" && (
              <p className="mt-1 text-sm font-medium text-[var(--upk-primary-text)]">
                {resultsData.intent === "quartier"
                  ? t(locale, "search.intent.quartier").replace("{name}", resultsData.label)
                  : resultsData.intent === "ville"
                    ? t(locale, "search.intent.ville").replace("{name}", resultsData.label)
                    : t(locale, "search.intent.categorie").replace("{name}", resultsData.label)}
              </p>
            )}
            {resultsData.intent === "texte" && q && !resultsData.exactNameMatch && (
              <p role="status" className="mt-2 text-sm text-amber-800 dark:text-amber-300">
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
            {resultsData.items.length === 0 ? (
              <div className="mt-4 space-y-3">
                <p className="whitespace-pre-line">{assistantText(locale, "assistant.notFound")}</p>
                <Link
                  to="/$locale/contribuer"
                  params={{ locale }}
                  className="inline-block font-medium text-[var(--upk-primary-text)] underline"
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
                  className="mt-3 rounded-lg border border-[var(--upk-border)] bg-[var(--upk-card)] px-4 py-2 text-sm font-medium"
                >
                  {t(locale, showMap ? "search.hideMap" : "search.showMap")}
                </button>
                <div
                  className={
                    showMap ? "mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]" : "mt-4"
                  }
                >
                  <ul className="flex flex-col gap-3">
                    {resultsData.items.map((place) => (
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
                          places={resultsData.items}
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

      <nav
        className="mt-auto flex justify-center gap-5 pt-6 text-sm"
        aria-label={t(locale, "nav.language")}
      >
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
                ? "font-semibold text-[var(--upk-primary-text)]"
                : "text-[var(--upk-muted-fg)]"
            }
          >
            {code.toUpperCase()}
          </Link>
        ))}
      </nav>
    </main>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${
        active
          ? "border-transparent bg-[var(--upk-primary)] text-[var(--upk-primary-fg)]"
          : "border-[var(--upk-border)] bg-[var(--upk-card)] text-[var(--upk-fg)]"
      }`}
    >
      {children}
    </button>
  );
}

function PlaceCard({ place, locale }: { place: PlaceSummary; locale: Locale }) {
  const distance = place.distanceM !== null ? formatDistance(place.distanceM) : null;
  return (
    <li className="rounded-xl border border-[var(--upk-border)] bg-[var(--upk-card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">
            <Link
              to="/$locale/places/$id"
              params={{ locale, id: place.id }}
              className="hover:underline"
            >
              {place.nom}
            </Link>
          </h2>
          <p className="mt-0.5 truncate text-sm text-[var(--upk-muted-fg)]">
            {place.categorieNom}
            {place.quartier ? ` · ${place.quartier}` : place.ville ? ` · ${place.ville}` : ""}
          </p>
        </div>
        {distance && (
          <span className="shrink-0 rounded-lg bg-[var(--upk-muted)] px-2 py-1 text-sm font-semibold dark:text-[var(--upk-primary-text)]">
            {distance}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--upk-border)] px-2.5 py-1 text-xs font-medium">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${place.verifie ? "bg-green-600" : "bg-amber-500"}`}
          />
          {t(locale, place.verifie ? "place.verified" : "place.unverified")}
        </span>
        {place.telephone && (
          <a
            href={`tel:${place.telephone}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--upk-primary-text)]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.78.64 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.21a2 2 0 0 1 2.11-.45c.85.3 1.73.52 2.63.64A2 2 0 0 1 22 16.92Z" />
            </svg>
            <span dir="ltr">{place.telephone}</span>
          </a>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--upk-primary)] text-sm font-semibold text-[var(--upk-primary-fg)]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 11 19-9-9 19-2-8-8-2Z" />
          </svg>
          {t(locale, "place.directions")}
        </a>
        <Link
          to="/$locale/places/$id"
          params={{ locale, id: place.id }}
          className="flex h-10 flex-1 items-center justify-center rounded-lg border border-[var(--upk-border)] text-sm font-medium"
        >
          {t(locale, "place.details")}
        </Link>
      </div>
    </li>
  );
}
