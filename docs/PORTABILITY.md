# Portabilité de UPK

Ce document décrit les éléments nécessaires pour exécuter UPK hors de Lovable
Cloud. Il doit être mis à jour lorsqu'une dépendance d'infrastructure évolue.

## Architecture

UPK est une application React/TanStack Start construite avec Vite. Le code
applicatif est versionné dans ce dépôt. Le backend de données repose sur
Supabase standard :

- PostgreSQL pour les données ;
- PostGIS pour les coordonnées et les recherches de proximité ;
- Row Level Security (RLS) pour les accès publics, utilisateurs et
  administrateurs ;
- fonctions SQL/RPC pour les recherches complexes ;
- Supabase Auth pour les comptes ;
- Supabase Storage pour les photos.

Les migrations versionnées se trouvent dans `supabase/migrations/`. Elles
constituent la source de vérité du schéma et doivent être appliquées dans leur
ordre chronologique.

## Variables d'environnement

Le client navigateur et le rendu serveur utilisent :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` est réservé au serveur et ne doit jamais être
exposé au navigateur. Les variables `VITE_*` sont intégrées au bundle public ;
elles ne doivent donc contenir qu'une clé publiable.

La recherche multi-sources peut utiliser les variables serveur suivantes :

```text
UPK_GEO_USER_AGENT
NOMINATIM_SEARCH_URL
GEONAMES_USERNAME
GEONAMES_SEARCH_URL
OPEN_METEO_GEOCODING_URL
```

`GEONAMES_USERNAME` est obligatoire pour activer GeoNames ; il n'y a pas de
clé API GeoNames générique à inventer. Nominatim et Open-Meteo sont désactivés
ou utilisés avec leurs endpoints publics par défaut, mais leurs conditions
d'utilisation doivent être vérifiées avant un déploiement à fort trafic.

Certaines fonctions internes peuvent aussi utiliser `LOVABLE_CRON_SECRET` et
`LOVABLE_CRON_SECRET_PREVIOUS` pour l'authentification de tâches planifiées.
Ces noms peuvent être remplacés par des secrets équivalents lors d'une
migration, à condition d'adapter la configuration du déploiement.

## Base de données et migrations

Les migrations importantes pour l'extension nationale actuelle sont :

1. `20260915220000_modele_territorial_niger.sql` : régions, départements,
   communes, villes/zones et rattachements territoriaux facultatifs aux lieux ;
2. `20260916200000_recherche_nationale_v2.sql` : RPC
   `public.rechercher_lieux_v2`, sans suppression de la RPC historique.

Les migrations OSM précédentes conservent les identifiants `osm_id`,
`osm_type`, la licence et la date d'import. Cette provenance est nécessaire
pour resynchroniser ou migrer les données sans perdre leur origine.

Sur une autre instance Supabase, installer la CLI puis :

```sh
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Avant toute application sur une base existante, effectuer un export PostgreSQL
et vérifier l'état des migrations. Ne jamais supprimer ou réécrire une
migration déjà appliquée ; créer une nouvelle migration corrective si
nécessaire.

Après application, vérifier notamment :

```sql
select version from supabase_migrations.schema_migrations
where version in ('20260915220000', '20260916200000')
order by version;

select to_regclass('public.regions'),
       to_regclass('public.villes_zones');

select has_function_privilege(
  'anon',
  'public.rechercher_lieux_v2(text,double precision,double precision,text,text,text,text,double precision,integer,integer)',
  'EXECUTE'
);
```

## Stockage des fichiers

Les photos sont stockées dans le bucket Supabase Storage `lieu-photos`. Les
chemins sont construits à partir de l'identifiant du lieu et les URLs sont
produites par Supabase Storage. Pour une migration, exporter :

1. les objets du bucket en conservant leurs chemins ;
2. les lignes de métadonnées `place_photos` ;
3. les politiques RLS du bucket ;
4. les URLs ou chemins enregistrés en base.

L'application ne doit pas dépendre d'un chemin local Lovable. Un autre
stockage compatible peut être utilisé en remplaçant la couche d'accès aux
photos et en conservant les identifiants de lieux.

## OpenStreetMap et services externes

La recherche unifiée utilise la base UPK en priorité et peut résoudre une
requête géographique avec Nominatim, GeoNames et Open-Meteo Geocoding. Les
réponses sont normalisées, dédupliquées et gardées dans un cache mémoire court
pour éviter de solliciter inutilement les services. GeoNames n'est appelé que
si `GEONAMES_USERNAME` est défini.

Les limites connues doivent être respectées : Nominatim impose notamment un
User-Agent/Referer identifiable, une cadence maximale d'environ une requête
par seconde et interdit l'autocomplétion côté client ; GeoNames utilise des
quotas par utilisateur ; Open-Meteo Geocoding est soumis à ses conditions
gratuites/non commerciales et à une attribution CC-BY. Les valeurs exactes
doivent être revalidées auprès des fournisseurs avant production.

OpenStreetMap est aussi la source principale pour les lieux et POI. Les
imports Overpass sont décrits dans les migrations OSM et doivent conserver
l'attribution ODbL ainsi que les identifiants et dates de synchronisation.
Overpass reste un pipeline d'import/rafraîchissement borné par zone : il n'est
pas appelé à chaque recherche utilisateur. Les appels Nominatim ou Overpass
doivent rester côté serveur, avec limitation et cache.

Les catégories UPK restent stockées en base afin d'éviter de coupler
l'interface aux valeurs OSM. Toute nouvelle source externe doit être ajoutée
dans une couche identifiable et documentée ici.

## Dépendance Lovable Cloud

`src/integrations/supabase/previewAuthStorage.ts` contient un adaptateur
spécifique aux aperçus Lovable : dans un aperçu embarqué, il synchronise la
session avec l'éditeur via `postMessage`. En dehors des domaines d'aperçu, le
client utilise `localStorage`.

Cet adaptateur n'est pas requis en production sur une infrastructure
indépendante. Une migration peut conserver le client Supabase et remplacer
`brokeredPreviewStorage()` par un stockage de session standard adapté au
domaine de déploiement. Aucun schéma de données ni logique métier ne dépend de
ce mécanisme d'aperçu.

## Procédure générale de migration

1. Cloner le dépôt et installer les dépendances avec `npm ci`.
2. Créer une instance PostgreSQL/Supabase avec PostGIS et Auth activés.
3. Configurer les variables d'environnement sans les committer.
4. Lier le projet avec Supabase CLI et appliquer les migrations dans l'ordre.
5. Restaurer les données et les objets du bucket `lieu-photos`.
6. Vérifier les politiques RLS, les RPC, l'authentification et la recherche
   de proximité.
7. Construire et déployer l'application avec `npm run build`.

La connexion actuelle à Lovable Cloud est donc une configuration de
déploiement et d'aperçu, pas une source exclusive du code, du schéma ou des
données UPK.
