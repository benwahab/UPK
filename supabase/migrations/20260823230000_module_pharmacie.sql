-- Lot 5 : module Pharmacie (stock, prix, gardes) — cf. cahier des charges
-- section 17. Catalogue en texte libre par pharmacie (pas de catalogue
-- medicament partage/dedoublonne pour l'instant, cf. section 41 : le
-- dedoublonnage viendra dans un lot ulterieur).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.medicaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  nom_commercial text NOT NULL,
  molecule text,
  dosage text,
  forme text,
  conditionnement text,
  prix_vente numeric(12, 0),
  disponible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX medicaments_place_idx ON public.medicaments (place_id);
-- Recherche "ou trouver X" par nom commercial ou molecule.
CREATE INDEX medicaments_nom_trgm_idx ON public.medicaments USING gin (nom_commercial gin_trgm_ops);
CREATE INDEX medicaments_molecule_trgm_idx ON public.medicaments USING gin (molecule gin_trgm_ops);

ALTER TABLE public.medicaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Le stock d'une pharmacie active est public" ON public.medicaments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.actif = true)
  );

CREATE POLICY "Le proprietaire gere le stock de sa pharmacie" ON public.medicaments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()));

GRANT SELECT ON public.medicaments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medicaments TO authenticated;

CREATE TRIGGER medicaments_updated_at BEFORE UPDATE ON public.medicaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Calendrier de garde : une ligne = un jour ou cette pharmacie est de garde.
CREATE TABLE public.pharmacie_gardes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  date_garde date NOT NULL,
  horaires text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, date_garde)
);

CREATE INDEX pharmacie_gardes_date_idx ON public.pharmacie_gardes (date_garde);

ALTER TABLE public.pharmacie_gardes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Le calendrier de garde est public" ON public.pharmacie_gardes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.actif = true)
  );

CREATE POLICY "Le proprietaire gere son calendrier de garde" ON public.pharmacie_gardes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()));

GRANT SELECT ON public.pharmacie_gardes TO anon, authenticated;
GRANT INSERT, DELETE ON public.pharmacie_gardes TO authenticated;
