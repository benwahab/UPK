import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Locale } from "@upk/domain";
import { t } from "@upk/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const socials = useQuery({ queryKey: ["site-content"], queryFn: async () => { const response = await fetch("/api/partners"); if (!response.ok) throw new Error("Impossible de charger les liens sociaux."); return response.json() as Promise<{ socials: { facebook: string; tiktok: string; instagram: string } }>; }, staleTime: 60_000 }).data?.socials ?? { facebook: "", tiktok: "", instagram: "" };
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
      <nav aria-label={locale === "ar" ? "الشبكات الاجتماعية" : locale === "en" ? "Social networks" : "Réseaux sociaux"} className="mx-auto mt-3 flex items-center justify-center gap-5 pb-2">
        <SocialLink label="Facebook" href={socials.facebook}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="currentColor"><path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z"/></svg>
        </SocialLink>
        <SocialLink label="TikTok" href={socials.tiktok}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="currentColor"><path d="M19.6 7.1a5.4 5.4 0 0 1-3.3-1.1 5.5 5.5 0 0 1-1.9-2.8h-3.2v12.1a2.6 2.6 0 1 1-2.6-2.6c.3 0 .6 0 .9.1V9.5a6 6 0 0 0-.9-.1 5.8 5.8 0 1 0 5.8 5.8V9.1a8.6 8.6 0 0 0 5.2 1.7V7.6c0-.1 0-.3 0-.5Z"/></svg>
        </SocialLink>
        <SocialLink label="Instagram" href={socials.instagram}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" fill="currentColor" stroke="none"/></svg>
        </SocialLink>
      </nav>
    </footer>
  );
}

function SocialLink({ label, href, children }: { label: string; href: string; children: ReactNode }) {
  const className = "flex size-10 items-center justify-center rounded-full border border-[var(--upk-border)] text-[var(--upk-muted-fg)]";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={className}>{children}</a>
  ) : (
    <span aria-label={label} title={label} className={className}>{children}</span>
  );
}