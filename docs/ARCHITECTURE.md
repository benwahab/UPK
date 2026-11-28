# Architecture technique — UPK v2

|               |                              |
| ------------- | ---------------------------- |
| **Version**   | 1.0                          |
| **Statut**    | À valider                    |
| **Référence** | `docs/CAHIER_DES_CHARGES.md` |
| **Exécution** | `docs/PLAN_DE_TRAVAIL.md`    |

---

## 1. Vue d'ensemble

```
┌──────────────────────┐        ┌──────────────────────┐
│  Web desktop (PWA)   │        │  Mobile (PWA)         │
│  TanStack Start SSR  │        │  Android / Chrome     │
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
│   ├── web/                  TanStack Start (React 19), SSR, PWA desktop + mobile
│   └── mobile/               Expo (v1.1, si besoin natif)
├── packages/
│   ├── domain/               Types, schémas Zod, règles métier pures
│   ├── api/                  Routeur tRPC + procédures
│   ├── db/                   Schéma Drizzle, migrations, repositories
│   ├── i18n/                 Catalogues fr/en/ar, formatage, RTL
│   └── ui/                   Design tokens (web + native)
├── eslint.config.js          ESLint partagé
├── tsconfig.base.json        TypeScript partagé
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
_Réversible :_ la couche `db` isole Drizzle ; un passage à Hyperdrive + Postgres
ne toucherait que `packages/db`.

### ADR-003 — tRPC plutôt que server functions

Le mobile ne peut pas consommer les server functions de TanStack Start. tRPC
donne un contrat unique, typé, utilisable par les deux clients avec TanStack
Query.

### ADR-004 — Better Auth

Sessions, vérification d'e-mail, réinitialisation, adaptateur D1, client Expo
avec stockage sécurisé. Évite de réécrire une authentification maison.

### ADR-005 — R2 privé + proxy Worker

Bucket privé. Le Worker vérifie le jeton de soumission, le type MIME et la
taille, puis écrit l'objet. La lecture passe par `/api/photos/{key}` avec un
cache immuable. Les URLs signées restent une option si la livraison directe
devient nécessaire.

### ADR-006 — Recherche : FTS5 + boîte englobante + distance en TS

1. `MATCH` FTS5 (tokenizer `unicode61 remove_diacritics 2`) ;
2. préfiltre `latitude BETWEEN … AND longitude BETWEEN …` ;
3. calcul Haversine en TypeScript sur les candidats ;
4. si position connue : tri distance croissante ; sinon pertinence puis distance.
   Évite de dépendre de fonctions mathématiques SQL dont la disponibilité sur D1
   doit être vérifiée.

### ADR-007 — Autorisation dans la couche service

D1 n'a pas de RLS. Chaque procédure passe par un wrapper qui exige une session
et une permission. **Refus par défaut.** Toute requête de repository est
contrainte par l'identité de l'appelant.

### ADR-008 — PWA installable desktop et mobile, app native différée

La v1.0 sort en PWA installable sur desktop et mobile. Le Play Store n'est pas
requis au lancement : il ajoute une review, un test fermé de 14 jours et une
seconde chaîne de distribution pour un besoin non démontré. Si une présence
Play Store devient nécessaire, un **TWA** (Trusted Web Activity) emballe la
même PWA dans un APK de 1–2 Mo, sans réécrire l'application. Expo/React Native
est différé à la v1.1, uniquement si un besoin natif réel apparaît (SQLite
50 fiches, push, background sync).

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

### ADR-012 — Assistant vocal côté navigateur, sans service cloud

La reconnaissance et la synthèse utilisent les API du navigateur. Aucun
enregistrement audio n'est envoyé à UPK et aucun fournisseur vocal n'est
ajouté. Le parseur d'intentions est pur et testé dans `packages/domain` ; les
messages sont dans `packages/i18n` ; l'interface est un composant client monté
dans le layout localisé. La langue de l'assistant est indépendante de la
langue de l'URL : le français, l'anglais et l'arabe sont pris en charge, le
haoussa et le zarma sont proposés en mode expérimental selon les voix
installées sur l'appareil. En cas d'indisponibilité, la saisie écrite reste
toujours accessible. Voir [`ASSISTANT.md`](./ASSISTANT.md).

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
7. si lat/lng : trier distance ASC puis nom ; sinon score texte DESC, distance ASC
8. paginer par curseur opaque (score, distance, id)
```

