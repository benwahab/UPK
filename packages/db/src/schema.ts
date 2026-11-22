import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const regions = sqliteTable("regions", {
  id: text("id").primaryKey(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull(),
});

export const departements = sqliteTable("departements", {
  id: text("id").primaryKey(),
  regionId: text("region_id").notNull(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull(),
});

export const communes = sqliteTable("communes", {
  id: text("id").primaryKey(),
  departementId: text("departement_id").notNull(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull(),
});

export const villesZones = sqliteTable("villes_zones", {
  id: text("id").primaryKey(),
  communeId: text("commune_id").notNull(),
  nom: text("nom").notNull(),
  slug: text("slug").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
});

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
    langue: text("langue").notNull().default("fr"),
    actif: integer("actif").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("places_geo_idx").on(table.latitude, table.longitude),
    index("places_categorie_idx").on(table.categoryId),
    index("places_ville_idx").on(table.villeZoneId),
    index("places_publication_idx").on(table.statutPublication, table.actif),
    index("places_tel_idx").on(table.telephoneNormalise),
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
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("signalements_place_idx").on(table.placeId)],
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
