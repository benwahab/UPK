# Audit final UPK et intégration contrôlée d’Overture Maps

| | |
| --- | --- |
| **Date** | 2026-11-21 |
| **Dépôt** | `benwahab/UPK`, branche `main` |
| **Périmètre** | Audit du dépôt, étude Overture Maps, dédoublonnage OSM, préparation de l’intégration |
| **Production** | `https://upk.benwahab111.workers.dev` — **non modifiée** |
| **Release Overture** | `2026-11-18.0` (release annoncée ; absente des CSV fournis) |
| **Décision** | Audit terminé ; intégration préparée mais **non exécutée** |

---

## 1. Ce que j’ai compris de la documentation

UPK est un **annuaire local et moteur de recherche** pour le Sahel
(Niger, Mali, Burkina Faso), conçu pour un Android bas de gamme
(2 Go de RAM, 3G) et pour trois langues de lancement : **français, anglais,
arabe avec RTL**. L’assistant accepte aussi le haoussa et le zarma en mode
expérimental, sans promesse de qualité vocale non testée sur appareil réel.

Les documents sont contractuels et se lisent dans cet ordre :

1. `CAHIER_DES_CHARGES.md` : le produit, les personas, les parcours et les
   critères d’acceptation. Le visiteur n’a pas de compte ; le texte passe avant
   l’image ; la proximité prime ; rien n’est publié sans validation.
2. `ARCHITECTURE.md` : monorepo TanStack Start sur Cloudflare Workers, tRPC,
   D1 + Drizzle, R2 privé, Better Auth, Turnstile, rate limiting, PWA.
   Une seule API, deux interfaces ; aucune requête SQL dans un composant.
3. `PLAN_DE_TRAVAIL.md` : séquence des sprints et jalons.
4. `RUNBOOK.md` : procédures local, migrations, secrets, sauvegarde,
   déploiement et retour arrière.
5. `ASSISTANT.md` : assistant vocal côté navigateur, sans service cloud,
   préférences locales uniquement, limites réelles.
6. `AGENTS.md` : règles de travail du dépôt, pièges vérifiés et état courant.

Les contraintes structurantes retenues :

- **Cloudflare uniquement** : Workers, D1, R2, tRPC, Better Auth, Drizzle.
  Aucune dépendance Supabase ni Lovable.
- **Une seule branche `main`**, aucun tag, aucune pull request, aucun
  `push --force`, aucune réécriture d’historique.
- **Un seul environnement distant** : production `upk`. L’ancien staging est
  retiré et ne doit pas être recréé.
- **Aucun secret dans le dépôt** ; migrations appliquées non modifiables ;
  sauvegarde D1 avant toute opération risquée.
- **Trois langues de données** (`fr`, `en`, `ar`) ; l’assistant ajoute `ha` et
  `za` côté interface.
- **Provenance obligatoire** : OSM en ODbL, GeoNames en CC BY 4.0 ; les champs
  absents restent `NULL`, rien n’est inventé.

Le dépôt est déjà bien avancé : monorepo, recherche SSR, FTS5, fiches, SEO,
PWA, contribution, modération, R2, Better Auth, en-têtes de sécurité et
assistant vocal. L’audit Overture arrive donc sur un catalogue existant, pas
sur une base vide.

---

## 2. Audit du dépôt

### 2.1 Structure et stack

| Élément | État constaté |
| --- | --- |
| Monorepo | `apps/web`, `packages/domain`, `api`, `db`, `i18n`, `ui`, `infra`, `seed`, `docs` |
| Web | TanStack Start, SSR, PWA, React 19 |
| API | tRPC sur Workers |
| Données | D1 + Drizzle, migrations `0001` à `0004` |
| Fichiers | R2 privé `upk-photos`, proxy Worker |
| Auth | Better Auth, sessions, rôles admin |
| Anti-abus | Turnstile, rate limiting |
| Langues | `fr`, `en`, `ar` (RTL) ; assistant `fr/en/ar/ha/za` |
| Branche | `main` uniquement ; pas de PR |
| Environnement | Production `upk` uniquement |

### 2.2 Données

