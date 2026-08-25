-- Lot 8 : module Hôtel (chambres) — cf. cahier des charges section 19.

CREATE TABLE public.chambres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  type text NOT NULL,
  capacite integer,
  nombre integer NOT NULL DEFAULT 1,
  equipements text,
  prix numeric(12, 0),
  description text,
  disponible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chambres_place_idx ON public.chambres (place_id);

ALTER TABLE public.chambres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les chambres d'un hotel actif sont publiques" ON public.chambres
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.actif = true)
  );

CREATE POLICY "Le proprietaire gere les chambres de son hotel" ON public.chambres
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()));

GRANT SELECT ON public.chambres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chambres TO authenticated;

CREATE TRIGGER chambres_updated_at BEFORE UPDATE ON public.chambres
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
