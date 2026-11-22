import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@upk/api";

let client: ReturnType<typeof createTRPCClient<AppRouter>> | null = null;

export function getTrpcClient() {
  client ??= createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: "/api/trpc" })],
  });
  return client;
}
