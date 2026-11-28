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

const APPLE_SPLASH_SCREENS = [
  { width: 1320, height: 2868, cssWidth: 440, cssHeight: 956, ratio: 3 },
  { width: 1206, height: 2622, cssWidth: 402, cssHeight: 874, ratio: 3 },
  { width: 1290, height: 2796, cssWidth: 430, cssHeight: 932, ratio: 3 },
  { width: 1179, height: 2556, cssWidth: 393, cssHeight: 852, ratio: 3 },
  { width: 1284, height: 2778, cssWidth: 428, cssHeight: 926, ratio: 3 },
  { width: 1170, height: 2532, cssWidth: 390, cssHeight: 844, ratio: 3 },
  { width: 1125, height: 2436, cssWidth: 375, cssHeight: 812, ratio: 3 },
  { width: 1242, height: 2688, cssWidth: 414, cssHeight: 896, ratio: 3 },
  { width: 828, height: 1792, cssWidth: 414, cssHeight: 896, ratio: 2 },
  { width: 1242, height: 2208, cssWidth: 414, cssHeight: 736, ratio: 3 },
  { width: 750, height: 1334, cssWidth: 375, cssHeight: 667, ratio: 2 },
  { width: 640, height: 1136, cssWidth: 320, cssHeight: 568, ratio: 2 },
];

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#FFFFFF" },
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
      ...APPLE_SPLASH_SCREENS.map((screen) => ({
        rel: "apple-touch-startup-image",
        href: `/splash/splash-${screen.width}x${screen.height}.png`,
        media: `(device-width: ${screen.cssWidth}px) and (device-height: ${screen.cssHeight}px) and (-webkit-device-pixel-ratio: ${screen.ratio}) and (orientation: portrait)`,
      })),
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
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updateRequested = useRef(false);

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
  const localizedPath = pathname.replace(/^\/(fr|en|ar)(?=\/|$)/, "") || "/";
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
      <div className="fixed end-3 top-1.5 z-40 flex items-center gap-1 rounded-full border border-[var(--upk-border)] bg-[var(--upk-bg)]/90 p-1 shadow-sm backdrop-blur">
        <nav aria-label="Language" className="flex items-center gap-0.5">
          {(["fr", "en", "ar"] as const).map((code) => (
            <a
              key={code}
              href={`/${code}${localizedPath === "/" ? "" : localizedPath}`}
              lang={code}
              aria-current={locale === code ? "page" : undefined}
              className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-bold transition-all duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
                locale === code
                  ? "bg-[var(--upk-primary)] text-[var(--upk-primary-fg)] shadow-sm"
                  : "text-[var(--upk-muted-fg)] hover:bg-[var(--upk-muted)] hover:text-[var(--upk-fg)]"
              }`}
            >
              {code.toUpperCase()}
            </a>
          ))}
        </nav>
        <span aria-hidden="true" className="h-5 w-px bg-[var(--upk-border)]" />
        <ThemeToggle locale={locale} />
      </div>
      <div className="flex min-h-svh flex-col">
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
        <SiteFooter locale={locale} />
      </div>
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
