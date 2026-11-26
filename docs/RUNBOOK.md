# Runbook UPK

Procédures vérifiées au sprint 0 (2026-11-22).

## 1. Prérequis

- Node >= 22, pnpm 12.21.0 (`corepack enable`).
- `CLOUDFLARE_API_TOKEN` avec droits Workers, D1 et R2.
- Compte Cloudflare `benwahab111@gmail.com`.

## 2. Développement local

```bash
pnpm install
pnpm seed:sql > /tmp/seed.sql
pnpm -C apps/web exec wrangler d1 migrations apply upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state -y
pnpm -C apps/web exec wrangler d1 execute upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state \
  --file=/tmp/seed.sql
printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -hex 32)" > apps/web/.dev.vars
cp apps/web/.dev.vars infra/.dev.vars
pnpm dev
```

- `pnpm dev` (plugin Cloudflare) lit `apps/web/.dev.vars` ; un
  `wrangler dev --config infra/wrangler.toml` lit `infra/.dev.vars`. Garder
  les deux identiques.
- Ajouter aussi `TURNSTILE_SECRET_KEY` (clé de test `1x000…AA` en local),
  `ADMIN_EMAILS` et `RATE_LIMIT_SALT` dans les deux fichiers.
- L'état D1 local est `apps/web/.wrangler/state`.
- `/api/poc` est réservé au staging (`APP_ENV=staging`) ; en local il renvoie 404.
- Vérifier : `curl http://127.0.0.1:8787/` renvoie 200 ; inscription via
  `POST /api/auth/sign-up/email`.

## 2 bis. PWA et carte

- Incrémenter `VERSION` dans `apps/web/public/sw.js` à chaque déploiement qui
  change le cache, puis vérifier `/sw.js`, `/manifest.webmanifest` et `/offline`.
- Le bandeau « Recharger » apparaît quand un nouveau service worker attend ;
  il envoie `SKIP_WAITING` puis recharge la page.
- La carte Leaflet est chargée au clic ; les tuiles OSM doivent garder leur
  attribution.

## 2 ter. Contribution, signalements et modération

- `ADMIN_EMAILS` liste les comptes modérateurs (séparés par des virgules).
  En local : `admin@upk.test` ; le mot de passe temporaire est dans
  `UPK_STAGING_ADMIN_PASSWORD` (fichier local, jamais versionné).
- `TURNSTILE_SECRET_KEY` et `VITE_TURNSTILE_SITE_KEY` utilisent les clés de
  test Cloudflare en local/staging ; remplacer par les clés réelles en
  production.
- Parcours de vérification :
  1. `/fr/contribuer` : soumettre un lieu. Il reste invisible en recherche.
  2. Se connecter avec un compte de `ADMIN_EMAILS`, puis ouvrir
     `/fr/admin/moderation` : approuver ou rejeter avec un motif.
  3. Rechercher le lieu : il apparaît avec `verifie: true` après approbation.
  4. Sur la fiche, ouvrir « Signaler une erreur », envoyer un signalement, puis
     le traiter dans la section « Signalements » de l'admin.
- Journal d'audit (colonne `action`, pas `cle`) :
  ```bash
  pnpm -C apps/web exec wrangler d1 execute upk --local \
    --config ../../infra/wrangler.toml --persist-to .wrangler/state \
    --command "SELECT action, resultat, cible_id, created_at FROM journal_admin ORDER BY created_at DESC LIMIT 10"
  ```
- Les photos R2 sont désactivées tant que R2 n'est pas activé : le champ
  photos est masqué dans le formulaire et `/api/uploads` renvoie 503.
  L'activation R2 exige le tableau de bord Cloudflare (l'API répond
  `Please enable R2 through the Cloudflare Dashboard.`).

## 2 quater. Tests E2E Playwright

```bash
pnpm e2e:prepare                 # migrations + seed D1 locale
pnpm exec playwright install chromium
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium pnpm e2e   # si Chromium système
pnpm e2e                         # sinon navigateur Playwright
```

- `pnpm e2e` démarre Vite sur `127.0.0.1:5173` et prépare la D1 locale.
- Pour tester un déploiement existant :
  `E2E_BASE_URL=https://upk-staging.benwahab111.workers.dev pnpm e2e`.
- 11 parcours : accueil vide, recherche, catégorie, proximité, vocal simulé,
  absence de JavaScript, photos masquées, confidentialité, bandeau
  d'installation mobile et cache du service worker. Les projets `chromium`
  et `mobile-chrome` (Pixel 5) sont exécutés.
- `pnpm e2e --project=mobile-chrome` ne lance que le mobile.
- Le test PWA est ignoré sans `E2E_BASE_URL` ; il vérifie le cache `upk-v3-pages`.
- En CI, le workflow installe Chromium puis exécute `pnpm e2e`.

## 3. Staging

```bash
export CLOUDFLARE_API_TOKEN="$CLOUDFARE_API_TOKEN"
SITE_URL=https://upk-staging.benwahab111.workers.dev \
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA \
CLOUDFLARE_ENV=staging pnpm --filter @upk/web build
pnpm -C apps/web exec wrangler deploy
# BETTER_AUTH_SECRET est déjà défini sur staging ; ne le régénérer que si
# nécessaire (cela invalide les sessions).
```

- URL : `https://upk-staging.benwahab111.workers.dev`.
- D1 : `upk-staging` (`9cab467d-3261-442d-8933-cc759e93b359`).
- **Ne pas** utiliser `wrangler deploy --env staging` sur le config généré :
  il déploie `upk` (production).
