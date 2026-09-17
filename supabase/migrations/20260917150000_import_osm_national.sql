-- Import national OSM : journalisation, alias et identite OSM idempotente.
-- Migration additive : les migrations deja appliquees ne sont pas modifiees.

CREATE TABLE IF NOT EXISTS public.place_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  alias text NOT NULL CHECK (btrim(alias) <> ''),
  source text NOT NULL DEFAULT 'osm',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, alias)
);

CREATE UNIQUE INDEX IF NOT EXISTS place_aliases_normalized_idx
  ON public.place_aliases (place_id, lower(btrim(alias)));

CREATE TABLE IF NOT EXISTS public.osm_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'overpass',
  requested_regions text[] NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'partial', 'failed')),
  overpass_endpoint text NOT NULL,
  started_at timestamptz,
  finished_at timestamptz,
  places_seen integer NOT NULL DEFAULT 0,
  places_upserted integer NOT NULL DEFAULT 0,
  places_failed integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.osm_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.osm_import_jobs(id) ON DELETE CASCADE,
  region_slug text NOT NULL,
  bbox text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  attempt integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  elements_seen integer NOT NULL DEFAULT 0,
  places_upserted integer NOT NULL DEFAULT 0,
  error_message text,
  UNIQUE (job_id, region_slug, bbox)
);

-- Les imports historiques utilisent deja osm_type + osm_id. Cette contrainte
-- permet a l'upsert national d'etre rejouable sans doublons.
CREATE UNIQUE INDEX IF NOT EXISTS places_osm_identity_unique_idx
  ON public.places (osm_type, osm_id)
  WHERE osm_type IS NOT NULL AND osm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS osm_import_batches_job_idx
  ON public.osm_import_batches (job_id, status);

ALTER TABLE public.place_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osm_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osm_import_batches ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.place_aliases, public.osm_import_jobs, public.osm_import_batches TO service_role;
GRANT SELECT ON public.place_aliases TO anon, authenticated;
