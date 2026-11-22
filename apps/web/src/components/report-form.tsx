import type { Locale } from "@upk/domain";
import { t, type TranslationKey } from "@upk/i18n";
import { useState, type FormEvent } from "react";
import { getTrpcClient } from "../lib/trpc";
import { TurnstileWidget } from "./turnstile";

const TYPES: { value: "ferme" | "adresse" | "telephone" | "horaire" | "autre"; key: TranslationKey }[] = [
  { value: "ferme", key: "report.types.ferme" },
  { value: "adresse", key: "report.types.adresse" },
  { value: "telephone", key: "report.types.telephone" },
  { value: "horaire", key: "report.types.horaire" },
  { value: "autre", key: "report.types.autre" },
];

const fieldClass =
  "mt-1 w-full rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--upk-primary)]";

export function ReportForm({ placeId, locale }: { placeId: string; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [typeProbleme, setTypeProbleme] = useState<(typeof TYPES)[number]["value"]>("ferme");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError(t(locale, "contribute.turnstile"));
      return;
    }
    setSubmitting(true);
    try {
      await getTrpcClient().reports.create.mutate({
        placeId,
        typeProbleme,
        description: description || undefined,
        email: email || undefined,
        turnstileToken: token,
      });
      setSuccess(true);
      setDescription("");
      setEmail("");
      setToken("");
    } catch {
      setError(t(locale, "report.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <details
      className="mt-8 rounded-xl border border-[var(--upk-border)] p-4"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm font-medium">
        {t(locale, "report.open")}
      </summary>
      {open && (
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <label>
            <span className="text-sm font-medium">{t(locale, "report.type")}</span>
            <select
              className={fieldClass}
              value={typeProbleme}
              onChange={(event) =>
                setTypeProbleme(event.target.value as (typeof TYPES)[number]["value"])
              }
            >
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {t(locale, type.key)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">{t(locale, "report.description")}</span>
            <textarea
              className={fieldClass}
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            <span className="text-sm font-medium">{t(locale, "report.email")}</span>
            <input
              className={fieldClass}
              type="email"
              maxLength={200}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <TurnstileWidget locale={locale} onToken={setToken} />
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm font-medium text-[var(--upk-primary)]">
              {t(locale, "report.success")}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="justify-self-start rounded-lg bg-[var(--upk-primary)] px-4 py-2 font-medium text-[var(--upk-primary-fg)] disabled:opacity-60"
          >
            {submitting ? t(locale, "report.submitting") : t(locale, "report.submit")}
          </button>
        </form>
      )}
    </details>
  );
}
