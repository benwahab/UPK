# Refonte complète de l’authentification UPK

## Résultat attendu
- Réunir connexion et inscription dans une carte unique de 850 × 550 px sur ordinateur.
- Afficher le formulaire actif sur une moitié et un panneau bleu arrondi sur l’autre.
- Faire glisser réellement le panneau et les formulaires, sans rechargement ni rupture visuelle.
- Adapter la même logique en disposition verticale sur les écrans de 650 px et moins.

## Mise en œuvre
- Conserver les appels d’authentification, la confirmation d’email, le renvoi de confirmation et la redirection existants.
- Remplacer les deux présentations séparées par une expérience partagée pilotée par un état React, tout en gardant `/connexion` et `/inscription` fonctionnels et directement accessibles.
- Reproduire précisément les champs, textes, boutons et quatre options sociales demandés ; les options sociales seront présentées sans inventer de connexion externe non configurée.
- Charger Poppins 400/500/600/700 dans l’en-tête du document.
- Remplacer les anciens effets décoratifs par le fond gris-bleu, la carte blanche, le panneau `#7494EC`, les champs gris et le halo bleu spécifiés.
- Préserver l’accessibilité clavier, les libellés, les bons types de champs et les messages fonctionnels existants.

## Vérification
- Tester connexion, inscription, aller-retour entre les deux états, focus des champs et absence d’erreur console.
- Contrôler visuellement les largeurs 320, 375, 390, 430, 768, 1024 et 1440 px, sans débordement horizontal ni contenu coupé.
- Vérifier les métadonnées propres aux deux adresses et le bon fonctionnement des liens de récupération et conditions d’utilisation.
