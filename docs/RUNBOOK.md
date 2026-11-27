# Runbook UPK

Procédures vérifiées au sprint 0 (2026-11-22).

## 1. Prérequis

- Node >= 22, pnpm 12.21.0 (`corepack enable`).
- `CLOUDFLARE_API_TOKEN` avec droits Workers, D1 et R2.
- Compte Cloudflare `benwahab111@gmail.com`.

## 2. Développement local

```bash
pnpm install
pnpm seed:sql > /tmp/seed.sql
pnpm -C apps/web exec wrangler d1 migrations apply upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state -y
pnpm -C apps/web exec wrangler d1 execute upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state \
  --file=/tmp/seed.sql
printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -hex 32)" > apps/web/.dev.vars
cp apps/web/.dev.vars infra/.dev.vars
pnpm dev
```

- `pnpm dev` (plugin Cloudflare) lit `apps/web/.dev.vars` ; un
  `wrangler dev --config infra/wrangler.toml` lit `infra/.dev.vars`. Garder
  les deux identiques.
- Ajouter aussi `TURNSTILE_SECRET_KEY` (clé de test `1x000…AA` en local),
  `ADMIN_EMAILS` et `RATE_LIMIT_SALT` dans les deux fichiers.
- L'état D1 local est `apps/web/.wrangler/state`.
- `/api/poc` est réservé au staging (`APP_ENV=staging`) ; en local il renvoie 404.
- Vérifier : `curl http://127.0.0.1:8787/` renvoie 200 ; inscription via
  `POST /api/auth/sign-up/email`.

## 2 bis. PWA et carte

- Incrémenter `VERSION` dans `apps/web/public/sw.js` à chaque déploiement qui
  change le cache, puis vérifier `/sw.js`, `/manifest.webmanifest` et `/offline`.
- Le bandeau « Recharger » apparaît quand un nouveau service worker attend ;
  il envoie `SKIP_WAITING` puis recharge la page.
- La carte Leaflet est chargée au clic ; les tuiles OSM doivent garder leur
  attribution.

## 2 ter. Contribution, signalements et modération

- `ADMIN_EMAILS` liste les comptes modérateurs (séparés par des virgules).
  En local : `admin@upk.test` ; le mot de passe temporaire est dans
  `UPK_STAGING_ADMIN_PASSWORD` (fichier local, jamais versionné).
- `TURNSTILE_SECRET_KEY` et `VITE_TURNSTILE_SITE_KEY` utilisent les clés de
  test Cloudflare en local/staging. La production initiale utilise aussi les
  clés de test pour l'instant : les remplacer avant l'ouverture publique.
- En-têtes de sécurité : `apps/web/src/start.ts` ajoute CSP, HSTS, nosniff,
  `frame-ancestors 'none'`, `Referrer-Policy` et `Permissions-Policy`. La CSP
  autorise Turnstile (`challenges.cloudflare.com`) et les tuiles OSM.
- Workers Logs : `[observability] enabled = true` dans `infra/wrangler.toml`
  (production et staging). Sentry n'est pas encore branché.
- Parcours de vérification :
  1. `/fr/contribuer` : soumettre un lieu. Il reste invisible en recherche.
  2. Se connecter avec un compte de `ADMIN_EMAILS`, puis ouvrir
     `/fr/admin/moderation` : approuver ou rejeter avec un motif.
  3. Rechercher le lieu : il apparaît avec `verifie: true` après approbation.
  4. Sur la fiche, ouvrir « Signaler une erreur », envoyer un signalement, puis
     le traiter dans la section « Signalements » de l'admin.
- Journal d'audit (colonne `action`, pas `cle`) :
  ```bash
  pnpm -C apps/web exec wrangler d1 execute upk --local \
    --config ../../infra/wrangler.toml --persist-to .wrangler/state \
    --command "SELECT action, resultat, cible_id, created_at FROM journal_admin ORDER BY created_at DESC LIMIT 10"
  ```
- R2 est actif : buckets privés `upk-photos` (production) et
  `upk-photos-staging` (staging), binding `PHOTOS`. Le formulaire propose
  jusqu'à 3 photos (JPEG/PNG/WebP, 5 Mo max). Vérifier après déploiement :
  `wrangler r2 bucket list`, puis un upload depuis `/fr/contribuer` et un
  `GET /api/photos/places/...` qui renvoie l'image en 200.

## 2 quater. Tests E2E Playwright

```bash
pnpm e2e:prepare                 # migrations + seed D1 locale
pnpm exec playwright install chromium
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium pnpm e2e   # si Chromium système
pnpm e2e                         # sinon navigateur Playwright
```

- `pnpm e2e` démarre Vite sur `127.0.0.1:5173` et prépare la D1 locale.
- Pour tester un déploiement existant :
  `E2E_BASE_URL=https://upk-staging.benwahab111.workers.dev pnpm e2e`.
- 21 parcours : accueil vide, recherche, catégorie, proximité, vocal simulé,
  assistant (accueil matin/soir, autoplay bloqué, langue, correction, questions
  complémentaires, lieu introuvable), absence de JavaScript, photos proposées, confidentialité,
  bandeau d'installation mobile et cache du service worker. Les projets
  `chromium` et `mobile-chrome` (Pixel 5) sont exécutés.
