import { createFileRoute, Link } from "@tanstack/react-router";
import { localeSchema } from "@upk/domain";
import { t } from "@upk/i18n";
import { ContributionForm } from "../../components/contribution-form";
import { absoluteUrl } from "../../lib/site";
import { useDocumentTitle } from "../../lib/use-document-title";
import { listCategories } from "../../server/places";

export const Route = createFileRoute("/$locale/contribuer")({
  loader: ({ params }) => listCategories({ data: localeSchema.parse(params.locale) }),
  head: ({ params }) => {
    const locale = localeSchema.parse(params.locale);
    const title = `${t(locale, "contribute.title")} — ${t(locale, "app.name")}`;
    return {
      meta: [
        { title },
        { name: "description", content: t(locale, "contribute.subtitle") },
        { property: "og:title", content: title },
        { property: "og:description", content: t(locale, "contribute.subtitle") },
      ],
      links: [
        { rel: "canonical", href: absoluteUrl(`/${locale}/contribuer`) },
        { rel: "alternate", hrefLang: "fr", href: absoluteUrl("/fr/contribuer") },
        { rel: "alternate", hrefLang: "en", href: absoluteUrl("/en/contribuer") },
        { rel: "alternate", hrefLang: "ar", href: absoluteUrl("/ar/contribuer") },
        { rel: "alternate", hrefLang: "x-default", href: absoluteUrl("/fr/contribuer") },
      ],
    };
  },
  component: ContributePage,
});

function ContributePage() {
  const { locale: rawLocale } = Route.useParams();
  const locale = localeSchema.parse(rawLocale);
  useDocumentTitle(`${t(locale, "contribute.title")} — ${t(locale, "app.name")}`);
  const categories = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link to="/$locale" params={{ locale }} className="text-sm text-[var(--upk-muted-fg)]">
        {t(locale, "contribute.back")}
      </Link>
      <h1 className="mt-4 text-4xl font-bold">{t(locale, "contribute.title")}</h1>
      <p className="mt-3 text-lg text-[var(--upk-muted-fg)]">
        {t(locale, "contribute.subtitle")}
      </p>
      <p className="mt-2 text-xs text-[var(--upk-muted-fg)]">
        {t(locale, "contribute.required")}
      </p>
      <ContributionForm locale={locale} categories={categories} />
    </main>
  );
}
