import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ModerationPlace, ReportRow } from "@upk/api";
import { localeSchema } from "@upk/domain";
import { formatDate, t, type TranslationKey } from "@upk/i18n";
import { useState } from "react";
import { getTrpcClient } from "../../../lib/trpc";
import { useDocumentTitle } from "../../../lib/use-document-title";
import { SiteContentAdmin } from "../../../components/site-content-admin";

const REPORT_TYPE_KEYS: Record<string, TranslationKey> = {
  ferme: "report.types.ferme",
  adresse: "report.types.adresse",
  telephone: "report.types.telephone",
  horaire: "report.types.horaire",
  autre: "report.types.autre",
};

export const Route = createFileRoute("/$locale/admin/moderation")({
  head: ({ params }) => {
    const locale = localeSchema.parse(params.locale);
    return {
      meta: [
        { title: `${t(locale, "admin.title")} — ${t(locale, "app.name")}` },
        { name: "robots", content: "noindex,nofollow" },
      ],
    };
  },
  component: ModerationPage,
});

function ModerationPage() {
  const { locale: rawLocale } = Route.useParams();
  const locale = localeSchema.parse(rawLocale);
  useDocumentTitle(`${t(locale, "admin.title")} — ${t(locale, "app.name")}`);
  const queryClient = useQueryClient();
  const [forceGps, setForceGps] = useState<Record<string, boolean>>({});
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [reportMotifs, setReportMotifs] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["moderation", "me"],
    queryFn: () => getTrpcClient().moderation.me.query(),
    enabled: typeof window !== "undefined",
    retry: false,
  });
  const isAdmin = me.data?.isAdmin === true;

  const pending = useQuery({
    queryKey: ["moderation", "pending"],
    queryFn: () => getTrpcClient().moderation.pending.query(),
    enabled: typeof window !== "undefined" && isAdmin,
    refetchInterval: 30_000,
  });
  const reports = useQuery({
    queryKey: ["moderation", "reports"],
    queryFn: () => getTrpcClient().moderation.reports.query(),
    enabled: typeof window !== "undefined" && isAdmin,
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["moderation"] });
  };
  const approve = useMutation({
    mutationFn: (input: { id: string; forceGps: boolean }) =>
      getTrpcClient().moderation.approve.mutate(input),
    onSuccess: invalidate,
    onError: () => setActionError(t(locale, "admin.error")),
  });
  const reject = useMutation({
    mutationFn: (input: { id: string; motif: string }) =>
      getTrpcClient().moderation.reject.mutate(input),
    onSuccess: invalidate,
    onError: () => setActionError(t(locale, "admin.error")),
  });
  const resolveReport = useMutation({
    mutationFn: (input: { id: string; statut: "traite" | "refuse"; motif?: string }) =>
      getTrpcClient().moderation.resolveReport.mutate(input),
    onSuccess: invalidate,
    onError: () => setActionError(t(locale, "admin.error")),
  });

  if (typeof window !== "undefined" && me.isPending) {
    return <p className="mx-auto max-w-3xl px-6 py-16">{t(locale, "common.loading")}</p>;
  }

  if (me.error || (me.data && !isAdmin)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">{t(locale, "admin.unauthorized")}</h1>
        <p className="mt-3 text-[var(--upk-muted-fg)]">{t(locale, "admin.loginRequired")}</p>
        <Link
          to="/$locale/connexion"
          params={{ locale }}
          className="mt-6 inline-block rounded-lg bg-[var(--upk-primary)] px-5 py-3 font-medium text-[var(--upk-primary-fg)]"
        >
          {t(locale, "nav.login")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold">{t(locale, "admin.title")}</h1>
      <p className="mt-2 text-[var(--upk-muted-fg)]">{t(locale, "admin.subtitle")}</p>
      <SiteContentAdmin locale={locale} />
      <button
        type="button"
        onClick={() => {
          void pending.refetch();
          void reports.refetch();
        }}
        className="mt-4 rounded-lg border border-[var(--upk-border)] px-4 py-2 text-sm font-medium"
      >
        {t(locale, "admin.refresh")}
      </button>
      {actionError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">
          {t(locale, "admin.pending")} ({pending.data?.length ?? 0})
        </h2>
        {pending.data?.length === 0 ? (
          <p className="mt-3 text-[var(--upk-muted-fg)]">{t(locale, "admin.empty")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {pending.data?.map((place) => (
              <PendingCard
                key={place.id}
                place={place}
                locale={locale}
                forceGps={Boolean(forceGps[place.id])}
                onForceGps={(value) =>
                  setForceGps((current) => ({ ...current, [place.id]: value }))
                }
                motif={motifs[place.id] ?? ""}
                onMotif={(value) =>
                  setMotifs((current) => ({ ...current, [place.id]: value }))
                }
                onApprove={() =>
                  approve.mutate({ id: place.id, forceGps: Boolean(forceGps[place.id]) })
                }
                onReject={() => reject.mutate({ id: place.id, motif: motifs[place.id] ?? "" })}
                busy={approve.isPending || reject.isPending}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">
          {t(locale, "admin.reports")} ({reports.data?.length ?? 0})
        </h2>
        {reports.data?.length === 0 ? (
          <p className="mt-3 text-[var(--upk-muted-fg)]">{t(locale, "admin.empty")}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {reports.data?.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                locale={locale}
                motif={reportMotifs[report.id] ?? ""}
                onMotif={(value) =>
                  setReportMotifs((current) => ({ ...current, [report.id]: value }))
                }
                onResolve={(statut) =>
                  resolveReport.mutate({
                    id: report.id,
                    statut,
                    motif: reportMotifs[report.id] || undefined,
                  })
                }
                busy={resolveReport.isPending}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function PendingCard({
  place,
  locale,
  forceGps,
  onForceGps,
  motif,
  onMotif,
  onApprove,
  onReject,
  busy,
}: {
  place: ModerationPlace;
  locale: "fr" | "en" | "ar";
  forceGps: boolean;
  onForceGps: (value: boolean) => void;
  motif: string;
  onMotif: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const gpsWarning = place.gpsPrecisionM !== null && place.gpsPrecisionM > 20;
  return (
    <li className="rounded-xl border border-[var(--upk-border)] p-4">
      <h3 className="text-lg font-semibold">{place.nom}</h3>
      <p className="text-sm text-[var(--upk-muted-fg)]">
        {place.categorieNom}
        {place.quartier ? ` · ${place.quartier}` : ""}
        {place.ville ? ` · ${place.ville}` : ""}
      </p>
      {place.description && <p className="mt-2">{place.description}</p>}
      <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">{t(locale, "contribute.latitude")}</dt>
          <dd>{place.latitude}</dd>
        </div>
        <div>
          <dt className="font-medium">{t(locale, "contribute.longitude")}</dt>
          <dd>{place.longitude}</dd>
        </div>
        {place.telephone && (
          <div>
            <dt className="font-medium">{t(locale, "contribute.phone")}</dt>
            <dd>{place.telephone}</dd>
          </div>
        )}
        {place.contactEmail && (
          <div>
            <dt className="font-medium">{t(locale, "admin.contact")}</dt>
            <dd className="break-all">{place.contactEmail}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium">{t(locale, "admin.created")}</dt>
          <dd>{formatDate(locale, new Date(place.createdAt))}</dd>
        </div>
      </dl>
      {place.gpsPrecisionM !== null && (
        <p className={gpsWarning ? "mt-2 text-sm text-red-700" : "mt-2 text-sm"}>
          {gpsWarning
            ? t(locale, "admin.gpsWarning").replace("{value}", String(place.gpsPrecisionM))
            : t(locale, "contribute.locationAccuracy").replace(
                "{value}",
                String(place.gpsPrecisionM),
              )}
        </p>
      )}
      {place.photos.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-medium">{t(locale, "admin.photos")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {place.photos.map((photo) => (
              <img
                key={photo.key}
                src={photo.url}
                alt={photo.alt ?? place.nom}
                loading="lazy"
                className="h-24 w-24 rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}
      {gpsWarning && (
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={forceGps}
            onChange={(event) => onForceGps(event.target.checked)}
            className="mt-1"
          />
          <span>{t(locale, "admin.forceGps")}</span>
        </label>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={onApprove}
          disabled={busy || (gpsWarning && !forceGps)}
          className="rounded-lg bg-[var(--upk-primary)] px-4 py-2 text-sm font-medium text-[var(--upk-primary-fg)] disabled:opacity-60"
        >
          {t(locale, "admin.approve")}
        </button>
        <label className="min-w-[200px] flex-1">
          <span className="text-xs font-medium">{t(locale, "admin.reason")}</span>
          <input
            value={motif}
            onChange={(event) => onMotif(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={onReject}
          disabled={busy || motif.trim().length < 5}
          className="rounded-lg border border-[var(--upk-border)] px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {t(locale, "admin.rejectConfirm")}
        </button>
      </div>
    </li>
  );
}

function ReportCard({
  report,
  locale,
  motif,
  onMotif,
  onResolve,
  busy,
}: {
  report: ReportRow;
  locale: "fr" | "en" | "ar";
  motif: string;
  onMotif: (value: string) => void;
  onResolve: (statut: "traite" | "refuse") => void;
  busy: boolean;
}) {
  const typeKey = REPORT_TYPE_KEYS[report.typeProbleme];
  return (
    <li className="rounded-xl border border-[var(--upk-border)] p-4">
      <h3 className="font-semibold">{report.placeNom}</h3>
      <p className="text-sm text-[var(--upk-muted-fg)]">
        {typeKey ? t(locale, typeKey) : report.typeProbleme}
        {" · "}
        {formatDate(locale, new Date(report.createdAt))}
      </p>
      {report.description && <p className="mt-2">{report.description}</p>}
      {report.email && <p className="mt-2 text-sm break-all">{report.email}</p>}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1">
          <span className="text-xs font-medium">{t(locale, "admin.reason")}</span>
          <input
            value={motif}
            onChange={(event) => onMotif(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => onResolve("traite")}
          disabled={busy}
          className="rounded-lg bg-[var(--upk-primary)] px-4 py-2 text-sm font-medium text-[var(--upk-primary-fg)] disabled:opacity-60"
        >
          {t(locale, "admin.resolve")}
        </button>
        <button
          type="button"
          onClick={() => onResolve("refuse")}
          disabled={busy || motif.trim().length < 5}
          className="rounded-lg border border-[var(--upk-border)] px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {t(locale, "admin.reject")}
        </button>
      </div>
    </li>
  );
}
