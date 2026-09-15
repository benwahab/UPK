-- Lots d'attribution : un gestionnaire de modérateurs confie à un modérateur
-- un groupe de lieux tous situés dans un rayon restreint autour d'un centre.
CREATE TABLE public.lots_assignation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  moderateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigne_par uuid REFERENCES auth.users(id),
  centre_lat double precision NOT NULL,
  centre_lng double precision NOT NULL,
  rayon_m integer NOT NULL DEFAULT 2000,
  statut text NOT NULL DEFAULT 'actif',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.lots_assignation TO authenticated;
GRANT ALL ON public.lots_assignation TO service_role;
ALTER TABLE public.lots_assignation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lots visibles au moderateur et aux gestionnaires"
ON public.lots_assignation FOR SELECT TO authenticated
USING (moderateur_id = auth.uid() OR public.a_permission(auth.uid(), 'moderateurs'));

CREATE POLICY "gestionnaires creent des lots"
ON public.lots_assignation FOR INSERT TO authenticated
WITH CHECK (public.a_permission(auth.uid(), 'moderateurs'));

CREATE POLICY "gestionnaires modifient les lots"
ON public.lots_assignation FOR UPDATE TO authenticated
USING (public.a_permission(auth.uid(), 'moderateurs'))
WITH CHECK (public.a_permission(auth.uid(), 'moderateurs'));

CREATE TABLE public.assignations_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES public.lots_assignation(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  moderateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut text NOT NULL DEFAULT 'a_verifier',
  motif_refus text,
  latitude_corrigee double precision,
  longitude_corrigee double precision,
  traite_le timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.assignations_moderation TO authenticated;
GRANT ALL ON public.assignations_moderation TO service_role;
ALTER TABLE public.assignations_moderation ENABLE ROW LEVEL SECURITY;

-- Un lieu ne peut être confié qu'à un seul modérateur à la fois.
CREATE UNIQUE INDEX assignation_lieu_ouverte_unique
ON public.assignations_moderation (place_id)
WHERE statut = 'a_verifier';

CREATE INDEX assignation_moderateur_statut
ON public.assignations_moderation (moderateur_id, statut);

CREATE POLICY "assignations visibles au moderateur et aux gestionnaires"
ON public.assignations_moderation FOR SELECT TO authenticated
USING (moderateur_id = auth.uid() OR public.a_permission(auth.uid(), 'moderateurs'));

CREATE POLICY "gestionnaires attribuent des lieux"
ON public.assignations_moderation FOR INSERT TO authenticated
WITH CHECK (public.a_permission(auth.uid(), 'moderateurs'));

CREATE POLICY "moderateur traite ses assignations"
ON public.assignations_moderation FOR UPDATE TO authenticated
USING (moderateur_id = auth.uid() OR public.a_permission(auth.uid(), 'moderateurs'))
WITH CHECK (moderateur_id = auth.uid() OR public.a_permission(auth.uid(), 'moderateurs'));

-- Lieux à vérifier disponibles dans un rayon donné (aucune attribution ouverte).
CREATE OR REPLACE FUNCTION public.lieux_a_assigner(
  p_lat double precision,
  p_lng double precision,
  p_rayon_m integer
)
RETURNS TABLE (
  id uuid,
  nom text,
  quartier text,
  adresse text,
  categorie_nom text,
  latitude double precision,
  longitude double precision,
  distance_m integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         p.nom,
         p.quartier,
         p.adresse,
         c.nom AS categorie_nom,
         p.latitude,
         p.longitude,
         ROUND(
           ST_Distance(
             ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
             ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
           )
         )::int AS distance_m
  FROM public.places p
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE p.actif = true
    AND p.statut_verification = 'a_verifier'
    AND public.a_permission(auth.uid(), 'moderateurs')
    AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          GREATEST(p_rayon_m, 100)
        )
    AND NOT EXISTS (
      SELECT 1 FROM public.assignations_moderation a
      WHERE a.place_id = p.id AND a.statut = 'a_verifier'
    )
  ORDER BY distance_m ASC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.lieux_a_assigner(double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lieux_a_assigner(double precision, double precision, integer) TO authenticated;
