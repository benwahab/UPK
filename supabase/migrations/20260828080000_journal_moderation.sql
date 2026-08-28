-- Journal des actions de moderation (qui a valide/rejete quoi, et quand),
-- pour permettre a l'admin de voir un nombre de lieux traites par
-- moderateur. Journal append-only, distinct de places elle-meme, pour
-- garder un historique complet meme si une fiche change plusieurs fois
-- de statut.

CREATE TABLE public.actions_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  moderateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('validation', 'rejet')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX actions_moderation_moderateur_idx ON public.actions_moderation (moderateur_id);

ALTER TABLE public.actions_moderation ENABLE ROW LEVEL SECURITY;

-- Un moderateur/admin enregistre uniquement sa propre action (jamais au
-- nom de quelqu'un d'autre).
CREATE POLICY "Un moderateur enregistre sa propre action" ON public.actions_moderation
  FOR INSERT TO authenticated WITH CHECK (
    moderateur_id = auth.uid() AND public.est_moderateur(auth.uid())
  );

-- Coherent avec le reste : seul un admin consulte les statistiques, pas
-- les moderateurs entre eux (qui n'ont de toute facon pas acces a /admin).
CREATE POLICY "Un admin consulte le journal de moderation" ON public.actions_moderation
  FOR SELECT TO authenticated USING (public.est_admin(auth.uid()));

GRANT SELECT, INSERT ON public.actions_moderation TO authenticated;
