import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, UserRound } from "lucide-react";

export function AuthLayout({
  mode,
  title,
  subtitle,
  children,
}: {
  mode: "login" | "signup";
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" aria-hidden />
      <div className="auth-orb auth-orb-two" aria-hidden />
      <div className="auth-grid" aria-hidden />
      <section className="auth-card" aria-labelledby="auth-title">
        <Link to="/" className="auth-back-link">
          <ArrowLeft className="size-4" aria-hidden />
          Accueil
        </Link>
        <div className="auth-brand">
          <img src="/logo/upk-logo.png" alt="UPK" className="auth-logo" />
          <span>UPK Business</span>
        </div>
        <div className="auth-heading">
          <div className="auth-icon" aria-hidden>
            {mode === "login" ? <LockKeyhole /> : <UserRound />}
          </div>
          <p className="auth-kicker">Votre espace professionnel</p>
          <h1 id="auth-title">{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
      </section>
      <p className="auth-footer">UPK · Votre guide local au Niger</p>
    </main>
  );
}

export function AuthField({
  id,
  label,
  icon,
  error,
  success,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string | null;
  success?: boolean;
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div
        className={`auth-input-wrap${error ? " has-error" : ""}${success ? " has-success" : ""}`}
      >
        <span className="auth-input-icon" aria-hidden>
          {icon}
        </span>
        <input id={id} {...props} />
      </div>
      {error ? (
        <p className="auth-field-message auth-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
