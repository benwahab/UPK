import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/inscription")({
  head: () => ({ meta: [{ title: "Créer un compte pro — UPK Business" }] }),
  component: PageInscription,
});

function PageInscription() {
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { nom_complet: nom } },
    });
    setEnCours(false);
    if (error) {
      setErreur(
        error.message.includes("already registered")
          ? "Un compte existe déjà avec cet email."
          : "Impossible de créer le compte. Réessayez.",
      );
      return;
    }
    navigate({ to: "/pro" });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 pb-16">
      <h1 className="font-display text-xl font-semibold text-foreground">Créer un compte pro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ajoutez et gérez votre établissement sur UPK.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nom">Nom complet</Label>
          <Input id="nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
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
            minLength={8}
            autoComplete="new-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
        </div>
        {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
        <Button type="submit" variant="terrain" className="w-full" disabled={enCours}>
          {enCours ? "Création…" : "Créer mon compte"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link to="/connexion" className="font-medium text-primary">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
