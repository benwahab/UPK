import { z } from "zod";

export const localeSchema = z.enum(["fr", "en", "ar"]);
export type Locale = z.infer<typeof localeSchema>;

export const searchInputSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    categorySlug: z.string().max(60).optional(),
    regionSlug: z.string().max(60).optional(),
    villeSlug: z.string().max(60).optional(),
    radiusKm: z.number().min(1).max(100).optional(),
    limit: z.number().int().min(1).max(50).default(20),
    cursor: z.string().max(200).optional(),
  })
  .refine((value) => (value.lat === undefined) === (value.lng === undefined), {
    message: "lat et lng doivent être fournis ensemble",
  });

export type SearchInput = z.infer<typeof searchInputSchema>;

export type PlacePhoto = {
  key: string;
  url: string;
  alt: string | null;
};

export type PlaceSummary = {
  id: string;
  nom: string;
  categorieSlug: string;
  categorieNom: string;
  quartier: string | null;
  ville: string | null;
  region: string | null;
  adresse: string | null;
  description: string | null;
  horaires: string | null;
  siteWeb: string | null;
  pays: string | null;
  latitude: number;
  longitude: number;
  telephone: string | null;
  verifie: boolean;
  distanceM: number | null;
  photos: PlacePhoto[];
};

export type SearchIntent = "nom" | "categorie" | "quartier" | "ville" | "texte";

export type SearchResult = {
  items: PlaceSummary[];
  nextCursor: string | null;
  total: number;
  intent: SearchIntent;
  label: string | null;
  exactNameMatch: boolean;
};

export const placeIdSchema = z.object({ id: z.string().min(1) });
