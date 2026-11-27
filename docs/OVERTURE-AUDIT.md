# Audit Overture Maps — UPK

**État : audit de couverture terminé ; aucune intégration ni importation en production.**

## Référentiel existant

OpenStreetMap est déjà importé dans UPK. Le seed du 27 novembre 2026 contient 41 558 lieux :

| Pays | Lieux OSM dans UPK |
|---|---:|
| Niger | 6 986 |
| Mali | 22 610 |
| Burkina Faso | 11 962 |
| **Total** | **41 558** |

Les données OSM conservent leur provenance et leur licence ODbL. Overture est donc une source complémentaire, pas un remplacement d'OSM.

## Résultat de la première comparaison

Publication Overture interrogée : **2026-11-18.0**.

| Pays | Lieux Overture avec pays ISO | Confiance ≥ 0,70 | Doublons probables avec OSM | Candidats pertinents UPK ≥ 0,70 | Candidats pertinents UPK ≥ 0,80 |
|---|---:|---:|---:|---:|---:|
| Niger | 1 737 | 559 | 60 | 388 | 156 |
| Mali | 4 117 | 1 022 | 130 | 654 | 363 |
| Burkina Faso | 8 390 | 2 020 | 194 | 1 201 | 617 |
| **Total** | **14 244** | **3 601** | **384** | **2 243** | **1 136** |

Les 1 136 résultats à confiance ≥ 0,80 sont des **candidats à vérifier**, pas 1 136 lieux déjà confirmés comme nouveaux. Les 2 243 résultats à confiance ≥ 0,70 donnent une couverture plus large, mais plus permissive.

## Méthode et limites

- Filtrage géographique par pays et code ISO présent dans les adresses Overture.
- Rapprochement probable avec OSM si nom identique ou très proche à moins de 100 m, ou téléphone/site identique à moins de 500 m.
- Catégories rapprochées des 16 catégories actuelles d'UPK.
- Les entrées sans code pays ISO explicite sont exclues : les volumes Overture ne représentent donc pas nécessairement toute la couverture.
- Les noms différents, translittérations, branches proches et doublons internes à Overture peuvent encore fausser les résultats.
- Des exemples montrent des catégories ou noms suspects (lieux naturels classés comme sites historiques, noms manifestement hors contexte). Un contrôle humain est indispensable.

## Règles avant toute intégration

1. Ne jamais remplacer les enregistrements OSM existants.
2. Conserver l'identifiant Overture, la provenance, la confiance, la version et la licence de chaque source.
3. Ne jamais promouvoir automatiquement un candidat Overture en lieu publié.
4. Revoir les catégories, les lieux fermés, les coordonnées et les doublons Overture/OSM.
5. Faire les tests sur des données locales ; attendre la disponibilité de D1 pour les vérifications de production.
6. Aucune importation en D1 de production sans validation explicite.

## Reproduire l'audit

Script : `infra/scripts/audit-overture.py`

Workflow GitHub Actions : `Audit Overture coverage` (déclenchement manuel possible).

L'audit est en lecture seule : il interroge les fichiers GeoParquet publics d'Overture et le seed OSM versionné ; il ne contacte ni D1 ni R2 et ne modifie pas le Worker.

Rapport et échantillons du run du 27 novembre 2026 :
https://github.com/benwahab/UPK/actions/runs/46059207205
