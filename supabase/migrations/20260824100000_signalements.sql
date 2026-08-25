-- Lot 6 : signalement d'erreur sur une fiche (cahier des charges section 13).
-- N'importe qui peut signaler, sans compte. Traitement reserve aux
-- moderateurs/admins (meme role que la file de moderation du Lot 3).

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

CREATE INDEX signalements_place_idx ON public.signalements (place_id);
CREATE INDEX signalements_traite_idx ON public.signalements (traite) WHERE traite = false;

ALTER TABLE public.signalements ENABLE ROW LEVEL SECURITY;

-- N'importe qui (avec ou sans compte) peut signaler un probleme.
CREATE POLICY "N'importe qui signale un probleme" ON public.signalements
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seuls les moderateurs/admins consultent et traitent les signalements
-- (reutilise la fonction est_moderateur() creee au Lot 3).
CREATE POLICY "Un moderateur voit les signalements" ON public.signalements
  FOR SELECT TO authenticated USING (public.est_moderateur(auth.uid()));

CREATE POLICY "Un moderateur traite les signalements" ON public.signalements
  FOR UPDATE TO authenticated
  USING (public.est_moderateur(auth.uid()))
  WITH CHECK (public.est_moderateur(auth.uid()));

GRANT INSERT ON public.signalements TO anon, authenticated;
GRANT SELECT, UPDATE ON public.signalements TO authenticated;
