# Cahier des charges — UPK v2

| | |
| --- | --- |
| **Produit** | UPK — Votre guide local |
| **Version du document** | 1.0 |
| **Statut** | À valider |
| **Périmètre** | Reconstruction complète (web desktop + application Android) |
| **Documents liés** | `docs/ARCHITECTURE.md`, `docs/PLAN_DE_TRAVAIL.md` |

---

## 1. Objet

Ce document définit ce que UPK v2 doit faire, pour qui, dans quelles limites et
selon quels critères on considérera le travail terminé. Il sert de référence
contractuelle entre le commanditaire et l'équipe de réalisation. Toute
fonctionnalité absente de ce document est hors périmètre et doit faire l'objet
d'un avenant.

## 2. Contexte

UPK v1 est une application TanStack Start adossée à Supabase. L'audit de
novembre 2026 a établi :

- backend Supabase injoignable (NXDOMAIN) ;
- PWA non installable (service worker non servi, manifeste non déclaré) ;
- modération déconnectée de la publication ;
- régression de langue sur l'authentification ;
- permissions granulaires non appliquées en base ;
- aucun test automatisé ;
- deux systèmes de migrations concurrents.

La décision est prise de **reconstruire sur des bases neuves**, avec deux
canaux assumés : **web desktop** (PWA installable) et **application Android**
(Play Store). Les données OpenStreetMap déjà intégrées sont conservées dans
`seed/`.

## 3. Vision et principes directeurs

**Vision.** Permettre à toute personne au Niger de trouver, en moins de trente
secondes, où se trouve ce dont elle a besoin, et d'agir immédiatement : appeler,
écrire, s'y rendre.

**Principes non négociables.**

1. **Le visiteur n'a pas de compte.** Chercher, consulter, appeler, itinéraire,
   proposer un lieu et signaler une erreur fonctionnent sans inscription.
2. **Le texte d'abord.** Sur un réseau lent, l'information utile arrive avant
   l'image.
3. **La proximité prime.** Un lieu proche et pertinent passe avant un lieu
   lointain mieux décrit.
4. **Rien n'est publié sans validation.** Une proposition reste invisible
   publiquement jusqu'à décision d'un modérateur.
5. **Trois langues au lancement : français, anglais, arabe**, avec le RTL
   natif. Rien n'est codé en dur : le haoussa et le zarma pourront être ajoutés
   sans refonte.
6. **Aucune donnée personnelle pour un visiteur anonyme.** Les consultations
   sont comptées de façon agrégée.
7. **Tout est testé.** Une fonctionnalité sans test n'est pas terminée.

## 4. Personas

| Persona | Contexte | Besoin principal |
| --- | --- | --- |
| **Amina, 24 ans, étudiante** | Android bas de gamme, forfait data limité, 3G | Trouver une pharmacie de garde proche, appeler |
| **Moussa, 38 ans, chauffeur** | Utilise son téléphone toute la journée | Itinéraire fiable, horaires, WhatsApp |
| **Hadiza, 45 ans, gérante de restaurant** | Ordinateur au bureau + téléphone | Créer et tenir sa fiche, voir ses statistiques |
| **Ibrahim, 30 ans, modérateur terrain** | Se déplace, valide sur place | Liste de lieux assignés, validation GPS |
| **Fatou, 35 ans, administratrice** | Ordinateur | Suivre l'activité, gérer les comptes et les signalements |
| **Visiteur presse / partenaire** | Ordinateur | Vérifier la crédibilité du service |

## 5. Parcours utilisateurs clés

### P1 — Recherche immédiate (visiteur, mobile)
Ouvre l'app → autorise la position (optionnel) → tape « pharmacie » → voit les
résultats triés par distance → appuie sur « Appeler ».

### P2 — Recherche desktop (visiteur, ordinateur)
Ouvre le site → tape une requête → voit la liste à gauche et la carte à droite
→ filtre par ville → ouvre une fiche dans un nouvel onglet.

