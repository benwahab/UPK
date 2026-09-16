import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AtSign, CheckCircle2, LockKeyhole, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { AuthField, AuthLayout } from "@/components/upk/AuthLayout";
import { ChampMotDePasse } from "@/components/upk/ChampMotDePasse";
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
        setErreur("Compte non confirmé. Vérifiez votre boîte mail et vos spams.");
      } else {
        setErreur(
          error.message.includes("Invalid login credentials")
            ? "Email ou mot de passe incorrect."
            : error.message,
        );
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
    <AuthLayout mode="login" title="Welcome back" subtitle="Sign in to continue your journey">
      <form onSubmit={onSubmit} className="auth-form">
        <AuthField
          id="email"
          label="Email address"
          icon={<AtSign />}
          type="email"
          required
          autoComplete="email"
          placeholder="vous@entreprise.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="auth-field">
          <div className="auth-label-row">
            <label htmlFor="mot-de-passe">Password</label>
            <Link to="/mot-de-passe-oublie" className="auth-inline-link">
              Forgot password?
            </Link>
          </div>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden>
              <LockKeyhole />
            </span>
            <ChampMotDePasse
              id="mot-de-passe"
              required
              autoComplete="current-password"
              value={motDePasse}
              onChange={setMotDePasse}
            />
          </div>
        </div>
        <label className="auth-check">
          <input type="checkbox" />
          <span>Remember me</span>
        </label>
        {erreur ? (
          <p className="auth-alert" role="alert">
            {erreur}
          </p>
        ) : null}
        {nonConfirme ? (
          renvoye ? (
            <p className="auth-success" role="status">
              <CheckCircle2 /> Email de confirmation renvoyé.
            </p>
          ) : (
            <button
              type="button"
              onClick={onRenvoyerConfirmation}
              disabled={renvoiEnCours}
              className="auth-inline-link auth-resend"
            >
              {renvoiEnCours ? "Sending…" : "Resend confirmation email"}
            </button>
          )
        ) : null}
        <button type="submit" className="auth-submit" disabled={enCours}>
          {enCours ? <LoaderCircle className="auth-spinner" /> : null}
          {enCours ? "Signing in…" : "Login"}
        </button>
      </form>
      <p className="auth-switch">
        Don&apos;t have an account? <Link to="/inscription">Create account</Link>
      </p>
    </AuthLayout>
  );
}
