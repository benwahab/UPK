-- Photos obligatoires a la soumission (verification a distance par l'equipe
-- de moderation, sans avoir a se deplacer). /proposer ne demandant pas de
-- compte, il faut permettre l'ajout de photo sans connexion — mais unique-
-- ment sur une fiche fraichement proposee, jamais revendiquee, encore en
-- attente : ca evite qu'un visiteur anonyme puisse ajouter des photos sur
-- une fiche deja verifiee ou appartenant a quelqu'un.

CREATE POLICY "Contributeur ajoute des photos a une proposition en attente" ON public.place_photos
  FOR INSERT TO anon, authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.places p
      WHERE p.id = place_id AND p.owner_id IS NULL AND p.statut_verification = 'a_verifier'
    )
  );

GRANT INSERT ON public.place_photos TO anon;

CREATE POLICY "Contributeur televerse une photo pour une proposition en attente" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (
    bucket_id = 'lieu-photos'
    AND EXISTS (
      SELECT 1 FROM public.places p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.owner_id IS NULL
        AND p.statut_verification = 'a_verifier'
    )
  );