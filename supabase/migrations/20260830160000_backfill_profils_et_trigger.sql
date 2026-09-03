-- Correctif structurel : la table profiles etait entierement vide, ce qui
-- indique que le trigger on_auth_user_created (cense creer un profil a
-- chaque inscription) n'a jamais fonctionne en pratique, meme si sa
-- definition SQL est correcte. Deux actions :
--
-- 1) Rattraper tous les comptes existants qui n'ont pas de profil.
-- 2) Re-attacher explicitement le trigger (DROP + CREATE), au cas ou sa
--    creation initiale ait echoue silencieusement lors d'une migration
--    precedente sans faire remonter d'erreur visible.

-- Rattrapage : un profil par compte existant sans profil, role 'user' par
-- defaut (le compte admin/moderateur legitime est deja corrige a part).
INSERT INTO public.profiles (id, nom_complet, role)
SELECT u.id, u.raw_user_meta_data ->> 'nom_complet', 'user'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Re-attache le trigger pour de bon.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
