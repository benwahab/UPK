# Plan de travail — UPK v2

| | |
| --- | --- |
| **Version** | 1.0 |
| **Statut** | À valider |
| **Durée totale** | 12 semaines |
| **Référence** | `docs/CAHIER_DES_CHARGES.md`, `docs/ARCHITECTURE.md` |

---

## 1. Principes d'exécution

1. **Une seule priorité à la fois.** Le sprint en cours est la seule vérité.
2. **Chaque sprint produit une version déployable.** Pas de « big bang ».
3. **Aucune fonctionnalité sans test.** Le pipeline bloque toute régression.
4. **Le périmètre ne change pas en cours de sprint.** Tout ajout passe par un
   avenant et entre dans un sprint ultérieur.
5. **Un seul dépôt, une seule branche : `main`.** Aucune branche de
   fonctionnalité, aucune pull request. Chaque commit va directement sur `main`.
6. **Pas de réécriture d'historique.** Jamais de `push --force`, jamais de
   rebase ou d'amendement d'un commit déjà poussé.
7. **On mesure avant d'optimiser.** Les budgets de performance sont vérifiés à
   chaque sprint, pas à la fin.

## 2. Vue d'ensemble

```
Semaine   1    2    3    4    5    6    7    8    9   10   11   12
          │    │    │    │    │    │    │    │    │    │    │    │
S0 Fond.  ████
S1 Web+i18n    ████████████████
S2 PWA+Contr.                  ████████████
S3 PWA mob.                             ████████████
S4 Admin                                        ████████████
S5 Indus.                                                   ████████
Jalons    M0        M1         M2         M3         M4      M5
```

| Jalon | Fin | Critère de franchissement |
| --- | --- | --- |
| **M0** | S1 | POC D1 + FTS5 (latin et arabe) validé sur 1 546 lieux, auth fonctionnelle, CI verte |
| **M1** | S4 | Web public déployé : recherche, fiche, SEO, fr/en/ar, RTL |
| **M2** | S6 | PWA installable desktop, contribution et modération opérationnelles |
| **M3** | S8 | PWA mobile validée sur Android 2 Go / 3G ; décision TWA prise |
| **M4** | S10 | Administration complète, permissions vérifiées par API |
| **M5** | S12 | Mise en production web (PWA) ; Play Store optionnel |

## 3. Sprint 0 — Fondations (1 semaine)

**Objectif :** prouver que la stack tient, avant d'écrire une ligne de produit.

| ID | Tâche | Est. |
| --- | --- | --- |
| T0.1 | Restructurer le dépôt existant en monorepo pnpm + Turborepo (aucun nouveau dépôt, aucune branche) | 0,5 j |
| T0.2 | TypeScript strict, ESLint, Prettier, Vitest | 0,5 j |
| T0.3 | CI GitHub Actions : lint, typecheck, test, build | 0,5 j |
| T0.4 | `wrangler.toml` : Workers, D1, R2, Queues, Cron | 0,5 j |
| T0.5 | **POC technique** : D1 + FTS5 + recherche sur les 1 546 lieux | 1 j |
| T0.6 | Schéma Drizzle : référentiels, `places`, `place_photos`, FTS | 0,5 j |
| T0.7 | Script de seed depuis `seed/niamey-2026-08-30.json` | 0,5 j |
| T0.8 | Better Auth : inscription, connexion, session web | 1 j |
| T0.9 | Design tokens (couleurs, typographie, espacements) | 0,5 j |
| T0.10 | Décision PWA mobile-first consignée (ADR-008, avenant) | 0,5 j |
| T0.11 | ADR validés, conventions de commit, runbook initial | 0,5 j |

**État au 2026-11-22.**
- T0.1, T0.2, T0.4, T0.5, T0.6, T0.7, T0.8, T0.9, T0.10 : faits et vérifiés.
- T0.3 : workflow `.github/workflows/ci.yml` présent ; lint, typecheck, tests
  et build verts en local, à confirmer par un run GitHub.
