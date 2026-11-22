import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/photos/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!env.PHOTOS) return new Response("Not found", { status: 404 });

        const key = decodeURIComponent(
          new URL(request.url).pathname.replace(/^\/api\/photos\//, ""),
        );
        if (!key.startsWith("places/") || key.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        const object = await env.PHOTOS.get(key);
        if (!object) return new Response("Not found", { status: 404 });

        return new Response(object.body, {
          headers: {
            "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