### P3 — Proposition de lieu (visiteur)
Appuie sur « Proposer un lieu » → remplit le formulaire → ajoute une photo →
valide un CAPTCHA → reçoit un accusé de réception → le lieu part en modération.

### P4 — Validation terrain (modérateur)
Reçoit un lot de lieux → se rend sur place → l'app vérifie qu'il est à moins de
20 m → valide ou rejette avec motif.

### P5 — Gestion de fiche (professionnel)
Crée un compte → revendique sa fiche → ajoute photos et horaires → consulte ses
statistiques.

## 6. Périmètre

### 6.1 MVP — v1.0 (obligatoire pour la mise en ligne)

| # | Fonctionnalité |
| --- | --- |
| 1 | Recherche texte + géolocalisée + filtres (région, ville, catégorie) |
| 2 | Fiche lieu complète (infos, photos, appel, WhatsApp, itinéraire) |
| 3 | Proposition de lieu avec photo et CAPTCHA |
| 4 | Signalement d'erreur |
| 5 | Favoris locaux (sans compte) |
| 6 | PWA desktop installable, hors-ligne sur les dernières fiches |
| 7 | Application Android publiée sur le Play Store |
| 8 | Modération minimale (valider / rejeter avec motif) |
| 9 | Administration minimale (comptes, catégories, signalements) |
| 10 | SEO : SSR, sitemap, données structurées `LocalBusiness` |
| 11 | Journal d'audit en écriture seule |
| 12 | Attribution ODbL visible |

### 6.2 Vagues suivantes

| Version | Contenu |
| --- | --- |
| **v1.1** | Comptes professionnels, revendication de fiche, photos gérées, statistiques |
| **v1.2** | Modules métier : pharmacie de garde, restaurant (menu), hôtel (chambres) |
| **v1.3** | Alertes médicament, assignations par zone, fusion de doublons |
| **v2.0** | Haoussa et zarma (après FR/EN/AR), paiement, API publique |

### 6.3 Hors périmètre explicite

- iOS (à réévaluer après la v1.1).
- PWA mobile : **abandonnée**, remplacée par l'app Android.
- Chat, réservation, paiement en ligne.
- Import CSV de menus/chambres.
- Recherche vocale.
- Temps réel.
- Multi-pays.

## 7. Exigences fonctionnelles

Chaque exigence est identifiée, priorisée (M = must, S = should, C = could) et
assortie de critères d'acceptation vérifiables.

### 7.1 E1 — Recherche

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-RCH-01 | Rechercher par texte libre sur le nom, la description et le quartier | M |
| EF-RCH-02 | Trier par pertinence, puis par distance si la position est connue | M |
| EF-RCH-03 | Filtrer par catégorie, région, ville, quartier | M |
| EF-RCH-04 | Filtrer par rayon (1, 5, 10, 25 km) quand la position est connue | S |
| EF-RCH-05 | Ne jamais afficher de distance sans position autorisée | M |
| EF-RCH-06 | Paginer par curseur, 20 résultats par page | M |
| EF-RCH-07 | Proposer des recherches suggérées quand zéro résultat | S |
| EF-RCH-08 | Ignorer les accents et la casse (« ecOle » = « École ») | M |
| EF-RCH-09 | Répondre en moins de 400 ms côté serveur (p95) | M |
| EF-RCH-10 | Résoudre une localité inconnue via un service géographique | C |

**Critères d'acceptation.**

- *Étant donné* « pharmacie » saisi, *quand* je valide, *alors* j'obtiens au
  moins un résultat si une pharmacie existe dans le rayon, triée par distance.
- *Étant donné* une position refusée, *quand* je recherche, *alors* aucune
  distance n'apparaît dans la liste.
- *Étant donné* une requête sans résultat, *alors* un message explicite et des
  suggestions s'affichent.

