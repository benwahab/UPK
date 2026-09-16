-- Modèle territorial national UPK.
-- Migration additive : les colonnes historiques de places restent inchangées.

CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  code text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.departements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
  nom text NOT NULL,
  code text,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region_id, nom)
);

CREATE TABLE IF NOT EXISTS public.communes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  departement_id uuid NOT NULL REFERENCES public.departements(id) ON DELETE RESTRICT,
  nom text NOT NULL,
  code text,
  slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'commune',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (departement_id, nom)
);

CREATE TABLE IF NOT EXISTS public.villes_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id uuid NOT NULL REFERENCES public.communes(id) ON DELETE RESTRICT,
  nom text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'ville',
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (commune_id, nom)
);

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS departement_id uuid REFERENCES public.departements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commune_id uuid REFERENCES public.communes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ville_zone_id uuid REFERENCES public.villes_zones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS departements_region_idx ON public.departements (region_id);
CREATE INDEX IF NOT EXISTS communes_departement_idx ON public.communes (departement_id);
CREATE INDEX IF NOT EXISTS villes_zones_commune_idx ON public.villes_zones (commune_id);
CREATE INDEX IF NOT EXISTS places_region_idx ON public.places (region_id);
CREATE INDEX IF NOT EXISTS places_departement_idx ON public.places (departement_id);
CREATE INDEX IF NOT EXISTS places_commune_idx ON public.places (commune_id);
CREATE INDEX IF NOT EXISTS places_ville_zone_idx ON public.places (ville_zone_id);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villes_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Territoires visibles par tous" ON public.regions;
CREATE POLICY "Territoires visibles par tous"
  ON public.regions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Departements visibles par tous" ON public.departements;
CREATE POLICY "Departements visibles par tous"
  ON public.departements FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Communes visibles par tous" ON public.communes;
CREATE POLICY "Communes visibles par tous"
  ON public.communes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Villes et zones visibles par tous" ON public.villes_zones;
CREATE POLICY "Villes et zones visibles par tous"
  ON public.villes_zones FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.regions, public.departements, public.communes, public.villes_zones
  TO anon, authenticated;
GRANT ALL ON public.regions, public.departements, public.communes, public.villes_zones
  TO service_role;

CREATE TRIGGER regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER departements_updated_at
  BEFORE UPDATE ON public.departements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER communes_updated_at
  BEFORE UPDATE ON public.communes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER villes_zones_updated_at
  BEFORE UPDATE ON public.villes_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.regions (nom, code, slug) VALUES
  ('Agadez', 'NE-1', 'agadez'),
  ('Diffa', 'NE-2', 'diffa'),
  ('Dosso', 'NE-3', 'dosso'),
  ('Maradi', 'NE-4', 'maradi'),
  ('Niamey', 'NE-5', 'niamey'),
  ('Tahoua', 'NE-6', 'tahoua'),
  ('Tillabéri', 'NE-7', 'tillaberi'),
  ('Zinder', 'NE-8', 'zinder')
ON CONFLICT (slug) DO UPDATE SET nom = EXCLUDED.nom, code = EXCLUDED.code;

INSERT INTO public.departements (region_id, nom, code, slug)
SELECT r.id, 'Niamey', 'NE-5-1', 'niamey'
FROM public.regions r
WHERE r.slug = 'niamey'
ON CONFLICT (slug) DO UPDATE SET region_id = EXCLUDED.region_id, nom = EXCLUDED.nom;

INSERT INTO public.communes (departement_id, nom, code, slug, type)
SELECT d.id, 'Niamey', 'NE-5-1-1', 'niamey', 'commune'
FROM public.departements d
WHERE d.slug = 'niamey'
ON CONFLICT (slug) DO UPDATE
SET departement_id = EXCLUDED.departement_id, nom = EXCLUDED.nom, type = EXCLUDED.type;

INSERT INTO public.villes_zones (commune_id, nom, slug, type, latitude, longitude)
SELECT c.id, 'Niamey', 'niamey', 'ville', 13.5116, 2.1254
FROM public.communes c
WHERE c.slug = 'niamey'
ON CONFLICT (slug) DO UPDATE SET commune_id = EXCLUDED.commune_id, nom = EXCLUDED.nom;

-- Les lieux historiques du catalogue sont tous situés à Niamey.
-- Le rattachement est limité à la zone urbaine connue pour éviter de classer
-- par erreur de futures données nationales.
UPDATE public.places p
SET
  region_id = r.id,
  departement_id = d.id,
  commune_id = c.id,
  ville_zone_id = v.id
FROM public.regions r
JOIN public.departements d ON d.region_id = r.id AND d.slug = 'niamey'
JOIN public.communes c ON c.departement_id = d.id AND c.slug = 'niamey'
JOIN public.villes_zones v ON v.commune_id = c.id AND v.slug = 'niamey'
WHERE r.slug = 'niamey'
  AND p.latitude BETWEEN 13.40 AND 13.70
  AND p.longitude BETWEEN 1.95 AND 2.30
  AND p.region_id IS NULL;
