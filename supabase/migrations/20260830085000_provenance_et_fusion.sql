-- Tracabilite fine par lieu (section 5/7/17 du document d'evolution UPK) :
-- le champ 'source' existant (place_source enum) reste tel quel, mais il
-- ne suffit pas a dire PRECISEMENT d'ou vient un lieu OSM donne (quel
-- noeud, quelle licence, quand importe/synchronise). Colonnes admin-only
-- par convention applicative (jamais selectionnees dans les fonctions
-- publiques comme obtenirLieu/rechercherLieux) — pas besoin de RLS
-- differente puisque la table places reste protegee comme avant, la
-- separation technique/utilisateur se fait au niveau des SELECT cote
-- application, pas au niveau de la table.

ALTER TABLE public.places
  ADD COLUMN osm_id text,
  ADD COLUMN osm_type text,
  ADD COLUMN licence_source text,
  ADD COLUMN importe_le timestamptz,
  ADD COLUMN derniere_sync timestamptz;

CREATE INDEX places_osm_id_idx ON public.places (osm_id) WHERE osm_id IS NOT NULL;

-- Fusion de doublons (section 7) : deplace le contenu du lieu "perdant"
-- vers le lieu "gagnant" puis desactive le perdant (jamais de suppression
-- definitive, pour garder un historique et ne pas casser les references
-- existantes ailleurs). Reserve a l'admin — verifie explicitement avant
-- toute ecriture.
CREATE OR REPLACE FUNCTION public.fusionner_lieux(p_garder_id uuid, p_retirer_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.est_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve aux administrateurs.';
  END IF;

  IF p_garder_id = p_retirer_id THEN
    RAISE EXCEPTION 'Impossible de fusionner un lieu avec lui-meme.';
  END IF;

  -- Photos, stock, menu, chambres : simplement reattaches au lieu gagnant.
  UPDATE public.place_photos SET place_id = p_garder_id WHERE place_id = p_retirer_id;
  UPDATE public.medicaments SET place_id = p_garder_id WHERE place_id = p_retirer_id;
  UPDATE public.plats SET place_id = p_garder_id WHERE place_id = p_retirer_id;
  UPDATE public.chambres SET place_id = p_garder_id WHERE place_id = p_retirer_id;

  -- pharmacie_gardes a une contrainte UNIQUE(place_id, date_garde) : on
  -- retire d'abord les gardes du perdant qui entreraient en conflit avec
  -- une garde deja existante du gagnant a la meme date, puis on reattache
  -- le reste (ON CONFLICT n'est valide que sur INSERT, pas sur UPDATE).
  DELETE FROM public.pharmacie_gardes pg
  WHERE pg.place_id = p_retirer_id
    AND EXISTS (
      SELECT 1 FROM public.pharmacie_gardes pg2
      WHERE pg2.place_id = p_garder_id AND pg2.date_garde = pg.date_garde
    );
  UPDATE public.pharmacie_gardes SET place_id = p_garder_id WHERE place_id = p_retirer_id;

  -- Le lieu perdant est desactive (jamais supprime) : reste consultable
  -- dans l'historique admin, disparait de la recherche et des fiches
  -- publiques (comme n'importe quel lieu actif=false).
  UPDATE public.places SET actif = false WHERE id = p_retirer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fusionner_lieux(uuid, uuid) TO authenticated;
