import { createFileRoute } from "@tanstack/react-router";
import { t } from "@upk/i18n";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-[var(--upk-primary)]">UPK</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{t("fr", "home.title")}</h1>
      <p className="mt-4 text-lg text-[var(--upk-muted-fg)]">{t("fr", "home.subtitle")}</p>
      <form
        className="mt-8 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          type="search"
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
      <p className="mt-10 text-xs text-[var(--upk-muted-fg)]">{t("fr", "footer.attribution")}</p>
    </main>
  );
}
