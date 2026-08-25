-- Lot 6 : signalement d'erreur sur une fiche.
CREATE TABLE public.signalements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  type_probleme text NOT NULL CHECK (
    type_probleme IN ('ferme', 'infos_incorrectes', 'position_incorrecte', 'doublon', 'autre')
  ),
  description text,
  traite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.signalements TO anon, authenticated;
GRANT SELECT, UPDATE ON public.signalements TO authenticated;
GRANT ALL ON public.signalements TO service_role;

ALTER TABLE public.signalements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "N'importe qui signale un probleme" ON public.signalements
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Un moderateur voit les signalements" ON public.signalements
  FOR SELECT TO authenticated USING (public.est_moderateur(auth.uid()));

CREATE POLICY "Un moderateur traite les signalements" ON public.signalements
  FOR UPDATE TO authenticated
  USING (public.est_moderateur(auth.uid()))
  WITH CHECK (public.est_moderateur(auth.uid()));

CREATE INDEX signalements_place_idx ON public.signalements (place_id);
CREATE INDEX signalements_traite_idx ON public.signalements (traite) WHERE traite = false;

-- Lot 7 : module Restaurant (menu).
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

GRANT SELECT ON public.plats TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plats TO authenticated;
GRANT ALL ON public.plats TO service_role;

ALTER TABLE public.plats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Le menu d'un restaurant actif est public" ON public.plats
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.actif = true)
  );

CREATE POLICY "Le proprietaire gere le menu de son restaurant" ON public.plats
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()));

CREATE INDEX plats_place_idx ON public.plats (place_id);

CREATE TRIGGER plats_updated_at BEFORE UPDATE ON public.plats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lot 8 : module Hotel (chambres).
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

GRANT SELECT ON public.chambres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chambres TO authenticated;
GRANT ALL ON public.chambres TO service_role;

ALTER TABLE public.chambres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les chambres d'un hotel actif sont publiques" ON public.chambres
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.actif = true)
  );

CREATE POLICY "Le proprietaire gere les chambres de son hotel" ON public.chambres
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()));

CREATE INDEX chambres_place_idx ON public.chambres (place_id);

CREATE TRIGGER chambres_updated_at BEFORE UPDATE ON public.chambres
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();