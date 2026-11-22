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

# Staging
CLOUDFLARE_ENV=staging pnpm --filter @upk/web build
pnpm -C apps/web exec wrangler deploy
```

## Décisions structurantes

- **ADR-008** : PWA installable desktop et mobile pour la v1.0 ; Play Store
  différé en v1.1 (TWA en priorité, Expo seulement si besoin natif prouvé).
- Le dépôt reste sur une seule branche `main`, sans tag ni pull request.

## État au 2026-11-22 (S0)

- Monorepo pnpm 12 + Turborepo ; 7 projets ; lint, typecheck et 28 tests verts.
- `packages/domain` (13 tests), `packages/i18n` (5), `packages/api` (10).
- D1 `upk` et `upk-staging` migrées et seedées : 1 546 lieux, 9 catégories.
- Better Auth : route `/api/auth/$`, inscription + `get-session` vérifiées en
  local (workerd) et sur staging.
- Repositories D1 : FTS5, filtres, distance, catégories ; tests sur les
  migrations réelles (`0001_init.sql`).
- POC D1 réelle : SQL p95 ≤ 4,9 ms ; bout-en-bout p95 ≤ 48 ms.
- S1 (première tranche) : `/api/trpc`, recherche SSR (1 546 lieux), filtre
  catégorie, routes `/fr` `/en` `/ar` avec RTL, fiche `/$locale/places/$id`,
  SEO (`hreflang`, sitemap, robots, JSON-LD, Open Graph).
- Staging : `https://upk-staging.benwahab111.workers.dev`.
- Reste : carte, Lighthouse, PWA, CI.

### Pièges vérifiés

- `wrangler dev` lit `apps/web/.dev.vars`, pas `infra/.dev.vars`.
- Build SEO : `SITE_URL=https://...` fige les canoniques, `hreflang` et
  Open Graph en URLs absolues ; sans elle, elles restent relatives.
- `wrangler deploy --env staging` sur le config généré déploie `upk`
  (production). Utiliser `CLOUDFLARE_ENV=staging` au build.
- Le seed ne doit pas contenir `BEGIN`/`COMMIT` : D1 les refuse.
- D1 : `upk` = `3b364a13-7620-415d-8b7f-6ec9d79a6d66`,
  `upk-staging` = `9cab467d-3261-442d-8933-cc759e93b359`.
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
- `seed/` — données OpenStreetMap (ODbL), 1 546 lieux de Niamey.

## Interdits

- Secrets dans le dépôt.
- Modification d'une migration déjà appliquée.
- Réécriture de l'historique Git.
