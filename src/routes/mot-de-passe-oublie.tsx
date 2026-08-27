import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mot-de-passe-oublie")({
  head: () => ({ meta: [{ title: "Mot de passe oublié — UPK" }] }),
  component: PageMotDePasseOublie,
});

function PageMotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setEnCours(false);
    // On affiche toujours le même message de succès, que l'email existe ou
    // non dans la base : ça évite de révéler quels emails ont un compte.
    if (error) {
      setErreur("Une erreur est survenue. Réessayez dans un instant.");
      return;
    }
    setEnvoye(true);
  }

  if (envoye) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">
          Vérifiez votre boîte mail
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Si un compte existe avec {email}, un lien de réinitialisation vient d'être envoyé.
          Vérifiez aussi les spams.
        </p>
        <Link to="/connexion" className="mt-4 text-sm font-medium text-primary">
          Retour à la connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 pb-16">
      <Link to="/" className="mb-6 self-start text-sm font-medium text-primary">
        ← Accueil
      </Link>
      <h1 className="font-display text-xl font-semibold text-foreground">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Indiquez l'email de votre compte, on vous envoie un lien pour le réinitialiser.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
        <Button type="submit" variant="terrain" className="w-full" disabled={enCours}>
          {enCours ? "Envoi…" : "Envoyer le lien"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link to="/connexion" className="font-medium text-primary">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
