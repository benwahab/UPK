-- Lot : systeme de demande de moderateur en libre-service, valide
-- uniquement par un admin. Au passage, correction d'une faille de
-- securite reelle : la policy UPDATE sur profiles ne restreignait pas
-- quelles colonnes un utilisateur pouvait modifier sur sa propre ligne —
-- n'importe quel compte authentifie pouvait donc s'auto-attribuer le
-- role 'admin' ou 'moderator' via un appel direct au client Supabase,
-- en contournant entierement les fonctions serveur.

-- 1) Verrouillage : un utilisateur ne peut plus modifier que son nom et
--    son telephone sur son propre profil. Le role devient uniquement
--    modifiable via les fonctions SECURITY DEFINER ci-dessous.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nom_complet, telephone) ON public.profiles TO authenticated;

-- 2) Fonction utilitaire admin (distincte de est_moderateur, qui reste
--    valable pour "peut valider une fiche" mais plus pour la gestion des
--    roles, des signalements, des revendications et des categories —
--    desormais reservees a l'admin, cf. plus bas).
CREATE OR REPLACE FUNCTION public.est_admin(p_user_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin');
$$;

-- 3) Un admin peut lister tous les profils (necessaire pour afficher la
--    liste des moderateurs actuels et pouvoir les revoquer).
CREATE POLICY "Un admin voit tous les profils" ON public.profiles
  FOR SELECT TO authenticated USING (public.est_admin(auth.uid()));

-- 4) Table des demandes de moderation (libre-service, depuis l'espace pro).
CREATE TABLE public.demandes_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuvee', 'rejetee')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Une seule demande EN ATTENTE a la fois par utilisateur (il peut
-- retenter apres un rejet, une nouvelle ligne est alors creee).
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

-- 5) Fonctions d'approbation/rejet/revocation : SECURITY DEFINER pour
--    pouvoir modifier profiles.role (verrouille cote client depuis le
--    point 1), mais chacune verifie explicitement est_admin() en tout
--    premier — impossible de les appeler avec un compte non-admin.
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

-- 6) Recentrage des permissions "moderateur" sur leur seule tache reelle
--    (verifier les lieux) : la gestion des signalements, revendications
--    et categories passe desormais par est_admin() plutot que
--    est_moderateur(), pour qu'un compte moderateur n'ait aucun droit
--    d'ecriture au-dela de la file de verification des lieux — coherent
--    avec le fait qu'il n'a plus non plus acces a l'interface /admin.
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

-- Les policies "Un moderateur voit tous les lieux" / "Un moderateur
-- modere tous les lieux" (places, Lot 3) restent inchangees et
-- continuent d'utiliser est_moderateur() : c'est precisement la tache
-- qu'un compte moderateur doit pouvoir faire.
