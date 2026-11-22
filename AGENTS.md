# UPK — Conventions du dépôt

## Règles de travail

- **Un seul dépôt, une seule branche : `main`.** Jamais de branche, jamais de
  tag, jamais de pull request.
- Jamais de `push --force`, de rebase ou d'amendement d'un commit poussé.
- Commits atomiques, message explicite, pipeline vert avant tout déploiement.
- Retour arrière par `git revert`, jamais par reset.
- Aucune dépendance ni artefact Lovable, aucune dépendance Supabase.

## Stack (v2)

- Web : TanStack Start (SSR, PWA desktop) sur Cloudflare Workers.
- Mobile : Expo / React Native, distribution Play Store.
- API : tRPC sur Workers.
- Données : D1 (SQLite) + Drizzle. Fichiers : R2.
- Auth : Better Auth. Anti-abus : Turnstile + rate limiting.
- Langues : français, anglais, arabe (RTL).

## Structure

```
apps/web        TanStack Start (SSR, PWA desktop)
apps/mobile     Expo (sprint 3)
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
pnpm seed:sql > infra/seed.sql
```

## État au démarrage du sprint 0

- v1 (TanStack Start + Supabase + Lovable) conservée dans l'historique Git,
  retirée du répertoire de travail.
- Monorepo pnpm 12 + Turborepo opérationnel.
- `packages/domain` : normalisation latine/arabe, téléphone, Haversine,
  scoring, schémas Zod. 13 tests.
- `packages/i18n` : catalogues fr/en/ar, repli, RTL, formats. 5 tests.
- `packages/api` : routeur tRPC `search.places`, `places.byId`,
  `categories.list`, permissions. 3 tests.
- `packages/db` : schéma Drizzle + migration `0001_init.sql` (D1, FTS5).
- Seed SQL : 1 546 lieux, 9 catégories, généré depuis le JSON OSM.
- POC FTS5 validé sur SQLite : « pharmacie » → 93 résultats, « ecole » → 200,
  arabe normalisé « صيدليه » → « صيدلية النور ».
- `apps/web` : accueil SSR minimal, build Vite vert, sans Lovable.
- CI GitHub Actions : lint, typecheck, test, build sur `main`.

## Notes d'environnement

- pnpm 12 doit être installé avec son binaire natif (scripts d'installation
  autorisés), sinon Turborepo échoue avec `Exec format error`.
- `apps/web/src/routeTree.gen.ts` est généré par TanStack Start ; il est
  versionné pour que le typecheck fonctionne sur un clone neuf.

## Documentation

- `docs/CAHIER_DES_CHARGES.md` — périmètre, exigences, critères d'acceptation.
- `docs/ARCHITECTURE.md` — choix techniques, ADR, schémas.
- `docs/PLAN_DE_TRAVAIL.md` — sprints, jalons, checklists.
- `seed/` — données OpenStreetMap (ODbL), 1 546 lieux de Niamey.

## Interdits

- Secrets dans le dépôt.
- Modification d'une migration déjà appliquée.
- Réécriture de l'historique Git.