### 7.2 E2 — Fiche lieu

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-FIC-01 | Afficher nom, catégorie, adresse, quartier, horaires, description | M |
| EF-FIC-02 | Bouton d'appel (`tel:`) et WhatsApp si disponibles | M |
| EF-FIC-03 | Itinéraire ouvrant l'application de cartes dans un nouvel onglet | M |
| EF-FIC-04 | Galerie de photos avec texte alternatif | M |
| EF-FIC-05 | Badge de vérification (vérifié / à vérifier / source fiable) | M |
| EF-FIC-06 | Signaler une erreur depuis la fiche | M |
| EF-FIC-07 | Ajouter aux favoris | S |
| EF-FIC-08 | Partage (lien canonique) | S |
| EF-FIC-09 | Ne jamais exposer `osm_id` ni les données internes de modération | M |

### 7.3 E3 — Contribution

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-CON-01 | Proposer un lieu sans compte | M |
| EF-CON-02 | Exiger au moins une photo | M |
| EF-CON-03 | Valider par CAPTCHA (Turnstile) | M |
| EF-CON-04 | Limiter à 5 propositions par heure et par IP | M |
| EF-CON-05 | Accuser réception avec un identifiant de suivi | S |
| EF-CON-06 | Signaler une erreur sans compte | M |
| EF-CON-07 | Statut initial `en_attente`, invisible publiquement | M |

### 7.4 E4 — Comptes et authentification

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-CPT-01 | Inscription et connexion par e-mail + mot de passe | M (personnel en v1.0, public en v1.1) |
| EF-CPT-02 | Confirmation d'e-mail | M (personnel en v1.0, public en v1.1) |
| EF-CPT-03 | Réinitialisation du mot de passe | M (personnel en v1.0, public en v1.1) |
| EF-CPT-04 | Session web en cookie `HttpOnly`, `Secure`, `SameSite=Lax` | M |
| EF-CPT-05 | Session mobile en stockage sécurisé natif | M (v1.1) |
| EF-CPT-06 | Aucune inscription obligatoire pour un visiteur | M |
| EF-CPT-07 | Connexion Google (plus tard) | C |

### 7.5 E5 — Espace professionnel

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-PRO-01 | Créer une fiche, statut `en_attente` | M (v1.1) |
| EF-PRO-02 | Modifier sa fiche, sans changer son statut de publication | M |
| EF-PRO-03 | Téléverser et supprimer ses photos | M |
| EF-PRO-04 | Revendiquer une fiche non revendiquée | M |
| EF-PRO-05 | Voir ses statistiques agrégées | S |
| EF-PRO-06 | Un professionnel ne voit que ses fiches | M |

### 7.6 E6 — Modération et administration

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-MOD-01 | File des propositions en attente | M |
| EF-MOD-02 | Valider une proposition → elle devient publique | M |
| EF-MOD-03 | Rejeter avec motif obligatoire (5 à 400 caractères) | M |
| EF-MOD-04 | Vérifier la présence physique à moins de 20 m (GPS serveur) | M |
| EF-MOD-05 | Traiter les signalements | M |
| EF-MOD-06 | Gérer les comptes et les rôles | M |
| EF-MOD-07 | Journal d'audit en lecture seule, filtrable | M |
| EF-MOD-08 | Toute action sensible est journalisée (acteur, avant, après) | M |
| EF-MOD-09 | Les permissions sont vérifiées côté serveur à chaque appel | M |

### 7.7 E7 — Modules métier (v1.2)

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-MET-01 | Pharmacies de garde par groupe et par période | S |
| EF-MET-02 | Menu de restaurant | S |
| EF-MET-03 | Chambres et tarifs d'hôtel | S |
| EF-MET-04 | Médicaments et alertes de disponibilité | C |
| EF-MET-05 | Un module n'est visible que si le lieu a des données | M |

### 7.8 E8 — PWA desktop

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-PWA-01 | Manifeste déclaré, icônes 192/512 + maskable | M |
| EF-PWA-02 | Service worker enregistré et servi à la racine | M |
| EF-PWA-03 | App-shell disponible hors-ligne | M |
| EF-PWA-04 | 20 dernières fiches consultées disponibles hors-ligne | S |
| EF-PWA-05 | Notification de mise à jour avec bouton « Recharger » | M |
| EF-PWA-06 | Bouton d'installation affiché uniquement sur desktop | M |

