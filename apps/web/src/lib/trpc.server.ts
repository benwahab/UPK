import { appRouter, type Context } from "@upk/api";
import { env } from "cloudflare:workers";
import { getAuth } from "./auth.server";
import {
  getAuditRepository,
  getCategoryRepository,
  getContributionRepository,
  getModerationRepository,
  getPlaceRepository,
  getRateLimitRepository,
  getReportRepository,
} from "./repositories.server";

function adminEmails(): string[] {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function sessionUser(request: Request): Promise<Context["user"]> {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return null;
    const isAdmin = adminEmails().includes(session.user.email.toLowerCase());
    return {
      id: session.user.id,
      email: session.user.email,
      roles: isAdmin ? ["admin"] : ["user"],
      permissions: isAdmin ? ["moderation:write"] : [],
    };
  } catch {
    return null;
  }
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1"
  );
}

async function hashIp(ip: string): Promise<string> {
  const input = new TextEncoder().encode(`${ip}|${env.RATE_LIMIT_SALT ?? "upk-rate-limit"}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return env.APP_ENV !== "production";
  if (!token) return false;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      },
    );
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

export async function createTrpcContext(request: Request): Promise<Context> {
  const ip = clientIp(request);
  return {
    user: await sessionUser(request),
    client: {
      ip,
      ipHash: await hashIp(ip),
      userAgent: request.headers.get("user-agent"),
    },
    places: getPlaceRepository(),
    categories: getCategoryRepository(),
    contributions: getContributionRepository(),
    reports: getReportRepository(),
    moderation: getModerationRepository(),
    rateLimits: getRateLimitRepository(),
    audit: getAuditRepository(),
    turnstile: { verify: verifyTurnstile },
  };
}

export function createTrpcCaller(context: Context) {
  return appRouter.createCaller(context);
}
