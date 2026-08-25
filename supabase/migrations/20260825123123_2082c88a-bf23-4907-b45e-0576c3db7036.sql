GRANT INSERT ON public.places TO anon;

CREATE POLICY "N'importe qui propose un lieu, sans compte" ON public.places
  FOR INSERT TO anon
  WITH CHECK (
    submitted_by IS NULL
    AND owner_id IS NULL
    AND source = 'soumission_utilisateur'
    AND statut_verification = 'a_verifier'
  );