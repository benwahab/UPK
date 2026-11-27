# Assistant vocal et recherche intelligente

|                    |                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Version**        | 1.0                                                                                                                                               |
| **Périmètre**      | Accueil vocal, compréhension des demandes, recherche de lieux, questions complémentaires                                                          |
| **Infrastructure** | Cloudflare Workers + D1 + R2 uniquement, sans service vocal cloud                                                                                 |
| **Code**           | `packages/domain/src/assistant.ts`, `packages/i18n/src/assistant.ts`, `apps/web/src/components/voice-assistant.tsx`, `apps/web/src/lib/speech.ts` |

## 1. Ce que fait l'assistant

L'assistant est monté dans le layout `/$locale` : il est disponible sur
l'accueil, les fiches et les pages légales. Il ne remplace pas le moteur de
recherche existant : il comprend la demande, appelle `search.places`, puis
transmet la recherche au moteur principal et affiche les résultats dans la
page.

Il sait traiter :

- une catégorie : « Trouve une pharmacie près de moi » ;
- un quartier : « Je cherche le quartier Yantala » ;
- une ville : « Les restaurants à Bamako » ;
- un nom exact : « Où se trouve l'hôtel Univers ? » ;
- une faute ou une variante : « Pharmacie la fayete » ;
- une question complémentaire après un résultat : horaires, téléphone,
  adresse, site web, distance, résultat suivant, ouverture de la fiche ;
- une salutation : « Bonjour », « Good morning », « Fofo ».

Les intentions sont détectées dans `parseAssistantQuery`, sans appel réseau.
Le texte original est conservé : une faute de frappe n'est jamais remplacée
silencieusement par le premier résultat.

## 2. Accueil vocal

### 2.1 Heure locale

`greetingPeriod` lit l'heure dans le fuseau de l'appareil avec
`Intl.DateTimeFormat`. Le navigateur fournit le fuseau réel (`Africa/Niamey`,
`Africa/Bamako`, `Africa/Ouagadougou`, etc.). Aucune heure serveur n'est
utilisée.

| Heure locale  | Message                            |
| ------------- | ---------------------------------- |
| 05:00 à 13:59 | « Bonjour et bienvenue sur UPK ! » |
| 14:00 à 04:59 | « Bonsoir et bienvenue sur UPK ! » |

Le message est suivi de : « Que souhaitez-vous rechercher aujourd'hui ? ».

Limite : si l'horloge ou le fuseau de l'appareil est mal réglé, la salutation
suit ce réglage. UPK ne demande pas la géolocalisation au chargement uniquement
pour corriger l'heure, afin de ne pas afficher une demande de permission non
sollicitée.

### 2.2 Une seule fois par ouverture

Un indicateur de module (`greetedThisOpen`) empêche la répétition lors des
navigations internes. Un rechargement complet de la page crée un nouveau
contexte JavaScript et peut donc relancer l'accueil, ce qui correspond à une
nouvelle ouverture effective.

L'utilisateur peut désactiver l'accueil dans le panneau. Le choix est conservé
dans `localStorage` sous `upk-assistant-greeting` (`on`/`off`).

### 2.3 Autoplay et premier geste

Les navigateurs peuvent bloquer la synthèse vocale avant une interaction. Si
la lecture automatique est bloquée, le panneau affiche « Activer la voix » et
un bouton compact apparaît près du bouton de l'assistant. Le premier
`pointerdown` ou `keydown` déclenche la lecture. L'utilisateur peut aussi
arrêter la voix à tout moment.

## 3. Voix, langues et limites réelles

| Langue   | Code reconnaissance | Synthèse                    | État           |
| -------- | ------------------- | --------------------------- | -------------- |
| Français | `fr-FR`             | Voix système                | Pris en charge |
| Anglais  | `en-US`             | Voix système                | Pris en charge |
| Arabe    | `ar-SA`             | Voix système, interface RTL | Pris en charge |
| Haoussa  | `ha-NG`             | Voix système si installée   | Expérimental   |
| Zarma    | `dje`               | Voix système si installée   | Expérimental   |

La reconnaissance et la synthèse utilisent uniquement les API du navigateur
(`SpeechRecognition` / `webkitSpeechRecognition` et `speechSynthesis`). Aucun
enregistrement audio n'est envoyé à UPK, aucun service tiers n'est ajouté et
aucune clé d'API vocale n'est nécessaire. Le navigateur peut toutefois envoyer
l'audio à son propre service de reconnaissance ; ce comportement dépend du
navigateur et du système.

**Limite vérifiée :** les tests automatisés simulent `SpeechRecognition` et
`speechSynthesis` pour vérifier le comportement de l'interface. Ils ne prouvent
pas la qualité acoustique réelle sur un téléphone Android 2 Go en 3G. La
qualité haoussa et zarma doit être validée sur les appareils cibles avec des
locuteurs natifs avant de la présenter comme une prise en charge complète. Si
la voix ou la reconnaissance n'est pas disponible, l'assistant l'indique et
propose la saisie écrite ; il ne prétend pas avoir compris.

## 4. Compréhension des demandes

Le parseur normalise les accents, la casse, les apostrophes et l'arabe
(diacritiques, alef, ya, ta marbuta). Il retire les formules de politesse, les
verbes introductifs et les articles, puis cherche :

1. une salutation ;
2. une question complémentaire ;
3. une catégorie, via des alias français, anglais, arabes, haoussa et zarma ;
4. une intention de proximité (« près de moi », « near me », « kusa da ni »,
   « sambu ») ;
