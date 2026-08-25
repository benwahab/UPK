CREATE TABLE public.alertes_medicament (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medicament_id uuid NOT NULL REFERENCES public.medicaments(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  notifie boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, medicament_id)
);

CREATE INDEX alertes_medicament_user_idx ON public.alertes_medicament (user_id);

ALTER TABLE public.alertes_medicament ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chacun gere ses propres alertes" ON public.alertes_medicament
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Le proprietaire notifie les alertes de sa pharmacie" ON public.alertes_medicament
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.alertes_medicament TO authenticated;
GRANT UPDATE (notifie) ON public.alertes_medicament TO authenticated;
GRANT ALL ON public.alertes_medicament TO service_role;