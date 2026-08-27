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

CREATE POLICY "Le proprietaire ajoute des photos a son lieu" ON public.place_photos
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "Le proprietaire supprime les photos de son lieu" ON public.place_photos
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.owner_id = auth.uid())
  );

GRANT INSERT, DELETE ON public.place_photos TO authenticated;