import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { localeSchema } from "@upk/domain";
import { t } from "@upk/i18n";
import { useState, type FormEvent } from "react";
import { useDocumentTitle } from "../../lib/use-document-title";

export const Route = createFileRoute("/$locale/connexion")({
  head: ({ params }) => {
    const locale = localeSchema.parse(params.locale);
    return {
      meta: [
        { title: `${t(locale, "login.title")} — ${t(locale, "app.name")}` },
        { name: "robots", content: "noindex,nofollow" },
      ],
    };
  },
  component: LoginPage,
});

const fieldClass =
  "mt-1 w-full rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--upk-primary)]";

function LoginPage() {
  const { locale: rawLocale } = Route.useParams();
  const locale = localeSchema.parse(rawLocale);
  useDocumentTitle(`${t(locale, "login.title")} — ${t(locale, "app.name")}`);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email";
      const body =
        mode === "signup" ? { email, password, name } : { email, password };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? t(locale, "login.error"));
        return;
      }
      void navigate({ to: "/$locale/admin/moderation", params: { locale } });
    } catch {
      setError(t(locale, "login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Link to="/$locale" params={{ locale }} className="text-sm text-[var(--upk-muted-fg)]">
        {t(locale, "login.back")}
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{t(locale, "login.title")}</h1>
      <p className="mt-2 text-[var(--upk-muted-fg)]">{t(locale, "login.subtitle")}</p>

      <form className="mt-8 grid gap-4" onSubmit={submit}>
        {mode === "signup" && (
          <label>
            <span className="text-sm font-medium">{t(locale, "login.name")}</span>
            <input
              className={fieldClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
              autoComplete="name"
            />
          </label>
        )}
        <label>
          <span className="text-sm font-medium">{t(locale, "login.email")}</span>
          <input
            className={fieldClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          <span className="text-sm font-medium">{t(locale, "login.password")}</span>
          <input
            className={fieldClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--upk-primary)] px-5 py-3 font-medium text-[var(--upk-primary-fg)] disabled:opacity-60"
        >
          {mode === "signup" ? t(locale, "login.signUp") : t(locale, "login.signIn")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="mt-4 text-sm font-medium text-[var(--upk-primary)]"
      >
        {mode === "signin" ? t(locale, "login.toggleSignUp") : t(locale, "login.toggleSignIn")}
      </button>
    </main>
  );
}
