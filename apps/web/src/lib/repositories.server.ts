import {
  createD1AuditRepository,
  createD1CategoryRepository,
  createD1ContributionRepository,
  createD1ModerationRepository,
  createD1PlaceRepository,
  createD1RateLimitRepository,
  createD1ReportRepository,
} from "@upk/api";
import { createDb } from "@upk/db";
import { env } from "cloudflare:workers";

let database: ReturnType<typeof createDb> | undefined;
let places: ReturnType<typeof createD1PlaceRepository> | undefined;
let categories: ReturnType<typeof createD1CategoryRepository> | undefined;
let contributions: ReturnType<typeof createD1ContributionRepository> | undefined;
let reports: ReturnType<typeof createD1ReportRepository> | undefined;
let moderation: ReturnType<typeof createD1ModerationRepository> | undefined;
let rateLimits: ReturnType<typeof createD1RateLimitRepository> | undefined;
let audit: ReturnType<typeof createD1AuditRepository> | undefined;

function getDb() {
  if (!database) database = createDb(env.DB);
  return database;
}

export function getPlaceRepository() {
  if (!places) places = createD1PlaceRepository(getDb());
  return places;
}

export function getCategoryRepository() {
  if (!categories) categories = createD1CategoryRepository(getDb());
  return categories;
}

export function getContributionRepository() {
  if (!contributions) contributions = createD1ContributionRepository(getDb());
  return contributions;
}

export function getReportRepository() {
  if (!reports) reports = createD1ReportRepository(getDb());
  return reports;
}

export function getModerationRepository() {
  if (!moderation) moderation = createD1ModerationRepository(getDb());
  return moderation;
}

export function getRateLimitRepository() {
  if (!rateLimits) rateLimits = createD1RateLimitRepository(getDb());
  return rateLimits;
}

export function getAuditRepository() {
  if (!audit) audit = createD1AuditRepository(getDb());
  return audit;
}
