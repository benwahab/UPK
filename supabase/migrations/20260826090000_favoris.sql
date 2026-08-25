-- Lot 13 : favoris (cahier des charges section 36).

CREATE TABLE public.favoris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, place_id)
);

CREATE INDEX favoris_user_idx ON public.favoris (user_id);

ALTER TABLE public.favoris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chacun gere ses propres favoris" ON public.favoris
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.favoris TO authenticated;
