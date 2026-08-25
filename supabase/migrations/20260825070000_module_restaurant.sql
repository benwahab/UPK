-- Lot 7 : module Restaurant (menu) — cf. cahier des charges section 20.

CREATE TABLE public.plats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text,
  categorie text,
  prix numeric(12, 0),
  disponible boolean NOT NULL DEFAULT true,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX plats_place_idx ON public.plats (place_id);

ALTER TABLE public.plats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Le menu d'un restaurant actif est public" ON public.plats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.actif = true)
  );

CREATE POLICY "Le proprietaire gere le menu de son restaurant" ON public.plats
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()));

GRANT SELECT ON public.plats TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plats TO authenticated;

CREATE TRIGGER plats_updated_at BEFORE UPDATE ON public.plats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