- `seed/osm-sahel-2026-11-27.json` : **41 558 lieux** OSM (NE, ML, BF).
- `seed/geonames-sahel-2026-11-27.json` : 1 197 villes, 3 340 quartiers,
  hiérarchie régions/départements/communes.
- `seed/categories-2026-11-27.json` : **16 catégories** traduites fr/en/ar.
- `seed/niamey-2026-08-30.json` : snapshot historique de 1 546 lieux.
- Provenance : `osm_id`, `osm_type`, `source_url`, `licence_source`,
  `importe_le`, `osm_tags`.

**Écart documentaire** : `AGENTS.md`, `docs/README.md` et `docs/RUNBOOK.md`
annoncent **41 566** lieux, alors que le fichier `seed/osm-sahel-2026-11-27.json`
en contient **41 558**. L’écart de 8 doit être expliqué avant de figer un
compteur public. Il peut provenir de 8 contributions publiées après le
snapshot, mais ce n’est pas démontré.

### 2.3 Recherche et assistant

La recherche est cohérente avec le cahier des charges :

- détection d’intention : quartier, ville, catégorie, nom exact ;
- filtrage géographique avant tri ;
- nom exact prioritaire ;
- FTS5 + boîte englobante + distance ;
- repli tolérant aux fautes même quand FTS renvoie des résultats ;
- correction proposée, jamais substituée ;
- aucun résultat : message exact et lien vers la contribution.

L’assistant est monté dans `apps/web/src/routes/$locale.tsx` ; il fonctionne
avec les API navigateur, sans service cloud. Les préférences sont locales
(`upk-assistant-greeting`, `upk-assistant-language`) ; aucun transcript ni
audio n’est stocké par UPK. Le point non couvert reste le **micro réel sur
Android 2 Go / 3G**, les tests simulant les API.

### 2.4 Sécurité et exploitation

Points solides :

- en-têtes CSP/HSTS/nosniff/frame-ancestors ;
- CSRF TanStack pour les server functions ;
- R2 privé avec proxy ;
- rate limiting ;
- sauvegardes D1 dans `upk-backups`, rétention 90 jours ;
- procédure de retour arrière par `git revert` et D1 Time Travel.

Points à traiter avant ouverture publique :

- **Turnstile utilise encore la clé de test** ;
- le mot de passe admin local doit être remplacé avant l’ouverture ;
- `docs/README.md` parlait encore de staging et de buckets `upk-photos-staging` ;
  ce texte a été corrigé pendant cet audit, mais d’autres historiques peuvent
  encore mentionner l’ancien environnement ;
- les versions de production citées ne sont pas homogènes (`ca7af247` dans le
  runbook, `8e322315` dans `AGENTS.md`) ;
- l’état local D1 de ce poste est ancien (1 548 lieux, 9 catégories) : il ne
  représente pas le catalogue Sahel et ne doit pas servir de référence.

### 2.5 Documentation

La documentation est riche et exploitable, mais elle a divergé :

| Sujet | Incohérence |
| --- | --- |
| Staging | `docs/README.md` a été corrigé ; `AGENTS.md` et `RUNBOOK.md` décrivent un seul environnement |
| Volume OSM | 41 566 annoncés vs 41 558 dans le seed |
| Version production | `ca7af247` vs `8e322315` selon le document |
| Audit Overture | `docs/OVERTURE-AUDIT.md`, `infra/scripts/audit-overture.py` et le workflow étaient absents avant cet audit ; ils sont désormais ajoutés |
| Tests | compteurs E2E différents selon les documents (20, 21, 39…) |

Ces écarts ne bloquent pas le produit, mais ils bloquent une **ouverture
publique sereine** : un auditeur externe ne peut pas savoir quel état est
réellement en production.

---

## 3. Audit Overture Maps

### 3.1 Entrées et intégrité

| Fichier | Lignes | Taille | SHA-256 |
| --- | ---: | ---: | --- |
| `UPK-revue-candidats-Overture_2.csv` | 1 136 | 375 994 o | `6643eecf2ace4549d00a3529600ce2123d0e0a2aacec476676ff8bc3290c402d` |
| `upk-overture-candidats-a-verifier_2.csv` | 1 136 | 186 729 o | `d39082519262390bac9fa34c467e7e7cd7d06bd9d681dfedf7bdbd1f7fb99095` |

