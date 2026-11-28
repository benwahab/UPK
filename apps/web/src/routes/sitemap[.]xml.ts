import { createFileRoute } from "@tanstack/react-router";
import { getPlaceRepository } from "../lib/repositories.server";

const LOCALES = ["fr", "en", "ar"] as const;

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[char] ?? char;
  });
}

function alternates(origin: string, suffix: string): string {
  const links = LOCALES.map(
    (locale) =>
      `<xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(`${origin}/${locale}${suffix}`)}"/>`,
  );
  links.push(
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}/fr${suffix}`)}"/>`,
  );
  return links.join("");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Le sitemap ne change pas à chaque visite. Le cache edge évite de relire
        // les 40 000+ identifiants publiés à chaque requête.
        const cache = (caches as CacheStorage & { default: Cache }).default;
        const cached = await cache.match(request);
        if (cached) {
          // Les en-têtes d'une réponse mise en cache sont immuables ; le
          // middleware de sécurité doit pouvoir les compléter.
          return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers: new Headers(cached.headers),
          });
        }

        const origin = new URL(request.url).origin;
        const ids = await getPlaceRepository().listPublishedIds();
        const entries: string[] = [];

        for (const locale of LOCALES) {
          entries.push(
            `<url><loc>${escapeXml(`${origin}/${locale}`)}</loc>${alternates(origin, "")}</url>`,
          );
        }

        // Une seule URL par fiche : les versions fr/en/ar sont déclarées en
        // hreflang. Trois URLs par fiche dépasseraient la limite de 50 000.
        for (const id of ids) {
          entries.push(
            `<url><loc>${escapeXml(`${origin}/fr/places/${id}`)}</loc>${alternates(
              origin,
              `/places/${id}`,
            )}</url>`,
          );
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;

        const response = new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600, s-maxage=3600",
          },
        });
        await cache.put(request, response.clone());
        return response;
      },
    },
  },
});
