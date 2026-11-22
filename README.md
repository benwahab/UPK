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
pnpm seed:sql > infra/seed.sql
```

## Règles

Un seul dépôt, une seule branche `main`. Aucun tag, aucune branche, aucune PR.
Voir `AGENTS.md` et `docs/`.
