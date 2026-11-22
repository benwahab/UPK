import type { Locale } from "@upk/domain";
import { t } from "@upk/i18n";
import { useEffect, useRef } from "react";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "cf-turnstile-script";

export function TurnstileWidget({
  locale,
  onToken,
}: {
  locale: Locale;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let widgetId: string | undefined;
    let cancelled = false;

    const render = () => {
      if (cancelled || !container.current || !window.turnstile) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: siteKey,
        callback: onToken,
        "error-callback": () => onToken(""),
        theme: "auto",
      });
    };

    if (window.turnstile) {
      render();
    } else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [onToken, siteKey]);

  if (!siteKey) {
    return (
      <p className="text-sm text-[var(--upk-muted-fg)]">
        {t(locale, "contribute.turnstileUnavailable")}
      </p>
    );
  }

  return (
    <div
      ref={container}
      className="min-h-[65px]"
      aria-label={t(locale, "contribute.turnstile")}
    />
  );
}