**Pourquoi la distance en TypeScript :** évite toute dépendance à des fonctions
mathématiques SQL dont la disponibilité sur D1 doit être vérifiée, et reste
négligeable sur 200 lignes.

Sans `q`, catégorie ni position, l'accueil ne lance aucune requête : il affiche
une aide et le formulaire. Le bouton « Autour de moi » ajoute `lat`/`lng` à
l'URL et déclenche le tri par distance. La recherche vocale est une amélioration
progressive via la Web Speech API (`fr-FR`, `en-US`, `ar-SA`, `ha-NG`, `dje`) ;
le bouton est masqué si le navigateur ne la supporte pas, et le texte reconnu
remplit la requête. Un second bouton ouvre l'assistant conversationnel, qui
comprend catégorie, quartier, ville, nom et questions complémentaires, puis
transmet la demande au même moteur. Les corrections sont proposées, jamais
substituées sans confirmation. Le message de lieu introuvable renvoie vers le
formulaire de contribution existant. Détail : [`ASSISTANT.md`](./ASSISTANT.md).

### 4.5 Migrations

- `packages/db/migrations/*.sql`, numérotées, immuables.
- Appliquées par `wrangler d1 migrations apply`, jamais à la main.
- Une migration appliquée ne se modifie plus : on en crée une nouvelle.
- Test de migration sur base vide **et** sur copie de production anonymisée.

## 5. API

### 5.1 Structure d'une procédure