- `pnpm e2e --project=mobile-chrome` ne lance que le mobile.
- Le test PWA est ignoré sans `E2E_BASE_URL` ; il vérifie le cache `upk-v4-pages`.
- En CI, le workflow installe Chromium puis exécute `pnpm e2e`.

## 3. Staging

```bash
export CLOUDFLARE_API_TOKEN="$CLOUDFARE_API_TOKEN"
SITE_URL=https://upk-staging.benwahab111.workers.dev \
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA \
CLOUDFLARE_ENV=staging pnpm --filter @upk/web build
pnpm -C apps/web exec wrangler deploy
# BETTER_AUTH_SECRET est déjà défini sur staging ; ne le régénérer que si
# nécessaire (cela invalide les sessions).
```

- URL : `https://upk-staging.benwahab111.workers.dev`.
- D1 : `upk-staging` (`fcfcb0f4-a79d-42b7-86c4-0ccc9eead1ee`).
- R2 : `upk-photos-staging` (binding `PHOTOS`).
- **Ne pas** utiliser `wrangler deploy --env staging` sur le config généré :
  il déploie `upk` (production).
- Mesure : `curl "https://upk-staging.benwahab111.workers.dev/api/poc?q=pharmacie&runs=30"`.
- Lighthouse mobile (3G/2 Go simulés) :
  `CHROME_PATH=/usr/bin/chromium npx --yes lighthouse@12.8.2 https://upk-staging.benwahab111.workers.dev/fr --form-factor=mobile --throttling-method=simulate --only-categories=performance,accessibility,best-practices,seo`.
  Résultat de référence : 100/100/100/100, LCP 0,8 s.
- Le compte admin de staging (`admin@upk.test`) existe et `moderation.me`
  renvoie `isAdmin: true`. Le staging utilise les clés Turnstile de test.
- Le token Cloudflare est enregistré sous `CLOUDFARE_API_TOKEN` (coquille) ;
  Wrangler attend `CLOUDFLARE_API_TOKEN`. Exporter avant toute commande :
  `export CLOUDFLARE_API_TOKEN="$CLOUDFARE_API_TOKEN"`.

## 4. Migrations D1

```bash
# local
pnpm -C apps/web exec wrangler d1 migrations apply upk --local \
  --config ../../infra/wrangler.toml --persist-to .wrangler/state -y

# staging
pnpm -C apps/web exec wrangler d1 migrations apply upk-staging --remote \
  --env staging --config ../../infra/wrangler.toml -y

# production
pnpm -C apps/web exec wrangler d1 migrations apply upk --remote \
  --config ../../infra/wrangler.toml -y
```

- Migrations additives uniquement ; ne jamais modifier une migration appliquée.
- `d1 execute` refuse `BEGIN`/`COMMIT` : le seed n'en contient pas.

## 5. Catalogue Sahel

```bash
python3 infra/scripts/import-sahel.py --out /tmp/upk-sahel-sql
for file in /tmp/upk-sahel-sql/*.sql; do
  pnpm -C apps/web exec wrangler d1 execute upk --remote \
    --config ../../infra/wrangler.toml --file="$file" -y
done
```

- 41 566 lieux, 1 197 villes, 3 340 quartiers, 16 catégories ; inserts
  idempotents (`ON CONFLICT ... DO UPDATE`).
- Vérifier : `SELECT COUNT(*) FROM places` = 41 566 ; `places_fts` = 41 566.
- Sauvegarder avant et après : `bash infra/scripts/backup-d1.sh`.

## 6. Secrets

| Nom                                        | Où                                                     | Usage                                     |
| ------------------------------------------ | ------------------------------------------------------ | ----------------------------------------- |
| `BETTER_AUTH_SECRET`                       | Worker staging/production                              | Signature des sessions                    |
| `TURNSTILE_SECRET_KEY`                     | Worker staging/production                              | Anti-abus formulaires                     |
| `RATE_LIMIT_SALT`                          | Worker production                                      | Hachage des IP du rate limit              |
| `ADMIN_EMAILS`                             | Secret Worker en production, variable en staging/local | Comptes modérateurs                       |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Hors Worker                                            | Non utilisés : le binding `PHOTOS` suffit |

`wrangler secret put <NOM> --name <worker>` ; jamais dans Git, jamais dans un
`.dev.vars` versionné.

## 7. Déploiement production (M5)

État au 2026-11-21 : production sur
`https://upk.benwahab111.workers.dev` (version `65d244f8`), migrations `0003`
et `0004` appliquées, catalogue Sahel importé, en-têtes de sécurité, CSRF et
Workers Logs actifs. L'assistant vocal et la recherche intelligente sont
déployés ; les 10 parcours E2E de l'assistant passent aussi contre la
production. Turnstile utilise encore la clé de test : à remplacer
avant l'ouverture publique.

1. `BETTER_AUTH_URL` vaut `https://upk.benwahab111.workers.dev` dans
   `infra/wrangler.toml`.
