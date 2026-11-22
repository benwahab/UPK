import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getPlaceRepository } from "../../lib/repositories.server";

export const Route = createFileRoute("/api/poc")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (env.APP_ENV === "production") {
          return new Response("Not found", { status: 404 });
        }

        const url = new URL(request.url);
        const q = url.searchParams.get("q") ?? "pharmacie";
        const runs = Math.min(50, Math.max(5, Number(url.searchParams.get("runs") ?? 20)));
        const repository = getPlaceRepository();
        const samples: number[] = [];

        for (let index = 0; index < runs; index += 1) {
          const start = performance.now();
          await repository.search({ q, limit: 20 });
          samples.push(performance.now() - start);
        }

        samples.sort((a, b) => a - b);
        const percentile = (p: number) => samples[Math.min(runs - 1, Math.floor(runs * p))];

        return Response.json({
          q,
          runs,
          p50: percentile(0.5),
          p95: percentile(0.95),
          min: samples[0],
          max: samples[runs - 1],
        });
      },
    },
  },
});
