# PROJECT HANDOVER - UPK

Document maître technique et fonctionnel du projet UPK. Ce document décrit
l'état prouvé par le dépôt, les migrations et l'historique Git. Une exigence
future ne doit jamais être présentée comme une fonctionnalité implémentée sans
preuve dans le code ou la base.

Dernière vérification : 2026-09-17.
Branche de référence : `main`.
Dépôt : `benwahab/upk-votre-guide-local`.

## 1. Vision UPK

UPK est un moteur de recherche local destiné à aider les personnes à trouver
des lieux, établissements et services au Niger. UPK n'est pas un moteur de
recherche Web généraliste.

Un visiteur doit pouvoir, sans créer de compte :

- rechercher un lieu ou un service ;
- consulter une fiche ;
- voir la distance lorsque sa position est disponible ;
- appeler un établissement ;
- ouvrir un site ou une page publique lorsqu'elle existe ;
- ouvrir un itinéraire Google Maps ;
- proposer un lieu ;
- signaler une erreur.

La priorité produit est la simplicité, la proximité et l'utilité immédiate
sur mobile.

## 2. Recherche nationale

### Objectif

L'architecture doit couvrir l'ensemble du Niger et non uniquement Niamey.
La structure territoriale et la RPC nationale existent, mais la couverture
réelle dépend encore des données chargées dans `places`.

### Recherche avec GPS

Le code et le schéma prévoient :

- calcul de distance PostGIS ;
- filtrage par rayon ;
- classement par proximité et pertinence ;
- affichage de la distance uniquement si une position est connue ;
- fonctionnement sans compte.

### Recherche sans GPS

La recherche doit fonctionner sans autorisation de géolocalisation :

- recherche textuelle ;
- filtre de catégorie ;
- filtre territorial ;
- pagination ;
- classement sans distance.

### Critères prévus

- nom ;
- catégorie ;
- région ;
- département ;
- commune ;
- ville ou localité ;
- quartier ou zone lorsque disponible ;
- variantes de noms ;
- fautes de frappe lorsque le moteur les reconnaît ;
- position GPS et rayon ;
- pagination et score de pertinence.

`public.rechercher_lieux` reste disponible pour les clients historiques.
`public.rechercher_lieux_v2` ajoute les filtres nationaux et le classement
étendu.

## 3. Architecture géographique multi-sources

Les sources ne sont pas équivalentes et ne doivent pas être présentées comme
quatre recherches séparées.

| Source | Rôle prévu | État réel |
| --- | --- | --- |
| OpenStreetMap / Overpass | Données de lieux et POI, imports et rafraîchissements par zone | Import OSM Niamey présent ; pipeline national à développer |
| Nominatim | Recherche textuelle et géocodage complémentaire | Intégration serveur présente ; doit rester limitée et cachée côté serveur |
| GeoNames | Villes, villages, subdivisions, variantes et hiérarchie géographique | Code présent ; nécessite `GEONAMES_USERNAME` pour être actif |
| Open-Meteo Geocoding | Résolution géographique complémentaire | Intégration serveur présente, sans clé prévue |

La couche `src/lib/geographie.server.ts` normalise les résultats, conserve la
source, dédoublonne les localités et utilise un cache mémoire court. Elle est
appelée comme complément de la recherche UPK, pas comme remplacement de la
base de lieux.

Les appels externes doivent rester côté serveur, être limités, gérer les
erreurs source par source et respecter les conditions d'utilisation des
fournisseurs. Nominatim ne doit pas être utilisé pour de l'autocomplétion
clientielle. Overpass est destiné à un pipeline borné d'import ou de
rafraîchissement, pas à chaque recherche utilisateur.

## 4. Données nationales

Il faut distinguer :

1. **Architecture nationale** : présente avec `regions`, `departements`,
   `communes`, `villes_zones`, les clés territoriales facultatives de
   `places` et `rechercher_lieux_v2`.
2. **Données nationales** : incomplètes. L'import OSM historique est centré
   sur Niamey et la hiérarchie détaillée initialisée concerne principalement
   Niamey.

Pour obtenir une couverture nationale réelle, il reste à :

