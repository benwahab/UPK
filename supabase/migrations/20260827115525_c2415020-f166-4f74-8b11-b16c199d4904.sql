CREATE INDEX IF NOT EXISTS places_nom_trgm_idx ON public.places USING gin (nom gin_trgm_ops);
CREATE INDEX IF NOT EXISTS places_description_trgm_idx ON public.places USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS places_quartier_trgm_idx ON public.places USING gin (quartier gin_trgm_ops);