PRAGMA foreign_keys = ON;

-- Référentiel pays et enrichissement géographique Sahel.
CREATE TABLE countries (
  code        TEXT PRIMARY KEY,
  nom         TEXT NOT NULL,
  phone_prefix TEXT,
  source      TEXT NOT NULL,
  licence     TEXT,
  updated_at  TEXT NOT NULL
);

ALTER TABLE regions ADD COLUMN country_code TEXT;
ALTER TABLE regions ADD COLUMN latitude REAL;
ALTER TABLE regions ADD COLUMN longitude REAL;
ALTER TABLE regions ADD COLUMN source TEXT;
ALTER TABLE regions ADD COLUMN geonames_id TEXT;

ALTER TABLE departements ADD COLUMN latitude REAL;
ALTER TABLE departements ADD COLUMN longitude REAL;
ALTER TABLE departements ADD COLUMN source TEXT;
ALTER TABLE departements ADD COLUMN geonames_id TEXT;

ALTER TABLE communes ADD COLUMN latitude REAL;
ALTER TABLE communes ADD COLUMN longitude REAL;
ALTER TABLE communes ADD COLUMN source TEXT;
ALTER TABLE communes ADD COLUMN geonames_id TEXT;

ALTER TABLE villes_zones ADD COLUMN type TEXT NOT NULL DEFAULT 'ville';
ALTER TABLE villes_zones ADD COLUMN population INTEGER;
ALTER TABLE villes_zones ADD COLUMN source TEXT;
ALTER TABLE villes_zones ADD COLUMN geonames_id TEXT;
ALTER TABLE villes_zones ADD COLUMN country_code TEXT;
ALTER TABLE villes_zones ADD COLUMN nom_normalise TEXT;

CREATE INDEX villes_zones_nom_idx ON villes_zones (nom_normalise);

CREATE TABLE quartiers (
  id            TEXT PRIMARY KEY,
  ville_zone_id TEXT NOT NULL REFERENCES villes_zones(id),
  commune_id    TEXT REFERENCES communes(id),
  nom           TEXT NOT NULL,
  slug          TEXT NOT NULL,
  nom_normalise TEXT NOT NULL,
  latitude      REAL,
  longitude     REAL,
  source        TEXT NOT NULL,
  geonames_id   TEXT,
  licence_source TEXT,
  created_at    TEXT NOT NULL
);

CREATE INDEX quartiers_ville_idx ON quartiers (ville_zone_id);
CREATE INDEX quartiers_nom_idx ON quartiers (nom_normalise);

ALTER TABLE places ADD COLUMN country_code TEXT;
ALTER TABLE places ADD COLUMN quartier_id TEXT REFERENCES quartiers(id);
ALTER TABLE places ADD COLUMN quartier_normalise TEXT;
ALTER TABLE places ADD COLUMN source_url TEXT;
ALTER TABLE places ADD COLUMN osm_tags TEXT;

CREATE INDEX places_country_idx ON places (country_code);
CREATE INDEX places_quartier_idx ON places (quartier_id);
CREATE INDEX places_nom_normalise_idx ON places (nom_normalise);
