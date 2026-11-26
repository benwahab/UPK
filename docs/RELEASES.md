# Registre des versions

Aucun tag, aucune branche. Le repère de version est le SHA du commit.

| Version | Commit | Date | Contenu | Déployé |
| --- | --- | --- | --- | --- |
| S0 (base) | `7efedd2` | 2026-11-21 | Monorepo v2, POC D1/FTS5, seed des 1 546 lieux | Non |
| S1 (tRPC, recherche, fiche) | `f607435` | 2026-11-22 | `/api/trpc`, recherche SSR 1 546 lieux, fiche lieu | Oui (staging) |
| S1 (filtre, routes fr/en/ar) | `09f48ba` | 2026-11-22 | Filtre catégorie, routes localisées, RTL | Oui (staging) |
| S1 (SEO) | `357fae7` | 2026-11-22 | hreflang, sitemap, robots, JSON-LD, Open Graph | Oui (staging) |
| S1 (carte, PWA, Lighthouse) | `b2e442d` | 2026-11-22 | Carte Leaflet, PWA hors-ligne, contrastes, recherche sans JS | Oui (staging `e97a25ea`) |
| S2 (contribution, modération) | `bb8b14b` | 2026-11-22 | Formulaire + Turnstile + GPS, signalements, modération, audit, pages légales, titres | Oui (staging `7aa952f2`) |
| S2 (accueil, proximité, vocal) | `6983613` | 2026-11-22 | Accueil sans liste initiale, géolocalisation, tri par distance, recherche vocale | Oui (staging `7aa952f2`) |
| S2 (qualité, confidentialité) | `ebc1a80` | 2026-11-22 | Tests E2E Playwright, confidentialité position/vocal, photos masquées (R2 non activé) | Oui (staging `a745f417`) |
| S3 (PWA mobile) | `fcb44c4` | 2026-11-26 | Installation mobile, 50 pages hors ligne, CSS critique inliné, tests Pixel 5 | Oui (staging `c9ea1400`) |
| S3 (R2 photos) | `0145576` | 2026-11-26 | Upload R2 actif (3 photos, 5 Mo), galerie sur la fiche publiée, confidentialité, tests et docs | Oui (staging `6b6ba112`) |
| S3 (production initiale) | `0c5a872` | 2026-11-26 | Déploiement production, migration `0003`, R2 `upk-photos`, auth et secrets admin ; Turnstile de test temporaire | Oui (`upk` `a9263a1b`) |
| S3 (durcissement production) | `1c27a4a` | 2026-11-26 | En-têtes CSP/HSTS, Workers Logs, sauvegardes D1 dans R2 (`upk-backups`) | Oui (`upk` `f76c19c5`, `upk-staging` `dd213a9d`) |
