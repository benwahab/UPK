-- Lot 3 : soumission de lieux par les utilisateurs + file de validation admin.

-- Roles simples (pas encore de systeme de permissions granulaire, cf. cahier
-- des charges section 33 pour les roles plus fins prevus plus tard).
ALTER TABLE public.profiles
  ADD COLUMN role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'moderator', 'admin'));

-- Bootstrap : s'il n'existe deja qu'un seul profil (le premier compte cree
-- sur le projet), on le promeut admin pour ne pas avoir a bidouiller la base
-- a la main.
UPDATE public.profiles SET role = 'admin'
WHERE (SELECT count(*) FROM public.profiles) = 1;

-- Fonction utilitaire (SECURITY DEFINER pour eviter la recursion RLS quand
-- une policy sur `places` a besoin de lire le role dans `profiles`).
CREATE OR REPLACE FUNCTION public.est_moderateur(p_user_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role IN ('moderator', 'admin')
  );
$$;

-- A la creation d'un compte : le tout premier compte du systeme devient
-- admin automatiquement (pratique pour le lancement), les suivants sont
-- de simples utilisateurs.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nom_complet, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'nom_complet',
    CASE WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Distingue "propose par" (simple contributeur, jamais proprietaire) de
-- "owner_id" (le professionnel qui gere reellement la fiche).
ALTER TABLE public.places ADD COLUMN submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Un utilisateur connecte peut proposer un lieu qu'il ne possede pas.
-- Toujours a_verifier, jamais owner_id (ca, c'est reserve au flux "Espace pro").
CREATE POLICY "Un utilisateur propose un lieu" ON public.places
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND owner_id IS NULL
    AND source = 'soumission_utilisateur'
    AND statut_verification = 'a_verifier'
  );

-- Un moderateur/admin voit tout, y compris les fiches non actives/non verifiees.
CREATE POLICY "Un moderateur voit tous les lieux" ON public.places
  FOR SELECT TO authenticated USING (public.est_moderateur(auth.uid()));

-- Un moderateur/admin peut valider, rejeter ou desactiver n'importe quelle fiche.
CREATE POLICY "Un moderateur modere tous les lieux" ON public.places
  FOR UPDATE TO authenticated
  USING (public.est_moderateur(auth.uid()))
  WITH CHECK (public.est_moderateur(auth.uid()));
