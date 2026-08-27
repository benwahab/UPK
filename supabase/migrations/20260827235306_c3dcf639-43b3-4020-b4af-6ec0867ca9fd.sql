REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nom_complet, telephone) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.est_admin(p_user_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin');
$$;

CREATE POLICY "Un admin voit tous les profils" ON public.profiles
  FOR SELECT TO authenticated USING (public.est_admin(auth.uid()));

CREATE TABLE public.demandes_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuvee', 'rejetee')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX demandes_moderation_pending_idx ON public.demandes_moderation (user_id)
  WHERE statut = 'en_attente';

ALTER TABLE public.demandes_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un utilisateur demande a devenir moderateur" ON public.demandes_moderation
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Un utilisateur voit ses propres demandes" ON public.demandes_moderation
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Un admin voit toutes les demandes" ON public.demandes_moderation
  FOR SELECT TO authenticated USING (public.est_admin(auth.uid()));

GRANT SELECT, INSERT ON public.demandes_moderation TO authenticated;
GRANT ALL ON public.demandes_moderation TO service_role;

CREATE OR REPLACE FUNCTION public.approuver_moderateur(p_demande_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.est_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve aux administrateurs.';
  END IF;

  SELECT user_id INTO v_user_id FROM public.demandes_moderation
  WHERE id = p_demande_id AND statut = 'en_attente';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Demande introuvable ou deja traitee.';
  END IF;

  UPDATE public.profiles SET role = 'moderator' WHERE id = v_user_id;
  UPDATE public.demandes_moderation SET statut = 'approuvee' WHERE id = p_demande_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rejeter_demande_moderation(p_demande_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.est_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve aux administrateurs.';
  END IF;

  UPDATE public.demandes_moderation SET statut = 'rejetee'
  WHERE id = p_demande_id AND statut = 'en_attente';
END;
$$;

CREATE OR REPLACE FUNCTION public.revoquer_moderateur(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.est_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve aux administrateurs.';
  END IF;

  UPDATE public.profiles SET role = 'user' WHERE id = p_user_id AND role = 'moderator';
END;
$$;

GRANT EXECUTE ON FUNCTION public.approuver_moderateur(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rejeter_demande_moderation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoquer_moderateur(uuid) TO authenticated;

DROP POLICY "Un moderateur voit les signalements" ON public.signalements;
DROP POLICY "Un moderateur traite les signalements" ON public.signalements;
CREATE POLICY "Un admin voit les signalements" ON public.signalements
  FOR SELECT TO authenticated USING (public.est_admin(auth.uid()));
CREATE POLICY "Un admin traite les signalements" ON public.signalements
  FOR UPDATE TO authenticated
  USING (public.est_admin(auth.uid()))
  WITH CHECK (public.est_admin(auth.uid()));

DROP POLICY "Un moderateur voit et traite les revendications" ON public.revendications;
CREATE POLICY "Un admin voit et traite les revendications" ON public.revendications
  FOR ALL TO authenticated
  USING (public.est_admin(auth.uid()))
  WITH CHECK (public.est_admin(auth.uid()));

DROP POLICY "Un moderateur cree des categories" ON public.categories;
DROP POLICY "Un moderateur modifie les categories" ON public.categories;
DROP POLICY "Un moderateur supprime des categories" ON public.categories;
CREATE POLICY "Un admin cree des categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (public.est_admin(auth.uid()));
CREATE POLICY "Un admin modifie les categories" ON public.categories
  FOR UPDATE TO authenticated
  USING (public.est_admin(auth.uid()))
  WITH CHECK (public.est_admin(auth.uid()));
CREATE POLICY "Un admin supprime des categories" ON public.categories
  FOR DELETE TO authenticated USING (public.est_admin(auth.uid()));