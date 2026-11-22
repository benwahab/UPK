import { createFileRoute } from "@tanstack/react-router";
import { localeSchema } from "@upk/domain";
import { legalHead } from "../../components/legal-content";
import { LegalPage } from "../../components/legal-page";

export const Route = createFileRoute("/$locale/a-propos")({
  head: ({ params }) => legalHead("about", localeSchema.parse(params.locale)),
  component: AboutPage,
});

function AboutPage() {
  const { locale } = Route.useParams();
  return <LegalPage page="about" locale={localeSchema.parse(locale)} />;
}
