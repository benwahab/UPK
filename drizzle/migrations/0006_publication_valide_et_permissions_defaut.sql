-- Les modérateurs disposent d'un socle de permissions liées à leur travail
CREATE OR REPLACE FUNCTION public.a_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.est_suspendu(_user_id) AND NOT public.est_super_admin(_user_id) THEN false
    WHEN public.est_super_admin(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id AND permission = _permission
    ) OR (
      _permission IN ('validation_lieux', 'etablissements')
      AND public.a_role(_user_id, 'moderateur')
    )
  END;
$$;

-- Reprise des rôles historiques stockés sur profiles
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'administrateur' FROM public.profiles p WHERE p.role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'moderateur' FROM public.profiles p WHERE p.role = 'moderator'
ON CONFLICT (user_id, role) DO NOTHING;

-- Seuls les lieux validés sont publiés dans la recherche publique
CREATE OR REPLACE FUNCTION public.rechercher_lieux(
  requete text DEFAULT NULL,
  lat double precision DEFAULT NULL,
  lng double precision DEFAULT NULL,
  categorie_slug text DEFAULT NULL,
  rayon_km double precision DEFAULT NULL,
  limite integer DEFAULT 50
) RETURNS TABLE(
  id uuid, nom text, description text, adresse text, quartier text,
  latitude double precision, longitude double precision, telephone text, whatsapp text,
  horaires text, site_web text, statut_verification verification_status,
  categorie_nom text, categorie_slug text, categorie_icone text, distance_m double precision
) LANGUAGE sql STABLE SET search_path TO 'public' AS $function$
  WITH pt AS (
    SELECT CASE WHEN lat IS NULL OR lng IS NULL THEN NULL
      ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography END AS g
  )
  SELECT p.id, p.nom, p.description, p.adresse, p.quartier, p.latitude, p.longitude,
         p.telephone, p.whatsapp, p.horaires, p.site_web, p.statut_verification,
         c.nom, c.slug, c.icone,
         CASE WHEN pt.g IS NULL THEN NULL ELSE ST_Distance(p.location, pt.g) END
  FROM public.places p
  LEFT JOIN public.categories c ON c.id = p.category_id
  CROSS JOIN pt
  WHERE p.actif = true
    AND COALESCE(p.statut_soumission, 'valide') = 'valide'
    AND (categorie_slug IS NULL OR c.slug = categorie_slug)
    AND (
      requete IS NULL OR btrim(requete) = '' OR
      p.nom ILIKE '%' || requete || '%' OR
      coalesce(p.description, '') ILIKE '%' || requete || '%' OR
      coalesce(p.quartier, '') ILIKE '%' || requete || '%' OR
      coalesce(p.adresse, '') ILIKE '%' || requete || '%' OR
      coalesce(c.nom, '') ILIKE '%' || requete || '%'
    )
    AND (pt.g IS NULL OR rayon_km IS NULL OR ST_DWithin(p.location, pt.g, rayon_km * 1000))
  ORDER BY CASE WHEN pt.g IS NULL THEN NULL ELSE ST_Distance(p.location, pt.g) END ASC NULLS LAST, p.nom ASC
  LIMIT COALESCE(limite, 50);
$function$;