Les deux fichiers sont cohérents en nombre de lignes. La vue de travail ajoute
les colonnes de priorité, de contrôle et de décision. **Aucun identifiant
Overture/GERS n’est présent** : c’est une limite majeure pour l’idempotence et
la traçabilité. Le script génère donc un identifiant déterministe
`overture_<sha1>` à partir du nom, de la catégorie, des coordonnées et des
contacts.

Répartition : **617 BF, 363 ML, 156 NE**. Les trois chaînes `Shell`,
`MoneyGram` et `TotalEnergies/TOTAL` représentent **313 candidats (27,5 %)**.
Les catégories Overture sont nombreuses (54) et doivent être projetées sur les
16 catégories UPK.

### 3.2 Méthode

Le script `infra/scripts/audit-overture.py` applique les règles suivantes :

1. normalisation des noms (accents, arabe, ponctuation) ;
2. téléphones normalisés en E.164 avec les préfixes **227 / 223 / 226** ;
3. domaines web normalisés, domaines génériques exclus des preuves fortes ;
4. distance haversine et index spatial sur les 41 558 lieux OSM ;
5. correspondance OSM forte :
   - nom exact à ≤ 100 m ;
   - nom proche + catégorie compatible à ≤ 150 m ;
   - téléphone et/ou site identiques avec nom proche ;
   - téléphone **et** site identiques avec catégorie compatible ;
6. dédoublonnage interne Overture : nom exact à ≤ 100 m, téléphone/site à
   ≤ 100 m avec nom proche, ou nom proche + catégorie compatible à ≤ 50 m ;
7. contrôle de localité : distance à la ville nommée, incohérence au-delà de
   150 km ;
8. contrôle des catégories hors périmètre, noms administratifs, noms naturels,
   noms étrangers et anomalies de contact ;
9. **aucune validation sur le seul score Overture** ;
10. vérification web séparée, uniquement pour les candidats sans correspondance
    OSM et sans anomalie.

### 3.3 Résultat global

| Décision | Nombre | Sens |
| --- | ---: | --- |
| `VALIDATED_NEW` | **26** | Nouveau lieu, existence confirmée par une page officielle |
| `VALIDATED_ENRICHMENT` | **16** | Correspondance OSM ; Overture apporte un téléphone ou un site absent |
| `DUPLICATE_OSM` | **34** | Doublon OSM fort, ne pas importer |
| `DUPLICATE_OVERTURE` | **2** | Doublon interne Overture |
| `NEEDS_REVIEW` | **913** | Aucune preuve suffisante ; revue humaine requise |
| `NOT_RELEVANT` | **128** | Catégorie hors périmètre ou division administrative/naturelle |
| `INVALID_LOCATION` | **11** | Localité et coordonnées incohérentes |
| `REJECTED` | **6** | Nom étranger manifestement incompatible |
| **Total** | **1 136** | |

Correspondances OSM fortes : **50** (34 doublons + 16 enrichissements).
Liens Overture forts : **3**, correspondant à **2 lignes doublons** et à leur fiche canonique.

### 3.4 Pourquoi seulement 50 correspondances fortes, alors que l’audit antérieur annonçait 384 doublons ?

L’audit antérieur n’est pas reproductible avec le seed actuel et ses 384
« doublons probables » ne doivent pas être repris tels quels. Explications :

- **224 candidats** ont un nom exact qui existe **quelque part** dans OSM, mais
  souvent dans une autre ville ou à plusieurs kilomètres : ce ne sont pas des
  doublons certains (chaînes, homonymes, erreurs de coordonnées).
- En matching **nom seul dans la même ville**, on trouve **439** candidats
  (152 exacts + 287 proches). C’est probablement l’ordre de grandeur de
  l’ancien chiffre, mais ce n’est pas une preuve de doublon.
