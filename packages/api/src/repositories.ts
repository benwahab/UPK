import type { Database } from "@upk/db";
import {
  boundingBox,
  categorySlugForText,
  haversineMetres,
  isFuzzyMatch,
  normalizeSearch,
  rankScore,
  type Locale,
  type PlacePhoto,
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
  nom_normalise: string;
  categorie_slug: string;
  categorie_nom: string;
  quartier: string | null;
  quartier_normalise: string | null;
  ville: string | null;
  region: string | null;
  adresse: string | null;
  description: string | null;
  horaires: string | null;
  site_web: string | null;
  pays: string | null;
  latitude: number;
  longitude: number;
  telephone: string | null;
  statut_verification: string;
  rank?: number | null;
};

const PLACE_COLUMNS = sql`
  p.id, p.nom, p.nom_normalise, c.slug AS categorie_slug, c.nom AS categorie_nom,
  p.quartier, p.quartier_normalise, v.nom AS ville, r.nom AS region, p.adresse,
  p.description, p.horaires, p.site_web, p.country_code AS pays,
  p.latitude, p.longitude, p.telephone, p.statut_verification
`;

const PLACE_JOINS = sql`
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN regions r ON r.id = p.region_id
  LEFT JOIN villes_zones v ON v.id = p.ville_zone_id
`;

const CATEGORY_INTENTS: Record<string, string> = {
  pharmacie: "pharmacie",
  pharmacies: "pharmacie",
  sante: "sante",
  hopital: "sante",
  hopitaux: "sante",
  clinique: "sante",
  clinic: "sante",
  clinics: "sante",
  cliniques: "sante",
  dispensaire: "sante",
  dispensaires: "sante",
  medecin: "sante",
  medecins: "sante",
  docteur: "sante",
  docteurs: "sante",
  restaurant: "restaurant",
  restaurants: "restaurant",
  cafe: "restaurant",
  cafes: "restaurant",
  hotel: "hotel",
  hotels: "hotel",
  auberge: "hotel",
  auberges: "hotel",
  banque: "banque",
  banques: "banque",
  atm: "distributeur",
  dab: "distributeur",
  distributeur: "distributeur",
  distributeurs: "distributeur",
  "station-service": "station-service",
  "stations-service": "station-service",
  essence: "station-service",
  carburant: "station-service",
  garage: "garage",
  garages: "garage",
  ecole: "ecole",
  ecoles: "ecole",
  marche: "marche",
  marches: "marche",
  administration: "administration",
  administrations: "administration",
  commerce: "commerce",
  commerces: "commerce",
  boutique: "commerce",
  boutiques: "commerce",
  supermarche: "commerce",
  supermarches: "commerce",
  transport: "transport",
  transports: "transport",
  loisirs: "loisirs",
  "services-professionnels": "services-professionnels",
  mosquee: "lieu-culte",
  mosquees: "lieu-culte",
  eglise: "lieu-culte",
  eglises: "lieu-culte",
  culte: "lieu-culte",
};

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

function toSummary(
  row: PlaceRow,
  origin: { lat: number; lng: number } | null,
  photos: PlacePhoto[] = [],
): PlaceSummary {
  return {
    id: row.id,
    nom: row.nom,
    categorieSlug: row.categorie_slug,
    categorieNom: row.categorie_nom,
    quartier: row.quartier,
    ville: row.ville,
    region: row.region,
    adresse: row.adresse,
    description: row.description,
    horaires: row.horaires,
    siteWeb: row.site_web,
    pays: row.pays,
    latitude: row.latitude,
    longitude: row.longitude,
    telephone: row.telephone,
    verifie: row.statut_verification !== "a_verifier",
    distanceM: origin ? haversineMetres(origin, { lat: row.latitude, lng: row.longitude }) : null,
    photos,
  };
}

function sqlList(values: string[]): SQL {
  return sql`(${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )})`;
}

type GeoMatch = { ids: string[]; label: string; intent: "quartier" | "ville" };