### 7.9 E9 — Application Android

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-MOB-01 | Recherche et fiche identiques au web en contenu | M |
| EF-MOB-02 | Géolocalisation native | M |
| EF-MOB-03 | Appel, WhatsApp, itinéraire natifs | M |
| EF-MOB-04 | 50 dernières fiches consultées hors-ligne | S |
| EF-MOB-05 | Poids de l'APK inférieur à 30 Mo | M |
| EF-MOB-06 | Compatible Android 8 et appareils 2 Go de RAM | M |
| EF-MOB-07 | Mises à jour OTA pour les correctifs | S |
| EF-MOB-08 | Bandeau « Ouvrir dans l'app » sur le web mobile | S |

### 7.10 E10 — Internationalisation

| ID | Exigence | Prio |
| --- | --- | --- |
| EF-I18N-01 | Trois langues : français, anglais, arabe | M |
| EF-I18N-02 | Bascule de langue sans perte de contexte ni rechargement complet | M |
| EF-I18N-03 | RTL complet en arabe (web et mobile) | M |
| EF-I18N-04 | URL localisées (`/fr`, `/en`, `/ar`) et `hreflang` réciproques | M |
| EF-I18N-05 | Traduction des catégories, de l'interface et des pages légales | M |
| EF-I18N-06 | Repli automatique si une clé de traduction manque | M |
| EF-I18N-07 | Détection de la langue du système sur mobile | S |
| EF-I18N-08 | Numérotation latine conservée pour téléphones et distances | M |
| EF-I18N-09 | Aucun débordement de mise en page en arabe (test visuel) | M |

## 8. Exigences non fonctionnelles

### 8.1 Performance

| ID | Exigence | Cible |
| --- | --- | --- |
| ENF-PERF-01 | LCP web (Android milieu de gamme, 3G) | < 2,5 s |
| ENF-PERF-02 | INP web | < 200 ms |
| ENF-PERF-03 | CLS web | < 0,1 |
| ENF-PERF-04 | JavaScript initial web (gzip) | < 180 Ko |
| ENF-PERF-05 | Réponse API p95 | < 400 ms |
| ENF-PERF-06 | Poids APK | < 30 Mo |
| ENF-PERF-07 | Démarrage à froid Android | < 3 s |

### 8.2 Disponibilité et résilience

- Disponibilité cible : **99,9 %** mensuelle.
- Dégradation gracieuse : si la géolocalisation échoue, la recherche reste
  utilisable sans distance.
- Si l'API est indisponible, le web affiche le cache et un message explicite.

### 8.3 Accessibilité

- Conformité **WCAG 2.1 niveau AA**.
- Navigation complète au clavier sur le web.
- Contrastes vérifiés en thème clair et sombre.
- Toutes les images ont un texte alternatif utile.
- Les états de chargement sont annoncés (`aria-live`).

### 8.4 SEO

- Rendu serveur des pages publiques (recherche, fiche, pages légales).
- `sitemap.xml` généré, `robots.txt` correct.
- Données structurées `LocalBusiness` sur chaque fiche.
- URL canoniques, pas de contenu dupliqué entre web et app.
- Balises Open Graph et image de partage.

### 8.5 Internationalisation

Langues au lancement : **français (`fr`), anglais (`en`), arabe (`ar`)**.

- Aucune chaîne en dur : tout passe par un catalogue versionné.
- Détection : segment d'URL sur le web (`/fr`, `/en`, `/ar`), langue du système
  sur mobile, choix manuel persistant dans les deux cas.
- Repli : `ar → en → fr`, `en → fr`.
- L'arabe impose le **sens droite-à-gauche (RTL)** : mise en page miroir,
  propriétés CSS logiques, icônes directionnelles inversées.
- Les chiffres restent en numération latine (`latn`) pour les téléphones, les
  distances et les coordonnées, y compris en arabe.
