import { z } from "zod";
import { localeSchema, type Locale } from "./place";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalEmail = z
  .string()
  .trim()
  .email()
  .max(200)
  .optional()
  .transform((value) => (value ? value : undefined));

export const contributionInputSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  categorySlug: z.string().trim().min(1).max(60),
  description: optionalText(2000),
  quartier: optionalText(120),
  adresse: optionalText(200),
  ville: optionalText(120),
  latitude: z.number().min(11).max(24),
  longitude: z.number().min(0).max(16),
  telephone: optionalText(30),
  whatsapp: optionalText(30),
  siteWeb: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(z.string().url().optional()),
  horaires: optionalText(200),
  contactEmail: optionalEmail,
  gpsPrecisionM: z.number().min(0).max(10_000).optional(),
  langue: localeSchema.default("fr"),
  turnstileToken: z.string().max(2048).optional(),
});

export type ContributionInput = z.infer<typeof contributionInputSchema>;
export type ContributionData = {
  nom: string;
  categorySlug: string;
  description?: string;
  quartier?: string;
  adresse?: string;
  ville?: string;
  latitude: number;
  longitude: number;
  telephone?: string;
  whatsapp?: string;
  siteWeb?: string;
  horaires?: string;
  contactEmail?: string;
  gpsPrecisionM?: number;
  langue: Locale;
};

export const reportTypeSchema = z.enum([
  "ferme",
  "adresse",
  "telephone",
  "horaire",
  "autre",
]);

export const reportInputSchema = z.object({
  placeId: z.string().min(1),
  typeProbleme: reportTypeSchema,
  description: optionalText(1000),
  email: optionalEmail,
  turnstileToken: z.string().max(2048).optional(),
});

export type ReportType = z.infer<typeof reportTypeSchema>;
export type ReportInput = z.infer<typeof reportInputSchema>;
export type ReportData = {
  placeId: string;
  typeProbleme: ReportType;
  description?: string;
  email?: string;
};

export const moderationApproveSchema = z.object({
  id: z.string().min(1),
  forceGps: z.boolean().default(false),
});

export const moderationRejectSchema = z.object({
  id: z.string().min(1),
  motif: z.string().trim().min(5).max(500),
});

export const reportResolveSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(["traite", "refuse"]),
  motif: z.string().trim().max(500).optional(),
});
