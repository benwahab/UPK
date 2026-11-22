import { createFileRoute } from "@tanstack/react-router";
import { localeSchema } from "@upk/domain";
import { legalHead } from "../../components/legal-content";
import { LegalPage } from "../../components/legal-page";

export const Route = createFileRoute("/$locale/contact")({
  head: ({ params }) => legalHead("contact", localeSchema.parse(params.locale)),
  component: ContactPage,
});

function ContactPage() {
  const { locale } = Route.useParams();
  return <LegalPage page="contact" locale={localeSchema.parse(locale)} />;
}
