# Architecture technique — UPK v2

| | |
| --- | --- |
| **Version** | 1.0 |
| **Statut** | À valider |
| **Référence** | `docs/CAHIER_DES_CHARGES.md` |
| **Exécution** | `docs/PLAN_DE_TRAVAIL.md` |

---

## 1. Vue d'ensemble

```
┌──────────────────────┐        ┌──────────────────────┐
│  Web desktop (PWA)   │        │  Android (Play Store) │
│  TanStack Start SSR  │        │  Expo / React Native  │
└──────────┬───────────┘        └──────────┬───────────┘
           │  HTTPS / tRPC                 │  HTTPS / tRPC
           └───────────────┬───────────────┘
                           ▼
              ┌─────────────────────────┐
              │  Cloudflare Workers      │
              │  /api/trpc  (tRPC)       │
              │  services + autorisation │
              └───────┬─────────┬───────┘
                      │         │
             ┌────────▼──┐   ┌──▼────────┐
             │  D1       │   │  R2       │
             │  SQLite   │   │  photos   │
             └───────────┘   └───────────┘
                      │
        ┌─────────────┴──────────────┐
        │  Cron + Queues             │
        │  import OSM / maintenance  │
        └────────────────────────────┘
```

**Principe directeur :** une seule API, deux interfaces. Aucune requête SQL
dans un composant. Aucune règle métier dans l'UI.

## 2. Monorepo

```
upk/
├── apps/
│   ├── web/                  TanStack Start (React 19), SSR, PWA desktop
│   └── mobile/               Expo (React Native), Android
├── packages/
│   ├── domain/               Types, schémas Zod, règles métier pures
│   ├── api/                  Routeur tRPC + procédures
│   ├── db/                   Schéma Drizzle, migrations, repositories
│   ├── i18n/                 Catalogues fr/en/ar, formatage, RTL
│   ├── ui/                   Design tokens (web + native)
│   └── config/               ESLint, TypeScript, Tailwind partagés
├── infra/
│   ├── wrangler.toml
│   └── scripts/              seed, import OSM, vérifications
├── seed/                     Snapshots de données (JSON + attribution)
├── docs/
└── package.json              pnpm workspaces + Turborepo
```

**Outillage.** pnpm, Turborepo, TypeScript strict, ESLint + Prettier, Vitest,
Playwright, Maestro, GitHub Actions.

## 3. Décisions d'architecture (ADR)

### ADR-001 — Deux interfaces, un domaine partagé
Un seul code React Native Web serait plus simple, mais sacrifie le SEO et la
qualité d'usage desktop. On partage donc `domain`, `api`, `db` et les tokens,
pas les composants d'écran.

### ADR-002 — D1 (SQLite) plutôt que Postgres
Volume attendu (< 100 000 lieux), besoins géographiques simples, coût et
latence. On renonce à PostGIS et aux fonctions SQL avancées. La distance est
calculée en TypeScript après un préfiltre par boîte englobante.
*Réversible :* la couche `db` isole Drizzle ; un passage à Hyperdrive + Postgres
ne toucherait que `packages/db`.

### ADR-003 — tRPC plutôt que server functions
Le mobile ne peut pas consommer les server functions de TanStack Start. tRPC
donne un contrat unique, typé, utilisable par les deux clients avec TanStack
Query.

### ADR-004 — Better Auth
Sessions, vérification d'e-mail, réinitialisation, adaptateur D1, client Expo
avec stockage sécurisé. Évite de réécrire une authentification maison.

### ADR-005 — R2 + URLs signées
Bucket privé. Le Worker vérifie la permission, génère une URL signée courte.
Contrôle du type MIME et de la taille côté serveur, pas seulement côté client.

### ADR-006 — Recherche : FTS5 + boîte englobante + distance en TS
1. `MATCH` FTS5 (tokenizer `unicode61 remove_diacritics 2`) ;
2. préfiltre `latitude BETWEEN … AND longitude BETWEEN …` ;
3. calcul Haversine en TypeScript sur les candidats ;
4. tri pertinence puis distance.
Évite de dépendre de fonctions mathématiques SQL dont la disponibilité sur D1
doit être vérifiée.

### ADR-007 — Autorisation dans la couche service
D1 n'a pas de RLS. Chaque procédure passe par un wrapper qui exige une session
et une permission. **Refus par défaut.** Toute requête de repository est
contrainte par l'identité de l'appelant.

### ADR-008 — PWA desktop uniquement
Pas de PWA mobile : l'Android passe par le Play Store. Réduit fortement la
complexité (pas d'iOS, pas de prompt d'installation mobile).

