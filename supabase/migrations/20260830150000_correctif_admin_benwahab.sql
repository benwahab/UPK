-- Correctif ponctuel : le compte benwahab111@gmail.com aurait du devenir
-- admin automatiquement a la creation (premier compte de la plateforme,
-- cf. trigger handle_new_user), mais ce n'est pas le cas — probablement
-- un compte de test cree furtivement avant, faussant le comptage. Cette
-- migration corrige explicitement, une seule fois, pour ce compte precis.

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'benwahab111@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte trouve avec cet email.';
  END IF;

  UPDATE public.profiles SET role = 'admin' WHERE id = v_user_id;
END $$;
