import { Link } from "@tanstack/react-router";
import type { Locale } from "@upk/domain";
import { t } from "@upk/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-[var(--upk-border)] px-6 py-8 text-sm text-[var(--upk-muted-fg)]">
      <nav
        className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-2"
        aria-label={t(locale, "footer.legal")}
      >
        <Link to="/$locale" params={{ locale }}>
          {t(locale, "nav.search")}
        </Link>
        <Link to="/$locale/contribuer" params={{ locale }}>
          {t(locale, "footer.contribute")}
        </Link>
        <Link to="/$locale/a-propos" params={{ locale }}>
          {t(locale, "footer.about")}
        </Link>
        <Link to="/$locale/confidentialite" params={{ locale }}>
          {t(locale, "nav.privacy")}
        </Link>
        <Link to="/$locale/conditions" params={{ locale }}>
          {t(locale, "nav.terms")}
        </Link>
        <Link to="/$locale/contact" params={{ locale }}>
          {t(locale, "nav.contact")}
        </Link>
        <Link to="/$locale/connexion" params={{ locale }}>
          {t(locale, "nav.login")}
        </Link>
      </nav>
      <p className="mx-auto mt-4 max-w-3xl text-xs">{t(locale, "footer.attribution")}</p>
    </footer>
  );
}
