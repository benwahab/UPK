-- GPS is mandatory for professional accounts only; moderator applications do not collect location.
CREATE TABLE account_applications_new (
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
  latitude REAL,
  longitude REAL,
  gps_accuracy REAL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO account_applications_new (
  id, user_id, account_type, first_name, last_name, phone,
  organization_name, establishment_type, city, commune, neighborhood,
  intervention_sector, latitude, longitude, gps_accuracy, status,
  reviewed_by, reviewed_at, created_at, updated_at
)
SELECT
  id, user_id, account_type, first_name, last_name, phone,
  organization_name, establishment_type, city, commune, neighborhood,
  intervention_sector, latitude, longitude, gps_accuracy, status,
  reviewed_by, reviewed_at, created_at, updated_at
FROM account_applications;

DROP TABLE account_applications;
ALTER TABLE account_applications_new RENAME TO account_applications;

CREATE INDEX account_applications_status_idx
  ON account_applications(status, created_at);
CREATE INDEX account_applications_geo_idx
  ON account_applications(latitude, longitude);
