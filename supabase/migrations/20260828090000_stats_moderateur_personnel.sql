-- Complement au journal de moderation : un moderateur peut consulter ses
-- propres actions (pour afficher son compteur personnel sur
-- /pro/moderation), sans pour autant voir celles des autres — ca reste
-- reserve a l'admin.

CREATE POLICY "Un moderateur voit ses propres actions" ON public.actions_moderation
  FOR SELECT TO authenticated USING (moderateur_id = auth.uid());