```ts
export const approvePlace = procedure("admin.moderation.approve")
  .input(approvePlaceInput) // Zod, packages/domain
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

**Implémentation S0/S1.** Handler `/api/trpc/$` (`fetchRequestHandler`),
contexte `createTrpcContext` (session Better Auth + repositories D1), client
vanilla `@trpc/client` + React Query. La recherche et la fiche sont aussi
rendues côté serveur via `createServerFn` (`apps/web/src/server/places.ts`).

## 6. Authentification

- **Better Auth** sur D1.
- Web : cookie `HttpOnly`, `Secure`, `SameSite=Lax`, durée 30 jours.
- Mobile : jeton de session dans `expo-secure-store`.
- Vérification d'e-mail obligatoire pour les comptes professionnels.
- Réinitialisation par lien à usage unique, valable 1 heure.
- Verrouillage progressif après échecs répétés.
- Aucune session pour un visiteur anonyme.

**Implémentation S0.** Route `/api/auth/$` (GET/POST) dans
`apps/web/src/routes/api/auth/$.ts` ; instance `apps/web/src/lib/auth.server.ts`
(cache par isolate) ; tables `user`, `session`, `account`, `verification`
(migration `0002_auth.sql`) ; secret `BETTER_AUTH_SECRET`. Inscription et
`get-session` vérifiés en local (workerd) et en production initiale.

**Administration.** Les adresses listées dans `ADMIN_EMAILS` reçoivent la
permission `moderation:write` ; `moderation.me` expose `isAdmin` à l'interface.
Le rôle est dérivé de l'e-mail vérifié, jamais d'un champ modifiable par le
client.

## 6 bis. Contribution et modération (S2)

**Schéma.** Migration `0003_contribution_moderation.sql` : `contributions`,
`signalements`, `journal_admin`, `rate_limits`. Une proposition crée un lieu
avec `statut_publication='en_attente'` et `statut_verification='a_verifier'` ;
elle n'apparaît dans la recherche qu'après passage à `valide`.

**Flux.**

1. `contributions.create` (public) : rate limit 5/h/IP, Turnstile, validation
   Zod (coordonnées du Sahel), insertion puis audit `contribution.create`.
2. `moderation.pending` (admin) liste les propositions ; `approve` passe le
   lieu à `valide` + `verifie` et renseigne `modere_par` / `modere_le`. Une
   précision GPS supérieure à 20 m exige `forceGps: true`.
3. `reject` exige un motif de 5 à 500 caractères et conserve `motif_refus`.
4. `reports.create` (public) : rate limit 10/h/IP + Turnstile, crée un
   signalement ; `moderation.reports` et `resolveReport` le traitent.

**Audit.** Chaque mutation écrit `journal_admin` (acteur, rôle, action, cible,
résultat, avant/après). Aucune route publique ne permet de le modifier.

**Rate limiting.** Table D1 `rate_limits` (scope + hash d'IP salé, fenêtre
d'une heure). Le sel vient de `RATE_LIMIT_SALT`.

**Anti-abus.** Turnstile : clé de test sur la production initiale, clé réelle à
installer avant l'ouverture publique. Le secret reste
côté Worker ; sans secret, les écritures sont refusées. En local,
`TURNSTILE_SECRET_KEY` peut utiliser la clé de test Cloudflare.

**Photos.** L'upload R2 est actif. `POST /api/uploads` vérifie le jeton de
soumission, limite à 10 envois par heure et par fiche, contrôle le type MIME
(JPEG/PNG/WebP) et la taille (5 Mo), puis écrit dans le bucket privé.
`GET /api/photos/{key}` sert l'objet avec un cache immuable.

## 7. Stockage des photos

- Bucket R2 **privé**.
- Chemin : `places/{placeId}/{uuid}.{ext}`.
- Téléversement : `POST /api/uploads?placeId=…&token=…` en multipart. Le Worker
  vérifie le jeton de soumission, la limite de débit, le type MIME et la taille
  (< 5 Mo), puis écrit l'objet et la ligne `place_photos`.
- Lecture : `GET /api/photos/{key}`, cache `public, max-age=31536000, immutable`.
  La fiche d'un lieu publié affiche ses photos dans une galerie.
- Types acceptés : `image/jpeg`, `image/png`, `image/webp`.
- Trois photos maximum par proposition ; redimensionnement à la demande
  (Cloudflare Images ou Worker) pour les vignettes.

**État au 2026-11-26.** R2 est actif sur le compte Cloudflare. Les bindings
`PHOTOS` sont déclarés dans `infra/wrangler.toml` ; le bucket
`upk-photos` est privé. Un upload réel et une lecture `/api/photos/...` ont été
vérifiés sur la production initiale.

## 8. Hors-ligne

### Web

- App-shell précaché par le service worker (`apps/web/public/sw.js`).
- 50 dernières navigations en cache, page `/offline` en repli.
- Page de repli hors-ligne.

### Mobile

- Dernières 50 fiches + favoris en SQLite local (`expo-sqlite`).
- Images en cache disque (`expo-image`).
- Bandeau « hors-ligne » et date de dernière synchronisation.

## 9. PWA installable (desktop et mobile)

- `manifest.webmanifest` : `display: standalone`, `start_url: "/"`,
  `theme_color`, icônes 192/512 + maskable, captures desktop et mobile.
- Service worker actuel : `apps/web/public/sw.js` (assets en cache-first,
  navigation en network-first, page hors-ligne, 50 dernières navigations en
  cache, `storage.persist`) ; migration VitePWA/Workbox possible sans changer
  l'interface.
- Enregistrement explicite au démarrage, en production uniquement.
- Flux de mise à jour : détection d'une nouvelle version → bandeau → activation
  au clic (`SKIP_WAITING`).
- `beforeinstallprompt` capturé sur desktop et mobile ; bouton d'installation
  affiché quand le navigateur le propose, avec une cible tactile de 44 px.
- Carte : composant Leaflet chargé à la demande (`lazy` +
  `createClientOnlyFn`), tuiles OSM avec attribution.
- Android : installation WebAPK, mode standalone, icône dans le tiroir
  d'applications.
- Recherche et fiche utilisables **sans JavaScript** (SSR + formulaire) pour
  Opera Mini et les réseaux lents.
- CSS critique inliné dans le document pour supprimer la requête bloquante ;
  Lighthouse mobile 100/100/100/100, LCP 0,8 s.

## 10. Application Android (différée v1.1)

- **v1.0** : pas d'app native ; la PWA mobile couvre le besoin.
- **v1.1, si besoin Play Store** : **TWA** (Bubblewrap) autour de la PWA,
  APK de 1–2 Mo, `assetlinks.json`, review Play Store.
- **Expo/React Native** seulement si un besoin natif réel est prouvé :
  `expo-sqlite` pour 50 fiches hors-ligne, push, background sync.
- Si Expo : EAS Build, EAS Update, Play App Signing, APK < 30 Mo, Android 8+,
  démarrage à froid < 3 s.
- Carte chargée à la demande, jamais dans le bundle initial.

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

| Menace                    | Contre-mesure                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Élévation de privilège    | Autorisation en couche service, refus par défaut                                               |
| Spam de propositions      | Turnstile + rate limiting + quota par IP                                                       |
| Injection SQL             | Drizzle + requêtes paramétrées uniquement                                                      |
| Injection de filtre       | Jamais de concaténation dans un `LIKE`/`MATCH`                                                 |
| Téléversement malveillant | Type MIME, taille, chemin contrôlés serveur                                                    |
| Fuite de secrets          | `wrangler secret`, jamais dans le bundle                                                       |
| Falsification du journal  | Écriture uniquement via le service, pas d'endpoint public                                      |
| XSS                       | Échappement par défaut, CSP stricte ; `dangerouslySetInnerHTML` réservé au CSS statique inliné |
| CSRF                      | Cookies `SameSite=Lax` + vérification d'origine                                                |
| Abus de scraping          | Rate limiting + cache                                                                          |

**En-têtes HTTP** : ajoutés par `apps/web/src/start.ts` —
`Content-Security-Policy` (Turnstile et tuiles OSM autorisés),
`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` minimal et `Cross-Origin-Opener-Policy: same-origin`.

## 13. Observabilité

- **Workers Logs** : activés par `[observability]` (production).
- **Sentry** : prévu, DSN non encore configuré.
- **Workers Analytics Engine** : prévu pour latence, erreurs et volume.
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
  ├─ e2e Playwright
  └─ CI verte → workflow « Deploy production » → wrangler deploy
```