- **285 paires Overture** sont à moins de 100 m l’une de l’autre, mais elles
  concernent souvent des commerces différents partageant un centroïde de
  quartier ou de mall. Seules 2 lignes (une paire) sont de vrais doublons internes.
- Les chaînes (`Shell`, `MoneyGram`, `Total`) ont des noms génériques et des
  téléphones de siège : un nom identique ne suffit pas à fusionner deux
  stations ou deux points de vente.

La méthode retenue est donc **conservatrice** : 50 correspondances fortes,
pas 384. Le fichier `duplicates-osm.csv` contient les 34 doublons à ne pas
importer ; les 224 noms exacts « ailleurs » restent dans `needs-review.csv`
avec le drapeau `nom_exact_existe_osm_ailleurs`.

### 3.5 Nouveaux lieux validés (26)

La validation web a porté sur 58 candidats disposant d’un site unique, sans
correspondance OSM forte, sans anomalie et avec une localité cohérente. Seuls
les sites dont la page accessible mentionnait réellement le nom ont été
retenus. Les 26 validés :

| Catégorie UPK | Lieux |
| --- | ---: |
| école | 12 |
| hôtel | 8 |
| santé | 2 |
| lieu de culte | 2 |
| administration (ambassade) | 1 |
| services professionnels | 1 |

Par pays : **ML 12, BF 9, NE 5**.

Exemples : Noom Hotel Niamey, Grand Hôtel du Niger, Bravia Hotel Niamey,
École Internationale Alliance, Université André Salifou de Zinder, Clinique
Pasteur (Bamako), American International School of Bamako, The Sleeping Camel,
ONOMO Hotel Bamako, Ambassade d’Inde à Bamako, Hôtel Villa Rose
(Bobo-Dioulasso), Clinique Les Genêts, Hôtel des Conférences Ouind Yidé,
Université Saint Thomas d’Aquin.

Le fichier `docs/overture/validated-new.csv` contient l’URL de vérification,
le titre de la page et le nombre de jetons du nom retrouvés. La preuve reste
**une page officielle accessible**, pas une visite terrain : la position exacte
et l’adresse postale restent à confirmer.

### 3.6 Enrichissements OSM (16)

Overture apporte un téléphone ou un site absent d’OSM pour 16 lieux déjà
présents. Les champs génériques de chaînes (par exemple le numéro de siège
Shell ou l’URL `find.shell.com`) ont été **exclus** : ils ne prouvent pas le
lieu précis. Les enrichissements retenus concernent notamment :

- Université de Maradi, ITMA, IPD-AOS, Badala Hotel, Tanoudja Résidence
  Hôtelière, Hôtel Laafi, White Stone, Panache Hotel, P'tit Bazar,
  JackPot Ouaga2000, Princess Yenenga, quelques stations TotalEnergies.

Le SQL d’enrichissement utilise `COALESCE` : il ne remplace jamais une valeur
OSM existante.

### 3.7 Rejets, hors périmètre et localisations invalides

- **128 hors périmètre** : sites historiques, parcs, musées, stades, divisions
  administratives (`Département`, `Cercle`, `Province`, `Commune`, etc.).
  UPK est un guide d’établissements, pas un gazetteer.
- **11 localisations invalides** : localité nommée à des centaines de kilomètres
  des coordonnées (ex. `Tessalit Cercle` localisé à Bamako, `Premium Market
  Mali` à Bamako mais coordonnées à Gao, `Shell` à Loulo).
- **6 rejets** : noms étrangers incompatibles avec le Sahel
  (`Bureau of Quarantine-Bacolod`, `KPU Kab.Kuantan Singingi`,
  `Specialty Store Nijmegen`, `Provincia di Kénédougou`, etc.).
- Les ambassades étrangères réelles (`India in Mali`, `U.S. Embassy`) ne sont
  pas rejetées : elles sont classées `administration` et restent en revue ou
  validées selon la source.

### 3.8 Qualité des données Overture

