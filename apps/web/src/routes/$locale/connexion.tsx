import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { localeSchema } from "@upk/domain";
import { t } from "@upk/i18n";
import { useState, type FormEvent } from "react";
import { useDocumentTitle } from "../../lib/use-document-title";

type AccountType = "moderation" | "professional";
type GpsPosition = { latitude: number; longitude: number; accuracy: number };

export const Route = createFileRoute("/$locale/connexion")({
  head: ({ params }) => {
    const locale = localeSchema.parse(params.locale);
    return {
      meta: [
        { title: `${t(locale, "login.title")} — ${t(locale, "app.name")}` },
        { name: "robots", content: "noindex,nofollow" },
      ],
    };
  },
  component: LoginPage,
});

const inputClass = "upk-auth-input";
const labelClass = "upk-auth-label";

function LoginPage() {
  const { locale: rawLocale } = Route.useParams();
  const locale = localeSchema.parse(rawLocale);
  useDocumentTitle(`${t(locale, "login.title")} — ${t(locale, "app.name")}`);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [accountType, setAccountType] = useState<AccountType>("professional");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [establishmentType, setEstablishmentType] = useState("");
  const [city, setCity] = useState("");
  const [commune, setCommune] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [interventionSector, setInterventionSector] = useState("");
  const [gps, setGps] = useState<GpsPosition | null>(null);
  const [existingAccountSession, setExistingAccountSession] = useState(false);
  const [locating, setLocating] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function captureGps() {
    setError(null);
    setGps(null);
    if (!navigator.geolocation) {
      setError(t(locale, "login.gpsUnsupported"));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocating(false);
      },
      () => {
        setError(t(locale, "login.gpsError"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const response = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          setError(payload?.message ?? t(locale, "login.error"));
          return;
        }
        const statusResponse = await fetch("/api/account-applications", { credentials: "include" });
        const status = (await statusResponse.json().catch(() => null)) as { status?: string; isAdmin?: boolean } | null;
        if (status?.isAdmin) {
          void navigate({ to: "/$locale/admin/moderation", params: { locale } });
        } else if (status?.status === "approved") {
          void navigate({ to: "/$locale", params: { locale } });
        } else if (status?.status === "pending") {
          setNotice(t(locale, "login.pending"));
        } else if (status?.status === "rejected") {
          setNotice(t(locale, "login.rejected"));
        } else {
          setExistingAccountSession(true);
          setMode("signup");
          setNotice(t(locale, "login.noApplication"));
        }
        return;
      }

      if (!gps) {
        setError(t(locale, "login.gpsRequired"));
        return;
      }
      if (password.length < 8) {
        setError(t(locale, "login.passwordHint"));
        return;
      }
      if (!existingAccountSession && password !== confirmPassword) {
        setError(t(locale, "login.passwordMismatch"));
        return;
      }

      if (!existingAccountSession) {
        const fullName = accountType === "moderation"
          ? `${firstName.trim()} ${lastName.trim()}`.trim()
          : organizationName.trim();
        const signUpResponse = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, name: fullName }),
          credentials: "include",
        });
        if (!signUpResponse.ok) {
          const payload = (await signUpResponse.json().catch(() => null)) as { message?: string } | null;
          setError(payload?.message ?? t(locale, "login.error"));
          return;
        }
      }

      const applicationResponse = await fetch("/api/account-applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountType,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          organizationName: organizationName.trim(),
          establishmentType: establishmentType.trim(),
          city: city.trim(),
          commune: commune.trim(),
          neighborhood: neighborhood.trim(),
          interventionSector: interventionSector.trim(),
          latitude: gps.latitude,
          longitude: gps.longitude,
          gpsAccuracy: gps.accuracy,
        }),
      });
      if (!applicationResponse.ok) {
        const payload = (await applicationResponse.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? t(locale, "login.applicationError"));
        return;
      }
      setNotice(t(locale, "login.submitted"));
      setMode("signin");
      setExistingAccountSession(false);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError(t(locale, "login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const isSignup = mode === "signup";
  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  return (
    <main className="upk-auth-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="upk-auth-layout">
        <aside className="upk-auth-brand">
          <p className="upk-auth-eyebrow">UPK · GUIDE LOCAL · CONFIANCE</p>
          <h2>{t(locale, "login.brandTitle")} <span>{t(locale, "login.brandAccent")}</span></h2>
          <p className="upk-auth-brand-copy">{t(locale, "login.brandText")}</p>
          <div className="upk-auth-orbit" aria-hidden="true">
            <div className="upk-auth-orbit-core"><span>UPK</span></div>
          </div>
        </aside>

        <section className="upk-auth-card">
          <div className="upk-auth-card-top">
            <Link to="/$locale" params={{ locale }} className="upk-auth-logo" aria-label="UPK accueil"><img src="/upk-logo.png" alt="UPK" width={216} height={92} className="h-auto w-28" /></Link>
            <Link
              to="/$locale"
              params={{ locale }}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--upk-border)] px-4 text-sm font-semibold text-[var(--upk-muted-fg)] transition-colors hover:bg-[var(--upk-muted)] hover:text-[var(--upk-fg)]"
            >
              {locale === "en" ? "Back to search" : locale === "ar" ? "العودة إلى البحث" : "Retour à la recherche"}
            </Link>
          </div>

          <div className="upk-auth-heading">
            <p className="upk-auth-kicker">{isSignup ? t(locale, "login.createEyebrow") : t(locale, "login.welcome")}</p>
            <h1>{isSignup ? t(locale, "login.createTitle") : t(locale, "login.title")}</h1>
            <p>{isSignup ? t(locale, "login.createSubtitle") : t(locale, "login.subtitle")}</p>
          </div>

          {notice && <p className="upk-auth-notice" role="status">{notice}</p>}
          {error && <p className="upk-auth-error" role="alert">{error}</p>}

          <form className="upk-auth-form" onSubmit={submit}>
            {isSignup && (
              <>
                <div className="upk-auth-type-switch" role="group" aria-label={t(locale, "login.accountType")}>
                  <button type="button" className={accountType === "professional" ? "active" : ""} onClick={() => setAccountType("professional")}>{t(locale, "login.professional")}</button>
                  <button type="button" className={accountType === "moderation" ? "active" : ""} onClick={() => setAccountType("moderation")}>{t(locale, "login.moderation")}</button>
                </div>

                {accountType === "moderation" ? (
                  <div className="upk-auth-grid">
                    <label className={labelClass}>{t(locale, "login.firstName")}
                      <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required maxLength={80} />
                    </label>
                    <label className={labelClass}>{t(locale, "login.lastName")}
                      <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required maxLength={80} />
                    </label>
                  </div>
                ) : (
                  <>
                    <label className={labelClass}>{t(locale, "login.organizationName")}
                      <input className={inputClass} value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required maxLength={160} autoComplete="organization" />
                    </label>
                    <label className={labelClass}>{t(locale, "login.establishmentType")}
                      <input className={inputClass} value={establishmentType} onChange={(e) => setEstablishmentType(e.target.value)} required maxLength={100} placeholder={t(locale, "login.establishmentPlaceholder")} />
                    </label>
                  </>
                )}

                <label className={labelClass}>{t(locale, "login.phone")}
                  <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={30} autoComplete="tel" />
                </label>
                <div className="upk-auth-grid">
                  <label className={labelClass}>{t(locale, "login.city")}
                    <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} required maxLength={100} />
                  </label>
                  <label className={labelClass}>{t(locale, "login.commune")}
                    <input className={inputClass} value={commune} onChange={(e) => setCommune(e.target.value)} required maxLength={100} />
                  </label>
                </div>
                <label className={labelClass}>{t(locale, "login.neighborhood")}
                  <input className={inputClass} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required maxLength={120} />
                </label>
                {accountType === "moderation" && (
                  <label className={labelClass}>{t(locale, "login.interventionSector")} <span>{t(locale, "login.optional")}</span>
                    <input className={inputClass} value={interventionSector} onChange={(e) => setInterventionSector(e.target.value)} maxLength={160} />
                  </label>
                )}
              </>
            )}

            <label className={labelClass}>{t(locale, "login.email")}
              <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" maxLength={254} />
            </label>
            <label className={labelClass}>{t(locale, "login.password")}
              <div className="upk-auth-password">
                <input className={inputClass} type={passwordVisible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={isSignup ? "new-password" : "current-password"} />
                <button type="button" onClick={() => setPasswordVisible((v) => !v)} aria-label={passwordVisible ? t(locale, "login.hidePassword") : t(locale, "login.showPassword")}>{passwordVisible ? "◉" : "◎"}</button>
              </div>
              {isSignup && <small>{t(locale, "login.passwordHint")}</small>}
            </label>
            {isSignup && !existingAccountSession && (
              <label className={labelClass}>{t(locale, "login.confirmPassword")}
                <input className={inputClass} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              </label>
            )}

            {isSignup && (
              <div className="upk-auth-gps">
                <div>
                  <strong>{t(locale, "login.gpsTitle")}</strong>
                  <p>{gps ? t(locale, "login.gpsAccuracy").replace("{value}", String(Math.round(gps.accuracy))) : t(locale, "login.gpsDescription")}</p>
                </div>
                <button type="button" onClick={captureGps} disabled={locating}>{locating ? t(locale, "login.gpsLocating") : gps ? t(locale, "login.gpsRefresh") : t(locale, "login.gpsButton")}</button>
                {gps && <span className="upk-auth-gps-ok">✓ {t(locale, "login.gpsCaptured")}</span>}
              </div>
            )}

            <button className="upk-auth-submit" type="submit" disabled={submitting || locating}>{submitting ? t(locale, "login.loading") : isSignup ? t(locale, "login.submitApplication") : t(locale, "login.signIn")}</button>
          </form>

          <div className="upk-auth-switch">
            {isSignup ? t(locale, "login.haveAccount") : t(locale, "login.noAccount")}
            <button type="button" onClick={() => switchMode(isSignup ? "signin" : "signup")}>{isSignup ? t(locale, "login.signIn") : t(locale, "login.signUp")}</button>
          </div>
          {isSignup && <p className="upk-auth-footnote">{t(locale, "login.noDocuments")}</p>}
        </section>
      </div>
    </main>
  );
}
