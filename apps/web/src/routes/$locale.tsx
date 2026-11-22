import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { localeSchema } from "@upk/domain";
import { t } from "@upk/i18n";

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
      ],
    };
  },
  component: LocaleLayout,
});

function LocaleLayout() {
  return <Outlet />;
}
