import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Nous contacter — UPK" }] }),
  component: PageContact,
});

function PageContact() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16">
      <div className="pt-6">
        <Link to="/" className="text-sm font-medium text-primary">
          ← Accueil
        </Link>
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-foreground">Nous contacter</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Une question, un signalement, une demande de partenariat ? Écrivez-nous.
      </p>

      <div className="mt-5 space-y-3">
        <a
          href="mailto:universpk1@gmail.com"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <Mail className="size-5 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium text-card-foreground">Email</p>
            <p className="text-sm text-muted-foreground">universpk1@gmail.com</p>
          </div>
        </a>

        <a
          href="tel:+22793560626"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <Phone className="size-5 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium text-card-foreground">Téléphone</p>
            <p className="text-sm text-muted-foreground">+227 93 56 06 26</p>
          </div>
        </a>

        <a
          href="https://wa.me/22793560626"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <MessageCircle className="size-5 text-primary" aria-hidden />
          <div>
            <p className="text-sm font-medium text-card-foreground">WhatsApp</p>
            <p className="text-sm text-muted-foreground">+227 93 56 06 26</p>
          </div>
        </a>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Pour signaler une erreur sur une fiche précise, utilisez plutôt le bouton « Signaler un
        problème » directement sur la fiche concernée — c'est traité plus rapidement.
      </p>
    </main>
  );
}
