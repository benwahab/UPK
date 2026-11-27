# UPK — Conventions du dépôt

## Règles de travail

- **Un seul dépôt, une seule branche : `main`.** Jamais de branche, jamais de
  tag, jamais de pull request.
- Jamais de `push --force`, de rebase ou d'amendement d'un commit poussé.
- Commits atomiques, message explicite, pipeline vert avant tout déploiement.
- Retour arrière par `git revert`, jamais par reset.
- Aucune dépendance ni artefact Lovable, aucune dépendance Supabase.

## Stack (v2)

- Web : TanStack Start (SSR, PWA installable desktop + mobile) sur Cloudflare Workers.
- Mobile : PWA mobile en v1.0 ; Expo ou TWA en v1.1 si besoin Play Store.
- API : tRPC sur Workers.
- Données : D1 (SQLite) + Drizzle. Fichiers : R2.
- Auth : Better Auth. Anti-abus : Turnstile + rate limiting.
- Langues : français, anglais, arabe (RTL).

## Structure

```
apps/web        TanStack Start (SSR, PWA desktop + mobile)
apps/mobile     Expo (v1.1, si besoin natif)
packages/domain types, Zod, normalisation, distance, scoring
packages/db     schéma Drizzle, migrations SQL, client D1
packages/api    routeur tRPC, contexte, permissions
packages/i18n   catalogues fr/en/ar, formatage, RTL
packages/ui     tokens de design (TS + CSS)
infra/          wrangler.toml, script de seed
seed/           données OpenStreetMap (ODbL)
docs/           cahier des charges, architecture, plan
```

## Commandes

```
pnpm install
pnpm dev          # turbo run dev
pnpm typecheck    # turbo run typecheck
pnpm test         # turbo run test
pnpm build        # turbo run build
pnpm lint         # eslint .
pnpm seed:sql > /tmp/seed.sql

# D1 locale (même état que wrangler dev)
pnpm -C apps/web exec wrangler d1 migrations apply upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state -y
pnpm -C apps/web exec wrangler d1 execute upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state \
  --file=/tmp/seed.sql


## Décisions structurantes

- **ADR-008** : PWA installable desktop et mobile pour la v1.0 ; Play Store
  différé en v1.1 (TWA en priorité, Expo seulement si besoin natif prouvé).
- Le dépôt reste sur une seule branche `main`, sans tag ni pull request.

## État au 2026-11-21 (assistant vocal et recherche intelligente)

- Assistant monté dans `apps/web/src/routes/$locale.tsx` ; panneau accessible
  sur toutes les pages, champ écrit toujours disponible.
- Accueil vocal une fois par ouverture (`greetedThisOpen`), heure locale via
  `Intl.DateTimeFormat` : Bonjour 05:00–13:59, Bonsoir sinon. Désactivation
  persistée dans `localStorage` (`upk-assistant-greeting`).
- Langues : `fr`, `en`, `ar` ; `ha` (`ha-NG`) et `za` (`dje`) expérimentaux.
  La voix dépend des API et voix système du navigateur ; ne pas promettre une
  qualité acoustique non testée sur appareil réel.
- `packages/domain/src/assistant.ts` : parseur pur (salutation, catégorie,
  proximité, nom, question complémentaire), alias fr/en/ar/ha/za, période de
  salutation et fuseau.
- `packages/i18n/src/assistant.ts` : messages des cinq langues, dont les
  messages exacts de lieu introuvable et d'incompréhension.
- Recherche : alias de catégories multilingues, repli flou même quand FTS
  renvoie des résultats, correction proposée (jamais substituée), quartiers et
  villes fautifs. Le nom exact reste prioritaire.
- Aucun résultat : message exact + lien vers `/$locale/contribuer`. Aucun
  nouveau circuit de contribution.
- Tests : 28 domaine, 10 i18n, 33 API, 19 E2E mobile (1 PWA ignoré sans
  `E2E_BASE_URL`), 6 typechecks, lint vert. Les tests vocaux simulent les API
  navigateur ; un test micro réel reste à faire sur Android 2 Go / 3G.
- Build client : 853 306 octets, +87 972 octets par rapport à la référence
  (765 334) ; chunk assistant ~15,9 ko (5,2 ko gzip). Voir
  `docs/ASSISTANT.md`.
- Production : version `e75ad0a2` déployée sur
  `https://upk.benwahab111.workers.dev` ; 9 parcours E2E assistant validés
  contre la production.

## État au 2026-11-27 (S3, catalogue Sahel)

- Migration `0004_sahel_geo.sql` appliquée en production : pays, coordonnées
  administratives, quartiers, provenance OSM.
- Catalogue : **41 566 lieux** (NE 6 986, ML 22 610, BF 11 962),
  **32 régions**, **162 départements**, **157 communes**, **1 197 villes**,
  **3 340 quartiers**, **16 catégories** avec traductions fr/en/ar.
