PRAGMA foreign_keys = ON;

-- Champs de soumission et de modération sur les lieux.
ALTER TABLE places ADD COLUMN contact_email TEXT;
ALTER TABLE places ADD COLUMN gps_precision_m REAL;
ALTER TABLE places ADD COLUMN motif_refus TEXT;
ALTER TABLE places ADD COLUMN modere_par TEXT;
ALTER TABLE places ADD COLUMN modere_le TEXT;

-- Suivi des signalements.
ALTER TABLE signalements ADD COLUMN user_id TEXT;
ALTER TABLE signalements ADD COLUMN email TEXT;
ALTER TABLE signalements ADD COLUMN statut TEXT NOT NULL DEFAULT 'nouveau'
  CHECK (statut IN ('nouveau', 'en_cours', 'traite', 'refuse'));
ALTER TABLE signalements ADD COLUMN motif TEXT;
ALTER TABLE signalements ADD COLUMN traite_le TEXT;
ALTER TABLE signalements ADD COLUMN traite_par TEXT;

CREATE INDEX IF NOT EXISTS places_moderation_idx
  ON places (statut_publication, source, created_at);
CREATE INDEX IF NOT EXISTS signalements_statut_idx
  ON signalements (statut, created_at);

-- Limitation de débit des écritures publiques.
CREATE TABLE IF NOT EXISTS rate_limits (
  scope        TEXT NOT NULL,
  identifier   TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  expires_at   INTEGER NOT NULL,
  PRIMARY KEY (scope, identifier, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limits_expires_idx ON rate_limits (expires_at);

-- Le journal d'audit est append-only.
CREATE TRIGGER IF NOT EXISTS journal_admin_no_update
BEFORE UPDATE ON journal_admin
BEGIN
  SELECT RAISE(ABORT, 'journal_admin est append-only');
END;

CREATE TRIGGER IF NOT EXISTS journal_admin_no_delete
BEFORE DELETE ON journal_admin
BEGIN
  SELECT RAISE(ABORT, 'journal_admin est append-only');
END;
