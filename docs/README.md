# Documentation UPK

Point d'entrée de la reconstruction UPK v2.

| Document                                           | Rôle                                                                      | Public                          |
| -------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------- |
| [`CAHIER_DES_CHARGES.md`](./CAHIER_DES_CHARGES.md) | Ce que le produit doit faire, pour qui, avec quels critères d'acceptation | Commanditaire, équipe           |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)             | Comment c'est construit : stack, schéma, API, sécurité, CI/CD             | Équipe technique                |
| [`ASSISTANT.md`](./ASSISTANT.md)                   | Assistant vocal, compréhension des demandes, limites réelles et tests     | Équipe technique, commanditaire |
| [`OVERTURE-AUDIT.md`](./OVERTURE-AUDIT.md)         | Audit Overture Maps, dédoublonnage OSM, intégration préparée              | Équipe technique, commanditaire |
| [`PLAN_DE_TRAVAIL.md`](./PLAN_DE_TRAVAIL.md)       | Quand et dans quel ordre : sprints, jalons, checklists                    | Tous                            |
| [`RUNBOOK.md`](./RUNBOOK.md)                       | Procédures : local, production, migrations, secrets, incidents            | Équipe technique                |
| [`PORTABILITY.md`](./PORTABILITY.md)               | Ancienne documentation de portabilité (v1)                                | Archive                         |

## Données

| Fichier                                                                            | Contenu                                                               |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`../seed/osm-sahel-2026-11-27.json`](../seed/osm-sahel-2026-11-27.json)           | 41 558 lieux OpenStreetMap au Niger, Mali et Burkina Faso             |
| [`../seed/geonames-sahel-2026-11-27.json`](../seed/geonames-sahel-2026-11-27.json) | 1 197 villes, 3 340 quartiers et hiérarchie administrative (GeoNames) |
| [`../seed/categories-2026-11-27.json`](../seed/categories-2026-11-27.json)         | 16 catégories traduites fr/en/ar                                      |
| [`../seed/niamey-2026-08-30.json`](../seed/niamey-2026-08-30.json)                 | Snapshot historique : 1 546 lieux de Niamey                           |
| [`../seed/ATTRIBUTION.md`](../seed/ATTRIBUTION.md)                                 | Attribution ODbL, CC BY 4.0, Overture et empreintes d'intégrité       |
| [`./overture/`](./overture/)                                                       | Audit des 1 136 candidats Overture et SQL d'intégration préparés      |

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

Français, anglais et arabe (RTL) au lancement. L'assistant propose aussi le
haoussa et le zarma en mode expérimental, selon les voix installées sur
l'appareil ; les messages complexes restent disponibles par écrit.

## Statut

Les trois documents sont en version 1.0. Le choix « web mobile-first » est
consigné (ADR-008) : la v1.0 sort en application web installable desktop +
mobile, le Play Store est différé en v1.1. L'assistant vocal et la recherche
intelligente sont documentés dans `ASSISTANT.md` (ADR-012).

S0 à S3 sont livrés : monorepo, POC D1/FTS5 sur D1 réelle, catalogue Sahel
de 41 558 lieux dans le seed (41 566 annoncés en production, écart à expliquer), Better Auth, recherche et fiches, PWA, contribution,
signalements, modération et journal d'audit. L'accueil reste simple : aucune liste n'est
chargée sans recherche, la géolocalisation affiche les lieux du plus proche au
plus éloigné et la recherche vocale est proposée quand le navigateur la
supporte. L'ancien staging a été retiré ; un seul environnement distant subsiste, la
production `upk`. L'upload R2 est actif : les photos optionnelles (3 max,
5 Mo) sont stockées dans le bucket privé `upk-photos`. La production est déployée sur
`https://upk.benwahab111.workers.dev` (`ca7af247`) avec les migrations `0003`
et `0004`, R2, Better Auth, en-têtes de sécurité, CSRF et Workers Logs. Les
sauvegardes D1 sont déposées dans `upk-backups`. Turnstile utilise encore la
clé de test en production : la remplacer avant l'ouverture publique. Les
parcours E2E Playwright couvrent désormais l'assistant vocal (20 tests mobiles
verts, 1 test PWA ignoré sans `E2E_BASE_URL`). Lighthouse mobile :
100/100/100/100, LCP 0,8 s.