| Constat | Valeur |
| --- | ---: |
| Candidats sans téléphone | 267 |
| Candidats sans site web | 470 |
| Candidats sans localité | 101 |
| Noms dupliqués (toutes localités) | 401 |
| Paires à ≤ 100 m | 285 |
| Catégories Overture distinctes | 54 |
| Catégories hors périmètre | 92 |
| Noms administratifs | 42 |
| Noms naturels | 24 |
| Anomalies de contact | 7 |
| Noms exacts existant ailleurs dans OSM | 224 |

Les coordonnées Overture sont parfois des centroïdes de quartier ou de centre
commercial : plusieurs établissements différents partagent exactement les mêmes
coordonnées. C’est pourquoi la proximité seule n’est jamais utilisée pour
fusionner.

### 3.9 Licences et attribution

Overture Places est distribué sous **CDLA-Permissive-2.0** pour les sources
Meta, Microsoft, PinMeTo, Uberall, etc., avec des composants sous Apache 2.0,
CC0 ou ODbL selon la source. L’attribution à prévoir :

> © Overture Maps Foundation — données Overture Maps, release 2026-11-18.0.

Et, pour les données dérivées d’OSM :

> © les contributeurs OpenStreetMap.

L’intégration proposée conserve `source='overture'`, `licence_source`, la
release et l’URL de vérification dans `metadata`. Aucune donnée Overture n’a
été ajoutée au dépôt en tant que nouveau seed : les fichiers d’audit sont dans
`docs/overture/`.

### 3.10 Limites de cet audit

- Pas d’identifiant Overture/GERS dans les CSV : les identifiants UPK sont
  déterministes mais ne permettent pas de suivre une mise à jour Overture.
- Pas de colonne adresse : aucune adresse n’a été inventée.
- 913 candidats restent en revue humaine ; les 26 validés ne représentent pas
  une validation terrain.
- La vérification web a testé 58 sites ; certains sites sont injoignables,
  détournés, en maintenance ou ne mentionnent pas le lieu. Ces cas restent
  `inconclusif`.
- Les chaînes et les centroïdes partagés limitent le dédoublonnage automatique.
- Le fichier OSM de référence contient 41 558 lieux ; la production peut en
  contenir 41 566. L’audit doit être rejoué sur l’export exact de production
  avant import.

---

## 4. Intégration contrôlée préparée

### 4.1 Principe

Aucune migration n’est nécessaire : le schéma `places` possède déjà
`source`, `source_url`, `licence_source`, `metadata`, `statut_publication` et
`statut_verification`. L’intégration utilise donc uniquement des colonnes
existantes.

- **Nouveaux lieux** : `source='overture'`, `statut_publication='valide'`,
  `statut_verification='source_fiable'` (validation web), catégorie UPK,
  ville/region/département/commune résolues par GeoNames.
- **Enrichissements** : la fiche OSM reste la fiche de référence ;
  `source='osm+overture'`, seuls les champs absents sont complétés, et
  `metadata.overture` conserve la release, l’audit et les champs ajoutés.

### 4.2 Fichiers générés

| Fichier | Rôle |
| --- | --- |
| `docs/overture/candidates-classified.csv` | 1 136 lignes, décision et justification |
| `docs/overture/validated-new.csv` | 26 nouveaux lieux validés |
| `docs/overture/enrichments-osm.csv` | 16 enrichissements OSM |
| `docs/overture/duplicates-osm.csv` | 34 doublons OSM |
| `docs/overture/duplicates-overture.csv` | 2 doublons internes |
| `docs/overture/not-relevant.csv` | 128 hors périmètre |
| `docs/overture/invalid-location.csv` | 11 localisations invalides |
| `docs/overture/rejected.csv` | 6 rejets |
| `docs/overture/needs-review.csv` | 913 revues humaines |
| `docs/overture/verification-web.csv` | 58 contrôles web, dont 26 confirmés |
| `docs/overture/import-new.sql` | 26 INSERT idempotents |
| `docs/overture/enrich-osm.sql` | 16 UPDATE limités aux champs absents |
| `docs/overture/rollback-new.sql` | suppression des seuls lieux Overture |
| `docs/overture/import-manifest.json` | empreintes et décomptes |

### 4.3 Vérifications locales effectuées

