import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const countries = sqliteTable("countries", {
  code: text("code").primaryKey(),
  nom: text("nom").notNull(),
  phonePrefix: text("phone_prefix"),
  source: text("source").notNull(),
  licence: text("licence"),
  updatedAt: text("updated_at").notNull(),
});

export const regions = sqliteTable("regions", {
  id: text("id").primaryKey(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull(),
  countryCode: text("country_code"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  source: text("source"),
  geonamesId: text("geonames_id"),
});

export const departements = sqliteTable("departements", {
  id: text("id").primaryKey(),
  regionId: text("region_id").notNull(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  source: text("source"),
  geonamesId: text("geonames_id"),
});

export const communes = sqliteTable("communes", {
  id: text("id").primaryKey(),
  departementId: text("departement_id").notNull(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  source: text("source"),
  geonamesId: text("geonames_id"),
});

export const villesZones = sqliteTable("villes_zones", {
  id: text("id").primaryKey(),
  communeId: text("commune_id").notNull(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  type: text("type").notNull().default("ville"),
  nomNormalise: text("nom_normalise"),
  population: integer("population"),
  source: text("source"),
  geonamesId: text("geonames_id"),
  countryCode: text("country_code"),
});

export const quartiers = sqliteTable(
  "quartiers",
  {
    id: text("id").primaryKey(),
    villeZoneId: text("ville_zone_id").notNull(),
    communeId: text("commune_id"),
    nom: text("nom").notNull(),
    slug: text("slug").notNull(),
    nomNormalise: text("nom_normalise").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    source: text("source").notNull(),
    geonamesId: text("geonames_id"),
    licenceSource: text("licence_source"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("quartiers_ville_idx").on(table.villeZoneId),
    index("quartiers_nom_idx").on(table.nomNormalise),
  ],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    nom: text("nom").notNull(),
    slug: text("slug").notNull(),
    icone: text("icone"),
    ordre: integer("ordre").notNull().default(0),
    parentId: text("parent_id"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const categoryTranslations = sqliteTable(
  "category_translations",
  {
    categoryId: text("category_id").notNull(),
    langue: text("langue").notNull(),
    nom: text("nom").notNull(),
  },
  (table) => [index("category_translations_langue_idx").on(table.langue)],
);

export const places = sqliteTable(
  "places",
  {
    id: text("id").primaryKey(),
    nom: text("nom").notNull(),
    nomNormalise: text("nom_normalise").notNull(),
    description: text("description"),
    categoryId: text("category_id").notNull(),
    regionId: text("region_id"),
    departementId: text("departement_id"),
    communeId: text("commune_id"),
    villeZoneId: text("ville_zone_id"),
    quartier: text("quartier"),
    adresse: text("adresse"),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    telephone: text("telephone"),
    telephoneNormalise: text("telephone_normalise"),
    whatsapp: text("whatsapp"),
    horaires: text("horaires"),
    siteWeb: text("site_web"),
    statutPublication: text("statut_publication").notNull().default("en_attente"),
    statutVerification: text("statut_verification").notNull().default("a_verifier"),
    ownerId: text("owner_id"),
    source: text("source").notNull().default("soumission_utilisateur"),
    osmId: text("osm_id"),
    osmType: text("osm_type"),
    licenceSource: text("licence_source"),
    importeLe: text("importe_le"),
    metadata: text("metadata"),
    contactEmail: text("contact_email"),
    gpsPrecisionM: real("gps_precision_m"),
    motifRefus: text("motif_refus"),
    moderePar: text("modere_par"),
    modereLe: text("modere_le"),
    langue: text("langue").notNull().default("fr"),
    countryCode: text("country_code"),
    quartierId: text("quartier_id"),
    quartierNormalise: text("quartier_normalise"),
    sourceUrl: text("source_url"),
    osmTags: text("osm_tags"),
    actif: integer("actif").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("places_geo_idx").on(table.latitude, table.longitude),
    index("places_categorie_idx").on(table.categoryId),
    index("places_ville_idx").on(table.villeZoneId),
    index("places_publication_idx").on(table.statutPublication, table.actif),
    index("places_moderation_idx").on(
      table.statutPublication,
      table.source,
      table.createdAt,
    ),
    index("places_tel_idx").on(table.telephoneNormalise),
    index("places_country_idx").on(table.countryCode),
    index("places_quartier_idx").on(table.quartierId),
    index("places_nom_normalise_idx").on(table.nomNormalise),
    uniqueIndex("places_osm_idx").on(table.osmId, table.osmType),
  ],
);

export const placePhotos = sqliteTable(
  "place_photos",
  {
    id: text("id").primaryKey(),
    placeId: text("place_id").notNull(),
    cleR2: text("cle_r2").notNull(),
    urlPublique: text("url_publique"),
    alt: text("alt"),
    ordre: integer("ordre").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("place_photos_place_idx").on(table.placeId)],
);

export const placeAliases = sqliteTable(
  "place_aliases",
  {
    id: text("id").primaryKey(),
    placeId: text("place_id").notNull(),
    alias: text("alias").notNull(),
    aliasNormalise: text("alias_normalise").notNull(),
    langue: text("langue").notNull().default("fr"),
    source: text("source"),
  },
  (table) => [index("place_aliases_place_idx").on(table.placeId)],
);

export const signalements = sqliteTable(
  "signalements",
  {
    id: text("id").primaryKey(),
    placeId: text("place_id").notNull(),
    typeProbleme: text("type_probleme").notNull(),
    description: text("description"),
    traite: integer("traite").notNull().default(0),
    userId: text("user_id"),
    email: text("email"),
    statut: text("statut").notNull().default("nouveau"),
    motif: text("motif"),
    traiteLe: text("traite_le"),
    traitePar: text("traite_par"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("signalements_place_idx").on(table.placeId),
    index("signalements_statut_idx").on(table.statut, table.createdAt),
  ],
);

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    scope: text("scope").notNull(),
    identifier: text("identifier").notNull(),
    windowStart: integer("window_start").notNull(),
    count: integer("count").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.identifier, table.windowStart] }),
    index("rate_limits_expires_idx").on(table.expiresAt),
  ],
);

export const revendications = sqliteTable(
  "revendications",
  {
    id: text("id").primaryKey(),
    placeId: text("place_id").notNull(),
    userId: text("user_id").notNull(),
    statut: text("statut").notNull().default("en_attente"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("revendications_statut_idx").on(table.statut)],
);

export const journalAdmin = sqliteTable(
  "journal_admin",
  {
    id: text("id").primaryKey(),
    acteurId: text("acteur_id"),
    acteurRole: text("acteur_role"),
    action: text("action").notNull(),
    section: text("section").notNull(),
    cibleType: text("cible_type"),
    cibleId: text("cible_id"),
    resultat: text("resultat"),
    avant: text("avant"),
    apres: text("apres"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("journal_admin_created_idx").on(table.createdAt)],
);

// Tables Better Auth (authentification).
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);


// Candidatures de création de comptes professionnels et de modération.
export const accountApplications = sqliteTable(
  "account_applications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
    accountType: text("account_type").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone").notNull(),
    organizationName: text("organization_name"),
    establishmentType: text("establishment_type"),
    city: text("city").notNull(),
    commune: text("commune").notNull(),
    neighborhood: text("neighborhood").notNull(),
    interventionSector: text("intervention_sector"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    gpsAccuracy: real("gps_accuracy"),
    status: text("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("account_applications_status_idx").on(table.status, table.createdAt),
    index("account_applications_geo_idx").on(table.latitude, table.longitude),
  ],
);
