-- Lot 18 : index de performance pour la recherche textuelle (cahier des
-- charges section 30). La recherche compare nom/description/quartier/adresse
-- avec ILIKE '%...%' — sans index adapté, ça devient un balayage complet de
-- la table à mesure que le nombre de lieux augmente. pg_trgm (déjà activé
-- au Lot 5 pour les médicaments) accélère ce type de comparaison.

CREATE INDEX IF NOT EXISTS places_nom_trgm_idx ON public.places USING gin (nom gin_trgm_ops);
CREATE INDEX IF NOT EXISTS places_description_trgm_idx ON public.places USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS places_quartier_trgm_idx ON public.places USING gin (quartier gin_trgm_ops);
