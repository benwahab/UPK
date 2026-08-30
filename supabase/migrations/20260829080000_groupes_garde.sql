-- Groupes de garde (gestion admin uniquement, independante de l'espace
-- pro). Au Niger, les pharmacies de garde tournent par groupe suivant un
-- calendrier precis : plutot que d'ajouter une date a chaque pharmacie une
-- par une, l'admin cree un groupe, y assigne des pharmacies membres, puis
-- assigne une periode de garde a tout le groupe en une fois — ce qui cree
-- automatiquement les lignes pharmacie_gardes correspondantes pour chaque
-- membre.

CREATE TABLE public.groupes_garde (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.groupes_garde ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un admin gere les groupes de garde" ON public.groupes_garde
  FOR ALL TO authenticated
  USING (public.est_admin(auth.uid()))
  WITH CHECK (public.est_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groupes_garde TO authenticated;

CREATE TABLE public.groupe_garde_membres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  groupe_id uuid NOT NULL REFERENCES public.groupes_garde(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (groupe_id, place_id)
);

CREATE INDEX groupe_garde_membres_groupe_idx ON public.groupe_garde_membres (groupe_id);

ALTER TABLE public.groupe_garde_membres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un admin gere les membres des groupes de garde" ON public.groupe_garde_membres
  FOR ALL TO authenticated
  USING (public.est_admin(auth.uid()))
  WITH CHECK (public.est_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groupe_garde_membres TO authenticated;

-- Assigne une periode de garde a tout un groupe d'un coup : cree une ligne
-- pharmacie_gardes par pharmacie membre et par jour de la periode.
-- SECURITY DEFINER car pharmacie_gardes n'autorise normalement l'ecriture
-- qu'au proprietaire du lieu (Lot 5) — l'admin agit ici a sa place, de
-- maniere explicite et verifiee (est_admin en tout premier), en attendant
-- que chaque pharmacie gere elle-meme son calendrier depuis l'espace pro.
CREATE OR REPLACE FUNCTION public.assigner_periode_garde_groupe(
  p_groupe_id uuid,
  p_date_debut date,
  p_date_fin date,
  p_horaires text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_jour date;
  v_place_id uuid;
  v_compte integer := 0;
BEGIN
  IF NOT public.est_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Reserve aux administrateurs.';
  END IF;

  IF p_date_fin < p_date_debut THEN
    RAISE EXCEPTION 'La date de fin doit etre apres la date de debut.';
  END IF;

  IF p_date_fin - p_date_debut > 90 THEN
    RAISE EXCEPTION 'Periode trop longue (90 jours maximum en une fois).';
  END IF;

  FOR v_place_id IN
    SELECT place_id FROM public.groupe_garde_membres WHERE groupe_id = p_groupe_id
  LOOP
    v_jour := p_date_debut;
    WHILE v_jour <= p_date_fin LOOP
      INSERT INTO public.pharmacie_gardes (place_id, date_garde, horaires)
      VALUES (v_place_id, v_jour, p_horaires)
      ON CONFLICT (place_id, date_garde) DO UPDATE SET horaires = EXCLUDED.horaires;
      v_compte := v_compte + 1;
      v_jour := v_jour + 1;
    END LOOP;
  END LOOP;

  RETURN v_compte;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assigner_periode_garde_groupe(uuid, date, date, text) TO authenticated;