- T0.11 : ADR-001 à ADR-008 consignés ; runbook créé (`docs/RUNBOOK.md`).
- POC D1 réelle : SQL p95 ≤ 4,9 ms ; bout-en-bout p95 ≤ 48 ms (staging).
- Staging : `https://upk-staging.benwahab111.workers.dev` (auth + recherche).

**Critères de sortie.**
- Une recherche « pharmacie » renvoie des résultats réels depuis D1 locale et
  distante.
- Le temps de réponse est mesuré et documenté (SQL D1 et bout-en-bout).
- Les limites D1/Workers listées dans `ARCHITECTURE.md` §18 sont vérifiées.
- La CI est verte sur un commit de test.
- Un utilisateur peut s'inscrire et se connecter (local et staging).

**Risque de sortie.** Si FTS5 ou le tokenizer `unicode61` ne fonctionne pas sur
D1, on bascule sur un index inversé applicatif. Décision prise en S0, pas en S4.

## 4. Sprint 1 — API, web et internationalisation (3 semaines)

**Objectif :** un site public utilisable, référençable, sur desktop.

| ID | Tâche | Est. |
| --- | --- | --- |
| T1.1 | `packages/domain` : types, Zod, normalisation latine et arabe, scoring | 2 j |
| T1.2 | `packages/db` : repositories (places, catégories, référentiels) | 2 j |
| T1.3 | tRPC : `search`, `places`, `categories`, `geo` | 2 j |
| T1.4 | `packages/i18n` : catalogues fr/en/ar, clés typées, repli | 2 j |
| T1.5 | Layout web desktop en propriétés logiques (RTL-ready) | 1 j |
| T1.6 | Page recherche : liste + filtres + carte | 3 j |
| T1.7 | Page fiche : contenu, photos, appel, itinéraire, JSON-LD | 2 j |
| T1.8 | Pages légales, à propos, contact (3 langues) | 1 j |
| T1.9 | Routage localisé `/fr`, `/en`, `/ar` + `hreflang` + sitemaps | 1 j |
| T1.10 | RTL web : audit des 5 écrans critiques, icônes, police arabe | 2 j |
| T1.11 | SEO : sitemap, robots, canoniques, Open Graph | 1 j |
| T1.12 | Tests unitaires, intégration et complétude des catalogues | 2 j |
| T1.13 | Déploiement préversion + Lighthouse | 1 j |

**État au 2026-11-22 (première tranche).**
- T1.1, T1.2, T1.4 : faits (domaine, repositories, i18n).
- T1.3 : `search.places`, `places.byId`, `categories.list` branchés sur D1 ;
  handler `/api/trpc` + contexte session Better Auth.
- T1.6/T1.7 (partiel) : recherche SSR (20 premiers résultats, total 1 546) et
  fiche `/places/$id` SSR, appel et itinéraire.
- Reste : filtres + carte, JSON-LD, routes `/fr` `/en` `/ar`, sitemap,
  Lighthouse.

**Critères de sortie.**
- Recherche < 400 ms p95 sur 1 546 lieux.
- Lighthouse : SEO ≥ 95, Performance ≥ 85 sur desktop.
- Aucune distance affichée sans position.
- Fiche partageable avec image Open Graph.
- Les trois langues s'affichent ; l'arabe est en RTL **sans débordement**.
- Aucune clé de traduction manquante dans les trois catalogues.

## 5. Sprint 2 — PWA et contribution (2 semaines)

**Objectif :** installation desktop, contribution et modération réelles.

| ID | Tâche | Est. |
| --- | --- | --- |
| T2.1 | Manifeste, icônes, `theme-color`, `apple-touch-icon` | 0,5 j |
| T2.2 | Workbox dans `.output/public`, app-shell, offline | 2 j |
| T2.3 | Flux de mise à jour + bouton « Recharger » | 1 j |
| T2.4 | Bouton d'installation desktop uniquement | 0,5 j |
| T2.5 | Formulaire de proposition + upload R2 + Turnstile | 3 j |
| T2.6 | Rate limiting sur toutes les écritures publiques | 1 j |
| T2.7 | Signalement d'erreur | 1 j |
| T2.8 | File de modération, validation GPS 20 m, rejet motivé | 3 j |
| T2.9 | Journal d'audit append-only | 1 j |
| T2.10 | Tests E2E Playwright | 2 j |