2. `SITE_URL=https://upk.benwahab111.workers.dev VITE_TURNSTILE_SITE_KEY=<clé> \
pnpm --filter @upk/web build` (config production par défaut).
3. Définir les secrets Worker :
   `wrangler secret put BETTER_AUTH_SECRET --name upk`,
   `wrangler secret put ADMIN_EMAILS --name upk`,
   `wrangler secret put RATE_LIMIT_SALT --name upk`,
   `wrangler secret put TURNSTILE_SECRET_KEY --name upk`.
4. Appliquer les migrations :
   `wrangler d1 migrations apply upk --remote --config ../../infra/wrangler.toml`.
5. `pnpm -C apps/web exec wrangler deploy`.
6. Vérifier `/`, `/api/auth/get-session`, une recherche, puis le parcours
   contribution → modération → recherche et un signalement.
7. Remplacer la clé Turnstile de test par une clé réelle avant l'ouverture
   publique, puis reconstruire et redéployer.

## 7 bis. Sauvegarde et restauration D1

- Sauvegarde logique :
  `pnpm backup:d1` exporte `upk` avec `--compatibility sqlite3_cli_only`
  (obligatoire : l'export D1 standard refuse les tables FTS5), compresse,
  calcule un SHA-256 et dépose le tout dans `r2://upk-backups/d1/`.
- Rétention R2 : règle `backup-90d` sur le préfixe `d1/` (expiration après
  90 jours).
- Restauration point-in-time (Cloudflare Time Travel) :
  `pnpm -C apps/web exec wrangler d1 time-travel info upk --config ../../infra/wrangler.toml --json`
  puis `... time-travel restore upk --timestamp <RFC3339>`. La restauration
  est destructive : la tester sur une base de copie, jamais directement sur
  la production.
- Restauration logique : télécharger l'archive, vérifier le SHA-256, puis
  l'importer dans un SQLite local disposant de FTS5. Le dump
  `sqlite3_cli_only` n'est pas importable tel quel dans D1 ; il sert à
  l'analyse et à la reconstruction locale.

## 8. Retour arrière

- Code : `git revert <sha>`, rebuild, redéploiement.
- Base : migrations additives ; corriger par une nouvelle migration.
- Worker : `wrangler versions` puis `wrangler rollback` si nécessaire.

## 9. Incidents connus

- **500 `HTTPError` sur `/api/auth/*`** : `BETTER_AUTH_SECRET` absent →
  `wrangler secret put`.
- **`no such table: places_fts`** : mauvaise base locale (build staging au lieu
  de production) ou migrations non appliquées ; vérifier
  `dist/server/wrangler.json` (`name`, `d1_databases`).
- **`BEGIN`/`COMMIT` refusés par D1** : retirer du SQL.
- **`/api/poc` 404** : `APP_ENV=production` ; route réservée au staging et au
  développement.
- **`wrangler deploy --env staging` déploie `upk`** : utiliser
  `CLOUDFLARE_ENV=staging` au build.
- **`moderation.me` renvoie `isAdmin: false`** : l'e-mail du compte n'est pas
  exactement dans `ADMIN_EMAILS` ou n'est pas vérifié ; recréer la session
  après correction.
- **Contribution invisible en recherche** : `statut_publication` vaut encore
  `en_attente` ; l'approuver dans `/fr/admin/moderation`.
- **Turnstile refusé** : `TURNSTILE_SECRET_KEY` et `VITE_TURNSTILE_SITE_KEY`
  doivent appartenir au même mode (test ou réel).
- **`/api/uploads` ou `/api/photos/*` en 503** : binding `PHOTOS` absent du
  Worker déployé ou bucket supprimé ; vérifier `dist/server/wrangler.json` et
  `wrangler r2 bucket list`.
- **Assistant silencieux** : le navigateur peut bloquer l'autoplay ; toucher
  « Activer la voix ». Vérifier aussi que le volume et la voix système de la
  langue choisie sont disponibles. La saisie écrite reste le repli.
- **Micro indisponible** : `SpeechRecognition` n'existe pas sur tous les
  navigateurs (surtout iOS) ; utiliser le champ texte. Pour le haoussa et le
  zarma, la qualité dépend des voix installées et doit être validée sur
  appareil réel.
- **Salutation à la mauvaise heure** : l'heure vient du fuseau de l'appareil,
  pas du serveur ; vérifier le réglage automatique de l'heure sur le téléphone.

## 10. Checklist avant déploiement

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` verts.
- [ ] Migrations appliquées à la base cible.
- [ ] `BETTER_AUTH_URL` correct.
- [ ] `BETTER_AUTH_SECRET` présent.
- [ ] Recherche « pharmacie » et « صيدلية » OK.
- [ ] `ADMIN_EMAILS` contient le compte de modération et `moderation.me`
      renvoie `isAdmin: true`.
- [ ] `TURNSTILE_SECRET_KEY` réel en production (pas la clé de test).
- [ ] Contribution → approbation → recherche → signalement vérifiés.
- [ ] `/api/poc` absent ou 404 en production.
