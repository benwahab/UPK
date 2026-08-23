# UPK: Votre Guide Local

Crée "UPK" — un moteur de recherche local pour le Niger, avec un slogan : "Dis-moi ce que tu cherches. UPK trouve où le trouver."

CONTEXTE DU PRODUIT (vision complète, pour orienter les choix d'architecture même si on ne construit que le Lot 1 maintenant) :
UPK aide les gens à trouver rapidement un lieu, un établissement ou un service près d'eux au Niger — pharmacies, restaurants, garages, hôtels, écoles, points géographiques, etc. Ce n'est pas un moteur généraliste type Google : la priorité absolue est la PROXIMITÉ et la pertinence locale. Le système doit rester extensible : de nouvelles catégories métier (pharmacie avec stock/gardes, hôtel avec chambres, restaurant avec menus...) seront ajoutées plus tard, ainsi que des comptes professionnels (Business), une soumission de lieux par les utilisateurs avec validation admin, une recherche vocale/langage naturel, et un centre d'administration no-code. NE CODE PAS ces modules maintenant — construis seulement le LOT 1 ci-dessous, mais avec un schéma de données assez générique pour les accueillir sans tout reconstruire.

LOT 1 À CONSTRUIRE MAINTENANT :

1. Schéma de données (Supabase/PostgreSQL avec PostGIS) :
- table `categories` : id, nom, slug, parent_id (nullable, pour sous-catégories), icône — doit permettre à un admin d'ajouter des catégories sans toucher au code plus tard
- table `places` (lieux/établissements) : id, nom, description, category_id, adresse, quartier, latitude, longitude (colonne géographique PostGIS), téléphone, whatsapp, horaires (texte simple pour l'instant), site_web, statut de vérification (enum: à_vérifier / source_fiable / vérifié), source (enum: interne / web_public / soumission_utilisateur), created_at, updated_at
- table `place_photos` : id, place_id, url, ordre
- Index géospatial sur la colonne de localisation pour permettre une requête "lieux à moins de X km d'un point donné"

2. Page de recherche (écran principal, simple) :
- Un seul champ de recherche en haut : "Que recherchez-vous ?"
- Demande la géolocalisation du navigateur avec consentement explicite (bouton clair, pas de popup automatique intrusive)
- Résultats sous forme de liste de cartes triées par proximité, chaque carte affiche : nom, catégorie, distance (ex: "450 m" ou "2,4 km" — n'affiche JAMAIS de distance si la position n'est pas connue), téléphone, bouton "Itinéraire" qui ouvre Google Maps dans un nouvel onglet avec les coordonnées du lieu
- Filtre simple par catégorie au-dessus des résultats

3. Page fiche lieu (détail d'un établissement) :
- Toutes les infos : nom, description, adresse, horaires, téléphone, whatsapp (lien direct), site web, photos, badge de statut de vérification (🟢🔵🟡)

4. Données de test :
- Insère une trentaine de lieux réalistes à Niamey, Niger (mélange de catégories : pharmacie, restaurant, garage, hôtel, école, point géographique comme un rond-point ou un marché), avec de vraies coordonnées GPS approximatives de quartiers de Niamey (Plateau, Banifandou, Yantala, Nogaré, Wadata, etc.)

5. PWA — obligatoire :
- manifest.json complet (nom "UPK", icônes, couleur de thème, display: standalone)
- Service worker pour permettre l'installation sur smartphone (Ajouter à l'écran d'accueil) et un minimum de mise en cache pour les connexions lentes
- L'app doit être installable sur Android et iOS depuis le navigateur

CONTRAINTES IMPORTANTES :
- Interface entièrement en français
- Design simple, mobile-first (la majorité des utilisateurs seront sur smartphone avec une connexion parfois lente) — priorise le texte et les infos essentielles avant les images, chargement progressif des photos
- Ne construis PAS encore : comptes utilisateurs, comptes business, dashboard, système de soumission/validation, recherche vocale, modules métier spécialisés (pharmacie/hôtel/restaurant), import CSV, administration. On les ajoutera dans les lots suivants une fois cette base validée.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/31972c2f-fa9a-4ff5-853d-b38a41ad6e76).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