- Mesure : `curl "https://upk-staging.benwahab111.workers.dev/api/poc?q=pharmacie&runs=30"`.
- Lighthouse mobile (3G/2 Go simulés) :
  `CHROME_PATH=/usr/bin/chromium npx --yes lighthouse@12.8.2 https://upk-staging.benwahab111.workers.dev/fr --form-factor=mobile --throttling-method=simulate --only-categories=performance,accessibility,best-practices,seo`.
  Résultat de référence : 100/100/100/100, LCP 0,8 s.
- Le compte admin de staging (`admin@upk.test`) existe et `moderation.me`
  renvoie `isAdmin: true`. Le staging utilise les clés Turnstile de test.
- Le token Cloudflare est enregistré sous `CLOUDFARE_API_TOKEN` (coquille) ;
  Wrangler attend `CLOUDFLARE_API_TOKEN`. Exporter avant toute commande :
  `export CLOUDFLARE_API_TOKEN="$CLOUDFARE_API_TOKEN"`.

## 4. Migrations D1

```bash
# local
pnpm -C apps/web exec wrangler d1 migrations apply upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state -y

# staging
pnpm -C apps/web exec wrangler d1 migrations apply upk-staging --remote \
  --env staging --config ../../infra/wrangler.toml -y

# production
pnpm -C apps/web exec wrangler d1 migrations apply upk --remote \
  --config ../../infra/wrangler.toml -y
```

- Migrations additives uniquement ; ne jamais modifier une migration appliquée.
- `d1 execute` refuse `BEGIN`/`COMMIT` : le seed n'en contient pas.

## 5. Seed

```bash
pnpm seed:sql > /tmp/seed.sql
pnpm -C apps/web exec wrangler d1 execute upk --remote \
  --config ../../infra/wrangler.toml --file=/tmp/seed.sql
```

- 1 546 lieux, 9 catégories ; inserts idempotents (`ON CONFLICT DO NOTHING`).
- Vérifier : `SELECT COUNT(*) FROM places` = 1 546 ; `places_fts` = 1 546.

## 6. Secrets

| Nom | Où | Usage |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Worker staging/production | Signature des sessions |
| `TURNSTILE_SECRET_KEY` | Worker staging/production | Anti-abus formulaires |
| `RATE_LIMIT_SALT` | Worker production | Hachage des IP du rate limit |
| `ADMIN_EMAILS` | Variable Worker | Comptes modérateurs (pas un secret) |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Worker production | Photos R2 (désactivé) |

`wrangler secret put <NOM> --name <worker>` ; jamais dans Git, jamais dans un
`.dev.vars` versionné.

## 7. Déploiement production (M5)

1. Domaine et `BETTER_AUTH_URL` décidés.
2. `SITE_URL=https://upk.benwahab111.workers.dev pnpm --filter @upk/web build`
   (config production par défaut ; adapter `SITE_URL` au domaine public).
3. Renseigner `ADMIN_EMAILS` dans `infra/wrangler.toml` (production), puis
   `pnpm -C apps/web exec wrangler deploy`.
4. `wrangler secret put BETTER_AUTH_SECRET --name upk`.
5. `wrangler secret put TURNSTILE_SECRET_KEY --name upk` (clé réelle, pas la
   clé de test) et `wrangler secret put RATE_LIMIT_SALT --name upk`.
6. Vérifier `/`, `/api/auth/get-session`, une recherche, puis le parcours
   contribution → modération → recherche et un signalement.
7. Le Worker `upk` actuel (`https://upk.benwahab111.workers.dev`) est un
   aperçu non configuré : le supprimer ou le configurer avant l'ouverture
   publique.

## 8. Retour arrière

- Code : `git revert <sha>`, rebuild, redéploiement.
- Base : migrations additives ; corriger par une nouvelle migration.
- Worker : `wrangler versions` puis `wrangler rollback` si nécessaire.

## 9. Incidents connus

- **500 `HTTPError` sur `/api/auth/*`** : `BETTER_AUTH_SECRET` absent →
  `wrangler secret put`.
- **`no such table: places_fts`** : mauvaise base locale (build staging au lieu
  de production) ou migrations non appliquées ; vérifier
  `dist/server/wrangler.json` (`name`, `d1_databases`).
- **`BEGIN`/`COMMIT` refusés par D1** : retirer du SQL.
- **`/api/poc` 404** : `APP_ENV=production` ; route réservée au staging et au
  développement.
- **`wrangler deploy --env staging` déploie `upk`** : utiliser
  `CLOUDFLARE_ENV=staging` au build.
- **`moderation.me` renvoie `isAdmin: false`** : l'e-mail du compte n'est pas
  exactement dans `ADMIN_EMAILS` ou n'est pas vérifié ; recréer la session
  après correction.
- **Contribution invisible en recherche** : `statut_publication` vaut encore
  `en_attente` ; l'approuver dans `/fr/admin/moderation`.
- **Turnstile refusé** : `TURNSTILE_SECRET_KEY` et `VITE_TURNSTILE_SITE_KEY`
  doivent appartenir au même mode (test ou réel).
- **`/api/uploads` ou `/api/photos/*` en 503** : R2 n'est pas activé ; c'est
  attendu tant que les bindings `PHOTOS` restent commentés.

## 10. Checklist avant déploiement

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` verts.
- [ ] Migrations appliquées à la base cible.
- [ ] `BETTER_AUTH_URL` correct.
- [ ] `BETTER_AUTH_SECRET` présent.
- [ ] Recherche « pharmacie » et « صيدلية » OK.
- [ ] `ADMIN_EMAILS` contient le compte de modération et `moderation.me`
      renvoie `isAdmin: true`.
- [ ] `TURNSTILE_SECRET_KEY` réel en production (pas la clé de test).
- [ ] Contribution → approbation → recherche → signalement vérifiés.
- [ ] `/api/poc` absent ou 404 en production.
