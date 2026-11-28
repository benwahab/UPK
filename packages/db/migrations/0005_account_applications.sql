PRAGMA foreign_keys = ON;

-- Les demandes de compte sont conservées séparément des comptes Better Auth.
-- Aucun document justificatif n'est collecté : la vérification se fait par contrôle humain et GPS.
CREATE TABLE IF NOT EXISTS account_applications (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('moderation', 'professional')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT NOT NULL,
  organization_name TEXT,
  establishment_type TEXT,
  city TEXT NOT NULL,
  commune TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  intervention_sector TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  gps_accuracy REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS account_applications_status_idx
  ON account_applications(status, created_at);
CREATE INDEX IF NOT EXISTS account_applications_geo_idx
  ON account_applications(latitude, longitude);
