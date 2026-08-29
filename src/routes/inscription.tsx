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
  const [confirmationRequise, setConfirmationRequise] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setEnCours(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { nom_complet: nom } },
    });
    setEnCours(false);
    if (error) {
      setErreur(
        error.message.includes("already registered")
          ? "Un compte existe déjà avec cet email."
          : error.message,
      );
      return;
    }
    // Si Supabase exige une confirmation par email, signUp ne renvoie pas de
    // session : on ne peut pas rediriger vers /pro (l'utilisateur n'est pas
    // encore connecté), il faut d'abord qu'il clique le lien reçu par mail.
    if (!data.session) {
      setConfirmationRequise(true);
      return;
    }
    navigate({ to: "/pro" });
  }

  if (confirmationRequise) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">
          Vérifiez votre boîte mail
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Un email de confirmation a été envoyé à {email}. Cliquez sur le lien qu'il contient, puis
          connectez-vous.
        </p>
        <Link to="/connexion" className="mt-4 text-sm font-medium text-primary">
          Aller à la connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 pb-16">
      <Link to="/" className="mb-6 self-start text-sm font-medium text-primary">
        ← Accueil
      </Link>
      <h1 className="font-display text-xl font-semibold text-foreground">Créer un compte pro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        L'espace pro sert à deux choses : gérer la fiche de votre établissement sur UPK (infos,
        horaires, photos, stock, statistiques de fréquentation), et — si vous le souhaitez — devenir
        modérateur pour aider à vérifier les lieux proposés par d'autres utilisateurs.
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
