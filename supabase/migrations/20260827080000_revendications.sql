-- Lot 17 : revendication de fiche (cahier des charges section 12).
-- Un utilisateur peut demander a devenir proprietaire d'une fiche non
-- revendiquee (owner_id NULL). La demande passe par la moderation —
-- pas d'attribution automatique, pour eviter qu'un compte quelconque
-- s'approprie l'etablissement d'un autre.

CREATE TABLE public.revendications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuvee', 'rejetee')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, user_id)
);

CREATE INDEX revendications_statut_idx ON public.revendications (statut) WHERE statut = 'en_attente';

ALTER TABLE public.revendications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un utilisateur demande une revendication" ON public.revendications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Un utilisateur voit ses propres revendications" ON public.revendications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Un moderateur voit et traite les revendications" ON public.revendications
  FOR ALL TO authenticated
  USING (public.est_moderateur(auth.uid()))
  WITH CHECK (public.est_moderateur(auth.uid()));

GRANT SELECT, INSERT ON public.revendications TO authenticated;
GRANT UPDATE ON public.revendications TO authenticated;