- Données : 1 244 téléphones, 1 716 adresses, 384 sites web ; 21 785 lieux
  rattachés à un quartier. Aucune donnée inventée : les champs absents restent
  NULL et la provenance est conservée (`source_url`, `osm_tags`).
- Recherche : détection d'intention (quartier, ville, catégorie, nom exact),
  filtrage géographique avant tri, nom exact prioritaire, repli tolérant aux
  fautes, avertissement « aucun nom exact ».
- GPS : `maximumAge: 0` et haute précision ; une recherche ou un changement de
  catégorie rafraîchit la position au lieu de réutiliser une position périmée.
- Sitemap : une URL par fiche avec alternates `hreflang` (41 569 URLs, sous la
  limite de 50 000).
- Seeds : `seed/osm-sahel-2026-11-27.json`,
  `seed/geonames-sahel-2026-11-27.json`,
  `seed/categories-2026-11-27.json` ; import via
  `infra/scripts/import-sahel.py`.
- Sécurité : middleware CSRF TanStack pour les server functions, en-têtes CSP/HSTS.
- Production : version `8e322315` au 27/11/2026. Compte admin `admin@upk.test`
  créé ; mot de passe local ignoré dans `UPK_PROD_ADMIN_PASSWORD` (à faire
  tourner avant ouverture publique). `ADMIN_EMAILS` contient cet e-mail.

## État au 2026-11-22 (S0–S2)

- Monorepo pnpm 12 + Turborepo ; 6 projets ; lint, typecheck et 48 tests verts.
- `packages/domain` (13 tests), `packages/i18n` (5), `packages/api` (24).
- D1 `upk` et `upk-staging` migrées et seedées : 1 546 lieux, 9 catégories.
- Better Auth : route `/api/auth/$`, inscription + `get-session` vérifiées en
  local (workerd) et sur staging.
- Repositories D1 : FTS5, filtres, distance, catégories ; tests sur les
  migrations réelles (`0001_init.sql`).
- POC D1 réelle : SQL p95 ≤ 4,9 ms ; bout-en-bout p95 ≤ 48 ms.
- S1 (première tranche) : `/api/trpc`, recherche SSR (1 546 lieux), filtre
  catégorie, routes `/fr` `/en` `/ar` avec RTL, fiche `/$locale/places/$id`,
  SEO (`hreflang`, sitemap, robots, JSON-LD, Open Graph), carte Leaflet à la
  demande (tuiles OSM) ; Lighthouse desktop/mobile 100/100/100/100.
- S2 (PWA) : manifest, icônes, service worker (assets cache-first, navigation
  network-first, page hors-ligne, 50 pages), stockage persistant, bandeau de
  mise à jour, installation desktop et mobile via `beforeinstallprompt`.
- S2 (contribution) : formulaire + Turnstile + GPS, signalements, file de
  modération, rejet motivé, journal d'audit, rate limiting, pages légales et
  titres de page. Upload R2 actif (bucket privé, proxy Worker) : photos
  optionnelles (3 max, 5 Mo), stockées dans R2, visibles en modération puis
  publiées sur la fiche après validation.
- S2 (accueil) : accueil sans liste initiale ; géolocalisation via bouton
  « Autour de moi » ; tri par distance croissante quand `lat`/`lng` sont
  fournis ; localisation automatique si la permission est déjà accordée ;
  recherche vocale Web Speech API selon `fr-FR`/`en-US`/`ar-SA`.
- Qualité : 11 parcours E2E Playwright, exécutés en desktop et Pixel 5
  (21 exécutions vertes sur staging) : accueil vide, recherche, catégorie,
  proximité, vocal simulé, absence de JavaScript, photos proposées,
  confidentialité, bandeau d'installation et cache du service worker.
  `pnpm e2e:prepare` prépare la D1 locale ; le test PWA nécessite
  `E2E_BASE_URL`.
- Staging : `https://upk-staging.benwahab111.workers.dev`, migration `0003`
  appliquée, version `dd213a9d`, compte `admin@upk.test`. Lighthouse mobile
  100/100/100/100, LCP 0,8 s (simulation 3G/2 Go). R2 actif : buckets
  `upk-photos` (production) et `upk-photos-staging`.
- Production : `https://upk.benwahab111.workers.dev`, migration `0003`
  appliquée, version `f76c19c5`. Secrets Worker `BETTER_AUTH_SECRET`,
  `ADMIN_EMAILS`, `RATE_LIMIT_SALT` et `TURNSTILE_SECRET_KEY` définis hors Git.
  R2 `upk-photos` et auth vérifiés. En-têtes de sécurité (CSP, HSTS, nosniff,
  frame-ancestors) servis par `apps/web/src/start.ts` ; Workers Logs activés.
  Sauvegardes D1 dans `upk-backups` (préfixe `d1/`, rétention 90 jours).
  Turnstile utilise encore la clé de test : la remplacer avant l'ouverture
  publique.
