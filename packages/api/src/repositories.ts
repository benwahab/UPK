import type { Database } from "@upk/db";
import {
  boundingBox,
  haversineMetres,
  normalizeSearch,
  rankScore,
  type Locale,
  type PlaceSummary,
  type SearchInput,
  type SearchResult,
} from "@upk/domain";
import { sql, type SQL } from "drizzle-orm";
import type { Category, CategoryRepository, PlaceRepository } from "./context";

const PUBLISHED = "valide";

type PlaceRow = {
  id: string;
  nom: string;
  categorie_slug: string;
  categorie_nom: string;
  quartier: string | null;
  ville: string | null;
  latitude: number;
  longitude: number;
  telephone: string | null;
  statut_verification: string;
  rank?: number | null;
};

const PLACE_COLUMNS = sql`
  p.id, p.nom, c.slug AS categorie_slug, c.nom AS categorie_nom,
  p.quartier, v.nom AS ville, p.latitude, p.longitude, p.telephone,
  p.statut_verification
`;

const PLACE_JOINS = sql`
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN regions r ON r.id = p.region_id
  LEFT JOIN villes_zones v ON v.id = p.ville_zone_id
`;

function toFtsQuery(query: string): string | null {
  const tokens = normalizeSearch(query)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  return tokens.length > 0 ? tokens.map((token) => `"${token}"*`).join(" ") : null;
}

function decodeOffset(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const value = Number.parseInt(atob(cursor), 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function encodeOffset(offset: number): string {
  return btoa(String(offset));
}

function toSummary(row: PlaceRow, origin: { lat: number; lng: number } | null): PlaceSummary {
  return {
    id: row.id,
    nom: row.nom,
    categorieSlug: row.categorie_slug,
    categorieNom: row.categorie_nom,
    quartier: row.quartier,
    ville: row.ville,
    latitude: row.latitude,
    longitude: row.longitude,
    telephone: row.telephone,
    verifie: row.statut_verification !== "a_verifier",
    distanceM: origin ? haversineMetres(origin, { lat: row.latitude, lng: row.longitude }) : null,
  };
}

export function createD1PlaceRepository(db: Database): PlaceRepository {
  return {
    async search(input: SearchInput): Promise<SearchResult> {
      const origin =
        input.lat !== undefined && input.lng !== undefined
          ? { lat: input.lat, lng: input.lng }
          : null;
      const ftsQuery = input.q ? toFtsQuery(input.q) : null;
      const conditions: SQL[] = [sql`p.statut_publication = ${PUBLISHED}`, sql`p.actif = 1`];

      if (ftsQuery) conditions.push(sql`places_fts MATCH ${ftsQuery}`);
      if (input.categorySlug) conditions.push(sql`c.slug = ${input.categorySlug}`);
      if (input.regionSlug) conditions.push(sql`r.slug = ${input.regionSlug}`);
      if (input.villeSlug) conditions.push(sql`v.slug = ${input.villeSlug}`);
      if (origin && input.radiusKm) {
        const box = boundingBox(origin, input.radiusKm * 1000);
        conditions.push(sql`p.latitude BETWEEN ${box.minLat} AND ${box.maxLat}`);
        conditions.push(sql`p.longitude BETWEEN ${box.minLng} AND ${box.maxLng}`);
      }

      const from = ftsQuery
        ? sql`places_fts JOIN places p ON p.rowid = places_fts.rowid`
        : sql`places p`;
      const where = sql.join(conditions, sql` AND `);
      const rank = ftsQuery ? sql`bm25(places_fts)` : sql`0`;
      const offset = decodeOffset(input.cursor);

      const rows = await db.all<PlaceRow>(sql`
        SELECT ${PLACE_COLUMNS}, ${rank} AS rank
        FROM ${from}
        ${PLACE_JOINS}
        WHERE ${where}
        ORDER BY rank ASC, p.nom ASC
        LIMIT ${input.limit} OFFSET ${offset}
      `);

      const ranks = new Map(rows.map((row) => [row.id, row.rank ?? 0]));
      const candidates = rows
        .map((row) => toSummary(row, origin))
        .filter(
          (item) =>
            !origin ||
            !input.radiusKm ||
            (item.distanceM ?? Number.POSITIVE_INFINITY) <= input.radiusKm * 1000,
        );

      const items = origin
        ? candidates.sort(
            (a, b) =>
              (a.distanceM ?? Number.POSITIVE_INFINITY) -
                (b.distanceM ?? Number.POSITIVE_INFINITY) || a.nom.localeCompare(b.nom),
          )
        : candidates
            .map((item) => ({
              item,
              score: rankScore({
                textScore: Math.max(0, -(ranks.get(item.id) ?? 0)),
                verified: item.verifie,
                hasPhone: Boolean(item.telephone),
                distanceM: item.distanceM,
              }),
            }))
            .sort((a, b) => b.score - a.score || a.item.nom.localeCompare(b.item.nom))
            .map(({ item }) => item);

      const count = await db.get<{ total: number }>(sql`
        SELECT COUNT(*) AS total FROM ${from} ${PLACE_JOINS} WHERE ${where}
      `);
      const total = Number(count?.total ?? 0);

      return {
        items,
        total,
        nextCursor: offset + rows.length < total ? encodeOffset(offset + rows.length) : null,
      };
    },

    async byId(id: string): Promise<PlaceSummary | null> {
      const row = await db.get<PlaceRow>(sql`
        SELECT ${PLACE_COLUMNS}
        FROM places p
        ${PLACE_JOINS}
        WHERE p.id = ${id} AND p.statut_publication = ${PUBLISHED} AND p.actif = 1
      `);
      return row ? toSummary(row, null) : null;
    },

    async listPublishedIds(): Promise<string[]> {
      const rows = await db.all<{ id: string }>(sql`
        SELECT id FROM places
        WHERE statut_publication = ${PUBLISHED} AND actif = 1
        ORDER BY id ASC
      `);
      return rows.map((row) => row.id);
    },
  };
}

export function createD1CategoryRepository(db: Database): CategoryRepository {
  return {
    async list(locale: Locale): Promise<Category[]> {
      return db.all<Category>(sql`
        SELECT c.id, c.slug, COALESCE(ct.nom, c.nom) AS nom, c.ordre
        FROM categories c
        LEFT JOIN category_translations ct
          ON ct.category_id = c.id AND ct.langue = ${locale}
        ORDER BY c.ordre ASC, nom ASC
      `);
    },
  };
}
