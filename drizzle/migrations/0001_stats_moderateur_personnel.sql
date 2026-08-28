CREATE POLICY "Un moderateur voit ses propres actions" ON public.actions_moderation
  FOR SELECT TO authenticated USING (moderateur_id = auth.uid());