**Critères de sortie.**
- `navigator.serviceWorker.getRegistration()` renvoie une registration active.
- L'application s'installe depuis Chrome desktop.
- Une proposition n'apparaît **jamais** avant validation.
- Après validation, elle apparaît dans la recherche.
- Le rejet enregistre un motif.
- Toute action de modération écrit une ligne de journal.

## 6. Sprint 3 — PWA mobile et durcissement (2 semaines)

**Objectif :** une PWA excellente sur Android bas de gamme, sans app native.

| ID | Tâche | Est. |
| --- | --- | --- |
| T3.1 | Installation mobile : WebAPK, `beforeinstallprompt`, bandeau | 1 j |
| T3.2 | Mise en page mobile : cibles tactiles, liste d'abord, carte à la demande | 2 j |
| T3.3 | Hors-ligne mobile : 50 fiches, `storage.persist`, éviction | 2 j |
| T3.4 | RTL mobile, arabe, sélecteur de langue | 1 j |
| T3.5 | Recherche sans JavaScript (progressive enhancement, Opera Mini) | 2 j |
| T3.6 | Tests sur Android 8 / 2 Go / 3G : Lighthouse, WebPageTest | 1 j |
| T3.7 | Mesure de la part de navigateurs, décision TWA | 0,5 j |
| T3.8 | Spike TWA (Bubblewrap, `assetlinks.json`) — optionnel | 1 j |
| T3.9 | Tests Playwright mobile | 1 j |
| T3.10 | Correctifs de performance | 1 j |

**Critères de sortie.**
- PWA installable en mode standalone sur Chrome Android (WebAPK).
- LCP < 2,5 s sur un Android 2 Go en 3G.
- Mode avion : les 50 dernières fiches restent consultables.
- Recherche « pharmacie » utilisable sans JavaScript.
- Aucun débordement horizontal en arabe.
- Décision TWA/Play Store consignée (GO ou NO-GO).

## 7. Sprint 4 — Administration (2 semaines)

**Objectif :** l'équipe pilote la plateforme en toute sécurité. Les comptes
professionnels publics arrivent en v1.1, après la mise en ligne.

| ID | Tâche | Est. |
| --- | --- | --- |
| T4.1 | Administration des comptes, rôles et permissions | 3 j |
| T4.2 | Administration des catégories | 1 j |
| T4.3 | Traitement des signalements | 1 j |
| T4.4 | Traitement des revendications | 1 j |
| T4.5 | Journal d'audit : filtres et détail | 1 j |
| T4.6 | Favoris locaux (web et mobile, sans compte) | 1 j |
| T4.7 | Tests d'autorisation (matrice de permissions) | 2 j |
| T4.8 | Tests de non-régression complets | 1 j |

**Critères de sortie.**
- Un modérateur ne peut pas gérer les comptes.
- Un administrateur sans la permission « catégories » ne peut pas en créer,
  **y compris par appel API direct**.
- Chaque changement de rôle est journalisé avec avant/après.
- Un visiteur anonyme ne peut pas lire le journal.
- Les favoris survivent à un rechargement, sans compte.

## 8. Sprint 5 — Industrialisation (2 semaines)

**Objectif :** passer de « ça marche » à « ça tient ».

| ID | Tâche | Est. |
| --- | --- | --- |
| T5.1 | Budgets de performance + optimisations | 2 j |
| T5.2 | Sentry + métriques + tableaux de bord | 1 j |
| T5.3 | Test de charge k6 (50 req/s) | 1 j |
| T5.4 | Audit accessibilité (WCAG 2.1 AA) | 1 j |
| T5.5 | Revue de sécurité + en-têtes + rate limits | 1 j |
| T5.6 | Sauvegarde D1 + procédure de restauration | 1 j |
| T5.7 | Runbook d'exploitation | 1 j |
| T5.8 | Préparation TWA si décision GO (sinon aucune action) | 1 j |
| T5.9 | Bascule DNS + redirections 301 depuis l'ancien domaine | 0,5 j |
| T5.10 | QA arabe et RTL : captures, non-débordement, relecture native | 1 j |
| T5.11 | Vérification PWA mobile : installation, hors-ligne, Lighthouse 2 Go / 3G | 1 j |