async function matchQuartier(
  db: Database,
  query: string,
  exactOnly = false,
): Promise<GeoMatch | null> {
  const rows = await db.all<{ id: string; nom: string }>(sql`
    SELECT q.id, q.nom
    FROM quartiers q
    WHERE q.nom_normalise = ${query}
       ${
         exactOnly
           ? sql``
           : sql`OR q.nom_normalise LIKE ${`${query} %`}
       OR q.nom_normalise LIKE ${`% ${query} %`}
       OR q.nom_normalise LIKE ${`% ${query}`}`
       }
    ORDER BY (q.nom_normalise = ${query}) DESC, length(q.nom) ASC, q.nom ASC
    LIMIT 8
  `);
  if (rows.length === 0) return null;
  return {
    ids: rows.map((row) => row.id),
    label: rows.map((row) => row.nom).join(", "),
    intent: "quartier",
  };
}

async function matchVille(
  db: Database,
  query: string,
  exactOnly = false,
): Promise<GeoMatch | null> {
  const rows = await db.all<{ id: string; nom: string }>(sql`
    SELECT v.id, v.nom
    FROM villes_zones v
    WHERE v.nom_normalise = ${query}
       ${exactOnly ? sql`` : sql`OR v.nom_normalise LIKE ${`${query} %`}`}
    ORDER BY (v.nom_normalise = ${query}) DESC, v.population DESC, length(v.nom) ASC
    LIMIT 3
  `);
  if (rows.length === 0) return null;
  return {
    ids: rows.map((row) => row.id),
    label: rows.map((row) => row.nom).join(", "),
    intent: "ville",
  };
}

async function matchQuartierFuzzy(db: Database, query: string): Promise<GeoMatch | null> {
  const prefix = query.slice(0, 3);
  if (prefix.length < 3) return null;
  const rows = await db.all<{ id: string; nom: string }>(sql`
    SELECT q.id, q.nom
    FROM quartiers q
    WHERE q.nom_normalise LIKE ${`${prefix}%`}
    LIMIT 60
  `);
  const matches = rows.filter((row) => isFuzzyMatch(query, row.nom));
  if (matches.length === 0) return null;
  return {
    ids: matches.map((row) => row.id),
    label: matches.map((row) => row.nom).join(", "),
    intent: "quartier",
  };
}

async function matchVilleFuzzy(db: Database, query: string): Promise<GeoMatch | null> {
  const prefix = query.slice(0, 3);
  if (prefix.length < 3) return null;
  const rows = await db.all<{ id: string; nom: string }>(sql`
    SELECT v.id, v.nom
    FROM villes_zones v
    WHERE v.nom_normalise LIKE ${`${prefix}%`}
    ORDER BY v.population DESC
    LIMIT 40
  `);
  const matches = rows.filter((row) => isFuzzyMatch(query, row.nom));
  if (matches.length === 0) return null;
  return {
    ids: matches.map((row) => row.id),
    label: matches.map((row) => row.nom).join(", "),
    intent: "ville",
  };
}

async function matchCategory(
  db: Database,
  query: string,
): Promise<{ slug: string; nom: string } | null> {
  const slug =
    CATEGORY_INTENTS[query] ??
    CATEGORY_INTENTS[query.replace(/s$/, "")] ??
    categorySlugForText(query);
  if (slug) {
    const row = await db.get<{ slug: string; nom: string }>(sql`
      SELECT slug, nom FROM categories WHERE slug = ${slug} LIMIT 1
    `);
    if (row) return row;
  }
  return db.get<{ slug: string; nom: string }>(sql`
    SELECT c.slug, c.nom
    FROM categories c
    WHERE c.slug = ${query}
       OR lower(c.nom) = ${query}
       OR EXISTS (
         SELECT 1 FROM category_translations ct
         WHERE ct.category_id = c.id AND lower(ct.nom) = ${query}
       )
    LIMIT 1
  `);
}

