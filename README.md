# UPK — Votre guide local

Moteur de recherche local et annuaire d'établissements pour le Niger.

- **Web desktop** : TanStack Start (SSR, PWA installable) sur Cloudflare Workers.
- **Android** : Expo / React Native, distribution Play Store.
- **Langues** : français, anglais, arabe (RTL).

## Structure

```
apps/web        application web (SSR + PWA)
apps/mobile     application Android (sprint 3)
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