**Critères de sortie.**
- Tous les budgets de performance sont respectés.
- Une panne API simulée produit un message clair, pas un écran blanc.
- Restauration D1 testée sur une base vide.
- PWA installable vérifiée sur Chrome Android et desktop ; décision TWA appliquée.
- Aucune erreur critique Sentry sur 72 h.

## 9. Rôles

| Rôle | Responsabilité |
| --- | --- |
| **Commanditaire** | Valide le périmètre, arbitre les priorités |
| **Tech lead / développeur** | Architecture, code, revue, déploiement |
| **Designer** | Tokens, maquettes desktop et mobile |
| **QA** | Plan de test, recette, non-régression |
| **Modérateur pilote** | Teste le circuit de validation sur le terrain |

## 10. Definition of Done

Une tâche est terminée quand :

- [ ] le code est relu et fusionné ;
- [ ] les tests unitaires et d'intégration passent ;
- [ ] le typecheck et le lint passent ;
- [ ] les critères d'acceptation du cahier des charges sont vérifiés ;
- [ ] le comportement est testé sur un appareil Android réel si l'UI change ;
- [ ] la documentation est à jour ;
- [ ] aucune régression n'est constatée sur les parcours existants.

## 11. Checklist de mise en production web

- [ ] Domaine et DNS configurés, TLS actif
- [ ] Redirections 301 depuis les anciennes URL
- [ ] `sitemap.xml` et `robots.txt` corrects
- [ ] En-têtes de sécurité vérifiés (CSP, HSTS, nosniff)
- [ ] Turnstile en mode production
- [ ] Rate limiting actif
- [ ] Sauvegarde D1 quotidienne + test de restauration
- [ ] Sentry configuré et alertes actives
- [ ] Pages légales, confidentialité, CGU publiées
- [ ] Attribution ODbL visible
- [ ] Test PWA sur Chrome et Edge desktop
- [ ] Test PWA sur Chrome Android (WebAPK, mode standalone)
- [ ] Recherche utilisable sans JavaScript
- [ ] Hors-ligne : 20 fiches web, 50 fiches mobiles
- [ ] Test sur connexion 3G bridée et appareil 2 Go
- [ ] Vérification des données structurées (Rich Results Test)

## 12. Checklist Play Store (v1.1, optionnelle)

> La v1.0 ne passe pas par le Play Store. Cette checklist sert si la décision
> TWA (ou Expo) est prise en v1.1.

- [ ] Compte développeur Google validé
- [ ] Nom de package définitif (`ne.upk.app`)
- [ ] Icône 512×512, bannière 1024×500, captures
- [ ] Description courte et longue en français
- [ ] Politique de confidentialité accessible par URL
- [ ] Formulaire Data Safety rempli
- [ ] Classification de contenu
- [ ] Target API level conforme
- [ ] Play App Signing activé
- [ ] AAB signé et testé sur appareil réel
- [ ] Test fermé : 12 testeurs, 14 jours
- [ ] Aucun crash bloquant sur 72 h
- [ ] Demande d'accès production

## 13. Plan de test

| Type | Quand | Critère |
| --- | --- | --- |
| Unitaire | À chaque commit | Couverture ≥ 70 % sur domaine et API |
| Intégration | À chaque push | Procédures tRPC sur D1 locale |
| E2E web | À chaque push | 5 parcours critiques |
| E2E mobile | À chaque build | 4 parcours critiques |
| Charge | Fin S5 | 50 req/s, p95 < 400 ms |
| Accessibilité | Fin S5 | WCAG 2.1 AA |
| Sécurité | Fin S5 | Matrice de permissions, injections, uploads |
| Compatibilité | Fin S5 | Chrome, Edge, Firefox, Safari ; Android 8 et 2 Go |
| Hors-ligne | Fin S2 et S3 | Fiches consultables sans réseau |

