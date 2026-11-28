import { Link } from "@tanstack/react-router";
import type { Locale } from "@upk/domain";
import { t } from "@upk/i18n";
import { useDocumentTitle } from "../lib/use-document-title";
import { legalContent, type LegalPageKey } from "./legal-content";

export function LegalPage({ page, locale }: { page: LegalPageKey; locale: Locale }) {
  const content = legalContent[page][locale];
  useDocumentTitle(`${content.title} — ${t(locale, "app.name")}`);
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/$locale" params={{ locale }} className="text-sm text-[var(--upk-muted-fg)]">
        {t(locale, "legal.back")}
      </Link>
      <h1 className="mt-4 text-4xl font-bold">{content.title}</h1>
      <p className="mt-3 text-lg text-[var(--upk-muted-fg)]">{content.description}</p>
      <div className="mt-8 space-y-4 leading-relaxed">
        {content.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {content.email && (
        <p className="mt-8">
          <a
            href={`mailto:${content.email}`}
            className="font-medium text-[var(--upk-primary-text)] break-all"
          >
            {content.email}
          </a>
        </p>
      )}
      <p className="mt-10 text-xs text-[var(--upk-muted-fg)]">{t(locale, "legal.updated")}</p>
    </main>
  );
}
