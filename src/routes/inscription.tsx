import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AtSign, Check, CheckCircle2, LockKeyhole, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { AuthField, AuthLayout } from "@/components/upk/AuthLayout";
import { ChampMotDePasse } from "@/components/upk/ChampMotDePasse";
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
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [confirmationRequise, setConfirmationRequise] = useState(false);

  const exigences = useMemo(
    () => [
      { label: "8 caractères minimum", ok: motDePasse.length >= 8 },
      { label: "Un chiffre", ok: /\d/.test(motDePasse) },
      { label: "Une majuscule", ok: /[A-Z]/.test(motDePasse) },
      { label: "Un caractère spécial", ok: /[^A-Za-z0-9]/.test(motDePasse) },
    ],
    [motDePasse],
  );
  const force = exigences.filter((exigence) => exigence.ok).length;

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
    if (!data.session) {
      setConfirmationRequise(true);
      return;
    }
    navigate({ to: "/pro" });
  }

  if (confirmationRequise) {
    return (
      <AuthLayout
        mode="signup"
        title="Check your inbox"
        subtitle="One last step to activate your account"
      >
        <div className="auth-confirmation">
          <div className="auth-confirmation-icon">
            <CheckCircle2 />
          </div>
          <p>
            Un email de confirmation a été envoyé à <strong>{email}</strong>. Cliquez sur le lien
            qu&apos;il contient, puis connectez-vous.
          </p>
          <Link to="/connexion" className="auth-submit auth-submit-link">
            Go to login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout mode="signup" title="Create your account" subtitle="Join us today">
      <form onSubmit={onSubmit} className="auth-form">
        <AuthField
          id="nom"
          label="Full name"
          icon={<UserRound />}
          required
          autoComplete="name"
          placeholder="Votre nom complet"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
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
          <label htmlFor="mot-de-passe">Password</label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon" aria-hidden>
              <LockKeyhole />
            </span>
            <ChampMotDePasse
              id="mot-de-passe"
              required
              minLength={8}
              autoComplete="new-password"
              value={motDePasse}
              onChange={setMotDePasse}
            />
          </div>
          <div className="auth-strength" aria-live="polite">
            <div className="auth-strength-bars">
              {[1, 2, 3, 4].map((bar) => (
                <span key={bar} className={bar <= force ? `strength-${force}` : ""} />
              ))}
            </div>
            <span>
              {force === 0
                ? "Choose a strong password"
                : force < 3
                  ? "Password is getting stronger"
                  : "Strong password"}
            </span>
          </div>
          <div className="auth-requirements">
            {exigences.map((exigence) => (
              <span key={exigence.label} className={exigence.ok ? "requirement-ok" : ""}>
                <Check />
                {exigence.label}
              </span>
            ))}
          </div>
        </div>
        <div className="auth-field">
          <label htmlFor="confirmation-mot-de-passe">Confirm password</label>
          <div
            className={`auth-input-wrap${confirmation && confirmation === motDePasse ? " has-success" : ""}`}
          >
            <span className="auth-input-icon" aria-hidden>
              <LockKeyhole />
            </span>
            <ChampMotDePasse
              id="confirmation-mot-de-passe"
              required
              autoComplete="new-password"
              value={confirmation}
              onChange={setConfirmation}
            />
          </div>
          {confirmation && confirmation === motDePasse ? (
            <p className="auth-field-message auth-success">
              <CheckCircle2 /> Passwords match
            </p>
          ) : null}
        </div>
        <label className="auth-check">
          <input type="checkbox" required />
          <span>
            I agree to the <Link to="/conditions-utilisation">Terms and Conditions</Link>
          </span>
        </label>
        {erreur ? (
          <p className="auth-alert" role="alert">
            {erreur}
          </p>
        ) : null}
        <button type="submit" className="auth-submit" disabled={enCours}>
          {enCours ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/connexion">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
