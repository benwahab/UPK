import type { Database } from "@upk/db";
import { normalizePhone, normalizeSearch } from "@upk/domain";
import { sql } from "drizzle-orm";
import type {
  AuditEntry,
  AuditRepository,
  ContributionRepository,
  ModerationPlace,
  ModerationRepository,
  Photo,
  RateLimitRepository,
  ReportRepository,
  ReportRow,
} from "./context";

type PendingRow = {
  id: string;
  nom: string;
  categorie_slug: string;
  categorie_nom: string;
  description: string | null;
  quartier: string | null;
  adresse: string | null;
  ville: string | null;
  latitude: number;
  longitude: number;
  telephone: string | null;
  whatsapp: string | null;
  site_web: string | null;
  horaires: string | null;
  contact_email: string | null;
  gps_precision_m: number | null;
  statut_publication: string;
  created_at: string;
  owner_id: string | null;
};

type PhotoRow = {
  place_id: string;
  cle_r2: string;
  url_publique: string | null;
  alt: string | null;
};

type ReportDbRow = {
  id: string;
  place_id: string;
  place_nom: string;
  type_probleme: string;
  description: string | null;
  email: string | null;
  statut: string;
  motif: string | null;
  created_at: string;
  traite_le: string | null;
};

const PENDING_SELECT = sql`
  SELECT p.id, p.nom, c.slug AS categorie_slug, c.nom AS categorie_nom,
         p.description, p.quartier, p.adresse, v.nom AS ville,
         p.latitude, p.longitude, p.telephone, p.whatsapp, p.site_web,
         p.horaires, p.contact_email, p.gps_precision_m, p.statut_publication,
         p.created_at, p.owner_id
  FROM places p
  JOIN categories c ON c.id = p.category_id
  LEFT JOIN villes_zones v ON v.id = p.ville_zone_id
`;

function toPhoto(row: PhotoRow): Photo {
  return {
    key: row.cle_r2,
    url: row.url_publique ?? `/api/photos/${row.cle_r2}`,
    alt: row.alt,
  };
}

function toModerationPlace(row: PendingRow, photos: Photo[]): ModerationPlace {
  return {
    id: row.id,
    nom: row.nom,
    categorieSlug: row.categorie_slug,
    categorieNom: row.categorie_nom,
    description: row.description,
    quartier: row.quartier,
    adresse: row.adresse,
    ville: row.ville,
    latitude: row.latitude,
    longitude: row.longitude,
    telephone: row.telephone,
    whatsapp: row.whatsapp,
    siteWeb: row.site_web,
    horaires: row.horaires,
    contactEmail: row.contact_email,
    gpsPrecisionM: row.gps_precision_m,
    statutPublication: row.statut_publication,
    createdAt: row.created_at,
    ownerId: row.owner_id,
    photos,
  };
}

function toReport(row: ReportDbRow): ReportRow {
  return {
    id: row.id,
    placeId: row.place_id,
    placeNom: row.place_nom,
    typeProbleme: row.type_probleme,
    description: row.description,
    email: row.email,
    statut: row.statut,
    motif: row.motif,
    createdAt: row.created_at,
    traiteLe: row.traite_le,
  };
}

async function photosByPlace(db: Database): Promise<Map<string, Photo[]>> {
  const rows = await db.all<PhotoRow>(sql`
    SELECT ph.place_id, ph.cle_r2, ph.url_publique, ph.alt
    FROM place_photos ph
    JOIN places p ON p.id = ph.place_id
    WHERE p.statut_publication IN ('en_attente', 'en_examen')
      AND p.source = 'soumission_utilisateur'
    ORDER BY ph.ordre ASC
  `);
  const grouped = new Map<string, Photo[]>();
  for (const row of rows) {
    const list = grouped.get(row.place_id) ?? [];
    list.push(toPhoto(row));
    grouped.set(row.place_id, list);
  }
  return grouped;
}

export function createD1ContributionRepository(db: Database): ContributionRepository {
  return {
    async create(data, meta) {
      const category = await db.get<{ id: string }>(
        sql`SELECT id FROM categories WHERE slug = ${data.categorySlug}`,
      );
      if (!category) throw new Error("CATEGORY_NOT_FOUND");

      const id = `usr_${crypto.randomUUID()}`;
      const submissionToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const metadata = JSON.stringify({ submissionToken });
      const contactEmail = meta.contactEmail ?? data.contactEmail ?? null;
      const gpsPrecisionM = meta.gpsPrecisionM ?? data.gpsPrecisionM ?? null;

      await db.run(sql`
        INSERT INTO places (
          id, nom, nom_normalise, description, category_id, quartier, adresse,
          latitude, longitude, telephone, telephone_normalise, whatsapp,
          horaires, site_web, statut_publication, statut_verification,
          owner_id, source, contact_email, gps_precision_m, metadata,
          langue, actif, created_at, updated_at
        ) VALUES (
          ${id}, ${data.nom}, ${normalizeSearch(data.nom)}, ${data.description ?? null},
          ${category.id}, ${data.quartier ?? null}, ${data.adresse ?? null},
          ${data.latitude}, ${data.longitude}, ${data.telephone ?? null},
          ${data.telephone ? normalizePhone(data.telephone) : null},
          ${data.whatsapp ?? null}, ${data.horaires ?? null}, ${data.siteWeb ?? null},
          'en_attente', 'a_verifier', ${meta.userId}, 'soumission_utilisateur',
          ${contactEmail}, ${gpsPrecisionM}, ${metadata}, ${data.langue}, 1,
          ${now}, ${now}
        )
      `);

      return { id, submissionToken };
    },

    async addPhoto(placeId, key, alt) {
      const next = await db.get<{ ordre: number }>(sql`
        SELECT COALESCE(MAX(ordre) + 1, 0) AS ordre
        FROM place_photos WHERE place_id = ${placeId}
      `);
      await db.run(sql`
        INSERT INTO place_photos (id, place_id, cle_r2, url_publique, alt, ordre, created_at)
        VALUES (
          ${`pho_${crypto.randomUUID()}`}, ${placeId}, ${key},
          ${`/api/photos/${key}`}, ${alt}, ${next?.ordre ?? 0},
          ${new Date().toISOString()}
        )
      `);
    },

    async verifySubmission(placeId, token) {
      const row = await db.get<{ metadata: string | null }>(sql`
        SELECT metadata FROM places
        WHERE id = ${placeId}
          AND statut_publication IN ('en_attente', 'en_examen')
          AND source = 'soumission_utilisateur'
      `);
      if (!row?.metadata) return false;
      try {
        const parsed = JSON.parse(row.metadata) as { submissionToken?: string };
        return parsed.submissionToken === token;
      } catch {
        return false;
      }
    },
  };
}