### Pipeline mobile (v1.1) — déclenchement manuel depuis `main`

En v1.0, la PWA mobile est livrée par le pipeline web : il n'y a pas de build
mobile séparé.

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

| Niveau              | Outil                   | Périmètre                                                    |
| ------------------- | ----------------------- | ------------------------------------------------------------ |
| Unitaire            | Vitest                  | Domaine, normalisation, scoring, permissions                 |
| Intégration         | Vitest + better-sqlite3 | Repositories D1 sur les migrations réelles (`0001_init.sql`) |
| D1 réelle           | Wrangler / API D1       | FTS5, latence SQL, seed                                      |
| Web E2E             | Playwright              | Recherche, fiche, proposition, admin                         |
| PWA mobile          | Playwright + Lighthouse | Installation, hors-ligne, budgets 2 Go / 3G                  |
| Mobile natif (v1.1) | Maestro                 | Recherche, fiche, appel, hors-ligne                          |
| Charge              | k6                      | Recherche à 50 req/s                                         |

## 16. Environnements et secrets

| Environnement | Base                                                    | Usage                                                                                        |
| ------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `local`       | D1 locale `upk` (Miniflare, `apps/web/.wrangler/state`) | Développement                                                                                |
| `production`  | D1 `upk`                                                | `https://upk.benwahab111.workers.dev` (production initiale ; domaine personnalisé à définir) |

Un seul environnement distant existe. L'ancien staging a été retiré : ne pas
recréer `upk-staging`, `upk-photos-staging`, ni utiliser `CLOUDFLARE_ENV=staging`
ou `wrangler deploy --env staging`.

**Secrets** : `BETTER_AUTH_SECRET`, `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_SALT`,
`SENTRY_DSN`, `GEONAMES_USERNAME`. R2 passe par le binding `PHOTOS`, sans clé
S3. Injectés par `wrangler secret put` et par les secrets EAS. **Jamais dans
Git.**

## 17. Migration depuis v1

1. La v1 reste dans l'historique Git de `main` : aucun tag, aucune branche.
2. Supprimer toute dépendance et tout artefact Lovable (`@lovable.dev/*`,
   `lovable-tagger`, `lovable-error-reporting`, `previewAuthStorage`,
   `.lovable/`, `LOVABLE_CRON_SECRET`).
