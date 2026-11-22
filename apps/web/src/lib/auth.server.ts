import { createAuth, type Auth } from "@upk/api";
import { createDb } from "@upk/db";
import { env } from "cloudflare:workers";

let cached: Auth | undefined;

export function getAuth(): Auth {
  if (!cached) {
    const secret = env.BETTER_AUTH_SECRET;
    if (!secret) throw new Error("BETTER_AUTH_SECRET manquant");
    cached = createAuth(createDb(env.DB), {
      secret,
      baseURL: env.BETTER_AUTH_URL,
      trustedOrigins: [
        env.BETTER_AUTH_URL,
        "http://localhost:5173",
        "http://localhost:8787",
        "http://127.0.0.1:8787",
      ],
    });
  }
  return cached;
}
