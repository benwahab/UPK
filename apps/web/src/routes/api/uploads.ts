import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import {
  getContributionRepository,
  getRateLimitRepository,
} from "../../lib/repositories.server";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const placeId = url.searchParams.get("placeId");
        const token = url.searchParams.get("token");
        if (!placeId || !token) {
          return Response.json({ error: "Paramètres manquants." }, { status: 400 });
        }
        if (!env.PHOTOS) {
          return Response.json({ error: "Upload indisponible." }, { status: 503 });
        }

        const contributions = getContributionRepository();
        if (!(await contributions.verifySubmission(placeId, token))) {
          return Response.json({ error: "Proposition introuvable." }, { status: 403 });
        }

        const rate = await getRateLimitRepository().consume(
          "upload",
          placeId,
          10,
          3600,
        );
        if (!rate.allowed) {
          return Response.json({ error: "Trop d'envois de photos." }, { status: 429 });
        }

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "Fichier manquant." }, { status: 400 });
        }
        if (!ALLOWED.has(file.type)) {
          return Response.json(
            { error: "Format accepté : JPEG, PNG ou WebP." },
            { status: 415 },
          );
        }
        if (file.size > MAX_BYTES) {
          return Response.json({ error: "Photo limitée à 5 Mo." }, { status: 413 });
        }

        const key = `places/${placeId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
        await env.PHOTOS.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });
        await contributions.addPhoto(placeId, key, file.name || null);

        return Response.json({ key, url: `/api/photos/${key}` }, { status: 201 });
      },
    },
  },
});
