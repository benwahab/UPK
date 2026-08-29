-- 1) Profil complet pour un modérateur : prénom, nom (nom_complet existant),
--    téléphone. On ajoute la colonne manquante et on l'ouvre à l'auto-
--    modification (comme nom_complet et telephone).
ALTER TABLE public.profiles ADD COLUMN prenom text;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nom_complet, prenom, telephone) ON public.profiles TO authenticated;

-- 2) La vérification de proximité GPS avant validation/rejet (le modérateur
--    doit se déplacer sur le lieu) est appliquée côté serveur, directement
--    dans validerLieu/rejeterLieu, par comparaison de distance à partir des
--    coordonnées envoyées par le client — aucune colonne ni fonction SQL
--    supplémentaire n'est nécessaire pour ça. C'est le calcul serveur qui
--    fait foi : un contrôle uniquement côté client serait contournable.