5. le texte restant, transmis tel quel au moteur.

Exemples testés :

| Demande                              | Interprétation                                |
| ------------------------------------ | --------------------------------------------- |
| `Trouve une pharmacie près de moi.`  | catégorie `pharmacie`, proximité              |
| `Où se trouve l'hôtel Univers ?`     | nom `hotel univers`, catégorie `hotel`        |
| `Je cherche le quartier Yantala.`    | nom `yantala` (le moteur détecte le quartier) |
| `Pharmacie la fayete`                | nom complet conservé, correction proposée     |
| `Ina neman kantin magani kusa da ni` | catégorie `pharmacie`, proximité              |
| `Quels sont les horaires ?`          | question complémentaire `hours`               |

## 5. Recherche renforcée

Le moteur existant est conservé. Les ajouts sont les suivants.

- **Alias de catégories** : anglais, arabe, haoussa et zarma en plus du
  français. Un alias ne s'applique à une requête écrite que si la requête
  entière est une catégorie ; « Pharmacie du Plateau » reste un nom.
- **Fautes et variantes** : FTS5 en préfixe, puis repli `LIKE` sur les
  premiers caractères, puis `isFuzzyMatch` (distance d'édition adaptée à la
  longueur). Le repli s'exécute aussi quand FTS renvoie des résultats mais
  aucun nom exact.
- **Quartiers et villes fautifs** : préfixe SQL puis comparaison floue en
  TypeScript, avec priorité au quartier exact et sans transformer une recherche
  de proximité en recherche de quartier.
- **Correction non silencieuse** : l'accueil affiche « Vouliez-vous dire
  “…” ? » et l'assistant demande confirmation. Le clic ou la confirmation est
  nécessaire avant de relancer sur le nom corrigé.
- **Nom exact prioritaire** : un nom exact reste devant un résultat plus
  proche ; le tri par distance ne s'applique qu'après l'intention et l'exactitude.
- **Aucun résultat** : message exact « Je n'ai pas trouvé cet endroit dans
  UPK… » avec un lien vers le formulaire de contribution existant. Aucun
  nouveau circuit de contribution n'est créé.

## 6. GPS et distances

- Une recherche de catégorie ou de proximité appelle
  `navigator.geolocation.getCurrentPosition` avec `maximumAge: 0` et
  `enableHighAccuracy: true`.
- Une recherche par nom ne déclenche pas de demande de permission si elle
  n'est pas déjà accordée ; si elle l'est, la distance est calculée.
- Si la position est refusée ou indisponible, l'assistant l'explique et
  continue sans distance. Il n'affiche pas de distance inventée.
- Le tri de l'accueil utilise la distance seulement quand `lat`/`lng` sont
  présents.

## 7. Interface et accessibilité

- Bouton flottant avec `aria-label`, panneau `role="dialog"`, messages
  `aria-live="polite"`.
- Champ texte toujours disponible dans le panneau, même quand la voix échoue.
- États visibles : écoute, recherche, parole, erreur, voix indisponible.
- Bouton d'arrêt de la voix.
- Sélecteur de langue de l'assistant indépendant de l'URL de recherche ; la
  langue de l'interface reste `fr`, `en` ou `ar`.
- En arabe, le panneau passe en `dir="rtl"` et utilise la police arabe des
  tokens.

## 8. Poids et performance

Mesure du build client après intégration :

| Élément                                       | Taille                           |
| --------------------------------------------- | -------------------------------- |
| Total `apps/web/dist/client`                  | 853 681 octets                   |
| Total avant l'assistant (référence)           | 765 334 octets                   |
| Écart total                                   | +88 347 octets (+11,5 %)         |
| Chunk contenant l'assistant (`distance-*.js`) | 15 901 octets, 5 116 octets gzip |

Le découpage des routes déplace une partie du code entre `index` et
`_locale` ; l'écart total est donc plus fiable que la variation d'un seul
fichier. Aucune dépendance npm n'a été ajoutée. Le code vocal reste dans un
chunk chargé avec le layout, ce qui permet de l'utiliser sur toutes les pages
sans nouvelle requête au moment de l'ouverture du panneau.

## 9. Tests

```bash
pnpm --filter @upk/domain test   # 28 tests
pnpm --filter @upk/i18n test     # 10 tests
pnpm --filter @upk/api test      # 33 tests
pnpm typecheck                   # 6 projets
pnpm lint
pnpm e2e --project=mobile-chrome # 20 tests, 1 PWA ignoré sans E2E_BASE_URL
```

Les 10 parcours E2E de l'assistant couvrent : accueil du matin, accueil du
soir, absence de répétition après navigation, désactivation, autoplay bloqué
et activation au premier geste, recherche vocale de catégorie avec GPS frais,
incompréhension puis saisie écrite, message de lieu introuvable, correction
non silencieuse, question complémentaire et changement de langue.

## 10. Fichiers à modifier

| Besoin                                              | Fichier                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| Ajouter un alias ou une intention                   | `packages/domain/src/assistant.ts`                                          |
| Modifier un message dans les cinq langues           | `packages/i18n/src/assistant.ts`                                            |
| Modifier le panneau ou le flux                      | `apps/web/src/components/voice-assistant.tsx`                               |
| Modifier la reconnaissance ou la synthèse           | `apps/web/src/lib/speech.ts`                                                |
| Modifier le message « aucun résultat » de l'accueil | `packages/i18n/src/assistant.ts` et `apps/web/src/routes/$locale/index.tsx` |
