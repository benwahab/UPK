import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { localeSchema, type Locale } from "@upk/domain";
import { t } from "@upk/i18n";
import { VoiceAssistant } from "../components/voice-assistant";
import { useDocumentTitle } from "../lib/use-document-title";

const OG_LOCALES: Record<Locale, string> = { fr: "fr_FR", en: "en_US", ar: "ar_AR" };

export const Route = createFileRoute("/$locale")({
  beforeLoad: ({ params }) => {
    const parsed = localeSchema.safeParse(params.locale);
    if (!parsed.success) {
      throw redirect({ to: "/$locale", params: { locale: "fr" } });
    }
    return { locale: parsed.data };
  },
  head: ({ params }) => {
    const parsed = localeSchema.safeParse(params.locale);
    if (!parsed.success) return {};
    const locale = parsed.data;
    return {
      meta: [
        { title: `${t(locale, "app.name")} — ${t(locale, "home.title")}` },
        { name: "description", content: t(locale, "home.subtitle") },
        { property: "og:site_name", content: t(locale, "app.name") },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: OG_LOCALES[locale] },
        { property: "og:title", content: `${t(locale, "app.name")} — ${t(locale, "home.title")}` },
        { property: "og:description", content: t(locale, "home.subtitle") },
      ],
    };
  },
  component: LocaleLayout,
});

function LocaleLayout() {
  const { locale } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useDocumentTitle(
    pathname === `/${locale}` || pathname === `/${locale}/`
      ? `${t(locale, "app.name")} — ${t(locale, "home.title")}`
      : null,
  );
  return (
    <>
      <Outlet />
      <VoiceAssistant locale={locale} />
    </>
  );
}