### ADR-009 — Visiteur sans compte
Aucune inscription pour chercher, consulter, proposer ou signaler.

### ADR-010 — Pas de file d'écriture hors-ligne en v1
Le hors-ligne est en lecture seule. Les écritures hors-ligne sont refusées avec
un message explicite. Une file de synchronisation sera étudiée en v2.

### ADR-011 — Trois langues au lancement, dont l'arabe (RTL)
Français, anglais et arabe dès la v1. L'arabe impose le RTL : on utilise des
propriétés CSS logiques (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`) et jamais
`left`/`right`. Les URL sont localisées (`/fr`, `/en`, `/ar`) pour le SEO. Les
chiffres restent latins pour les téléphones et les distances. Le haoussa et le
zarma viendront après, sans refonte, grâce au même catalogue.

## 4. Base de données

### 4.1 Conventions

- Identifiants `TEXT` (UUID v4 générés par `crypto.randomUUID()`).
- Booléens `INTEGER` 0/1.
- Dates `TEXT` ISO 8601 UTC.
- Montants `INTEGER` en unité monétaire mineure (si besoin).
- Colonnes normalisées (`nom_normalise`, `telephone_normalise`) calculées à
  l'écriture, jamais à la lecture.
- `metadata` en `TEXT` JSON pour les attributs spécifiques à une catégorie.

### 4.2 Schéma des lieux

```sql
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  nom         TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icone       TEXT,
  ordre       INTEGER NOT NULL DEFAULT 0,
  parent_id   TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE places (
  id                  TEXT PRIMARY KEY,
  nom                 TEXT NOT NULL,
  nom_normalise       TEXT NOT NULL,
  description         TEXT,
  category_id         TEXT NOT NULL REFERENCES categories(id),
  region_id           TEXT REFERENCES regions(id),
  departement_id      TEXT REFERENCES departements(id),
  commune_id          TEXT REFERENCES communes(id),
  ville_zone_id       TEXT REFERENCES villes_zones(id),
  quartier            TEXT,
  adresse             TEXT,
  latitude            REAL NOT NULL,
  longitude           REAL NOT NULL,
  telephone           TEXT,
  telephone_normalise TEXT,
  whatsapp            TEXT,
  horaires            TEXT,
  site_web            TEXT,
  statut_publication  TEXT NOT NULL DEFAULT 'en_attente'
                      CHECK (statut_publication IN
                        ('en_attente','en_examen','valide','refuse')),
  statut_verification TEXT NOT NULL DEFAULT 'a_verifier'
                      CHECK (statut_verification IN
                        ('a_verifier','verifie','source_fiable')),
  owner_id            TEXT REFERENCES user(id) ON DELETE SET NULL,
  source              TEXT NOT NULL DEFAULT 'soumission_utilisateur',
  osm_id              TEXT,
  osm_type            TEXT,
  licence_source      TEXT,
  importe_le          TEXT,
  metadata            TEXT,
  actif               INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX places_geo_idx        ON places (latitude, longitude);
CREATE INDEX places_categorie_idx  ON places (category_id);
CREATE INDEX places_ville_idx      ON places (ville_zone_id);
CREATE INDEX places_publication_idx ON places (statut_publication, actif);
CREATE INDEX places_tel_idx        ON places (telephone_normalise);
CREATE UNIQUE INDEX places_osm_idx ON places (osm_id, osm_type)
  WHERE osm_id IS NOT NULL;
```

### 4.3 Recherche plein texte

```sql
CREATE VIRTUAL TABLE places_fts USING fts5(
  nom, description, quartier,
  content = 'places',
  content_rowid = 'rowid',
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TRIGGER places_ai AFTER INSERT ON places BEGIN
  INSERT INTO places_fts(rowid, nom, description, quartier)
  VALUES (new.rowid, new.nom, new.description, new.quartier);
END;

CREATE TRIGGER places_ad AFTER DELETE ON places BEGIN
  INSERT INTO places_fts(places_fts, rowid, nom, description, quartier)
  VALUES ('delete', old.rowid, old.nom, old.description, old.quartier);
END;

CREATE TRIGGER places_au AFTER UPDATE ON places BEGIN
  INSERT INTO places_fts(places_fts, rowid, nom, description, quartier)
  VALUES ('delete', old.rowid, old.nom, old.description, old.quartier);
  INSERT INTO places_fts(rowid, nom, description, quartier)
  VALUES (new.rowid, new.nom, new.description, new.quartier);
END;
```

### 4.4 Algorithme de recherche

```
entrée : q, lat?, lng?, filtres, limite, curseur

1. si q non vide :
     candidats = FTS5 MATCH q
   sinon :
     candidats = tous les lieux publiés
2. filtrer statut_publication = 'valide' AND actif = 1
3. filtrer catégorie / région / ville / quartier
4. si lat/lng :
     boîte englobante de rayon + marge de 20 %
     (index places_geo_idx)
5. charger au plus 200 candidats
6. calculer la distance Haversine en TypeScript
7. trier : score texte DESC, puis distance ASC
8. paginer par curseur opaque (score, distance, id)
```

**Pourquoi la distance en TypeScript :** évite toute dépendance à des fonctions
mathématiques SQL dont la disponibilité sur D1 doit être vérifiée, et reste
négligeable sur 200 lignes.

### 4.5 Migrations

- `packages/db/migrations/*.sql`, numérotées, immuables.
- Appliquées par `wrangler d1 migrations apply`, jamais à la main.
- Une migration appliquée ne se modifie plus : on en crée une nouvelle.
- Test de migration sur base vide **et** sur copie de production anonymisée.

## 5. API

### 5.1 Structure d'une procédure

```ts
export const approvePlace = procedure("admin.moderation.approve")
  .input(approvePlaceInput)              // Zod, packages/domain
  .use(requireAuth)
  .use(requirePermission("validation_lieux"))
  .mutation(async ({ ctx, input }) => {
    await assertWithinRadius(ctx.user.id, input.placeId, input.lat, input.lng);
    return moderationService.approve(ctx, input);
  });
```

### 5.2 Règles

- Toute entrée validée par Zod.
- Toute procédure d'écriture : `requireAuth` + `requirePermission`.
- Toute lecture privée : filtre par `ctx.user.id` dans le repository.
- Erreurs normalisées : `{ code, message, details? }`.
- Aucun champ interne dans les sorties publiques.
- Journalisation automatique des mutations sensibles.

### 5.3 Versionnement

- `/api/trpc` pour les clients internes.
- Une API REST publique (`/api/v1`) pourra être ajoutée en v2.0 sans casser
  tRPC.

## 6. Authentification

- **Better Auth** sur D1.
- Web : cookie `HttpOnly`, `Secure`, `SameSite=Lax`, durée 30 jours.
- Mobile : jeton de session dans `expo-secure-store`.
- Vérification d'e-mail obligatoire pour les comptes professionnels.
- Réinitialisation par lien à usage unique, valable 1 heure.
- Verrouillage progressif après échecs répétés.
- Aucune session pour un visiteur anonyme.

## 7. Stockage des photos

- Bucket R2 **privé**.
- Chemin : `places/{placeId}/{uuid}.{ext}`.
- Téléversement : le client demande une URL signée `PUT` au Worker, qui vérifie
  la session, la propriété de la fiche, le type MIME et la taille (< 5 Mo).
- Lecture : URL signée `GET` de 15 minutes, ou URL publique si la fiche est
  publiée.
- Types acceptés : `image/jpeg`, `image/png`, `image/webp`, `image/avif`.
- Redimensionnement à la demande (Cloudflare Images ou Worker) pour les
  vignettes.

## 8. Hors-ligne

### Web
- App-shell précaché par Workbox.
- Dernières 20 fiches et derniers résultats en IndexedDB via la persistance
  TanStack Query.
- Page de repli hors-ligne.

### Mobile
- Dernières 50 fiches + favoris en SQLite local (`expo-sqlite`).
- Images en cache disque (`expo-image`).
- Bandeau « hors-ligne » et date de dernière synchronisation.

## 9. PWA desktop

- `manifest.webmanifest` : `display: standalone`, `start_url: "/"`,
  `theme_color`, icônes 192/512 + maskable, captures desktop.
- Service worker généré par VitePWA **dans la sortie réelle** du build
  (`.output/public`), pas dans `dist/`.
- Enregistrement explicite au démarrage.
- Flux de mise à jour : détection d'une nouvelle version → bandeau → activation
  au clic.
- `beforeinstallprompt` capturé, bouton affiché uniquement sur desktop.

## 10. Application Android

- **Expo** (dernière SDK stable), Expo Router.
- `expo-location`, `expo-linking`, `expo-image`, `expo-secure-store`,
  `expo-sqlite`.
- **EAS Build** pour l'AAB, **EAS Update** pour les correctifs OTA.
- Signature Play App Signing.
- Budget : APK < 30 Mo, démarrage à froid < 3 s, Android 8+.
- Carte chargée à la demande, jamais dans le bundle initial.
- Bandeau web mobile « Ouvrir dans l'application » (lien Play Store).

## 11. Import OpenStreetMap

```
Cron (hebdomadaire)
  └─ crée un job par région
       └─ Queue : un message par région
            └─ Consumer :
                 1. Overpass (User-Agent identifiable, 1 req/s)
                 2. normalisation (nom, catégorie, téléphone, coordonnées)
                 3. upsert par (osm_id, osm_type)
                 4. mise à jour FTS (triggers)
                 5. statut du job + compteurs
```

- Attribution ODbL conservée sur chaque ligne.
- Idempotence garantie par l'index unique `(osm_id, osm_type)`.
- Aucun appel Overpass depuis une requête utilisateur.
- Un import national ne bloque jamais la recherche.

## 12. Sécurité

| Menace | Contre-mesure |
| --- | --- |
| Élévation de privilège | Autorisation en couche service, refus par défaut |
| Spam de propositions | Turnstile + rate limiting + quota par IP |
| Injection SQL | Drizzle + requêtes paramétrées uniquement |
| Injection de filtre | Jamais de concaténation dans un `LIKE`/`MATCH` |
| Téléversement malveillant | Type MIME, taille, chemin contrôlés serveur |
| Fuite de secrets | `wrangler secret`, jamais dans le bundle |
| Falsification du journal | Écriture uniquement via le service, pas d'endpoint public |
| XSS | Échappement par défaut, CSP stricte, pas de `dangerouslySetInnerHTML` |
| CSRF | Cookies `SameSite=Lax` + vérification d'origine |
| Abus de scraping | Rate limiting + cache |

**En-têtes HTTP** : `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` minimal.

## 13. Observabilité

- **Sentry** : erreurs web, mobile, Worker.
- **Workers Analytics Engine** : latence, erreurs, volume par procédure.
- **Logs structurés** JSON avec identifiant de requête.
- Tableaux de bord : recherches sans résultat, taux d'erreur, p95 API.
- Alertes : pic d'erreurs, chute du taux de succès de recherche, échec d'import.

## 14. CI/CD

Un seul dépôt, une seule branche (`main`). Aucune pull request, aucune branche
de fonctionnalité.

### Pipeline web — à chaque push sur `main`
```
push main
  ├─ pnpm install --frozen-lockfile
  ├─ lint
  ├─ typecheck
  ├─ vitest
  ├─ build
  ├─ deploy staging (si tout est vert)
  └─ deploy production (déclenchement manuel depuis main)
```

### Pipeline mobile — déclenchement manuel depuis `main`
```
workflow_dispatch
  ├─ lint + typecheck + tests
  ├─ eas build --platform android --profile production
  └─ eas submit --platform android
```

### Qualité sans branches
- Le pipeline s'exécute à chaque push ; un commit rouge est corrigé
  immédiatement par un commit suivant.
- Aucun déploiement en production si lint, typecheck ou tests échouent.
- Chaque commit est atomique et accompagné d'un message explicite.
- Couverture minimale : 70 % sur `packages/domain` et `packages/api`.

### Retour arrière
- Code : `git revert <sha>` puis redéploiement.
- Base : migrations additives uniquement ; une correction est une nouvelle
  migration, jamais une modification.
- Application : `eas update --rollback` ou redéploiement du commit précédent.

## 15. Tests

| Niveau | Outil | Périmètre |
| --- | --- | --- |
| Unitaire | Vitest | Domaine, normalisation, scoring, permissions |
| Intégration | Vitest + Miniflare | Procédures tRPC sur D1 locale |
| Web E2E | Playwright | Recherche, fiche, proposition, admin |
| Mobile E2E | Maestro | Recherche, fiche, appel, hors-ligne |
| Charge | k6 | Recherche à 50 req/s |

## 16. Environnements et secrets

| Environnement | Base | Usage |
| --- | --- | --- |
| `local` | D1 locale (Miniflare) | Développement |
| `staging` | D1 de préversion | Chaque push sur `main` |
| `production` | D1 de production | Public |

**Secrets** : `BETTER_AUTH_SECRET`, `TURNSTILE_SECRET_KEY`, `SENTRY_DSN`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `GEONAMES_USERNAME`.
Injectés par `wrangler secret put` et par les secrets EAS. **Jamais dans Git.**

## 17. Migration depuis v1

1. La v1 reste dans l'historique Git de `main` : aucun tag, aucune branche.
2. Supprimer toute dépendance et tout artefact Lovable (`@lovable.dev/*`,
   `lovable-tagger`, `lovable-error-reporting`, `previewAuthStorage`,
   `.lovable/`, `LOVABLE_CRON_SECRET`).
3. Les 1 546 lieux de Niamey sont déjà extraits dans
   `seed/niamey-2026-08-30.json`.
4. Tenter un export runtime de l'ancienne base (comptes, photos, propositions)
   **avant** toute coupure définitive.
5. Importer le seed dans D1 via `infra/scripts/seed.ts`.
6. Vérifier : comptage, coordonnées, catégories, FTS.
7. Aucune donnée de modération n'est reprise : le nouvel historique démarre à
   zéro, avec les lieux OSM marqués `valide` et `source_fiable`.

## 18. Limites à valider avant production

- Taille maximale d'une base D1 et stratégie d'archivage.
- Nombre maximal de paramètres liés par requête (impact sur les imports par
  lots).
- Temps CPU maximal par requête Worker (impact sur l'import Overpass).
- Disponibilité des fonctions FTS5 et du tokenizer `unicode61` sur D1.
- Comportement de `wrangler d1 migrations apply` en préversion.
- Coût R2 pour les photos à l'échelle prévue.
- Comportement de FTS5 sur l'arabe (tokenizer, normalisation des harakat).

Ces points font l'objet de tests explicites au sprint 0, avant tout
développement fonctionnel.

## 19. Internationalisation et RTL

### 19.1 Catalogues

- `packages/i18n/locales/{fr,en,ar}.json`.
- Clés typées, aucune chaîne en dur dans les composants.
- Test CI : mêmes clés dans les trois fichiers, aucune clé manquante.
- Repli : `ar → en → fr`, `en → fr`.

### 19.2 Détection et routage

- Web : `/fr/...`, `/en/...`, `/ar/...`. Redirection depuis `/` selon
  `Accept-Language`, choix mémorisé dans un cookie.
- Mobile : `expo-localization` + réglage in-app persistant.
- `lang` et `dir` sur `<html>`.
- `hreflang` réciproques sur chaque page.

### 19.3 RTL

- CSS logiques uniquement (`margin-inline-start`, `padding-inline-end`,
  `inset-inline-start`, `text-align: start`).
- Tailwind : `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, variantes
  `rtl:`.
- Icônes directionnelles (flèches, chevrons) inversées en RTL.
- Cartes, coordonnées et numéros de téléphone restent en LTR (`dir="ltr"`
  local).
- Mobile : styles logiques React Native, `I18nManager` avec redémarrage
  contrôlé lors du changement de langue.

### 19.4 Typographie

- Latin : police système ou Inter.
- Arabe : Noto Naskh Arabic ou IBM Plex Sans Arabic, sous-ensemble limité pour
  tenir le budget de poids.
- Chargement conditionnel par locale : jamais les trois polices au démarrage.

### 19.5 Données traduisibles

- `category_translations(category_id, langue, nom)`.
- `place_aliases(..., langue)` pour les noms alternatifs.
- `places.langue` indique la langue d'origine de la description.
- Les noms de lieux ne sont pas traduits automatiquement.

### 19.6 Recherche multilingue

- Normalisation avant indexation et avant requête :
  - latin : minuscules + suppression des accents ;
  - arabe : suppression des harakat, unification alef (`أ إ آ ا`), ya
    (`ي ى`) et ta marbuta (`ة ه`).
- FTS5 `unicode61 remove_diacritics 2` pour le latin.
- Pour l'arabe, vérifier au sprint 0 le comportement du tokenizer ; à défaut,
  indexer une colonne `recherche_normalisee` et faire le `MATCH` dessus, ou
  utiliser le tokenizer `trigram`.
- Les alias sont indexés avec leur langue.

### 19.7 Formats

- `Intl.NumberFormat` et `Intl.DateTimeFormat` par locale.
- Numérotation `latn` forcée pour téléphones, distances et coordonnées.
- Devise FCFA (XOF) formatée selon la locale.

### 19.8 Tests

- Captures d'écran de référence en `ar` (RTL) sur les 5 écrans critiques.
- Test de non-débordement : aucun scroll horizontal.
- Test de complétude des catalogues en CI.
- Relecture par un locuteur natif arabe avant mise en production.

### 19.9 Charge de traduction

- Interface : environ 250 clés.
- Catégories : 9 à 12 libellés.
- Pages légales : 3 documents.
- Prévoir un traducteur ou une relecture native pour l'arabe. La traduction
  machine seule n'est pas acceptée pour les pages légales.
