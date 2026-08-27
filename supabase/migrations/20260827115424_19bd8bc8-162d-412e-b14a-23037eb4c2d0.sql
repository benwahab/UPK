CREATE POLICY "Un moderateur cree des categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (public.est_moderateur(auth.uid()));

CREATE POLICY "Un moderateur modifie les categories" ON public.categories
  FOR UPDATE TO authenticated
  USING (public.est_moderateur(auth.uid()))
  WITH CHECK (public.est_moderateur(auth.uid()));

CREATE POLICY "Un moderateur supprime des categories" ON public.categories
  FOR DELETE TO authenticated USING (public.est_moderateur(auth.uid()));

GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;