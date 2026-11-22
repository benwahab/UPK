# UPK — Votre guide local

Moteur de recherche local et annuaire d'établissements pour le Niger.

- **Web et mobile** : TanStack Start (SSR, PWA installable desktop + mobile) sur Cloudflare Workers.
- **Play Store** : différé en v1.1 (TWA ou Expo selon besoin natif).
- **Langues** : français, anglais, arabe (RTL).

## Structure

```
apps/web        application web (SSR + PWA desktop + mobile)
apps/mobile     Expo (v1.1, si besoin natif)
packages/       domaine, API, base, i18n, UI
infra/          Wrangler, scripts de seed
docs/           cahier des charges, architecture, plan de travail
seed/           données OpenStreetMap (ODbL)
```

## Commandes

```
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm lint
pnpm seed:sql > /tmp/seed.sql
```

### Base D1 locale

```
pnpm -C apps/web exec wrangler d1 migrations apply upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state -y
pnpm -C apps/web exec wrangler d1 execute upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state \
  --file=/tmp/seed.sql
```

Le secret local `BETTER_AUTH_SECRET` se place dans `apps/web/.dev.vars`
(fichier ignoré par Git). L'état D1 local est dans `apps/web/.wrangler/state`.

### Staging

```
CLOUDFLARE_ENV=staging pnpm --filter @upk/web build
pnpm -C apps/web exec wrangler deploy
```

Le staging est `https://upk-staging.benwahab111.workers.dev`. Ne pas utiliser
`wrangler deploy --env staging` sur le config généré : il déploie le Worker de
production `upk`.

## Règles

Un seul dépôt, une seule branche `main`. Aucun tag, aucune branche, aucune PR.
Voir `AGENTS.md` et `docs/`.
