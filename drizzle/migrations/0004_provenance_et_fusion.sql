ALTER TABLE public.places
  ADD COLUMN osm_id text,
  ADD COLUMN osm_type text,
  ADD COLUMN licence_source text,
  ADD COLUMN importe_le timestamptz,
  ADD COLUMN derniere_sync timestamptz;

CREATE INDEX places_osm_id_idx ON public.places (osm_id) WHERE osm_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fusionner_lieux(p_garder_id uuid, p_retirer_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.est_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve aux administrateurs.';
  END IF;

  IF p_garder_id = p_retirer_id THEN
    RAISE EXCEPTION 'Impossible de fusionner un lieu avec lui-meme.';
  END IF;

  UPDATE public.place_photos SET place_id = p_garder_id WHERE place_id = p_retirer_id;
  UPDATE public.medicaments SET place_id = p_garder_id WHERE place_id = p_retirer_id;
  UPDATE public.plats SET place_id = p_garder_id WHERE place_id = p_retirer_id;
  UPDATE public.chambres SET place_id = p_garder_id WHERE place_id = p_retirer_id;

  DELETE FROM public.pharmacie_gardes pg
  WHERE pg.place_id = p_retirer_id
    AND EXISTS (
      SELECT 1 FROM public.pharmacie_gardes pg2
      WHERE pg2.place_id = p_garder_id AND pg2.date_garde = pg.date_garde
    );
  UPDATE public.pharmacie_gardes SET place_id = p_garder_id WHERE place_id = p_retirer_id;

  UPDATE public.places SET actif = false WHERE id = p_retirer_id;
END;
$$;