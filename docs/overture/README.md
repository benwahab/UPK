# Overture Maps — audit et intégration exécutée

Ce dossier contient l’audit reproductible des 1 136 candidats Overture Maps
(release `2026-11-18.0`) et les SQL de l’intégration, **exécutée en production
le 2026-11-28** après sauvegarde D1.

## Commandes

```bash
# 1. Classer les candidats et produire les CSV d'audit
python3 infra/scripts/audit-overture.py

# 2. Générer les SQL D1, le manifeste et le rollback
python3 infra/scripts/import-overture.py
```

Les deux scripts n’utilisent que la bibliothèque standard Python et ne
touchent ni à D1 ni à Cloudflare.

Audit de couverture initial, en lecture seule avec DuckDB :
`python3 infra/scripts/audit-overture-coverage.py` (workflow
`Audit Overture coverage`). Il interroge les GeoParquet Overture et le seed OSM,
sans accès D1/R2.

## Décisions

| Décision | Nombre | Suite |
| --- | ---: | --- |
| `VALIDATED_NEW` | 26 | Importés le 2026-11-28 |
| `VALIDATED_ENRICHMENT` | 16 | Appliqués le 2026-11-28, sans écraser OSM |
| `DUPLICATE_OSM` | 34 | Ne pas importer |
| `DUPLICATE_OVERTURE` | 2 | Ne pas importer |
| `NEEDS_REVIEW` | 913 | Revue humaine, pas d’import automatique |
| `NOT_RELEVANT` | 128 | Hors périmètre UPK |
| `INVALID_LOCATION` | 11 | Localisation incohérente |
| `REJECTED` | 6 | Candidat écarté |
| **Total** | **1 136** | |

## Fichiers

| Fichier | Contenu |
| --- | --- |
| `candidates-classified.csv` | Vue complète, une ligne par candidat, décision et justification |
| `validated-new.csv` | 26 nouveaux lieux validés par page officielle |
| `enrichments-osm.csv` | 16 enrichissements de fiches OSM |
| `duplicates-osm.csv` | 34 doublons OSM forts |
| `duplicates-overture.csv` | 2 doublons internes |
| `not-relevant.csv` | 128 catégories hors périmètre ou divisions administratives |
| `invalid-location.csv` | 11 localisations incohérentes |
| `rejected.csv` | 6 candidats étrangers manifestement incompatibles |
| `needs-review.csv` | 913 candidats à vérifier |
| `verification-web.csv` | 58 contrôles HTTP de pages officielles, 26 confirmés |
| `import-new.sql` | `INSERT` idempotents des 26 nouveaux lieux |
| `enrich-osm.sql` | `UPDATE` avec `COALESCE`, champs absents uniquement |
| `rollback-new.sql` | Suppression des seuls lieux `source='overture'` |
| `import-manifest.json` | Compteurs, empreintes SHA-256, état d’exécution |
| `production-integration.json` | Journal de l’exécution production, bookmarks et vérifications |

## Règles de sécurité appliquées

- Aucun score Overture ne vaut validation.
- Aucune fusion sur la seule proximité : les centroïdes partagés créent de
  faux voisins.
- Les téléphones et sites génériques de chaînes ne sont pas des enrichissements
  de station.
- Les adresses et quartiers absents restent `NULL`.
- Les identifiants sont déterministes (`overture_<sha1>`) faute d’identifiant
  GERS dans les CSV.
- Aucune migration, aucun changement de schéma, aucun déploiement.

## Intégration en production

Exécutée le **2026-11-28** après sauvegarde D1. État vérifié :
**41 592** lieux, **26** `source='overture'`, **16** `source='osm+overture'`,
**41 592** entrées FTS, sitemap à jour. Le journal complet est dans
[`production-integration.json`](./production-integration.json).

Les commandes ci-dessous sont conservées pour une ré-exécution idempotente ou
un environnement restauré. Ne jamais les lancer sans sauvegarde.

```bash
# 1. Sauvegarde et bookmark Time Travel
pnpm backup:d1

# 2. Import des nouveaux lieux
pnpm -C apps/web exec wrangler d1 execute upk --remote \
  --config ../../infra/wrangler.toml \
  --file=../../docs/overture/import-new.sql -y

# 3. Enrichissements OSM
pnpm -C apps/web exec wrangler d1 execute upk --remote \
  --config ../../infra/wrangler.toml \
  --file=../../docs/overture/enrich-osm.sql -y
```

Vérifier ensuite (valeurs attendues après l’intégration) :

```sql
SELECT COUNT(*) FROM places WHERE source = 'overture';
SELECT COUNT(*) FROM places WHERE source = 'osm+overture';
SELECT nom, categorie_id, ville_zone_id FROM places WHERE source = 'overture';
```

Retour arrière des nouveaux lieux :

```bash
pnpm -C apps/web exec wrangler d1 execute upk --remote \
  --config ../../infra/wrangler.toml \
  --file=../../docs/overture/rollback-new.sql -y
```

Les enrichissements ne sont pas annulés par ce fichier : utiliser D1 Time
Travel ou la sauvegarde prise avant l’import.

## Limites

- Pas d’identifiant Overture/GERS dans les fichiers fournis.
- Pas de colonne adresse.
- 913 candidats restent en revue humaine.
- Les 26 validations reposent sur une page officielle accessible, pas sur une
  visite terrain.
- L’audit doit être rejoué sur l’export exact de production avant import.

Voir le rapport complet : [`../OVERTURE-AUDIT.md`](../OVERTURE-AUDIT.md).