- Formats de date, de nombre, de devise (FCFA) et de téléphone localisés via
  `Intl`.
- Le contenu utilisateur (nom et description d'un lieu) n'est pas traduit
  automatiquement : la langue d'origine est indiquée.
- Les catégories, les libellés d'interface et les pages légales sont traduits.
- SEO : `hreflang` réciproques, `lang` et `dir` sur `<html>`, sitemaps par
  langue, URL canoniques par langue.

**Critères d'acceptation.**

- *Étant donné* la locale `ar`, *quand* j'ouvre n'importe quelle page, *alors*
  la mise en page est en RTL, le texte est en arabe et aucun élément ne déborde.
- *Étant donné* une fiche en français, *quand* je passe en anglais, *alors*
  l'interface change de langue mais le nom du lieu reste inchangé.
- *Étant donné* un numéro de téléphone, *quand* la locale est `ar`, *alors* il
  s'affiche en chiffres latins et reste cliquable.

### 8.6 Hors-ligne

- Web : app-shell + 20 dernières fiches.
- Mobile : 50 dernières fiches + favoris.
- Les actions d'écriture hors-ligne sont **refusées** avec un message clair
  (pas de file d'attente en v1).

### 8.7 Sécurité

- Autorisation vérifiée **côté serveur** sur chaque procédure (aucune RLS
  disponible avec D1).
- Aucun secret dans le client.
- Rate limiting sur toutes les écritures publiques.
- Turnstile sur les formulaires anonymes.
- Validation Zod de toutes les entrées.
- Requêtes SQL paramétrées uniquement.
- Journal d'audit append-only.
- En-têtes de sécurité (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`).
- Téléversements : type MIME, taille, chemin contrôlés côté serveur.

### 8.8 Vie privée

- Aucun identifiant personnel pour un visiteur anonyme.
- Statistiques agrégées uniquement.
- Pas de cookie de suivi publicitaire.
- Durée de conservation des journaux : 13 mois.
- Politique de confidentialité et mentions légales publiées.

### 8.9 Observabilité

- Erreurs front et back remontées (Sentry).
- Latence et taux d'erreur par procédure API.
- Métrique « recherches sans résultat ».
- Alertes sur pic d'erreurs et sur chute du taux de succès.

### 8.10 Compatibilité

- Web : Chrome, Edge, Firefox, Safari (2 dernières versions majeures).
- Android : 8.0 minimum, test sur 2 Go de RAM.
- Écrans : 360 px à 1920 px de large.

## 9. Modèle de données (vue d'ensemble)

Base **D1 (SQLite)**. Identifiants `text` (UUID v4 générés côté application),
booléens `integer` 0/1, dates ISO 8601 en `text`.

### 9.1 Référentiels

| Table | Colonnes principales |
| --- | --- |
| `regions` | `id`, `nom`, `slug` |
| `departements` | `id`, `region_id`, `nom`, `slug` |
| `communes` | `id`, `departement_id`, `nom`, `slug` |
| `villes_zones` | `id`, `commune_id`, `nom`, `slug`, `latitude`, `longitude` |
| `categories` | `id`, `nom`, `slug`, `icone`, `ordre`, `parent_id` |
| `category_translations` | `category_id`, `langue`, `nom` |

### 9.2 Lieux

| Table | Colonnes principales |
| --- | --- |
| `places` | `id`, `nom`, `nom_normalise`, `description`, `category_id`, `region_id`, `departement_id`, `commune_id`, `ville_zone_id`, `quartier`, `adresse`, `latitude`, `longitude`, `telephone`, `telephone_normalise`, `whatsapp`, `horaires`, `site_web`, `statut_publication`, `statut_verification`, `owner_id`, `source`, `osm_id`, `osm_type`, `licence_source`, `importe_le`, `metadata`, `langue`, `actif`, `created_at`, `updated_at` |
| `place_photos` | `id`, `place_id`, `cle_r2`, `url_publique`, `alt`, `ordre`, `created_at` |
| `place_aliases` | `id`, `place_id`, `alias`, `alias_normalise`, `langue`, `source` |
| `places_fts` | table virtuelle FTS5 (`nom`, `description`, `quartier`, `content='places'`) |

### 9.3 Comptes et autorisations

| Table | Rôle |
| --- | --- |
| `user` | Comptes Better Auth |
| `session` | Sessions |
| `account` | Fournisseurs d'authentification |
| `verification` | Jetons de vérification |
| `profiles` | Prénom, nom, téléphone, `admin_suspendu` |
| `user_roles` | `user_id`, `role` (`professionnel`, `moderateur`, `administrateur`, `super_admin`) |
| `user_permissions` | `user_id`, `permission` |

### 9.4 Contribution et modération

| Table | Rôle |
| --- | --- |
| `signalements` | `place_id`, `type_probleme`, `description`, `traite`, `created_at` |
| `revendications` | `place_id`, `user_id`, `statut`, `created_at` |
| `lots_assignation` | `nom`, `moderateur_id`, `centre_lat`, `centre_lng`, `rayon_m` |
| `assignations_moderation` | `lot_id`, `place_id`, `moderateur_id`, `statut`, `motif_refus`, `traite_le` |
| `journal_admin` | `acteur_id`, `acteur_role`, `action`, `section`, `cible_*`, `resultat`, `avant`, `apres`, `created_at` |

### 9.5 Modules métier (v1.2)

`pharmacie_gardes`, `groupes_garde`, `groupe_garde_membres`, `medicaments`,
`plats`, `chambres`, `favoris`, `alertes_medicament`.

### 9.6 Index obligatoires

- `places(latitude, longitude)` — préfiltre géographique.
- `places(category_id)`, `places(ville_zone_id)`, `places(statut_publication)`.
- `places(telephone_normalise)` — détection de doublons.
- `places(nom_normalise)`.
- `places_fts` (FTS5).
- `assignations_moderation(place_id)` unique partiel sur `statut='a_verifier'`.

## 10. Contrats d'API

API **tRPC** exposée sur `/api/trpc`, consommée par le web et le mobile.

### 10.1 Public

```
search.places({ q?, lat?, lng?, categorySlug?, regionSlug?, villeSlug?,
                quartier?, radiusKm?, limit?, cursor? })
places.byId({ id })
places.bySlug({ slug })
categories.list()
geo.resolve({ q })
geo.reverse({ lat, lng })
```

### 10.2 Contribution

```
proposals.create({ nom, categorieId, latitude, longitude, adresse?, quartier?,
                   telephone?, horaires?, photoKey, turnstileToken })
reports.create({ placeId, typeProbleme, description?, turnstileToken })
```

### 10.3 Compte

```
auth.*                     (Better Auth)
me.profile()
me.favorites.list() / toggle({ placeId })
me.alerts.list() / create() / delete()
```

### 10.4 Professionnel

```
pro.places.list()
pro.places.create() / update({ id, ... })
pro.photos.list({ placeId }) / add({ placeId, key, ordre }) / remove({ id })
pro.stats({ placeId })
pro.claims.create({ placeId })
```

### 10.5 Administration

```
admin.moderation.queue({ cursor })
admin.moderation.approve({ placeId, lat, lng })
admin.moderation.reject({ placeId, lat, lng, motif })
admin.reports.list() / resolve({ id })
admin.claims.list() / approve({ id }) / reject({ id })
admin.accounts.search({ q }) / grantRole() / revokeRole() / setPermissions()
admin.categories.list() / create() / update() / remove()
admin.journal.list({ acteurId?, section?, action?, from?, to?, cursor })
admin.assignments.create() / list()
```

### 10.6 Règles de contrat

- Toute entrée est validée par un schéma Zod partagé dans `packages/domain`.
- Toute procédure renvoie soit une donnée typée, soit une erreur
  `{ code, message }` normalisée.
- Aucune procédure ne renvoie un champ interne (`osm_id`, `owner_id`,
  `statut_publication` d'un lieu non publié).
- Les procédures d'écriture exigent une session valide **et** une permission.

## 11. Rôles et permissions

| Permission | Visiteur | Professionnel | Modérateur | Administrateur | Super admin |
| --- | --- | --- | --- | --- | --- |
| Rechercher / consulter | ✅ | ✅ | ✅ | ✅ | ✅ |
| Proposer / signaler | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gérer ses fiches | — | ✅ (les siennes) | — | — | ✅ |
| Valider / rejeter un lieu | — | — | ✅ | ✅ | ✅ |
| Traiter les signalements | — | — | — | ✅ | ✅ |
| Traiter les revendications | — | — | — | ✅ | ✅ |
| Gérer les catégories | — | — | — | ✅ (permission) | ✅ |
| Gérer les comptes | — | — | — | ✅ (permission) | ✅ |
| Lire le journal | — | — | — | ✅ (permission) | ✅ |
| Attribuer des rôles | — | — | — | ✅ (permission) | ✅ |

**Règles.**

1. Personne ne peut s'attribuer un rôle à soi-même.
2. Un super administrateur peut tout, sans exception.
3. Les permissions sont vérifiées **dans la couche service**, jamais uniquement
   dans l'interface.
4. Toute action sensible écrit une ligne dans `journal_admin`.

## 12. Règles métier

### 12.1 Publication

- `statut_publication ∈ { en_attente, en_examen, valide, refuse }`.
- Seuls les lieux `valide` **et** `actif = 1` sont visibles publiquement.
- Un lieu importé d'OSM est `valide` à l'import (source fiable, tracée).
- Une proposition humaine est `en_attente`.
- Le rejet enregistre un motif obligatoire.

### 12.2 Distance

- Calculée uniquement si l'utilisateur a fourni une position.
- Jamais affichée si la position est inconnue.
- Formule de Haversine, arrondie à 50 m sous 1 km, sinon au km.

### 12.3 Vérification terrain

- Un modérateur ne peut valider ou rejeter que s'il se trouve à **20 m maximum**
  du lieu, position vérifiée côté serveur.

### 12.4 Doublons

- Deux lieux sont candidats au doublon si même téléphone normalisé, ou nom
  similaire (≥ 0,8) et distance < 100 m.
- La fusion conserve la fiche la plus complète et archive l'autre.

### 12.5 Téléphone

- Normalisation au format international `+227XXXXXXXX`.
- Un numéro invalide n'est jamais affiché comme cliquable.

### 12.6 Recherche

Score = `pertinence_texte × 100` + `bonus_vérification` + `bonus_téléphone`
− `pénalité_distance`, avec un préfiltre par boîte englobante avant le calcul
de distance.

**Normalisation multilingue.** Avant indexation et avant requête :

- latin : minuscules, suppression des accents ;
- arabe : suppression des diacritiques (harakat), unification des variantes de
  alef (`أ إ آ ا`), de ya (`ي ى`) et de ta marbuta (`ة ه`) ;
- les alias (`place_aliases`) sont indexés avec leur langue, ce qui permet de
  trouver un lieu par son nom arabe, français ou anglais.

## 13. Contraintes techniques

- Hébergement **Cloudflare Workers** (web + API).
- Base **D1** (SQLite), accès via **Drizzle**.
- Fichiers **R2**, URLs signées, contrôle type/taille côté serveur.
- Authentification **Better Auth**.
- CAPTCHA **Turnstile**, rate limiting natif Workers.
- Import OSM via **Cron Triggers + Queues**.
- Aucun serveur permanent, aucun conteneur.
- Limites Workers/D1 à valider avant la mise en production (taille de base,
  nombre de paramètres par requête, temps CPU).

## 14. Conformité et obligations légales

- **ODbL** : attribution « © les contributeurs OpenStreetMap » visible et
  provenance conservée pour chaque lieu.
- **Mentions légales**, **politique de confidentialité**, **CGU** publiées.
- **Play Store** : politique de confidentialité accessible, formulaire Data
  Safety, classification de contenu, signature Play App Signing.
- Aucune donnée personnelle collectée sans base légale identifiable.

## 15. Definition of Done

Une fonctionnalité est terminée lorsque :

1. le code est relu (auto-revue documentée) et poussé sur `main` ;
2. les tests unitaires et d'intégration passent ;
3. le typecheck et le lint passent sans erreur ;
4. les critères d'acceptation sont vérifiés manuellement ;
5. la documentation est à jour ;
6. le comportement est vérifié sur un appareil Android réel ;
7. aucune régression n'est constatée sur les parcours existants.

## 16. Indicateurs de succès

| Indicateur | Cible à 3 mois |
| --- | --- |
| Taux de recherches avec clic sur un résultat | > 40 % |
| Taux de recherches sans résultat | < 15 % |
| Temps jusqu'au premier résultat | < 1,5 s |
| Sessions sans plantage (Android) | > 99,5 % |
| Fiches publiées et vérifiées | > 2 000 |
| Installations Play Store | > 1 000 |
| Complétude des traductions (fr, en, ar) | 100 % |

## 17. Risques

| Risque | Impact | Mitigation |
| --- | --- | --- |
| Perte définitive des données v1 | Élevé | Données OSM déjà extraites dans `seed/` ; export runtime à tenter avant coupure |
| Dérive de périmètre | Élevé | Ce document fait foi ; tout ajout passe par un avenant |
| Limites D1/Workers découvertes tard | Moyen | POC en sprint 0, tests de charge avant production |
| Faible qualité des données OSM | Moyen | Circuit de modération, signalements, fusion de doublons |
| Coût de la review Play Store | Moyen | Compte développeur et test fermé lancés dès le sprint 0 |
| Réseau lent / appareils faibles | Élevé | Budgets de performance, offline, texte d'abord |
| Perte de SEO au changement de domaine | Moyen | Plan de redirections 301, sitemap, canoniques |

## 18. Gouvernance

- **Décisions techniques** : consignées dans `docs/ARCHITECTURE.md` (section
  ADR). Toute décision structurante fait l'objet d'un ADR.
- **Changements de périmètre** : avenant écrit, validé par le commanditaire.
- **Dépôt et branche** : un seul dépôt, une seule branche (`main`). Aucune
  branche de fonctionnalité, aucune pull request.
- **Historique** : jamais de `push --force`, jamais de réécriture de commits
  déjà poussés.
- **Contrôle qualité** : le pipeline s'exécute à chaque push. Un commit rouge
  est corrigé par un commit suivant, jamais par un reset.
- **Retour arrière** : `git revert` puis redéploiement du dernier état stable.
- **Tags** : aucun. Le repère de version est le SHA du commit, consigné dans
  `docs/RELEASES.md`.
- **Lovable** : aucune dépendance, aucun artefact, aucun service.
- **Livraison** : chaque fin de sprint produit une version déployable.

## 19. Livrables

1. Ce cahier des charges.
2. `docs/ARCHITECTURE.md`.
3. `docs/PLAN_DE_TRAVAIL.md`.
4. `seed/niamey-2026-08-30.json` + `seed/ATTRIBUTION.md`.
5. Monorepo initialisé avec CI.
6. Web déployé sur Workers.
7. Application Android publiée (test fermé puis production).
8. Documentation d'exploitation (runbook).

## 20. Glossaire

| Terme | Définition |
| --- | --- |
| **Lieu** | Établissement ou point d'intérêt référencé |
| **Proposition** | Lieu soumis par un visiteur ou un professionnel, en attente de validation |
| **Publication** | Action de rendre un lieu visible dans la recherche |
| **Vérification** | Contrôle terrain confirmant l'existence et la position du lieu |
| **Lot d'assignation** | Groupe de lieux confié à un modérateur dans un rayon donné |
| **PWA** | Application web installable sur ordinateur |
| **AAB** | Android App Bundle, format de publication Play Store |
| **ODbL** | Licence Open Database License d'OpenStreetMap |
| **Turnstile** | CAPTCHA invisible de Cloudflare |