export function createD1PlaceRepository(db: Database): PlaceRepository {
  return {
    async search(input: SearchInput): Promise<SearchResult> {
      const origin =
        input.lat !== undefined && input.lng !== undefined
          ? { lat: input.lat, lng: input.lng }
          : null;
      const normalizedQuery = input.q ? normalizeSearch(input.q) : "";
      if (input.q && !normalizedQuery) {
        return {
          items: [],
          total: 0,
          nextCursor: null,
          intent: "texte",
          label: null,
          exactNameMatch: false,
        };
      }
      const ftsQuery = normalizedQuery ? toFtsQuery(normalizedQuery) : null;
      let intent: SearchResult["intent"] = "texte";
      let label: string | null = null;
      let categorySlug = input.categorySlug ?? null;
      let geoFilter: SQL | null = null;
      let useFts = Boolean(ftsQuery);

      if (normalizedQuery) {
        const exactQuartier = await matchQuartier(db, normalizedQuery, true);
        const exactVille = exactQuartier ? null : await matchVille(db, normalizedQuery, true);
        const quartier =
          exactQuartier ??
          (exactVille
            ? null
            : ((await matchQuartier(db, normalizedQuery)) ??
              (await matchQuartierFuzzy(db, normalizedQuery))));
        const ville =
          exactVille ??
          (quartier
            ? null
            : ((await matchVille(db, normalizedQuery)) ??
              (await matchVilleFuzzy(db, normalizedQuery))));
        if (quartier) {
          intent = "quartier";
          label = quartier.label;
          geoFilter = sql`p.quartier_id IN ${sqlList(quartier.ids)}`;
          useFts = false;
        } else if (ville) {
          intent = "ville";
          label = ville.label;
          geoFilter = sql`p.ville_zone_id IN ${sqlList(ville.ids)}`;
          useFts = false;
        } else {
          const category = await matchCategory(db, normalizedQuery);
          if (category) {
            intent = "categorie";
            label = category.nom;
            categorySlug = category.slug;
            useFts = false;
          }
        }
      }

      if (input.categorySlug) {
        categorySlug = input.categorySlug;
        if (intent === "texte" && !normalizedQuery) intent = "categorie";
      }

      const baseConditions: SQL[] = [sql`p.statut_publication = ${PUBLISHED}`, sql`p.actif = 1`];
      if (categorySlug) baseConditions.push(sql`c.slug = ${categorySlug}`);
      if (input.regionSlug) baseConditions.push(sql`r.slug = ${input.regionSlug}`);
      if (input.villeSlug) baseConditions.push(sql`v.slug = ${input.villeSlug}`);
      if (geoFilter) baseConditions.push(geoFilter);
      if (origin && input.radiusKm) {
        const box = boundingBox(origin, input.radiusKm * 1000);
        baseConditions.push(sql`p.latitude BETWEEN ${box.minLat} AND ${box.maxLat}`);
        baseConditions.push(sql`p.longitude BETWEEN ${box.minLng} AND ${box.maxLng}`);
      }

      const offset = decodeOffset(input.cursor);
      const queryRows = async (
        conditions: SQL[],
        fromFts: boolean,
        countOnly = false,
        skipCount = false,
        forceGeoIndex = false,
      ) => {
        const where = sql.join(conditions, sql` AND `);
        const from = fromFts
          ? sql`places_fts JOIN places p ON p.rowid = places_fts.rowid`
          : forceGeoIndex
            ? sql`places p INDEXED BY places_geo_idx`
            : sql`places p`;
        const rank = fromFts ? sql`bm25(places_fts)` : sql`0`;
        const exactOrder = normalizedQuery
          ? sql`CASE WHEN p.nom_normalise = ${normalizedQuery} THEN 0 ELSE 1 END, `
          : sql``;
        // Sans FTS, le LIMIT doit précéder le tri exact en mémoire : on ordonne
        // donc par distance approximative en SQL pour ne pas tronquer les plus proches.
        const distanceOrder =
          origin && !fromFts
            ? sql`((p.latitude - ${origin.lat}) * (p.latitude - ${origin.lat}) +
                (p.longitude - ${origin.lng}) * (p.longitude - ${origin.lng}) *
                ${Math.cos((origin.lat * Math.PI) / 180) ** 2}) ASC, `
            : sql``;
        const rows = countOnly
          ? []
          : await db.all<PlaceRow>(sql`
              SELECT ${PLACE_COLUMNS}, ${rank} AS rank
              FROM ${from}
              ${PLACE_JOINS}
              WHERE ${where}
              ORDER BY ${exactOrder}${fromFts ? sql`rank ASC, ` : distanceOrder}p.nom ASC, p.id ASC
              LIMIT ${input.limit} OFFSET ${offset}
            `);
        if (skipCount) return { rows, total: 0 };
        // Le comptage n'a pas besoin des jointures d'affichage.
        // Les filtres géographiques et de catégorie sont résolus par sous-requêtes.
        const countConditions: SQL[] = [
          sql`p.statut_publication = ${PUBLISHED}`,
          sql`p.actif = 1`,
        ];
        if (categorySlug) {
          countConditions.push(sql`p.category_id IN (
            SELECT id FROM categories WHERE slug = ${categorySlug}
          )`);
        }
        if (input.regionSlug) {
          countConditions.push(sql`p.region_id IN (
            SELECT id FROM regions WHERE slug = ${input.regionSlug}
          )`);
        }
        if (input.villeSlug) {
          countConditions.push(sql`p.ville_zone_id IN (
            SELECT id FROM villes_zones WHERE slug = ${input.villeSlug}
          )`);
        }
        if (geoFilter) countConditions.push(geoFilter);
        if (origin && input.radiusKm) {
          const box = boundingBox(origin, input.radiusKm * 1000);
          countConditions.push(sql`p.latitude BETWEEN ${box.minLat} AND ${box.maxLat}`);
          countConditions.push(sql`p.longitude BETWEEN ${box.minLng} AND ${box.maxLng}`);
        }
        // Inclure aussi les conditions propres aux replis (ex. recherche tolérante).
        // Elles suivent toujours les filtres de base dans le tableau transmis.
        countConditions.push(...conditions.slice(baseConditions.length));
        const countWhere = sql.join(countConditions, sql` AND `);
        const count = await db.get<{ total: number }>(sql`
          SELECT COUNT(*) AS total FROM ${from} WHERE ${countWhere}
        `);
        return { rows, total: Number(count?.total ?? 0) };
      };

      const useFtsQuery = useFts && Boolean(ftsQuery);
      // Une recherche GPS sans rayon élargit progressivement sa zone.
      // Dès que les N premiers résultats sont entièrement dans le cercle exploré,
      // aucun lieu situé hors de la zone ne peut les dépasser en distance.
      // Cela évite de trier tout le catalogue pour ne renvoyer que quelques lieux.
      let rows: PlaceRow[] = [];
      let total = 0;
      if (normalizedQuery && intent === "texte" && !useFtsQuery) {
        rows = [];
        total = 0;
      } else if (origin && !input.radiusKm && !useFtsQuery) {
        const requiredRows = input.limit;
        let searchRadiusKm = 2;
        const maxSearchRadiusKm = 20_000;
        let complete = false;
        while (!complete) {
          const box = boundingBox(origin, searchRadiusKm * 1000);
          const boundedConditions = [
            ...baseConditions,
            sql`p.latitude BETWEEN ${box.minLat} AND ${box.maxLat}`,
            sql`p.longitude BETWEEN ${box.minLng} AND ${box.maxLng}`,
          ];
          const nearby = await queryRows(boundedConditions, false, false, true, true);
          rows = nearby.rows;
          const farthestDistance = rows.reduce((farthest, row) => {
            const distance = haversineMetres(origin, {
              lat: row.latitude,
              lng: row.longitude,
            });
            return Math.max(farthest, distance);
          }, 0);
          complete =
            rows.length >= requiredRows && farthestDistance <= searchRadiusKm * 1000;
          if (complete || searchRadiusKm >= maxSearchRadiusKm) break;
          searchRadiusKm = Math.min(searchRadiusKm * 2, maxSearchRadiusKm);
        }
        // Le total reste exact, mais cette requête ne récupère aucune ligne :
        // la lecture des lieux est limitée à la zone nécessaire au classement.
        const countResult = await queryRows(baseConditions, false, true);
        total = countResult.total;
      } else {
        const result = await queryRows(
          useFtsQuery ? [...baseConditions, sql`places_fts MATCH ${ftsQuery}`] : baseConditions,
          useFtsQuery,
        );
        rows = result.rows;
        total = result.total;
      }

      let exactNameMatch =
        intent !== "texte" || !normalizedQuery
          ? true
          : rows.some((row) => row.nom_normalise === normalizedQuery);

      // Repli tolérant aux fautes et variantes : même si FTS renvoie des
      // résultats, on cherche une correspondance plus proche quand aucun nom
      // exact n'a été trouvé.
      if (normalizedQuery && intent === "texte" && !exactNameMatch) {
        const stopwords = new Set(["de", "du", "des", "la", "le", "les", "et", "a", "au", "aux"]);
        const tokens = normalizedQuery
          .split(" ")
          .filter((token) => token.length >= 3 && !stopwords.has(token));
        if (tokens.length > 0) {
          // FTS5 prefix search narrows fuzzy candidates without scanning every
          // published place with leading-wildcard LIKE predicates.
          const fallbackFtsQuery = tokens
            .map((token) => `"${token.slice(0, 3)}"*`)
            .join(" OR ");
          const fallback = await queryRows(
            [...baseConditions, sql`places_fts MATCH ${fallbackFtsQuery}`],
            true,
          );
          const fuzzyRows = fallback.rows.filter(
            (row) =>
              isFuzzyMatch(normalizedQuery, row.nom) ||
              isFuzzyMatch(normalizedQuery, row.quartier ?? ""),
          );
          const seen = new Set(rows.map((row) => row.id));
          rows = [...rows, ...fuzzyRows.filter((row) => !seen.has(row.id))];
          total = Math.max(total, rows.length);
          exactNameMatch = rows.some((row) => row.nom_normalise === normalizedQuery);
        }
      }

      if (intent === "texte" && rows.some((row) => row.nom_normalise === normalizedQuery)) {
        intent = "nom";
        exactNameMatch = true;
      }

      const ranks = new Map(rows.map((row) => [row.id, row.rank ?? 0]));
      const candidates = rows
        .map((row) => ({
          row,
          item: toSummary(row, origin),
          exact: row.nom_normalise === normalizedQuery,
          fuzzy: Boolean(normalizedQuery) && isFuzzyMatch(normalizedQuery, row.nom),
        }))
        .filter(
          ({ item }) =>
            !origin ||
            !input.radiusKm ||
            (item.distanceM ?? Number.POSITIVE_INFINITY) <= input.radiusKm * 1000,
        );

      const items = candidates
        .sort((a, b) => {
          if (a.exact !== b.exact) return a.exact ? -1 : 1;
          if (intent === "texte" && a.fuzzy !== b.fuzzy) return a.fuzzy ? -1 : 1;
          if (!normalizedQuery && origin) {
            return (
              (a.item.distanceM ?? Number.POSITIVE_INFINITY) -
                (b.item.distanceM ?? Number.POSITIVE_INFINITY) ||
              a.item.nom.localeCompare(b.item.nom)
            );
          }
          if (intent === "quartier" || intent === "ville" || intent === "categorie") {
            if (origin) {
              return (
                (a.item.distanceM ?? Number.POSITIVE_INFINITY) -
                  (b.item.distanceM ?? Number.POSITIVE_INFINITY) ||
                a.item.nom.localeCompare(b.item.nom)
              );
            }
            return (
              Number(b.item.verifie) - Number(a.item.verifie) ||
              Number(Boolean(b.item.telephone)) - Number(Boolean(a.item.telephone)) ||
              a.item.nom.localeCompare(b.item.nom)
            );
          }
          const scoreA = rankScore({
            textScore: Math.max(0, -(ranks.get(a.item.id) ?? 0)),
            verified: a.item.verifie,
            hasPhone: Boolean(a.item.telephone),
            distanceM: a.item.distanceM,
          });
          const scoreB = rankScore({
            textScore: Math.max(0, -(ranks.get(b.item.id) ?? 0)),
            verified: b.item.verifie,
            hasPhone: Boolean(b.item.telephone),
            distanceM: b.item.distanceM,
          });
          return scoreB - scoreA || a.item.nom.localeCompare(b.item.nom);
        })
        .map(({ item }) => item);

      return {
        items,
        total,
        nextCursor: offset + rows.length < total ? encodeOffset(offset + rows.length) : null,
        intent,
        label,
        exactNameMatch,
      };
    },

    async byId(id: string): Promise<PlaceSummary | null> {
      const row = await db.get<PlaceRow>(sql`
        SELECT ${PLACE_COLUMNS}
        FROM places p
        ${PLACE_JOINS}
        WHERE p.id = ${id} AND p.statut_publication = ${PUBLISHED} AND p.actif = 1
      `);
      if (!row) return null;
      const photos = await db.all<{
        cle_r2: string;
        url_publique: string | null;
        alt: string | null;
      }>(sql`
        SELECT cle_r2, url_publique, alt
        FROM place_photos
        WHERE place_id = ${id}
        ORDER BY ordre ASC, created_at ASC
      `);
      return toSummary(
        row,
        null,
        photos.map((photo) => ({
          key: photo.cle_r2,
          url: photo.url_publique ?? `/api/photos/${photo.cle_r2}`,
          alt: photo.alt,
        })),
      );
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
