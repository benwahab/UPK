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
  const [nonConfirme, setNonConfirme] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);
  const [renvoye, setRenvoye] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setNonConfirme(false);
    setRenvoye(false);
    setEnCours(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setEnCours(false);
    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setNonConfirme(true);
        setErreur("Compte non confirmé. Vérifiez votre boîte mail (et les spams) pour le lien de confirmation.");
      } else {
        setErreur(error.message.includes("Invalid login credentials") ? "Email ou mot de passe incorrect." : error.message);
      }
      return;
    }
    navigate({ to: "/pro" });
  }

  async function onRenvoyerConfirmation() {
    setRenvoiEnCours(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setRenvoiEnCours(false);
    if (!error) setRenvoye(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 pb-16">
      <Link to="/" className="mb-6 self-start text-sm font-medium text-primary">
        ← Accueil
      </Link>
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
          <Link to="/mot-de-passe-oublie" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
        {nonConfirme ? (
          renvoye ? (
            <p className="text-sm text-primary">Email de confirmation renvoyé.</p>
          ) : (
            <button
              type="button"
              onClick={onRenvoyerConfirmation}
              disabled={renvoiEnCours}
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {renvoiEnCours ? "Envoi…" : "Renvoyer l'email de confirmation"}
            </button>
          )
        ) : null}
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
