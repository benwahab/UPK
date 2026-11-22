# UPK — Conventions du dépôt

## Règles de travail

- **Un seul dépôt, une seule branche : `main`.** Jamais de branche, jamais de
  tag, jamais de pull request.
- Jamais de `push --force`, de rebase ou d'amendement d'un commit poussé.
- Commits atomiques, message explicite, pipeline vert avant tout déploiement.
- Retour arrière par `git revert`, jamais par reset.
- Aucune dépendance ni artefact Lovable, aucune dépendance Supabase.

## Stack cible (v2)

- Web : TanStack Start (SSR, PWA desktop) sur Cloudflare Workers.
- Mobile : Expo / React Native, distribution Play Store.
- API : tRPC sur Workers.
- Données : D1 (SQLite) + Drizzle. Fichiers : R2.
- Auth : Better Auth. Anti-abus : Turnstile + rate limiting.
- Langues : français, anglais, arabe (RTL).

## Documentation

- `docs/CAHIER_DES_CHARGES.md` — périmètre, exigences, critères d'acceptation.
- `docs/ARCHITECTURE.md` — choix techniques, ADR, schémas.
- `docs/PLAN_DE_TRAVAIL.md` — sprints, jalons, checklists.
- `seed/` — données OpenStreetMap (ODbL), 1 546 lieux de Niamey.

## Interdits

- Secrets dans le dépôt.
- Modification d'une migration déjà appliquée.
- Réécriture de l'historique Git.
