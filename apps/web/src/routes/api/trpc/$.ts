import { createFileRoute } from "@tanstack/react-router";
import { appRouter } from "@upk/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTrpcContext } from "../../../lib/trpc.server";

function handle(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createTrpcContext(request),
  });
}

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