3. Le catalogue courant couvre le Sahel : 41 592 lieux (41 558 OSM + 26
   Overture + 8 contributions), 1 197 villes,
   3 340 quartiers et 16 catégories (`seed/osm-sahel-2026-11-27.json`,
   `seed/geonames-sahel-2026-11-27.json`). Le snapshot historique de Niamey
   reste `seed/niamey-2026-08-30.json`.
4. Tenter un export runtime de l'ancienne base (comptes, photos, propositions)
   **avant** toute coupure définitive.
5. Importer le seed dans D1 via `infra/scripts/seed.ts`.
6. Vérifier : comptage, coordonnées, catégories, FTS.
7. Aucune donnée de modération n'est reprise : le nouvel historique démarre à
   zéro, avec les lieux OSM marqués `valide` et `source_fiable`.

## 18. Limites à valider avant production

- Taille maximale d'une base D1 et stratégie d'archivage. **Mesuré : 41 592
  lieux + index FTS ≈ 35 Mo, compatible avec les limites D1.**
- Nombre maximal de paramètres liés par requête (impact sur les imports par
  lots).
- Temps CPU maximal par requête Worker (impact sur l'import Overpass).
- Disponibilité des fonctions FTS5 et du tokenizer `unicode61` sur D1.
  **Vérifié : disponible, y compris `bm25`.**
- Comportement de `wrangler d1 migrations apply` en préversion.
  **Vérifié : OK sur `upk`.**
- Coût R2 pour les photos à l'échelle prévue.
- Comportement de FTS5 sur l'arabe (tokenizer, normalisation des harakat).
  **Vérifié : « صيدلية » retrouve « صيدلية النور » après normalisation.**
- Installation WebAPK sur Android (Chrome, Samsung Internet) et comportement
  de la recherche sans JavaScript.

**Mesures du POC (SQLite local, 1 546 lieux, `MATCH` + filtres, `LIMIT 200`,
pilote Python inclus) :** p50 ≈ 22 ms, p95 ≈ 25 ms sur « pharmacie »,
« ecole » et « banque » ; p95 ≈ 50 ms sur la phrase « station service ».
Ces chiffres mesurent le harnais Node/better-sqlite3, pas D1.

**Mesures sur D1 réelle** (base `upk`, 1 546 lieux, 20 requêtes par terme,
API D1, `MATCH` + `bm25` + filtres, `LIMIT 20`) :

| Terme           | SQL p50 | SQL p95 |
| --------------- | ------- | ------- |
| pharmacie       | 0,79 ms | 4,90 ms |
| ecole           | 0,96 ms | 3,15 ms |
| station service | 0,76 ms | 1,37 ms |
| banque          | 0,65 ms | 0,90 ms |

**Mesures bout-en-bout** (Worker `upk`, 30 requêtes par terme, D1
distante incluse, repository + scoring) :

| Terme           | p50      | p95      |
| --------------- | -------- | -------- |
| pharmacie       | 16–21 ms | 24–48 ms |
| ecole           | 19–20 ms | 23–28 ms |
| station service | 19–20 ms | 23–27 ms |
| banque          | 19–21 ms | 24–31 ms |

Le budget de 400 ms est largement tenu. FTS5, `bm25` et
`unicode61 remove_diacritics 2` fonctionnent sur D1 ; la recherche arabe
normalisée (« صيدلية » → « صيدليه ») est validée par test et sur la base
distante.

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
- Canoniques, sitemap multilingue et JSON-LD `LocalBusiness` générés côté
  serveur ; `SITE_URL` fige les URLs absolues au build.

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
- **Validé en S0** : `unicode61` ne suffit pas pour l'arabe (ni les harakat,
  ni les variantes de alef/ya/ta marbuta ne sont unifiées). On indexe donc
  `places.nom_normalise` dans `places_fts` et on normalise la requête avant
  le `MATCH`. Vérifié sur SQLite/D1 : « صيدليه » retrouve « صيدلية النور ».
- Les alias sont indexés avec leur langue, via `place_aliases.alias_normalise`.

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