- charger les subdivisions et localités nationales fiables ;
- importer les POI par région ou zone ;
- rattacher les lieux aux territoires ;
- prévoir un pipeline OSM reprenable et contrôlé ;
- activer GeoNames si nécessaire ;
- tester la recherche sur plusieurs régions et villes ;
- mesurer les doublons et la qualité des coordonnées.

## 5. Google Maps

Google Maps n'est pas une base de données UPK et ne doit pas être synchronisé
pour alimenter le catalogue.

Il intervient uniquement lorsqu'un utilisateur demande un itinéraire. Le code
génère une URL Google Maps avec les coordonnées de destination.

## 6. Utilisateurs et rôles

### Visiteur

Le visiteur n'a pas besoin de compte pour la recherche, les fiches, les
appels, les itinéraires, les propositions ou les signalements.

### Professionnel

Le compte professionnel peut gérer une fiche selon les permissions et
fonctions présentes dans l'Espace Pro, notamment revendication, informations,
photos, statistiques et modules spécialisés.

### Modérateur

Le modérateur traite les propositions, validations, refus, signalements,
revendications et tâches qui lui sont assignées, selon ses permissions.

### Administrateur

L'administrateur gère les fonctions autorisées : comptes, modération,
catégories, professionnels, statistiques, assignations, paramètres et
activité. Le rôle ne doit pas être auto-attribuable depuis l'interface.

### Super administrateur

Le modèle prévoit un super administrateur disposant de toutes les permissions
et pouvant attribuer ou retirer des rôles selon les règles de sécurité.
L'existence et l'état du compte administrateur principal doivent être
confirmés dans l'instance Supabase active, pas supposés à partir du code.

## 7. Ajout de lieux, modération et provenance

La proposition d'un lieu sans compte est prévue et présente dans les
migrations et les routes publiques. Les propositions passent par une
modération avant publication.

Le circuit documenté est :

```text
En attente de vérification -> En cours d'examen -> Validé ou Refusé
```

Le dépôt contient aussi :

- motifs de refus ;
- signalements ;
- assignations par zone ;
- journal de modération et d'activité ;
- provenance des lieux ;
- identifiants OSM ;
- détection de doublons ;
- fusion sans suppression définitive du lieu perdant.

## 8. Catégories

La table `categories` permet :

- nom ;
- slug ;
- icône ;
- catégorie parente ;
- ordre ;
- administration sans modification du code.

Les catégories initiales et réellement retrouvées dans les migrations
comprennent notamment :

- pharmacie ;
- restaurant ;
- hôtel ;
- école ;
- garage ;
- station-service ;
- marché ;
- point géographique.

Cette liste peut évoluer par l'administration. Une catégorie mentionnée dans
une vision produit mais absente de la base ne doit pas être considérée comme
active.

## 9. Espace Pro

Les routes et migrations présentes couvrent :

- espace professionnel ;
- création ou gestion de fiche ;
- revendication d'une fiche ;
- ajout de photos ;
- statistiques de vues, appels et itinéraires ;
- modération liée aux comptes professionnels ;
- module pharmacie ;
- module restaurant ;
- module hôtel.

Les détails d'un module doivent être vérifiés dans ses fonctions et migrations
avant d'être annoncés comme complets.

## 10. Modules spécialisés

### Pharmacie

Le dépôt contient le catalogue de médicaments, les gardes, les groupes de
garde et les alertes associées.

### Restaurant

Le dépôt contient le module des plats et les écrans de menu associés.

### Hôtel

Le dépôt contient le module des chambres et les écrans associés.

Les fonctions métier futures non trouvées dans le code restent à développer.

## 11. Administration

Les routes et fonctions d'administration présentes couvrent notamment :

- tableau de bord ;
- modération ;
- comptes ;
- modérateurs ;
- catégories ;
- revendications ;
- signalements ;
- assignations ;
- statistiques ;
- groupes de garde ;
- activité administrative ;
- permissions.

Les policies RLS et les fonctions serveur doivent rester la source de contrôle
effective. Une simple restriction visuelle dans l'interface ne suffit pas.

## 12. PWA et expérience utilisateur

