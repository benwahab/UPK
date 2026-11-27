# UPK — Votre guide local

Moteur de recherche local et annuaire d'établissements pour le Sahel : Niger, Mali et Burkina Faso.

- **Web et mobile** : TanStack Start (SSR, PWA installable desktop + mobile) sur Cloudflare Workers.
- **Play Store** : différé en v1.1 (TWA ou Expo selon besoin natif).
- **Langues** : français, anglais, arabe (RTL).

## Structure

```
apps/web        application web (SSR + PWA desktop + mobile)
apps/mobile     prévu v1.1 (Expo, si besoin natif)
packages/       domaine, API, base, i18n, UI
infra/          Wrangler, scripts de seed
docs/           cahier des charges, architecture, plan de travail
seed/           OpenStreetMap (ODbL) et GeoNames (CC BY 4.0)
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

Les secrets locaux (`BETTER_AUTH_SECRET`, `TURNSTILE_SECRET_KEY`,
`ADMIN_EMAILS`, `RATE_LIMIT_SALT`) se placent dans `apps/web/.dev.vars` pour
`pnpm dev`, et dans `infra/.dev.vars` pour un `wrangler dev` lancé avec
`infra/wrangler.toml`. Garder les deux fichiers identiques ; ils sont ignorés
par Git. L'état D1 local est dans `apps/web/.wrangler/state`.

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
