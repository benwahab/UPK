# Attribution des données géographiques

## Fichier `niamey-2026-08-30.json`

- **Source** : OpenStreetMap, extrait via l'API Overpass.
- **Zone** : Niamey, Niger (bbox approximative `2.0, 13.4, 2.3, 13.7`).
- **Snapshot** : 30 août 2026.
- **Volume** : 1 546 lieux.
- **Licence** : ODbL 1.0 (Open Database License).
- **Attribution obligatoire** : « © les contributeurs OpenStreetMap ».

## Obligations ODbL

Toute diffusion publique de données dérivées doit :

1. afficher l'attribution « © les contributeurs OpenStreetMap » de manière visible
   (pied de page, page « À propos » ou mentions légales) ;
2. conserver la provenance de chaque enregistrement (`osm_id`, `osm_type`,
   `licence_source`, date d'import) ;
3. ne pas appliquer de restriction technique empêchant l'extraction des données
   dérivées (pas de DRM sur les données).

## Traçabilité

Chaque lieu du fichier porte :

| Champ | Rôle |
| --- | --- |
| `osm_id` | identifiant OpenStreetMap |
| `osm_type` | `node`, `way` ou `relation` |
| `source` | `openstreetmap` |
| `licence_source` | `ODbL-1.0` |

## Vérification d'intégrité

- Empreinte SHA-256 du fichier au moment de l'extraction :
  `d73941690a7ce95287eb73ae3c629950c81d901c3959d8bf73c0e96b4c18e388`
  (vérifiable avec `sha256sum seed/niamey-2026-08-30.json`)
- Nombre de lieux : **1 546**
- Lieux avec coordonnées : **1 546** (100 %)

## Régénération

Ce fichier est un instantané. Pour des données fraîches ou une couverture
nationale, utiliser le pipeline `seed/scripts/import-osm.ts` (voir
`docs/ARCHITECTURE.md`), qui interroge Overpass par région et conserve la même
traçabilité.