Le projet utilise React/TanStack Start avec Vite et contient une configuration
PWA. Les objectifs UX sont :

- interface en français ;
- mobile-first ;
- recherche rapide ;
- informations essentielles avant les images ;
- fonctionnement avec ou sans GPS ;
- absence de compte obligatoire ;
- itinéraire externe Google Maps ;
- chargement adapté aux connexions lentes.

L'état réellement installable et la mise en cache en production doivent être
vérifiés par un test navigateur et un build de déploiement.

## 13. Architecture technique

- Frontend : React, TanStack Start, TanStack Router, Vite.
- Backend de données : Supabase.
- Base : PostgreSQL.
- Géographie : PostGIS.
- Recherche textuelle : `pg_trgm`, index GIN et RPC SQL.
- Sécurité : RLS, grants, fonctions serveur et fonctions SQL.
- Authentification : Supabase Auth.
- Fichiers : Supabase Storage, notamment le bucket `lieu-photos`.
- Migrations principales : `supabase/migrations/`.
- Migrations historiques complémentaires : `drizzle/migrations/`.
- Services géographiques : couche serveur identifiable.
- Déploiement connecté : Lovable et GitHub.
- Branche de référence Lovable : `main`.

Variables documentées :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
UPK_GEO_USER_AGENT
NOMINATIM_SEARCH_URL
GEONAMES_USERNAME
GEONAMES_SEARCH_URL
OPEN_METEO_GEOCODING_URL
```

Les secrets serveur ne doivent jamais être exposés au navigateur ou committés.

## 14. État réel du projet

| Fonctionnalité | État | Preuve dans le dépôt | Reste à faire |
| --- | --- | --- | --- |
| Recherche publique de lieux | IMPLEMENTÉ | `src/routes/index.tsx`, RPC historique, fonctions serveur | Tests de charge et parcours complet à maintenir |
| Fiche lieu | IMPLEMENTÉ | `src/routes/lieu.$id.tsx`, composants de fiche | Vérification continue des données réelles |
| Recherche nationale | PARTIELLEMENT IMPLEMENTÉ | migrations territoriales, `rechercher_lieux_v2`, filtres UI | Charger et tester les données de tout le Niger |
| GPS et distance | IMPLEMENTÉ | PostGIS, RPC, demande de position et cartes | Tester davantage les cas sans permission |
| Régions et hiérarchie Niamey | IMPLEMENTÉ | `20260915220000_modele_territorial_niger.sql` | Étendre les départements, communes et localités |
| Import OSM Niamey | IMPLEMENTÉ | `20260830090000_import_osm_niamey.sql` | Améliorer la synchronisation et la couverture |
| Pipeline OSM national | PRÉVU / À DÉVELOPPER | provenance OSM et documentation | Import par zone, reprise, quotas, rattachement territorial |
| Nominatim | PARTIELLEMENT IMPLEMENTÉ | `src/lib/geographie.server.ts` | Validation de production, quotas et tests intégrés |
| Open-Meteo Geocoding | PARTIELLEMENT IMPLEMENTÉ | `src/lib/geographie.server.ts` | Validation de production et suivi des conditions |
| GeoNames | PARTIELLEMENT IMPLEMENTÉ | code et variables documentées | Fournir un username et tester dans l'environnement réel |
| Dédoublonnage géographique | PARTIELLEMENT IMPLEMENTÉ | couche géographique et fonctions de fusion | Améliorer les variantes, noms locaux et règles métier |
| Google Maps itinéraire | IMPLEMENTÉ | `src/lib/upk.ts` et liens d'itinéraire | Aucun catalogue Google Maps à ajouter |
| Ajout sans compte | IMPLEMENTÉ | routes et migrations de propositions anonymes | Vérifier le parcours complet en production |
| Modération | IMPLEMENTÉ | routes admin/pro, migrations et fonctions serveur | Vérifier tous les droits sur l'instance active |
| Rôles et permissions | PARTIELLEMENT IMPLEMENTÉ | migrations, autorisations, routes admin | Audit complet des rôles et attribution sécurisée |
| Espace Pro | PARTIELLEMENT IMPLEMENTÉ | routes `/pro`, fonctions business et revendications | Vérifier chaque parcours professionnel réel |
| Pharmacie | IMPLEMENTÉ | migrations et routes spécialisées | Enrichissement métier éventuel |
| Restaurant | IMPLEMENTÉ | migration plats et route menu | Enrichissement métier éventuel |
| Hôtel | IMPLEMENTÉ | migration chambres et route chambres | Enrichissement métier éventuel |
| PWA | PARTIELLEMENT IMPLEMENTÉ | manifest, configuration et `src/lib/pwa.ts` | Test d'installation et offline réel |
| Portabilité hors Lovable | PARTIELLEMENT IMPLEMENTÉ | `docs/PORTABILITY.md`, migrations versionnées | Procédure d'export/restauration réellement testée |
| Couverture nationale des lieux | PRÉVU / À DÉVELOPPER | architecture territoriale nationale | Importer et vérifier les données hors Niamey |

## 15. Travail restant vers l'objectif actuel

Priorités connues :

1. confirmer régulièrement l'état des migrations sur la base Supabase active ;
2. charger les territoires et localités nationales fiables ;
3. construire un pipeline OSM par région ou zone ;
4. activer GeoNames uniquement après configuration d'un username ;
5. améliorer les variantes, noms locaux et fautes ;
6. tester la recherche de bout en bout hors Niamey ;
7. mesurer les performances avec plusieurs milliers de lieux ;
8. vérifier les droits RLS et les parcours Pro/admin ;
9. tester la PWA sur appareil réel.

## 16. AI DEVELOPMENT RULES

Tout agent IA travaillant sur UPK doit :

- analyser le dépôt, les migrations, la documentation et l'historique avant de modifier ;
- utiliser `PROJECT_HANDOVER.md` comme document maître ;
- fusionner toute nouvelle information dans ce fichier au lieu de créer un doublon ;
- préserver les fonctionnalités existantes ;
- ne pas refaire une fonctionnalité déjà présente ;
- ne pas remplacer une intégration réelle par une structure vide, une simulation ou un mock ;
- distinguer le code écrit, le code connecté et la fonctionnalité réellement opérationnelle ;
- ne pas déclarer une fonctionnalité terminée sans test réel ;
- signaler immédiatement toute action externe nécessaire ;
- demander la création d'un compte, d'une clé, d'un secret, d'une autorisation ou l'application d'une migration avant de continuer lorsque cette action est bloquante ;
- fournir, pour une migration Supabase, un script SQL prêt à coller et les requêtes de vérification ;
- ne jamais demander de coller une clé secrète dans la conversation ;
- attendre la confirmation de l'utilisateur après une action externe ;
- conserver `main` comme branche de référence ;
- ne pas supprimer ni réécrire une migration appliquée ;
- préférer les fonctionnalités PostgreSQL/Supabase portables ;
- isoler et documenter les services externes ;
- vérifier les conditions d'utilisation et les quotas des API ;
- documenter les changements importants dans ce fichier lorsque l'état du projet évolue.

### Règle de statut

Une fonctionnalité est :

- **IMPLEMENTÉE** uniquement si le code ou les migrations la prouvent et qu'elle est utilisable ;
- **PARTIELLEMENT IMPLEMENTÉE** si une partie est connectée mais qu'une configuration, des données ou une validation manque ;
- **PRÉVUE / À DÉVELOPPER** si elle est un objectif documenté sans implémentation suffisante ;
- **À VÉRIFIER** si le dépôt ne permet pas de conclure avec certitude.

## 17. Sources consultées

- `README.md`
- `.lovable/plan/rôles-permissions-et-salle-de-contrôle-upk-2026-09-13.md`
- `docs/PORTABILITY.md`
- `supabase/migrations/`
- `drizzle/migrations/`
- `src/routes/`
- `src/components/upk/`
- `src/lib/`
- historique Git de `origin/main`

`PROJECT_HANDOVER.md` est désormais la référence de synthèse. Les documents
spécifiques restent utiles comme preuves détaillées, mais ne doivent pas être
contradictoires avec ce fichier.
