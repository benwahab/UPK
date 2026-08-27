-- Lot 19 : televersement de photos par le proprietaire (cahier des charges
-- section 9 — "photos" fait partie de la fiche standardisee, mais rien ne
-- permettait jusqu'ici a un proprietaire d'en ajouter).

-- Bucket de stockage public (lecture) pour les photos de lieux.
INSERT INTO storage.buckets (id, name, public)
VALUES ('lieu-photos', 'lieu-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Convention de nommage : {place_id}/{nom-fichier}. La policy verifie que
-- le proprietaire du lieu correspond bien a l'utilisateur connecte, via le
-- premier segment du chemin.
CREATE POLICY "Lecture publique des photos de lieux" ON storage.objects
  FOR SELECT USING (bucket_id = 'lieu-photos');

CREATE POLICY "Le proprietaire televerse ses photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'lieu-photos'
    AND EXISTS (
      SELECT 1 FROM public.places p
      WHERE p.id::text = (storage.foldername(name))[1] AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Le proprietaire supprime ses photos" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'lieu-photos'
    AND EXISTS (
      SELECT 1 FROM public.places p
      WHERE p.id::text = (storage.foldername(name))[1] AND p.owner_id = auth.uid()
    )
  );

-- La table place_photos elle-meme n'autorisait que la lecture publique ;
-- il manquait le droit d'ecriture pour le proprietaire du lieu concerne.
CREATE POLICY "Le proprietaire ajoute des photos a son lieu" ON public.place_photos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "Le proprietaire supprime les photos de son lieu" ON public.place_photos
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid())
  );

GRANT INSERT, DELETE ON public.place_photos TO authenticated;
