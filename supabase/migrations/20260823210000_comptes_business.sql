-- Lot 2 : comptes business (creation de fiche par les etablissements eux-memes).
-- Auth email/mot de passe standard Supabase (auth.users), pas d'OTP telephone pour l'instant.

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_complet text,
  telephone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chacun voit son propre profil" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Chacun modifie son propre profil" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cree automatiquement un profil a l'inscription.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nom_complet)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nom_complet')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Rattache un lieu a son proprietaire (nullable : les lieux importes/internes n'ont pas de owner).
ALTER TABLE public.places ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX places_owner_idx ON public.places (owner_id);

GRANT INSERT, UPDATE ON public.places TO authenticated;

-- Un proprietaire voit ses propres fiches meme si elles ne sont pas encore actives/verifiees.
CREATE POLICY "Le proprietaire voit ses propres lieux" ON public.places
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Un utilisateur connecte peut creer une fiche pour lui-meme.
-- La fiche part en source = soumission_utilisateur, statut = a_verifier (jamais "verifie" a la creation).
CREATE POLICY "Un utilisateur cree ses propres lieux" ON public.places
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND source = 'soumission_utilisateur'
    AND statut_verification = 'a_verifier'
  );

-- Le proprietaire peut modifier sa propre fiche, mais ne peut pas se verifier lui-meme
-- ni changer la source (seul un admin/moderateur pourra faire ca plus tard).
CREATE POLICY "Le proprietaire modifie ses propres lieux" ON public.places
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND statut_verification = 'a_verifier'
    AND source = 'soumission_utilisateur'
  );
