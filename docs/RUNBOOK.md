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
pnpm dev
```

- `wrangler dev` lit `apps/web/.dev.vars`, pas `infra/.dev.vars`.
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

## 3. Staging

```bash
SITE_URL=https://upk-staging.benwahab111.workers.dev CLOUDFLARE_ENV=staging pnpm --filter @upk/web build
pnpm -C apps/web exec wrangler deploy
openssl rand -hex 32 | pnpm -C apps/web exec wrangler secret put \
  BETTER_AUTH_SECRET --name upk-staging
```

- URL : `https://upk-staging.benwahab111.workers.dev`.
- D1 : `upk-staging` (`9cab467d-3261-442d-8933-cc759e93b359`).
- **Ne pas** utiliser `wrangler deploy --env staging` sur le config généré :
  il déploie `upk` (production).
- Mesure : `curl "https://upk-staging.benwahab111.workers.dev/api/poc?q=pharmacie&runs=30"`.

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
| `TURNSTILE_SECRET_KEY` | Worker production | Anti-abus formulaires |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Worker production | Photos R2 |

`wrangler secret put <NOM> --name <worker>` ; jamais dans Git, jamais dans un
`.dev.vars` versionné.

## 7. Déploiement production (M5)

1. Domaine et `BETTER_AUTH_URL` décidés.
2. `SITE_URL=https://upk.benwahab111.workers.dev pnpm --filter @upk/web build`
   (config production par défaut ; adapter `SITE_URL` au domaine public).
3. `pnpm -C apps/web exec wrangler deploy`.
4. `wrangler secret put BETTER_AUTH_SECRET --name upk`.
5. Vérifier `/`, `/api/auth/get-session` et une recherche.
6. Le Worker `upk` actuel (`https://upk.benwahab111.workers.dev`) est un
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

## 10. Checklist avant déploiement

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` verts.
- [ ] Migrations appliquées à la base cible.
- [ ] `BETTER_AUTH_URL` correct.
- [ ] `BETTER_AUTH_SECRET` présent.
- [ ] Recherche « pharmacie » et « صيدلية » OK.
- [ ] `/api/poc` absent ou 404 en production.
