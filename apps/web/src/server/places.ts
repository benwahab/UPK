import { createServerFn } from "@tanstack/react-start";
import type { Context } from "@upk/api";
import {
  getAuditRepository,
  getCategoryRepository,
  getContributionRepository,
  getModerationRepository,
  getPlaceRepository,
  getRateLimitRepository,
  getReportRepository,
} from "../lib/repositories.server";
import { createTrpcCaller } from "../lib/trpc.server";

function publicContext(): Context {
  return {
    user: null,
    client: { ip: "127.0.0.1", ipHash: "server", userAgent: null },
    places: getPlaceRepository(),
    categories: getCategoryRepository(),
    contributions: getContributionRepository(),
    reports: getReportRepository(),
    moderation: getModerationRepository(),
    rateLimits: getRateLimitRepository(),
    audit: getAuditRepository(),
    turnstile: { verify: async () => false },
  };
}

export const searchPlaces = createServerFn({ method: "GET" })
  .validator(
    (input: { q?: string; categorySlug?: string; lat?: number; lng?: number; limit?: number }) =>
      input,
  )
  .handler(({ data }) =>
    createTrpcCaller(publicContext()).search.places({ ...data, limit: data.limit ?? 20 }),
  );

export const listCategories = createServerFn({ method: "GET" })
  .validator((locale: "fr" | "en" | "ar") => locale)
  .handler(({ data }) => createTrpcCaller(publicContext()).categories.list({ locale: data }));

export const getPlace = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(({ data }) => createTrpcCaller(publicContext()).places.byId({ id: data }));
