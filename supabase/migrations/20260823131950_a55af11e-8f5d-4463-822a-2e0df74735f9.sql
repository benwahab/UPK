CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.verification_status AS ENUM ('a_verifier', 'source_fiable', 'verifie');
CREATE TYPE public.place_source AS ENUM ('interne', 'web_public', 'soumission_utilisateur');

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  icone text,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  adresse text,
  quartier text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  location geography(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED,
  telephone text,
  whatsapp text,
  horaires text,
  site_web text,
  statut_verification public.verification_status NOT NULL DEFAULT 'a_verifier',
  source public.place_source NOT NULL DEFAULT 'interne',
  actif boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.place_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  url text NOT NULL,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX places_location_gix ON public.places USING GIST (location);
CREATE INDEX places_category_idx ON public.places (category_id);
CREATE INDEX places_nom_trgm_idx ON public.places USING GIN (nom gin_trgm_ops);
CREATE INDEX place_photos_place_idx ON public.place_photos (place_id, ordre);
CREATE INDEX categories_parent_idx ON public.categories (parent_id);

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT SELECT ON public.places TO anon, authenticated;
GRANT ALL ON public.places TO service_role;
GRANT SELECT ON public.place_photos TO anon, authenticated;
GRANT ALL ON public.place_photos TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalogue des categories visible par tous" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Lieux actifs visibles par tous" ON public.places FOR SELECT TO anon, authenticated USING (actif = true);
CREATE POLICY "Photos de lieux actifs visibles par tous" ON public.place_photos FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.actif = true));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER places_updated_at BEFORE UPDATE ON public.places FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.rechercher_lieux(
  requete text DEFAULT NULL,
  lat double precision DEFAULT NULL,
  lng double precision DEFAULT NULL,
  categorie_slug text DEFAULT NULL,
  rayon_km double precision DEFAULT NULL,
  limite integer DEFAULT 50
)
RETURNS TABLE (
  id uuid, nom text, description text, adresse text, quartier text,
  latitude double precision, longitude double precision,
  telephone text, whatsapp text, horaires text, site_web text,
  statut_verification public.verification_status,
  categorie_nom text, categorie_slug text, categorie_icone text,
  distance_m double precision
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.rechercher_lieux(text, double precision, double precision, text, double precision, integer) TO anon, authenticated;

INSERT INTO public.categories (nom, slug, icone, ordre) VALUES
  ('Pharmacie', 'pharmacie', 'Pill', 1),
  ('Restaurant', 'restaurant', 'UtensilsCrossed', 2),
  ('Garage', 'garage', 'Wrench', 3),
  ('Hôtel', 'hotel', 'BedDouble', 4),
  ('École', 'ecole', 'GraduationCap', 5),
  ('Santé', 'sante', 'Stethoscope', 6),
  ('Banque', 'banque', 'Landmark', 7),
  ('Point géographique', 'point-geographique', 'MapPin', 8);

INSERT INTO public.places (nom, description, category_id, adresse, quartier, latitude, longitude, telephone, whatsapp, horaires, site_web, statut_verification, source) VALUES
('Pharmacie du Plateau', 'Pharmacie de quartier avec médicaments essentiels et garde de nuit régulière.', (SELECT id FROM public.categories WHERE slug='pharmacie'), 'Avenue du Général de Gaulle', 'Plateau', 13.5137, 2.1098, '+22720733412', '+22796401212', 'Lun-Sam 8h-20h, Dim 9h-13h', NULL, 'verifie', 'interne'),
('Pharmacie Yantala', 'Officine de proximité, conseils et produits parapharmaceutiques.', (SELECT id FROM public.categories WHERE slug='pharmacie'), 'Route de Tillabéri', 'Yantala', 13.5305, 2.0868, '+22720753388', '+22790112233', 'Tous les jours 8h-21h', NULL, 'source_fiable', 'web_public'),
('Pharmacie Banifandou', 'Pharmacie familiale, dépôt de matériel médical.', (SELECT id FROM public.categories WHERE slug='pharmacie'), 'Rue du Marché', 'Banifandou', 13.5222, 2.1442, '+22720744501', NULL, 'Lun-Sam 8h-19h30', NULL, 'a_verifier', 'web_public'),
('Pharmacie Wadata', 'Officine proche du marché de Wadata.', (SELECT id FROM public.categories WHERE slug='pharmacie'), 'Boulevard Mali Béro', 'Wadata', 13.5257, 2.1176, '+22720735522', '+22797334455', 'Lun-Dim 7h30-20h', NULL, 'source_fiable', 'interne'),
('Pharmacie Nouveau Marché', 'Grande officine, large stock de génériques.', (SELECT id FROM public.categories WHERE slug='pharmacie'), 'Avenue de l''Indépendance', 'Nouveau Marché', 13.5162, 2.1153, '+22720736677', NULL, 'Lun-Sam 8h-20h', NULL, 'verifie', 'interne'),
('Restaurant Le Pilier', 'Cuisine nigérienne et européenne, terrasse ombragée.', (SELECT id FROM public.categories WHERE slug='restaurant'), 'Rue du Sahel', 'Plateau', 13.5121, 2.1131, '+22720734020', '+22796778899', 'Lun-Dim 11h30-23h', NULL, 'verifie', 'interne'),
('Maquis Chez Fati', 'Grillades, riz au gras et jus de bissap maison.', (SELECT id FROM public.categories WHERE slug='restaurant'), 'Rue 12, près du stade', 'Yantala', 13.5348, 2.0921, '+22796223344', '+22796223344', 'Lun-Dim 18h-1h', NULL, 'a_verifier', 'soumission_utilisateur'),
('Restaurant La Cascade', 'Poissons du fleuve Niger, vue sur le fleuve.', (SELECT id FROM public.categories WHERE slug='restaurant'), 'Corniche Yantala', 'Yantala Bas', 13.5251, 2.0784, '+22720751199', NULL, 'Mar-Dim 12h-23h', NULL, 'source_fiable', 'web_public'),
('Le Toulousain', 'Restaurant-pizzeria apprécié des familles.', (SELECT id FROM public.categories WHERE slug='restaurant'), 'Rue de Kalley', 'Kalley', 13.5169, 2.1055, '+22720732211', '+22790556677', 'Lun-Sam 12h-15h et 19h-23h', NULL, 'verifie', 'interne'),
('Cafétéria Nogaré', 'Petit-déjeuner, omelettes et café touba.', (SELECT id FROM public.categories WHERE slug='restaurant'), 'Rond-point Nogaré', 'Nogaré', 13.5058, 2.1249, '+22797889900', '+22797889900', 'Lun-Dim 6h-22h', NULL, 'a_verifier', 'soumission_utilisateur'),
('Restaurant Dolce Vita', 'Pizzas au feu de bois et glaces artisanales.', (SELECT id FROM public.categories WHERE slug='restaurant'), 'Avenue du Zarmaganda', 'Plateau', 13.5145, 2.1075, '+22720730505', NULL, 'Mar-Dim 17h-23h30', NULL, 'source_fiable', 'web_public'),
('Garage Salifou Auto', 'Mécanique générale, diagnostic électronique, vidange.', (SELECT id FROM public.categories WHERE slug='garage'), 'Zone industrielle', 'Banifandou', 13.5194, 2.1521, '+22796334411', '+22796334411', 'Lun-Sam 7h30-18h', NULL, 'source_fiable', 'interne'),
('Garage Moderne Niamey', 'Tôlerie, peinture et réparation toutes marques.', (SELECT id FROM public.categories WHERE slug='garage'), 'Route de Dosso', 'Aéroport', 13.4881, 2.1734, '+22790443322', NULL, 'Lun-Sam 8h-18h30', NULL, 'a_verifier', 'web_public'),
('Garage Talladjé Pneus', 'Vente et réparation de pneus, équilibrage.', (SELECT id FROM public.categories WHERE slug='garage'), 'Boulevard Talladjé', 'Talladjé', 13.4938, 2.1131, '+22797665544', '+22797665544', 'Lun-Dim 7h-19h', NULL, 'a_verifier', 'soumission_utilisateur'),
('Garage Électricité Auto Wadata', 'Spécialiste batteries, alternateurs et climatisation auto.', (SELECT id FROM public.categories WHERE slug='garage'), 'Rue du marché de Wadata', 'Wadata', 13.5281, 2.1204, '+22796887711', NULL, 'Lun-Sam 8h-18h', NULL, 'source_fiable', 'web_public'),
('Hôtel Gaweye', 'Hôtel de standing au bord du fleuve, piscine et salles de conférence.', (SELECT id FROM public.categories WHERE slug='hotel'), 'Boulevard de la République', 'Plateau', 13.5093, 2.1041, '+22720722210', '+22796000110', 'Réception 24h/24', 'https://www.hotelgaweye.ne', 'verifie', 'interne'),
('Hôtel Terminus', 'Hôtel central, restaurant et jardin.', (SELECT id FROM public.categories WHERE slug='hotel'), 'Rue du Commerce', 'Plateau', 13.5148, 2.1121, '+22720733415', NULL, 'Réception 24h/24', NULL, 'source_fiable', 'web_public'),
('Hôtel Ténéré', 'Chambres climatisées, navette aéroport.', (SELECT id FROM public.categories WHERE slug='hotel'), 'Avenue de l''Aéroport', 'Yantala', 13.5322, 2.0942, '+22720751234', '+22790778812', 'Réception 24h/24', NULL, 'source_fiable', 'interne'),
('Auberge Sahel Nogaré', 'Auberge économique, cour intérieure calme.', (SELECT id FROM public.categories WHERE slug='hotel'), 'Quartier Nogaré, rue 45', 'Nogaré', 13.5041, 2.1288, '+22796445566', '+22796445566', 'Réception 6h-23h', NULL, 'a_verifier', 'soumission_utilisateur'),
('Hôtel Bravia', 'Hôtel d''affaires moderne, rooftop et spa.', (SELECT id FROM public.categories WHERE slug='hotel'), 'Boulevard Mali Béro', 'Plateau', 13.5183, 2.0997, '+22720350000', NULL, 'Réception 24h/24', NULL, 'verifie', 'interne'),
('École Primaire Yantala Haut', 'École publique, cycle primaire complet.', (SELECT id FROM public.categories WHERE slug='ecole'), 'Rue 24, Yantala Haut', 'Yantala', 13.5361, 2.0895, '+22720752200', NULL, 'Lun-Ven 7h30-17h30', NULL, 'source_fiable', 'interne'),
('Lycée Kassaï', 'Établissement secondaire public, enseignement général.', (SELECT id FROM public.categories WHERE slug='ecole'), 'Quartier Kassaï', 'Kassaï', 13.4986, 2.1069, '+22720744120', NULL, 'Lun-Ven 7h-18h', NULL, 'verifie', 'interne'),
('Complexe Scolaire Le Savoir', 'École privée, maternelle et primaire bilingue.', (SELECT id FROM public.categories WHERE slug='ecole'), 'Rue de Banifandou 2', 'Banifandou', 13.5238, 2.1478, '+22796112244', '+22796112244', 'Lun-Ven 7h30-17h', NULL, 'a_verifier', 'soumission_utilisateur'),
('Université Abdou Moumouni', 'Principale université publique du Niger, campus au bord du fleuve.', (SELECT id FROM public.categories WHERE slug='ecole'), 'Route de Torodi', 'Université', 13.4917, 2.0836, '+22720315145', NULL, 'Lun-Ven 7h30-18h30', NULL, 'verifie', 'interne'),
('CEG Wadata', 'Collège d''enseignement général public.', (SELECT id FROM public.categories WHERE slug='ecole'), 'Wadata, près du marché', 'Wadata', 13.5269, 2.1221, '+22720736001', NULL, 'Lun-Ven 7h-18h', NULL, 'source_fiable', 'web_public'),
('Hôpital National de Niamey', 'Hôpital de référence, urgences 24h/24.', (SELECT id FROM public.categories WHERE slug='sante'), 'Boulevard de la République', 'Plateau', 13.5116, 2.1023, '+22720722712', NULL, 'Urgences 24h/24', NULL, 'verifie', 'interne'),
('Clinique Gamkalley', 'Clinique privée, maternité et laboratoire.', (SELECT id FROM public.categories WHERE slug='sante'), 'Route de Gamkalley', 'Gamkalley', 13.4952, 2.1176, '+22720743311', '+22796223311', 'Tous les jours 24h/24', NULL, 'source_fiable', 'web_public'),
('Banque Atlantique Niamey', 'Agence bancaire avec distributeur automatique.', (SELECT id FROM public.categories WHERE slug='banque'), 'Avenue de l''Indépendance', 'Plateau', 13.5131, 2.1108, '+22720730909', NULL, 'Lun-Ven 8h-16h', NULL, 'source_fiable', 'interne'),
('Bank Of Africa Wadata', 'Agence et guichet automatique.', (SELECT id FROM public.categories WHERE slug='banque'), 'Boulevard Mali Béro', 'Wadata', 13.5263, 2.1189, '+22720735050', NULL, 'Lun-Ven 8h-15h30', NULL, 'a_verifier', 'web_public'),
('Grand Marché de Niamey', 'Le plus grand marché de la ville : textile, alimentation, électronique.', (SELECT id FROM public.categories WHERE slug='point-geographique'), 'Centre-ville', 'Grand Marché', 13.5157, 2.1132, NULL, NULL, 'Lun-Dim 7h-19h', NULL, 'verifie', 'interne'),
('Rond-point Nogaré', 'Carrefour majeur reliant le centre au sud de la ville.', (SELECT id FROM public.categories WHERE slug='point-geographique'), 'Intersection Nogaré', 'Nogaré', 13.5052, 2.1256, NULL, NULL, 'Accessible 24h/24', NULL, 'verifie', 'interne'),
('Marché de Katako', 'Marché populaire : pièces détachées, quincaillerie, bricolage.', (SELECT id FROM public.categories WHERE slug='point-geographique'), 'Quartier Katako', 'Katako', 13.5219, 2.1279, NULL, NULL, 'Lun-Dim 7h-18h', NULL, 'source_fiable', 'interne'),
('Pont Kennedy', 'Pont historique traversant le fleuve Niger.', (SELECT id FROM public.categories WHERE slug='point-geographique'), 'Fleuve Niger', 'Plateau', 13.5024, 2.0985, NULL, NULL, 'Accessible 24h/24', NULL, 'verifie', 'interne'),
('Marché de Wadata', 'Marché de quartier animé, produits frais.', (SELECT id FROM public.categories WHERE slug='point-geographique'), 'Wadata centre', 'Wadata', 13.5274, 2.1198, NULL, NULL, 'Lun-Dim 6h30-19h', NULL, 'source_fiable', 'web_public');