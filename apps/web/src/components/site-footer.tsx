import { Link, useRouterState } from "@tanstack/react-router";
import type { Locale } from "@upk/domain";
import { t } from "@upk/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const linkClass = "py-1 hover:text-[var(--upk-fg)] hover:underline";
  return (
    <footer className="border-t border-[var(--upk-border)] px-4 pb-1 pt-1.5 text-[11px] leading-tight text-[var(--upk-muted-fg)]">
      <nav
        className="mx-auto flex max-w-3xl flex-wrap justify-center gap-x-5"
        aria-label={t(locale, "footer.legal")}
      >
        {!onHome && (
          <>
            <Link to="/$locale" params={{ locale }} className={linkClass}>
              {t(locale, "nav.search")}
            </Link>
            <Link to="/$locale/contribuer" params={{ locale }} className={linkClass}>
              {t(locale, "footer.contribute")}
            </Link>
          </>
        )}
        <Link to="/$locale/a-propos" params={{ locale }} className={linkClass}>
          {t(locale, "footer.about")}
        </Link>
        <Link to="/$locale/contact" params={{ locale }} className={linkClass}>
          {t(locale, "nav.contact")}
        </Link>
        <Link to="/$locale/confidentialite" params={{ locale }} className={linkClass}>
          {t(locale, "nav.privacy")}
        </Link>
        <Link to="/$locale/conditions" params={{ locale }} className={linkClass}>
          {t(locale, "nav.terms")}
        </Link>
        {!onHome && (
          <Link to="/$locale/connexion" params={{ locale }} className={linkClass}>
            {t(locale, "nav.login")}
          </Link>
        )}
      </nav>
      <p className="mt-0.5 text-center">
        {t(locale, "footer.copyright").replace("{year}", String(new Date().getFullYear()))}
      </p>
      <p className="mt-1 text-center">{t(locale, "footer.attribution")}</p>
    </footer>
  );
}
