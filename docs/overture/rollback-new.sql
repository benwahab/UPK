-- UPK — intégration Overture Maps, release 2026-11-18.0
-- Audit du 2026-11-21 ; licence Overture Places : CDLA-Permissive-2.0
-- Ne pas exécuter en production sans sauvegarde D1 et validation explicite.
PRAGMA foreign_keys = ON;

DELETE FROM places
WHERE id IN ('overture_d4866d10c064cf28', 'overture_1353965649a44372', 'overture_12f01c32b38abc38', 'overture_75c1cd30b472322c', 'overture_662ccdf3cb20c9d4', 'overture_17e5811a6f002656', 'overture_95da65cc8b69dd58', 'overture_4789bfeb79be0452', 'overture_808eb3867402b4e7', 'overture_5d9da325cfa11cf4', 'overture_a821af75064bb7e4', 'overture_a3e0ccbb23551115', 'overture_9fe2c18c056edbcf', 'overture_5c40eacbbe167ce2', 'overture_8e07868e3a9e432c', 'overture_95bb35ca36ca43ea', 'overture_35b6fcc991d15b5f', 'overture_91796a2c1afd60b9', 'overture_16403abbf3d2b54f', 'overture_27fbfeccb1032528', 'overture_3bc99c8e66bde839', 'overture_1d0c992fcfac1311', 'overture_24ca66e459969de2', 'overture_171e5ee77d97a703', 'overture_b0587ecac1be4053', 'overture_a4c4aae5a5b27aca')
  AND source = 'overture';