Le SQL a été testé sur une base SQLite temporaire construite avec les
migrations `0001` à `0004` :

- import de 26 nouveaux lieux : **26** lignes `source='overture'` ;
- enrichissement de 16 fiches : **16** lignes `source='osm+overture'` ;
- ré-exécution des deux fichiers : **aucun doublon**, toujours 42 lignes ;
- `rollback-new.sql` : **0** ligne `source='overture'` restante ;
- les contraintes de clé étrangère et les catégories sont respectées.

Ce test valide la syntaxe et l’idempotence, pas la qualité métier des 26 lieux.

### 4.4 Procédure de mise en production (non exécutée)

1. Sauvegarder D1 (`pnpm backup:d1`) et noter le bookmark Time Travel.
2. Vérifier la production : `SELECT COUNT(*) FROM places` et
   `SELECT COUNT(*) FROM categories` ; expliquer l’écart 41 558 / 41 566.
3. Exécuter `docs/overture/import-new.sql` sur `upk` uniquement.
4. Vérifier 26 lignes `source='overture'` et les catégories.
5. Exécuter `docs/overture/enrich-osm.sql`.
6. Vérifier 16 lignes `source='osm+overture'` et l’absence d’écrasement.
7. Tester `/fr?q=noom`, `/fr?q=clinique%20les%20genets`,
   `/en?q=american%20international%20school`, une fiche, le sitemap et les E2E.
8. Surveiller Workers Logs et les erreurs D1.
9. En cas de problème : `rollback-new.sql` pour les nouveaux lieux ; D1 Time
   Travel ou restauration de sauvegarde pour les enrichissements.

Aucune de ces étapes n’a été exécutée sur `upk` pendant cet audit.

### 4.5 Critères d’acceptation de l’intégration

- 26 nouveaux lieux visibles et recherchables, sans doublon manifeste.
- 16 enrichissements sans écrasement de valeur OSM.
- Aucun changement de schéma, aucune migration.
- Aucune régression des tests unitaires, typecheck, lint, E2E.
- Sitemap et `hreflang` cohérents.
- Attribution Overture et OSM visible avant ouverture publique.
- Rollback testé et documenté.

---

## 5. Recommandations prioritaires

1. **Ne pas importer les 913 `NEEDS_REVIEW`** sans revue humaine ou source
   indépendante.
2. **Rejouer l’audit sur l’export exact de production** (41 566 lignes) et
   ajouter les identifiants Overture/GERS si l’export les fournit.
3. **Poursuivre la correction documentaire** : compteur OSM, versions de
   production, compteurs de tests et mentions historiques de staging.
4. **Traiter Turnstile et le mot de passe admin** avant ouverture publique.
5. **Ajouter l’attribution Overture** dans les mentions légales et
   `seed/ATTRIBUTION.md`.
6. **Automatiser l’audit** via le workflow GitHub Actions fourni ; il ne
   déploie rien et vérifie que les sorties sont reproductibles.
7. **Tester les 26 lieux sur le terrain** ou via une source locale avant de
   les considérer comme vérifiés.
8. **Ne pas fusionner les chaînes sur le nom seul** : utiliser l’adresse, le
   téléphone local ou une visite.

---

## 6. Conclusion

Le dépôt est techniquement cohérent et conforme à l’architecture Cloudflare
demandée. La recherche, la provenance OSM et les garde-fous de sécurité sont
solides. Les principaux risques sont documentaires et opérationnels :
incohérences résiduelles dans les historiques, compteurs divergents, Turnstile
de test, versions de production contradictoires.

L’audit Overture est terminé : **1 136 candidats examinés**, **50
correspondances OSM fortes**, **34 doublons OSM**, **16 enrichissements**,
**26 nouveaux lieux validés par source officielle**, **2 doublons internes**,
**128 hors périmètre**, **11 localisations invalides**, **6 rejets** et
**913 revues humaines**. L’intégration est prête sous forme de SQL idempotent
et réversible, mais **rien n’a été exécuté en production**. Le prochain geste
doit être une validation humaine ciblée, puis une sauvegarde D1 et un import
contrôlé.
