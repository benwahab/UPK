import { Link } from "@tanstack/react-router";
import type { Category } from "@upk/api";
import type { Locale } from "@upk/domain";
import { t } from "@upk/i18n";
import { useState, type FormEvent } from "react";
import { getTrpcClient } from "../lib/trpc";
import { TurnstileWidget } from "./turnstile";

const fieldClass =
  "mt-1 w-full rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--upk-primary)]";

export function ContributionForm({
  locale,
  categories,
}: {
  locale: Locale;
  categories: Category[];
}) {
  const [nom, setNom] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [description, setDescription] = useState("");
  const [quartier, setQuartier] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("Niamey");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [gpsPrecisionM, setGpsPrecisionM] = useState<number | null>(null);
  const [telephone, setTelephone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [horaires, setHoraires] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function locate() {
    if (!("geolocation" in navigator)) {
      setError(t(locale, "contribute.locationError"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGpsPrecisionM(Math.round(position.coords.accuracy));
        setError(null);
      },
      () => setError(t(locale, "contribute.locationError")),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError(t(locale, "contribute.locationError"));
      return;
    }
    if (!turnstileToken) {
      setError(t(locale, "contribute.turnstile"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await getTrpcClient().contributions.create.mutate({
        nom,
        categorySlug,
        description: description || undefined,
        quartier: quartier || undefined,
        adresse: adresse || undefined,
        ville: ville || undefined,
        latitude: lat,
        longitude: lng,
        gpsPrecisionM: gpsPrecisionM ?? undefined,
        telephone: telephone || undefined,
        whatsapp: whatsapp || undefined,
        siteWeb: siteWeb || undefined,
        horaires: horaires || undefined,
        contactEmail: contactEmail || undefined,
        langue: locale,
        turnstileToken,
      });

      for (const file of files.slice(0, 3)) {
        const body = new FormData();
        body.append("file", file);
        await fetch(
          `/api/uploads?placeId=${encodeURIComponent(result.id)}&token=${encodeURIComponent(result.submissionToken)}`,
          { method: "POST", body },
        );
      }

      setSuccess(true);
    } catch {
      setError(t(locale, "contribute.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div role="status" className="mt-8 rounded-xl border border-[var(--upk-border)] p-6">
        <p className="font-medium">{t(locale, "contribute.success")}</p>
        <Link
          to="/$locale"
          params={{ locale }}
          className="mt-4 inline-block font-medium text-[var(--upk-primary-text)]"
        >
          {t(locale, "contribute.back")}
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <label className="sm:col-span-2">
        <span className="text-sm font-medium">{t(locale, "contribute.name")} *</span>
        <input
          className={fieldClass}
          value={nom}
          onChange={(event) => setNom(event.target.value)}
          required
          maxLength={120}
        />
      </label>

      <label>
        <span className="text-sm font-medium">{t(locale, "contribute.category")} *</span>
        <select
          className={fieldClass}
          value={categorySlug}
          onChange={(event) => setCategorySlug(event.target.value)}
          required
        >
          <option value="">—</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.nom}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="text-sm font-medium">{t(locale, "contribute.quartier")}</span>
        <input
          className={fieldClass}
          value={quartier}
          onChange={(event) => setQuartier(event.target.value)}
          maxLength={120}
        />
      </label>

      <label className="sm:col-span-2">
        <span className="text-sm font-medium">{t(locale, "contribute.address")}</span>
        <input
          className={fieldClass}
          value={adresse}
          onChange={(event) => setAdresse(event.target.value)}
          maxLength={200}
        />
      </label>

      <label>
        <span className="text-sm font-medium">{t(locale, "contribute.city")}</span>
        <input
          className={fieldClass}
          value={ville}
          onChange={(event) => setVille(event.target.value)}
          maxLength={120}
        />
      </label>

      <div className="flex items-end">
        <button
          type="button"
          onClick={locate}
          className="w-full rounded-lg border border-[var(--upk-border)] px-3 py-2 text-sm font-medium"
        >
          {t(locale, "contribute.location")}
        </button>
      </div>

      <label>
        <span className="text-sm font-medium">{t(locale, "contribute.latitude")} *</span>
        <input
          className={fieldClass}
          type="number"
          step="any"
          min={11}
          max={24}
          value={latitude}
          onChange={(event) => {
            setLatitude(event.target.value);
            setGpsPrecisionM(null);
          }}
          required
        />
      </label>

      <label>
        <span className="text-sm font-medium">{t(locale, "contribute.longitude")} *</span>
        <input
          className={fieldClass}
          type="number"
          step="any"
          min={0}
          max={16}
          value={longitude}
          onChange={(event) => {
            setLongitude(event.target.value);
            setGpsPrecisionM(null);
          }}
          required
        />
      </label>

      <p className="text-sm text-[var(--upk-muted-fg)] sm:col-span-2">
        {t(locale, "contribute.locationHelp")}
        {gpsPrecisionM !== null && (
          <span className="mt-1 block">
            {t(locale, "contribute.locationAccuracy").replace("{value}", String(gpsPrecisionM))}
          </span>
        )}
      </p>

      <label>
        <span className="text-sm font-medium">{t(locale, "contribute.phone")}</span>
        <input
          className={fieldClass}
          type="tel"
          value={telephone}
          onChange={(event) => setTelephone(event.target.value)}
          maxLength={30}
        />
      </label>

      <label>
        <span className="text-sm font-medium">{t(locale, "contribute.whatsapp")}</span>
        <input
          className={fieldClass}
          type="tel"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          maxLength={30}
        />
      </label>

      <label>
        <span className="text-sm font-medium">{t(locale, "contribute.website")}</span>
        <input
          className={fieldClass}
          type="url"
          value={siteWeb}
          onChange={(event) => setSiteWeb(event.target.value)}
          maxLength={200}
          placeholder="https://"
        />
      </label>

      <label>
        <span className="text-sm font-medium">{t(locale, "contribute.hours")}</span>
        <input
          className={fieldClass}
          value={horaires}
          onChange={(event) => setHoraires(event.target.value)}
          maxLength={200}
        />
      </label>

      <label className="sm:col-span-2">
        <span className="text-sm font-medium">{t(locale, "contribute.email")}</span>
        <input
          className={fieldClass}
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          maxLength={200}
        />
      </label>

      <label className="sm:col-span-2">
        <span className="text-sm font-medium">{t(locale, "contribute.description")}</span>
        <textarea
          className={fieldClass}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={2000}
        />
      </label>

      <label className="sm:col-span-2">
        <span className="text-sm font-medium">{t(locale, "contribute.photos")}</span>
        <input
          className="mt-1 block w-full text-sm"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}
        />
        <span className="mt-1 block text-xs text-[var(--upk-muted-fg)]">
          {t(locale, "contribute.photosHelp")}
        </span>
      </label>

      <div className="sm:col-span-2">
        <TurnstileWidget locale={locale} onToken={setTurnstileToken} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--upk-primary)] px-5 py-3 font-medium text-[var(--upk-primary-fg)] disabled:opacity-60"
        >
          {submitting ? t(locale, "contribute.submitting") : t(locale, "contribute.submit")}
        </button>
      </div>
    </form>
  );
}
