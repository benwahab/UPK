-- 1. Rôles hors table profils (anti-élévation de privilège)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('professionnel', 'moderateur', 'administrateur', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  accorde_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  accorde_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_suspendu boolean NOT NULL DEFAULT false;

-- 2. Helpers d'autorisation
CREATE OR REPLACE FUNCTION public.a_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.est_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.est_suspendu(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT admin_suspendu FROM public.profiles WHERE id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.a_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.est_suspendu(_user_id) AND NOT public.est_super_admin(_user_id) THEN false
    WHEN public.est_super_admin(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id AND permission = _permission
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.est_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('moderateur', 'administrateur', 'super_admin')
  ) AND (NOT public.est_suspendu(_user_id) OR public.est_super_admin(_user_id));
$$;

CREATE POLICY "Chacun voit ses roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.a_permission(auth.uid(), 'administrateurs'));

CREATE POLICY "Chacun voit ses permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.a_permission(auth.uid(), 'administrateurs'));

-- 3. Journal des actions administratives (append-only)
CREATE TABLE IF NOT EXISTS public.journal_admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acteur_nom text,
  acteur_role text NOT NULL,
  action text NOT NULL,
  section text NOT NULL,
  cible_type text,
  cible_id text,
  cible_libelle text,
  resultat text NOT NULL DEFAULT 'succes',
  avant jsonb,
  apres jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_admin_created_idx ON public.journal_admin (created_at DESC);
CREATE INDEX IF NOT EXISTS journal_admin_acteur_idx ON public.journal_admin (acteur_id, created_at DESC);

GRANT SELECT ON public.journal_admin TO authenticated;
GRANT ALL ON public.journal_admin TO service_role;
ALTER TABLE public.journal_admin ENABLE ROW LEVEL SECURITY;

-- Lecture réservée à la permission "activite" ; aucune policy UPDATE/DELETE :
-- personne ne peut réécrire l'historique, pas même un administrateur.
CREATE POLICY "Lecture du journal selon permission" ON public.journal_admin
  FOR SELECT TO authenticated
  USING (public.a_permission(auth.uid(), 'activite'));

CREATE OR REPLACE FUNCTION public.journaliser(
  p_action text,
  p_section text,
  p_cible_type text DEFAULT NULL,
  p_cible_id text DEFAULT NULL,
  p_cible_libelle text DEFAULT NULL,
  p_resultat text DEFAULT 'succes',
  p_avant jsonb DEFAULT NULL,
  p_apres jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;

  SELECT CASE
    WHEN public.est_super_admin(auth.uid()) THEN 'super_admin'
    WHEN public.a_role(auth.uid(), 'administrateur') THEN 'administrateur'
    WHEN public.a_role(auth.uid(), 'moderateur') THEN 'moderateur'
    ELSE 'professionnel' END INTO v_role;

  INSERT INTO public.journal_admin (
    acteur_id, acteur_nom, acteur_role, action, section,
    cible_type, cible_id, cible_libelle, resultat, avant, apres
  ) VALUES (
    auth.uid(),
    (SELECT COALESCE(NULLIF(TRIM(COALESCE(prenom, '') || ' ' || COALESCE(nom_complet, '')), ''), NULL)
       FROM public.profiles WHERE id = auth.uid()),
    v_role, p_action, p_section,
    p_cible_type, p_cible_id, p_cible_libelle, COALESCE(p_resultat, 'succes'), p_avant, p_apres
  );
END; $$;

-- 4. Attribution des rôles et permissions (super admin / permission dédiée)
CREATE OR REPLACE FUNCTION public.accorder_role(p_user_id uuid, p_role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.a_permission(auth.uid(), 'administrateurs') THEN
    RAISE EXCEPTION 'Permission requise pour accorder un rôle.';
  END IF;
  IF p_role = 'super_admin' AND NOT public.est_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Seul un super administrateur peut accorder ce rôle.';
  END IF;

  INSERT INTO public.user_roles (user_id, role, accorde_par)
  VALUES (p_user_id, p_role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles SET role = CASE
      WHEN public.a_role(p_user_id, 'super_admin') OR public.a_role(p_user_id, 'administrateur') THEN 'admin'
      WHEN public.a_role(p_user_id, 'moderateur') THEN 'moderator'
      ELSE role END
    WHERE id = p_user_id;

  PERFORM public.journaliser('Attribution du rôle ' || p_role::text, 'administrateurs',
    'compte', p_user_id::text, NULL, 'succes', NULL, jsonb_build_object('role', p_role::text));
END; $$;

CREATE OR REPLACE FUNCTION public.retirer_role(p_user_id uuid, p_role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.a_permission(auth.uid(), 'administrateurs') THEN
    RAISE EXCEPTION 'Permission requise pour retirer un rôle.';
  END IF;
  IF p_role = 'super_admin' THEN
    RAISE EXCEPTION 'Le rôle super administrateur ne peut pas être retiré ici.';
  END IF;
  IF public.est_super_admin(p_user_id) AND NOT public.est_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Action non autorisée sur un super administrateur.';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;

  UPDATE public.profiles SET role = CASE
      WHEN public.a_role(p_user_id, 'super_admin') OR public.a_role(p_user_id, 'administrateur') THEN 'admin'
      WHEN public.a_role(p_user_id, 'moderateur') THEN 'moderator'
      ELSE 'user' END
    WHERE id = p_user_id;

  PERFORM public.journaliser('Retrait du rôle ' || p_role::text, 'administrateurs',
    'compte', p_user_id::text, NULL, 'succes', jsonb_build_object('role', p_role::text), NULL);
END; $$;

CREATE OR REPLACE FUNCTION public.definir_permissions(p_user_id uuid, p_permissions text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_avant text[];
BEGIN
  IF NOT public.a_permission(auth.uid(), 'administrateurs') THEN
    RAISE EXCEPTION 'Permission requise pour modifier les permissions.';
  END IF;
  IF public.est_super_admin(p_user_id) AND NOT public.est_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Action non autorisée sur un super administrateur.';
  END IF;

  SELECT COALESCE(array_agg(permission ORDER BY permission), '{}')
    INTO v_avant FROM public.user_permissions WHERE user_id = p_user_id;

  DELETE FROM public.user_permissions WHERE user_id = p_user_id;
  INSERT INTO public.user_permissions (user_id, permission, accorde_par)
  SELECT p_user_id, p, auth.uid() FROM unnest(COALESCE(p_permissions, '{}')) AS p
  ON CONFLICT (user_id, permission) DO NOTHING;

  PERFORM public.journaliser('Modification des permissions', 'administrateurs',
    'compte', p_user_id::text, NULL, 'succes',
    jsonb_build_object('permissions', v_avant),
    jsonb_build_object('permissions', COALESCE(p_permissions, '{}')));
END; $$;

CREATE OR REPLACE FUNCTION public.suspendre_acces_admin(p_user_id uuid, p_suspendu boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_avant boolean;
BEGIN
  IF NOT public.a_permission(auth.uid(), 'administrateurs') THEN
    RAISE EXCEPTION 'Permission requise pour suspendre un accès.';
  END IF;
  IF public.est_super_admin(p_user_id) THEN
    RAISE EXCEPTION 'Un super administrateur ne peut pas être suspendu.';
  END IF;

  SELECT admin_suspendu INTO v_avant FROM public.profiles WHERE id = p_user_id;
  UPDATE public.profiles SET admin_suspendu = p_suspendu WHERE id = p_user_id;

  PERFORM public.journaliser(
    CASE WHEN p_suspendu THEN 'Suspension de l''accès administratif'
         ELSE 'Réactivation de l''accès administratif' END,
    'comptes', 'compte', p_user_id::text, NULL, 'succes',
    jsonb_build_object('suspendu', v_avant), jsonb_build_object('suspendu', p_suspendu));
END; $$;

-- 5. Recherche de comptes (e-mail dans auth.users, donc fonction definer)
CREATE OR REPLACE FUNCTION public.rechercher_comptes(p_recherche text DEFAULT NULL)
RETURNS TABLE (
  id uuid, email text, prenom text, nom_complet text, telephone text,
  cree_le timestamptz, admin_suspendu boolean, roles text[], permissions text[]
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.a_permission(auth.uid(), 'comptes') THEN
    RAISE EXCEPTION 'Permission requise pour consulter les comptes.';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::text, p.prenom, p.nom_complet, p.telephone, u.created_at,
         COALESCE(p.admin_suspendu, false),
         COALESCE((SELECT array_agg(r.role::text ORDER BY r.role::text)
                     FROM public.user_roles r WHERE r.user_id = u.id), '{}'),
         COALESCE((SELECT array_agg(pe.permission ORDER BY pe.permission)
                     FROM public.user_permissions pe WHERE pe.user_id = u.id), '{}')
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p_recherche IS NULL OR TRIM(p_recherche) = ''
     OR u.email ILIKE '%' || p_recherche || '%'
     OR COALESCE(p.nom_complet, '') ILIKE '%' || p_recherche || '%'
     OR COALESCE(p.prenom, '') ILIKE '%' || p_recherche || '%'
     OR COALESCE(p.telephone, '') ILIKE '%' || p_recherche || '%'
  ORDER BY u.created_at DESC
  LIMIT 100;
END; $$;

CREATE OR REPLACE FUNCTION public.mes_autorisations()
RETURNS TABLE (roles text[], permissions text[], suspendu boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
  RETURN QUERY
  SELECT COALESCE((SELECT array_agg(r.role::text ORDER BY r.role::text)
                     FROM public.user_roles r WHERE r.user_id = auth.uid()), '{}'),
         COALESCE((SELECT array_agg(pe.permission ORDER BY pe.permission)
                     FROM public.user_permissions pe WHERE pe.user_id = auth.uid()), '{}'),
         public.est_suspendu(auth.uid());
END; $$;

-- 6. Circuit de validation des propositions de lieux
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS statut_soumission text;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS motif_refus text;

UPDATE public.places SET statut_soumission = CASE
    WHEN source = 'soumission_utilisateur' AND statut_verification = 'a_verifier' THEN 'en_attente'
    ELSE 'valide' END
  WHERE statut_soumission IS NULL;

ALTER TABLE public.places ALTER COLUMN statut_soumission SET DEFAULT 'en_attente';

ALTER TABLE public.places DROP CONSTRAINT IF EXISTS places_statut_soumission_check;
ALTER TABLE public.places ADD CONSTRAINT places_statut_soumission_check
  CHECK (statut_soumission IN ('en_attente', 'en_examen', 'valide', 'refuse'));

CREATE INDEX IF NOT EXISTS places_statut_soumission_idx ON public.places (statut_soumission);

CREATE OR REPLACE FUNCTION public.definir_statut_soumission(
  p_place_id uuid, p_statut text, p_motif text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_avant text; v_nom text;
BEGIN
  IF NOT public.a_permission(auth.uid(), 'validation_lieux') THEN
    RAISE EXCEPTION 'Permission requise pour traiter les propositions.';
  END IF;
  IF p_statut NOT IN ('en_attente', 'en_examen', 'valide', 'refuse') THEN
    RAISE EXCEPTION 'Statut inconnu.';
  END IF;

  SELECT statut_soumission, nom INTO v_avant, v_nom FROM public.places WHERE id = p_place_id;

  UPDATE public.places
    SET statut_soumission = p_statut,
        motif_refus = CASE WHEN p_statut = 'refuse' THEN p_motif ELSE NULL END,
        actif = CASE WHEN p_statut = 'refuse' THEN false ELSE actif END
    WHERE id = p_place_id;

  PERFORM public.journaliser('Statut de proposition : ' || p_statut, 'validation_lieux',
    'lieu', p_place_id::text, v_nom, 'succes',
    jsonb_build_object('statut_soumission', v_avant),
    jsonb_build_object('statut_soumission', p_statut, 'motif', p_motif));
END; $$;

-- 7. Le propriétaire de la plateforme devient super administrateur
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin' FROM auth.users u WHERE u.email = 'benwahab111@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
