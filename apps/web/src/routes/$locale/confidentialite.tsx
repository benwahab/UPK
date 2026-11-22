import { createFileRoute } from "@tanstack/react-router";
import { localeSchema } from "@upk/domain";
import { legalHead } from "../../components/legal-content";
import { LegalPage } from "../../components/legal-page";

export const Route = createFileRoute("/$locale/confidentialite")({
  head: ({ params }) => legalHead("privacy", localeSchema.parse(params.locale)),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { locale } = Route.useParams();
  return <LegalPage page="privacy" locale={localeSchema.parse(locale)} />;
}