- Reste : Turnstile réel, domaine personnalisé et Sentry avant ouverture
  publique ; automatiser `pnpm backup:d1` ; fin du durcissement PWA mobile
  (T3.2, T3.4, T3.7/T3.8). Expo/TWA reste différé en v1.1 (ADR-008) ;
  `apps/mobile` est un emplacement réservé.

### Pièges vérifiés

- Le secret Cloudflare est enregistré sous `CLOUDFARE_API_TOKEN` (coquille) ;
  Wrangler attend `CLOUDFLARE_API_TOKEN`. Faire
  `export CLOUDFLARE_API_TOKEN="$CLOUDFARE_API_TOKEN"` avant toute commande
  distante.
- `pnpm dev` lit `apps/web/.dev.vars` ; `wrangler dev --config
infra/wrangler.toml` lit `infra/.dev.vars`. Garder les deux identiques.
- Modération : `ADMIN_EMAILS` doit contenir l'e-mail exact du compte ;
  `moderation.me` renvoie `isAdmin`. En production c'est un secret Worker
  (`wrangler secret put`), pas une variable de `wrangler.toml`. `approve` passe le lieu à `valide` +
  `verifie` ; sans cela il reste invisible en recherche.
- Audit : la colonne du journal est `action` (pas `cle`).
- R2 : si `/api/uploads` ou `/api/photos/*` renvoie 503, vérifier le binding
  `PHOTOS` dans `dist/server/wrangler.json` et l'existence du bucket.
- Titres de page : `useDocumentTitle` pour les navigations client ; le `head`
  SSR reste la source pour le premier chargement.
- Build SEO : `SITE_URL=https://...` fige les canoniques, `hreflang` et
  Open Graph en URLs absolues ; sans elle, elles restent relatives.
- Carte : importer Leaflet uniquement via `createClientOnlyFn` + `lazy` dans
  un fichier `.client.tsx` ; les tuiles OSM exigent l'attribution.
- PWA : incrémenter `VERSION` dans `apps/web/public/sw.js` à chaque changement
  de cache ; le SW attend `SKIP_WAITING` pour le bandeau « Recharger ».
- Recherche sans JS : le formulaire GET `?q=&category=` fonctionne en SSR.
- `wrangler deploy --env staging` sur le config généré déploie `upk`
  (production). Utiliser `CLOUDFLARE_ENV=staging` au build.
- Le seed ne doit pas contenir `BEGIN`/`COMMIT` : D1 les refuse.
- D1 : `upk` = `3b364a13-7620-415d-8b7f-6ec9d79a6d66`,
  `upk-staging` = `fcfcb0f4-a79d-42b7-86c4-0ccc9eead1ee`.
- `seed:sql` utilise `node --experimental-strip-types`.

## Notes d'environnement

- pnpm 12 doit être installé avec son binaire natif (scripts d'installation
  autorisés), sinon Turborepo échoue avec `Exec format error`.
- `apps/web/src/routeTree.gen.ts` est généré par TanStack Start ; il est
  versionné pour que le typecheck fonctionne sur un clone neuf.

## Documentation

- `docs/CAHIER_DES_CHARGES.md` — périmètre, exigences, critères d'acceptation.
- `docs/ARCHITECTURE.md` — choix techniques, ADR, schémas.
- `docs/PLAN_DE_TRAVAIL.md` — sprints, jalons, checklists.
- `docs/RUNBOOK.md` — procédures local, staging, migrations, secrets, incidents.
- `seed/` — OpenStreetMap (ODbL) et GeoNames (CC BY 4.0), catalogue Sahel
  (41 566 lieux) + snapshot historique de Niamey.

## Interdits

- Secrets dans le dépôt.
- Modification d'une migration déjà appliquée.
- Réécriture de l'historique Git.

- Assistant : ne pas redéclarer `Window.SpeechRecognition` dans plusieurs
  fichiers ; `apps/web/src/lib/speech.ts` utilise un type local, `voice-search`
  garde le sien. Deux déclarations globales incompatibles cassent le typecheck.
- Assistant : les tests E2E doivent attendre `networkidle` avant de cliquer le
  bouton flottant, sinon le clic précède l'hydratation React.
- Assistant : `localStorage` est utilisé uniquement pour les préférences
  (`upk-assistant-greeting`, `upk-assistant-language`) ; aucun transcript ni
  audio n'est stocké par UPK.


## Environnements Cloudflare

- Un seul environnement distant est autorisé : production (`upk`).
- Ne jamais ajouter `[env.staging]`, `CLOUDFLARE_ENV=staging`, `--env staging`, un Worker `upk-staging`, une base `upk-staging` ou un bucket `upk-photos-staging`.
- Les tests automatisés et fonctionnels se font en local. Toute vérification distante se fait sur `upk`, avec précaution et sans données destructives.
- L'ancien staging a été retiré ; ne pas le recréer.
