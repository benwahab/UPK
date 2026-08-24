import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  head: () => ({ meta: [{ title: "Connexion — UPK Business" }] }),
  component: PageConnexion,
});

function PageConnexion() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setEnCours(false);
    if (error) {
      setErreur(
        error.message.includes("Email not confirmed")
          ? "Compte non confirmé. Vérifiez votre boîte mail (et les spams) pour le lien de confirmation."
          : error.message.includes("Invalid login credentials")
            ? "Email ou mot de passe incorrect."
            : error.message,
      );
      return;
    }
    navigate({ to: "/pro" });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 pb-16">
      <h1 className="font-display text-xl font-semibold text-foreground">Connexion Espace pro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gérez vos établissements sur UPK.
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
        <div className="space-y-1.5">
          <Label htmlFor="mot-de-passe">Mot de passe</Label>
          <Input
            id="mot-de-passe"
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </div>
        {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
        <Button type="submit" variant="terrain" className="w-full" disabled={enCours}>
          {enCours ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Pas encore de compte pro ?{" "}
        <Link to="/inscription" className="font-medium text-primary">
          Créer un compte
        </Link>
      </p>
    </main>
  );
}