**Parcours critiques.**
1. Recherche → résultat → fiche → appel.
2. Recherche sans position → aucune distance affichée.
3. Proposition → modération → publication → visible en recherche.
4. Rejet → motif enregistré → invisible.
5. Connexion pro → modification de sa fiche → autre pro ne la voit pas.
6. Administrateur sans permission → accès refusé par l'API.

## 14. Plan de migration v1 → v2

| Étape | Action | Responsable |
| --- | --- | --- |
| 1 | Conserver la v1 dans l'historique Git de `main` (aucun tag, aucune branche) | Tech lead |
| 2 | Supprimer les dépendances et artefacts Lovable | Tech lead |
| 3 | Tenter l'export runtime de l'ancienne base (comptes, photos, propositions) | Commanditaire |
| 4 | Importer `seed/niamey-2026-08-30.json` dans D1 | Tech lead |
| 5 | Vérifier comptage, coordonnées, catégories, FTS | QA |
| 6 | Marquer les lieux OSM `valide` + `source_fiable` | Tech lead |
| 7 | Rediriger les anciennes URL vers les nouvelles (301) | Tech lead |
| 8 | Conserver l'ancien site en lecture seule 30 jours | Tech lead |

## 15. Registre des risques

| Risque | Prob. | Impact | Déclencheur | Mitigation |
| --- | --- | --- | --- | --- |
| Limite D1 découverte tard | Moy. | Élevé | POC S0 | Bascule Hyperdrive prévue |
| FTS5 indisponible | Faible | Moyen | POC S0 | Index inversé applicatif |
| Découvrabilité de l'installation PWA | Moy. | Moyen | Lancement | Bandeau `beforeinstallprompt`, page d'aide, WebAPK |
| Part d'Opera Mini / navigateurs non compatibles | Moy. | Élevé | Mesure S3 | Recherche SSR sans JS, repli serveur, TWA/natif si besoin |
| Éviction du cache PWA | Faible | Moyen | Appareil sous pression | `storage.persist`, cache limité, repli réseau |
| Review Play Store (v1.1) | Moy. | Faible | Décision TWA | Compte dès S3, TWA plutôt qu'Expo |
| Dérive de périmètre | Élevé | Élevé | Nouvelle demande | Avenant obligatoire |
| Données OSM incomplètes (3 % de téléphones, 5 % d'adresses, 0,06 % de quartiers sur 1 546 lieux) | Élevé | Élevé | Revue qualité | Enrichissement terrain et partenaires, signalements, modération |
| Perte SEO au changement de domaine | Moy. | Moyen | Bascule | 301 + sitemap + Search Console |
| Appareil de test indisponible | Faible | Moyen | S3 | Émulateur + appareil prêté |
| Traductions arabes non livrées | Moy. | Élevé | Relecture native | Lancer la traduction dès S1, repli `en` |
| RTL incomplet découvert tard | Moy. | Élevé | Audit S1 | Propriétés logiques dès le premier composant |

## 16. Après la v1

| Version | Contenu | Horizon |
| --- | --- | --- |
| v1.1 | Comptes pro complets, statistiques, revendication avancée, app Play Store (TWA ou Expo) | +3 sem. |
| v1.2 | Modules pharmacie de garde, restaurant, hôtel | +4 sem. |
| v1.3 | Alertes médicament, assignations par zone, fusion de doublons | +3 sem. |
| v2.0 | Haoussa et zarma (après FR/EN/AR), API publique, iOS | +8 sem. |

## 17. Rituels et outils

- **Point quotidien** : 15 minutes, blocages uniquement.
- **Revue de sprint** : démonstration sur environnement de préversion.
- **Rétrospective** : une action d'amélioration par sprint.
- **Outils** : GitHub Projects (suivi), Sentry (erreurs), Figma (design),
  Lighthouse CI (performance), Play Console (distribution).

## 18. Première semaine, jour par jour

| Jour | Livrable |
| --- | --- |
| J1 | Dépôt créé, monorepo, CI vide mais verte |
| J2 | `wrangler.toml`, D1 locale, schéma initial |
| J3 | Seed des 1 546 lieux, première recherche FTS5 |
| J4 | Mesures de performance, décision GO/NO-GO sur D1 |
| J5 | Better Auth fonctionnel, tokens, ADR validés, démo |