export function createD1ReportRepository(db: Database): ReportRepository {
  return {
    async create(data, meta) {
      const id = `sig_${crypto.randomUUID()}`;
      await db.run(sql`
        INSERT INTO signalements (
          id, place_id, type_probleme, description, user_id, email, statut, created_at
        ) VALUES (
          ${id}, ${data.placeId}, ${data.typeProbleme}, ${data.description ?? null},
          ${meta.userId}, ${meta.email ?? data.email ?? null}, 'nouveau',
          ${new Date().toISOString()}
        )
      `);
      return { id };
    },
  };
}

export function createD1ModerationRepository(db: Database): ModerationRepository {
  return {
    async listPending() {
      const rows = await db.all<PendingRow>(sql`
        ${PENDING_SELECT}
        WHERE p.statut_publication IN ('en_attente', 'en_examen')
          AND p.source = 'soumission_utilisateur'
        ORDER BY p.created_at ASC
        LIMIT 50
      `);
      const photos = await photosByPlace(db);
      return rows.map((row) => toModerationPlace(row, photos.get(row.id) ?? []));
    },

    async findPending(id) {
      const row = await db.get<PendingRow>(sql`
        ${PENDING_SELECT}
        WHERE p.id = ${id}
          AND p.statut_publication IN ('en_attente', 'en_examen')
          AND p.source = 'soumission_utilisateur'
      `);
      if (!row) return null;
      const photos = await photosByPlace(db);
      return toModerationPlace(row, photos.get(row.id) ?? []);
    },

    async approve(id, actorId) {
      const now = new Date().toISOString();
      await db.run(sql`
        UPDATE places
        SET statut_publication = 'valide', statut_verification = 'verifie',
            modere_par = ${actorId}, modere_le = ${now}, motif_refus = NULL,
            updated_at = ${now}
        WHERE id = ${id}
          AND statut_publication IN ('en_attente', 'en_examen')
      `);
    },

    async reject(id, actorId, motif) {
      const now = new Date().toISOString();
      await db.run(sql`
        UPDATE places
        SET statut_publication = 'refuse', motif_refus = ${motif},
            modere_par = ${actorId}, modere_le = ${now}, updated_at = ${now}
        WHERE id = ${id}
          AND statut_publication IN ('en_attente', 'en_examen')
      `);
    },

    async listReports() {
      const rows = await db.all<ReportDbRow>(sql`
        SELECT s.id, s.place_id, p.nom AS place_nom, s.type_probleme,
               s.description, s.email, s.statut, s.motif, s.created_at, s.traite_le
        FROM signalements s
        JOIN places p ON p.id = s.place_id
        WHERE s.statut IN ('nouveau', 'en_cours')
        ORDER BY s.created_at ASC
        LIMIT 50
      `);
      return rows.map(toReport);
    },

    async resolveReport(id, statut, motif, actorId) {
      const now = new Date().toISOString();
      await db.run(sql`
        UPDATE signalements
        SET statut = ${statut}, motif = ${motif}, traite = 1,
            traite_le = ${now}, traite_par = ${actorId}
        WHERE id = ${id} AND statut IN ('nouveau', 'en_cours')
      `);
    },
  };
}

export function createD1RateLimitRepository(db: Database): RateLimitRepository {
  return {
    async consume(scope, identifier, limit, windowSeconds) {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
      const expiresAt = windowStart + windowSeconds;

      await db.run(sql`DELETE FROM rate_limits WHERE expires_at < ${now}`);

      const row = await db.get<{ count: number }>(sql`
        INSERT INTO rate_limits (scope, identifier, window_start, count, expires_at)
        VALUES (${scope}, ${identifier}, ${windowStart}, 1, ${expiresAt})
        ON CONFLICT(scope, identifier, window_start)
        DO UPDATE SET count = count + 1
        RETURNING count
      `);
      const count = Number(row?.count ?? 1);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt: expiresAt * 1000,
      };
    },
  };
}

export function createD1AuditRepository(db: Database): AuditRepository {
  return {
    async append(entry: AuditEntry) {
      await db.run(sql`
        INSERT INTO journal_admin (
          id, acteur_id, acteur_role, action, section, cible_type, cible_id,
          resultat, avant, apres, created_at
        ) VALUES (
          ${`aud_${crypto.randomUUID()}`}, ${entry.actorId}, ${entry.actorRole},
          ${entry.action}, ${entry.section}, ${entry.targetType ?? null},
          ${entry.targetId ?? null}, ${entry.result ?? null},
          ${entry.before === undefined ? null : JSON.stringify(entry.before)},
          ${entry.after === undefined ? null : JSON.stringify(entry.after)},
          ${new Date().toISOString()}
        )
      `);
    },
  };
}
