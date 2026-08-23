// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        // Registration happens only through src/lib/pwa.ts (guarded wrapper).
        injectRegister: null,
        filename: "sw.js",
        // The web app manifest is hand-maintained in public/manifest.webmanifest.
        manifest: false,
        devOptions: { enabled: false },
        workbox: {
          // No build-time precache manifest (SSR app): caching is runtime-only.
          globPatterns: [],
          navigateFallback: undefined,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // HTML navigations: always try the network first (never cache-first).
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "upk-pages",
                networkTimeoutSeconds: 6,
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Hashed, immutable build assets.
              urlPattern: ({ url, sameOrigin }) =>
                Boolean(sameOrigin) && /\/(_build|assets)\//.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "upk-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                Boolean(sameOrigin) && /\.(png|svg|webp|jpg|jpeg|ico|woff2)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "upk-media",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
