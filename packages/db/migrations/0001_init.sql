PRAGMA foreign_keys = ON;

-- Référentiels géographiques
CREATE TABLE regions (
  id   TEXT PRIMARY KEY,
  nom  TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE departements (
  id        TEXT PRIMARY KEY,
  region_id TEXT NOT NULL REFERENCES regions(id),
  nom       TEXT NOT NULL,
  slug      TEXT NOT NULL
);

CREATE TABLE communes (
  id             TEXT PRIMARY KEY,
  departement_id TEXT NOT NULL REFERENCES departements(id),
  nom            TEXT NOT NULL,
  slug           TEXT NOT NULL
);

CREATE TABLE villes_zones (
  id          TEXT PRIMARY KEY,
  commune_id  TEXT NOT NULL REFERENCES communes(id),
  nom         TEXT NOT NULL,
  slug        TEXT NOT NULL,
  latitude    REAL,
  longitude   REAL
);

-- Catégories et traductions
CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  nom        TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  icone      TEXT,
  ordre      INTEGER NOT NULL DEFAULT 0,
  parent_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE category_translations (
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  langue      TEXT NOT NULL CHECK (langue IN ('fr', 'en', 'ar')),
  nom         TEXT NOT NULL,
  PRIMARY KEY (category_id, langue)
);

-- Lieux
CREATE TABLE places (
  id                  TEXT PRIMARY KEY,
  nom                 TEXT NOT NULL,
  nom_normalise       TEXT NOT NULL,
  description         TEXT,
  category_id         TEXT NOT NULL REFERENCES categories(id),
  region_id           TEXT REFERENCES regions(id),
  departement_id      TEXT REFERENCES departements(id),
  commune_id          TEXT REFERENCES communes(id),
  ville_zone_id       TEXT REFERENCES villes_zones(id),
  quartier            TEXT,
  adresse             TEXT,
  latitude            REAL NOT NULL,
  longitude           REAL NOT NULL,
  telephone           TEXT,
  telephone_normalise TEXT,
  whatsapp            TEXT,
  horaires            TEXT,
  site_web            TEXT,
  statut_publication  TEXT NOT NULL DEFAULT 'en_attente'
                      CHECK (statut_publication IN ('en_attente', 'en_examen', 'valide', 'refuse')),
  statut_verification TEXT NOT NULL DEFAULT 'a_verifier'
                      CHECK (statut_verification IN ('a_verifier', 'verifie', 'source_fiable')),
  owner_id            TEXT,
  source              TEXT NOT NULL DEFAULT 'soumission_utilisateur',
  osm_id              TEXT,
  osm_type            TEXT,
  licence_source      TEXT,
  importe_le          TEXT,
  metadata            TEXT,
  langue              TEXT NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr', 'en', 'ar')),
  actif               INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX places_geo_idx ON places (latitude, longitude);
CREATE INDEX places_categorie_idx ON places (category_id);
CREATE INDEX places_ville_idx ON places (ville_zone_id);
CREATE INDEX places_publication_idx ON places (statut_publication, actif);
CREATE INDEX places_tel_idx ON places (telephone_normalise);
CREATE UNIQUE INDEX places_osm_idx ON places (osm_id, osm_type)
  WHERE osm_id IS NOT NULL;

CREATE TABLE place_photos (
  id           TEXT PRIMARY KEY,
  place_id     TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  cle_r2       TEXT NOT NULL,
  url_publique TEXT,
  alt          TEXT,
  ordre        INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);

CREATE INDEX place_photos_place_idx ON place_photos (place_id);

CREATE TABLE place_aliases (
  id              TEXT PRIMARY KEY,
  place_id        TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  alias           TEXT NOT NULL,
  alias_normalise TEXT NOT NULL,
  langue          TEXT NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr', 'en', 'ar')),
  source          TEXT
);

CREATE INDEX place_aliases_place_idx ON place_aliases (place_id);
CREATE UNIQUE INDEX place_aliases_unique_idx
  ON place_aliases (place_id, alias_normalise, langue);

-- Contribution et modération
CREATE TABLE signalements (
  id            TEXT PRIMARY KEY,
  place_id      TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  type_probleme TEXT NOT NULL,
  description   TEXT,
  traite        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE INDEX signalements_place_idx ON signalements (place_id);
CREATE INDEX signalements_traite_idx ON signalements (traite);

CREATE TABLE revendications (
  id         TEXT PRIMARY KEY,
  place_id   TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  statut     TEXT NOT NULL DEFAULT 'en_attente'
             CHECK (statut IN ('en_attente', 'approuvee', 'refusee')),
  created_at TEXT NOT NULL
);

CREATE INDEX revendications_statut_idx ON revendications (statut);

CREATE TABLE lots_assignation (
  id             TEXT PRIMARY KEY,
  nom            TEXT NOT NULL,
  moderateur_id  TEXT,
  centre_lat     REAL NOT NULL,
  centre_lng     REAL NOT NULL,
  rayon_m        INTEGER NOT NULL,
  assigne_par    TEXT,
  created_at     TEXT NOT NULL
);

CREATE TABLE assignations_moderation (
  id            TEXT PRIMARY KEY,
  lot_id        TEXT REFERENCES lots_assignation(id) ON DELETE SET NULL,
  place_id      TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  moderateur_id TEXT,
  statut        TEXT NOT NULL DEFAULT 'a_verifier'
                CHECK (statut IN ('a_verifier', 'valide', 'refuse')),
  motif_refus   TEXT,
  traite_le     TEXT,
  created_at    TEXT NOT NULL
);

CREATE UNIQUE INDEX assignations_unique_idx
  ON assignations_moderation (place_id)
  WHERE statut = 'a_verifier';

CREATE TABLE journal_admin (
  id          TEXT PRIMARY KEY,
  acteur_id   TEXT,
  acteur_role TEXT,
  action      TEXT NOT NULL,
  section     TEXT NOT NULL,
  cible_type  TEXT,
  cible_id    TEXT,
  resultat    TEXT,
  avant       TEXT,
  apres       TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX journal_admin_created_idx ON journal_admin (created_at);
CREATE INDEX journal_admin_acteur_idx ON journal_admin (acteur_id);

-- Recherche plein texte (latin avec suppression des diacritiques)
CREATE VIRTUAL TABLE places_fts USING fts5(
  nom,
  nom_normalise,
  description,
  quartier,
  content = 'places',
  content_rowid = 'rowid',
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TRIGGER places_ai AFTER INSERT ON places BEGIN
  INSERT INTO places_fts(rowid, nom, nom_normalise, description, quartier)
  VALUES (new.rowid, new.nom, new.nom_normalise, new.description, new.quartier);
END;

CREATE TRIGGER places_ad AFTER DELETE ON places BEGIN
  INSERT INTO places_fts(places_fts, rowid, nom, nom_normalise, description, quartier)
  VALUES ('delete', old.rowid, old.nom, old.nom_normalise, old.description, old.quartier);
END;

CREATE TRIGGER places_au AFTER UPDATE ON places BEGIN
  INSERT INTO places_fts(places_fts, rowid, nom, nom_normalise, description, quartier)
  VALUES ('delete', old.rowid, old.nom, old.nom_normalise, old.description, old.quartier);
  INSERT INTO places_fts(rowid, nom, nom_normalise, description, quartier)
  VALUES (new.rowid, new.nom, new.nom_normalise, new.description, new.quartier);
END;
