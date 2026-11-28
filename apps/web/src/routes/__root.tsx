import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SiteFooter } from "../components/site-footer";
import { ThemeToggle } from "../components/theme-toggle";
import { absoluteUrl } from "../lib/site";
import appCss from "../styles.css?inline";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#F5FFFA" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "UPK" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { title: "UPK — Votre guide local" },
      { name: "description", content: "Trouvez un lieu proche de vous au Niger." },
      { name: "robots", content: "index,follow" },
      { property: "og:site_name", content: "UPK" },
      { property: "og:image", content: absoluteUrl("/og-default.png") },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "UPK — Votre guide local" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "UPK — Votre guide local" },
      { name: "twitter:description", content: "Trouvez un lieu proche de vous au Niger." },
      { name: "twitter:image", content: absoluteUrl("/og-default.png") },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const locale =
    pathname === "/en" || pathname.startsWith("/en/")
      ? "en"
      : pathname === "/ar" || pathname.startsWith("/ar/")
        ? "ar"
        : "fr";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("upk-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()',
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: appCss }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [updateReady, setUpdateReady] = useState(false);
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateRequested = useRef(false);

  useEffect(() => {
    const splashTimer = window.setTimeout(() => setShowLaunchSplash(false), 1100);
    return () => window.clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      if (updateRequested.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    if (navigator.storage?.persist) {
      void navigator.storage.persist().catch(() => {});
    }
    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      registrationRef.current = registration;
      if (registration.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
      }
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const reload = () => {
    updateRequested.current = true;
    registrationRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  const install = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
    } finally {
      setInstallPrompt(null);
    }
  };

  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const locale =
    pathname === "/en" || pathname.startsWith("/en/")
      ? "en"
      : pathname === "/ar" || pathname.startsWith("/ar/")
        ? "ar"
        : "fr";
  const labels =
    locale === "en"
      ? { update: "A new version is available.", reload: "Reload", install: "Install UPK" }
      : locale === "ar"
        ? { update: "تتوفر نسخة جديدة.", reload: "إعادة التحميل", install: "تثبيت UPK" }
        : {
            update: "Une nouvelle version est disponible.",
            reload: "Recharger",
            install: "Installer UPK",
          };

  return (
    <QueryClientProvider client={queryClient}>
      {showLaunchSplash && <div className="upk-launch-splash" role="status" aria-label="UPK"><img src="/icon-512.png" alt="UPK" /></div>}
      <div className="fixed end-3 top-3 z-40 rounded-full border border-[var(--upk-border)] bg-[var(--upk-card)] shadow-sm">
        <ThemeToggle locale={locale} />
      </div>
      <Outlet />
      <SiteFooter locale={locale} />
      {updateReady && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-[var(--upk-border)] bg-[var(--upk-bg)] p-3 shadow-lg"
        >
          <span className="text-sm">{labels.update}</span>
          <button
            type="button"
            onClick={reload}
            className="rounded-lg bg-[var(--upk-primary)] px-3 py-1.5 text-sm font-medium text-[var(--upk-primary-fg)]"
          >
            {labels.reload}
          </button>
        </div>
      )}
      {installPrompt && (
        <div className="fixed bottom-4 start-4 z-50">
          <button
            type="button"
            onClick={install}
            className="rounded-lg border border-[var(--upk-border)] bg-[var(--upk-bg)] px-4 py-3 text-sm font-medium shadow-lg"
          >
            {labels.install}
          </button>
        </div>
      )}
    </QueryClientProvider>
  );
}
