-- Lot 11 : statistiques pour les propriétaires (cahier des charges section 35).

CREATE TABLE public.evenements_lieu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  type_evenement text NOT NULL CHECK (
    type_evenement IN ('vue', 'appel', 'itineraire', 'site_web', 'whatsapp')
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour l'agregation par lieu/type/periode (requete la plus frequente).
CREATE INDEX evenements_lieu_place_type_idx ON public.evenements_lieu (place_id, type_evenement, created_at);

ALTER TABLE public.evenements_lieu ENABLE ROW LEVEL SECURITY;

-- N'importe qui (avec ou sans compte) genere des evenements en consultant
-- une fiche. Ecriture seule, pas de lecture publique (donnees du proprietaire).
CREATE POLICY "N'importe qui enregistre un evenement" ON public.evenements_lieu
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Le proprietaire consulte les statistiques de ses lieux" ON public.evenements_lieu
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid())
  );

GRANT INSERT ON public.evenements_lieu TO anon, authenticated;
GRANT SELECT ON public.evenements_lieu TO authenticated;
