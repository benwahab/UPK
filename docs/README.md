# Documentation UPK

Point d'entrée de la reconstruction UPK v2.

| Document | Rôle | Public |
| --- | --- | --- |
| [`CAHIER_DES_CHARGES.md`](./CAHIER_DES_CHARGES.md) | Ce que le produit doit faire, pour qui, avec quels critères d'acceptation | Commanditaire, équipe |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Comment c'est construit : stack, schéma, API, sécurité, CI/CD | Équipe technique |
| [`PLAN_DE_TRAVAIL.md`](./PLAN_DE_TRAVAIL.md) | Quand et dans quel ordre : sprints, jalons, checklists | Tous |
| [`RUNBOOK.md`](./RUNBOOK.md) | Procédures : local, staging, migrations, secrets, incidents | Équipe technique |
| [`PORTABILITY.md`](./PORTABILITY.md) | Ancienne documentation de portabilité (v1) | Archive |

## Données

| Fichier | Contenu |
| --- | --- |
| [`../seed/niamey-2026-08-30.json`](../seed/niamey-2026-08-30.json) | 1 546 lieux OpenStreetMap de Niamey, avec coordonnées |
| [`../seed/ATTRIBUTION.md`](../seed/ATTRIBUTION.md) | Attribution ODbL et empreinte d'intégrité |

## Ordre de lecture recommandé

1. Cahier des charges — pour comprendre le périmètre.
2. Plan de travail — pour comprendre la séquence.
3. Architecture — pour comprendre les choix techniques.

## Conventions de travail

- **Un seul dépôt, une seule branche : `main`.** Aucune branche de
  fonctionnalité, aucune pull request, aucun tag.
- Commits atomiques, message explicite, jamais de `push --force`.
- Pipeline vert obligatoire avant tout déploiement.
- Retour arrière par `git revert`, jamais par reset.
- Chaque commit est auto-relu et accompagné d'un court rapport de vérification.
- Aucune dépendance Lovable ni Supabase.

## Langues

Français, anglais et arabe (RTL) au lancement. Haoussa et zarma après la v1.

## Statut

Les trois documents sont en version 1.0. Le choix « web mobile-first » est
consigné (ADR-008) : la v1.0 sort en application web installable desktop +
mobile, le Play Store est différé en v1.1.

S0 à S2 sont livrés : monorepo, POC D1/FTS5 sur D1 réelle, seed des 1 546
lieux, Better Auth, recherche et fiches, PWA, contribution, signalements,
modération et journal d'audit. L'accueil reste simple : aucune liste n'est
chargée sans recherche, la géolocalisation affiche les lieux du plus proche au
plus éloigné et la recherche vocale est proposée quand le navigateur la
supporte. La migration `0003` et la tranche S2 sont déployées sur staging
(`6b6ba112`), avec le compte `admin@upk.test`. L'upload R2 est actif : les
photos optionnelles (3 max, 5 Mo) sont stockées dans les buckets privés
`upk-photos` et `upk-photos-staging`. Les 11 parcours E2E Playwright sont
exécutés en desktop et mobile (21 exécutions vertes sur staging). Lighthouse
mobile : 100/100/100/100, LCP 0,8 s.
