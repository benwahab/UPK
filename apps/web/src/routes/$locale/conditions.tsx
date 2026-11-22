import { createFileRoute } from "@tanstack/react-router";
import { localeSchema } from "@upk/domain";
import { legalHead } from "../../components/legal-content";
import { LegalPage } from "../../components/legal-page";

export const Route = createFileRoute("/$locale/conditions")({
  head: ({ params }) => legalHead("terms", localeSchema.parse(params.locale)),
  component: TermsPage,
});

function TermsPage() {
  const { locale } = Route.useParams();
  return <LegalPage page="terms" locale={localeSchema.parse(locale)} />;
}
