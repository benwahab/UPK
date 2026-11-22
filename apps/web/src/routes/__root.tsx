import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { absoluteUrl } from "../lib/site";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
    links: [{ rel: "stylesheet", href: appCss }],
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
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
