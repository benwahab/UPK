import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reinitialiser-mot-de-passe")({
  head: () => ({ meta: [{ title: "Nouveau mot de passe — UPK" }] }),
  component: PageReinitialiser,
});

function PageReinitialiser() {
  const navigate = useNavigate();
  const [pret, setPret] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [reussi, setReussi] = useState(false);

  useEffect(() => {
    // Le lien reçu par email place un jeton de récupération dans l'URL ;
    // le SDK Supabase l'échange automatiquement contre une session et émet
    // cet événement. Tant qu'il n'est pas arrivé, on ne montre pas le
    // formulaire (sinon updateUser échouerait sans session valide).
    const { data: abonnement } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPret(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPret(true);
    });
    return () => abonnement.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCours(false);
    if (error) {
      setErreur("Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.");
      return;
    }
    setReussi(true);
    setTimeout(() => navigate({ to: "/pro" }), 1500);
  }

  if (reussi) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">
          Mot de passe mis à jour
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Redirection…</p>
      </main>
    );
  }

  if (!pret) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-muted-foreground">Vérification du lien…</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Rien ne se passe ?{" "}
          <Link to="/mot-de-passe-oublie" className="font-medium text-primary">
            Redemander un lien
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 pb-16">
      <h1 className="font-display text-xl font-semibold text-foreground">Nouveau mot de passe</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="mot-de-passe">Nouveau mot de passe</Label>
          <Input
            id="mot-de-passe"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmation">Confirmer le mot de passe</Label>
          <Input
            id="confirmation"
            type="password"
            required
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
        {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
        <Button type="submit" variant="terrain" className="w-full" disabled={enCours}>
          {enCours ? "Mise à jour…" : "Mettre à jour le mot de passe"}
        </Button>
      </form>
    </main>
  );
}
