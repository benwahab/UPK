# Attribution des données géographiques

## Fichier `niamey-2026-08-30.json`

- **Source** : OpenStreetMap, extrait via l'API Overpass.
- **Zone** : Niamey, Niger (bbox approximative `2.0, 13.4, 2.3, 13.7`).
- **Snapshot** : 30 août 2026.
- **Volume** : 1 546 lieux.
- **Licence** : ODbL 1.0 (Open Database License).
- **Attribution obligatoire** : « © les contributeurs OpenStreetMap ».

## Fichiers `osm-sahel-2026-11-27.json` et `geonames-sahel-2026-11-27.json`

- **Sources** : OpenStreetMap (extraits Geofabrik Niger, Mali, Burkina Faso)
  et GeoNames (NE, ML, BF).
- **Zone** : Niger, Mali, Burkina Faso.
- **Snapshot** : 27 novembre 2026.
- **Volume** : 41 558 lieux OSM, 3 pays, 32 régions, 162 départements,
  157 communes, 1 197 villes et 3 340 quartiers.
- **Licences** : ODbL 1.0 pour OpenStreetMap ; CC BY 4.0 pour GeoNames.
- **Attribution** : « © les contributeurs OpenStreetMap » et
  « Données géographiques : GeoNames (CC BY 4.0) ».
- **Traçabilité** : chaque lieu conserve `osm_id`, `osm_type`, `source`,
  `source_url`, `licence_source`, `importe_le` et `osm_tags`.

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
- Empreinte SHA-256 de `osm-sahel-2026-11-27.json` :
  `4be8a8c65564e52148e01704b38d6ebe73d49c6cea7965c799856b1d7a7c6de6`
- Empreinte SHA-256 de `geonames-sahel-2026-11-27.json` :
  `40eac562912cdbe995db9cdec6badf77af36b04d6178f18fa84e2abc5bdd5c3c`
- Empreinte SHA-256 de `categories-2026-11-27.json` :
  `1f22929f7bb247adc7f11204e10e253a739f453cc1061c129f988724b1adee4c`

## Régénération

Les fichiers sont des instantanés. Pour régénérer le catalogue :

```bash
# Extraits Geofabrik + archives GeoNames, puis :
python3 infra/scripts/import-sahel.py --out /tmp/upk-sahel-sql
```

Le pipeline conserve la même traçabilité et n'invente ni adresse, ni
téléphone. Les rattachements quartier/commune sont déterministes : tag
`addr:*` lorsqu'il existe, sinon plus proche centroïde dans un rayon borné.
