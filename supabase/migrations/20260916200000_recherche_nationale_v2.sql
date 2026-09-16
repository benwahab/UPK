-- Recherche nationale versionnee. La RPC historique rechercher_lieux reste
-- disponible pour les clients existants.

CREATE OR REPLACE FUNCTION public.rechercher_lieux_v2(
  requete text DEFAULT NULL,
  lat double precision DEFAULT NULL,
  lng double precision DEFAULT NULL,
  categorie_slug text DEFAULT NULL,
  region_slug text DEFAULT NULL,
  ville_slug text DEFAULT NULL,
  quartier_recherche text DEFAULT NULL,
  rayon_km double precision DEFAULT NULL,
  limite integer DEFAULT 40,
  decalage integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  nom text,
  description text,
  adresse text,
  quartier text,
  latitude double precision,
  longitude double precision,
  telephone text,
  whatsapp text,
  horaires text,
  site_web text,
  statut_verification public.verification_status,
  categorie_nom text,
  categorie_slug text,
  categorie_icone text,
  region_nom text,
  region_slug text,
  ville_nom text,
  ville_slug text,
  distance_m double precision,
  score_pertinence double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH parametres AS (
    SELECT
      CASE
        WHEN lat IS NULL OR lng IS NULL THEN NULL
        ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      END AS position,
      NULLIF(btrim(requete), '') AS texte,
      NULLIF(btrim(quartier_recherche), '') AS quartier_filtre,
      LEAST(GREATEST(COALESCE(limite, 40), 1), 60) AS taille,
      GREATEST(COALESCE(decalage, 0), 0) AS debut
  ),
  candidats AS (
    SELECT
      p.*,
      c.nom AS categorie_nom_calculee,
      c.slug AS categorie_slug_calcule,
      c.icone AS categorie_icone_calculee,
      r.nom AS region_nom_calcule,
      r.slug AS region_slug_calcule,
      v.nom AS ville_nom_calculee,
      v.slug AS ville_slug_calcule,
      CASE
        WHEN parametres.position IS NULL THEN NULL
        ELSE ST_Distance(p.location, parametres.position)
      END AS distance_calculee,
      CASE
        WHEN parametres.texte IS NULL THEN 0
        ELSE GREATEST(
          similarity(lower(p.nom), lower(parametres.texte)),
          similarity(lower(COALESCE(p.description, '')), lower(parametres.texte)),
          similarity(lower(COALESCE(p.adresse, '')), lower(parametres.texte)),
          similarity(lower(COALESCE(p.quartier, '')), lower(parametres.texte)),
          similarity(lower(COALESCE(c.nom, '')), lower(parametres.texte))
        )
      END AS score_texte
    FROM public.places p
    LEFT JOIN public.categories c ON c.id = p.category_id
    LEFT JOIN public.regions r ON r.id = p.region_id
    LEFT JOIN public.villes_zones v ON v.id = p.ville_zone_id
    CROSS JOIN parametres
    WHERE p.actif = true
      AND (categorie_slug IS NULL OR c.slug = categorie_slug)
      AND (region_slug IS NULL OR r.slug = region_slug)
      AND (ville_slug IS NULL OR v.slug = ville_slug)
      AND (
        parametres.quartier_filtre IS NULL
        OR lower(COALESCE(p.quartier, '')) LIKE '%' || lower(parametres.quartier_filtre) || '%'
      )
      AND (
        parametres.texte IS NULL
        OR lower(p.nom) LIKE '%' || lower(parametres.texte) || '%'
        OR lower(COALESCE(p.description, '')) LIKE '%' || lower(parametres.texte) || '%'
        OR lower(COALESCE(p.adresse, '')) LIKE '%' || lower(parametres.texte) || '%'
        OR lower(COALESCE(p.quartier, '')) LIKE '%' || lower(parametres.texte) || '%'
        OR lower(COALESCE(c.nom, '')) LIKE '%' || lower(parametres.texte) || '%'
        OR similarity(lower(p.nom), lower(parametres.texte)) >= 0.25
      )
      AND (
        parametres.position IS NULL
        OR rayon_km IS NULL
        OR ST_DWithin(p.location, parametres.position, rayon_km * 1000)
      )
  )
  SELECT
    candidats.id,
    candidats.nom,
    candidats.description,
    candidats.adresse,
    candidats.quartier,
    candidats.latitude,
    candidats.longitude,
    candidats.telephone,
    candidats.whatsapp,
    candidats.horaires,
    candidats.site_web,
    candidats.statut_verification,
    candidats.categorie_nom_calculee,
    candidats.categorie_slug_calcule,
    candidats.categorie_icone_calculee,
    candidats.region_nom_calcule,
    candidats.region_slug_calcule,
    candidats.ville_nom_calculee,
    candidats.ville_slug_calcule,
    candidats.distance_calculee,
    (
      candidats.score_texte * 100
      + CASE candidats.statut_verification
          WHEN 'verifie' THEN 20
          WHEN 'source_fiable' THEN 10
          ELSE 0
        END
      + CASE WHEN candidats.telephone IS NOT NULL THEN 3 ELSE 0 END
      + CASE WHEN candidats.adresse IS NOT NULL THEN 3 ELSE 0 END
      + CASE WHEN candidats.horaires IS NOT NULL THEN 2 ELSE 0 END
      + CASE WHEN candidats.distance_calculee IS NULL THEN 0
             ELSE GREATEST(0, 15 - (candidats.distance_calculee / 1000))
        END
    )::double precision AS score_pertinence
  FROM candidats
  CROSS JOIN parametres
  ORDER BY
    score_pertinence DESC,
    candidats.distance_calculee ASC NULLS LAST,
    candidats.nom ASC
  LIMIT (SELECT taille FROM parametres)
  OFFSET (SELECT debut FROM parametres);
$$;

GRANT EXECUTE ON FUNCTION public.rechercher_lieux_v2(
  text, double precision, double precision, text, text, text, text,
  double precision, integer, integer
) TO anon, authenticated;
