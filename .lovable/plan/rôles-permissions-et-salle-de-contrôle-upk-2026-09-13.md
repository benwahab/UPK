# Rôles, permissions et salle de contrôle UPK

## 1. Visiteurs sans compte

Rien de la recherche, de la fiche, des appels, des itinéraires, des liens ou de l'ajout de lieu ne demandera de compte. Aucune donnée personnelle n'est associée aux visiteurs : les consultations restent comptées de façon anonyme et agrégée (aucun identifiant de personne enregistré).

Les pages publiques garderont un simple lien « Connexion » destiné aux professionnels et à l'équipe, jamais une invitation obligatoire.

## 2. Hiérarchie des rôles

Cinq rôles : **visiteur** (sans compte), **professionnel**, **modérateur**, **administrateur**, **super administrateur**.

- Le super administrateur voit et peut tout, sans exception.
- Personne ne peut s'attribuer un rôle à soi-même ; seul le super administrateur (ou un administrateur ayant la permission « gérer les administrateurs ») accorde un rôle.
- Le compte propriétaire principal (benwahab111@gmail.com) devient super administrateur.

## 3. Permissions par personne

Chaque administrateur ou modérateur reçoit une liste de permissions cochables :

établissements, validation des lieux, professionnels, statistiques, comptes, modérateurs, administrateurs, activité administrative, paramètres, données sensibles.

Le tableau de bord et la barre de navigation n'affichent que les sections autorisées ; l'accès direct par URL est aussi refusé côté serveur.

## 4. Lieux proposés : circuit de validation

Chaque proposition (avec ou sans compte) suit un statut : **En attente de vérification → En cours d'examen → Validé** ou **Refusé**. Rien n'est publié avant validation. La file de modération affiche et fait avancer ces statuts, avec motif en cas de refus.

## 5. Gestion des comptes (espace super admin)

Nouvelle page « Comptes » :

- recherche par e-mail, nom ou téléphone ;
- fiche du compte : rôle, permissions, date de création, état ;
- actions : accorder / retirer le rôle administrateur ou modérateur, définir les permissions, suspendre puis réactiver l'accès administratif.

## 6. Activité des administrateurs

Nouvelle page indépendante « Activité des administrateurs », réservée aux personnes ayant la permission correspondante. Chaque ligne indique : qui, son rôle, l'action, l'élément concerné, la section, la date et l'heure, le résultat, et — quand c'est pertinent — la valeur avant et après.

Sont enregistrées : connexion et déconnexion à l'administration, validation ou refus d'un lieu, modification ou suppression d'informations, suspension et réactivation de comptes, changements de rôle et de permissions, ajout d'un professionnel, traitement des demandes et signalements.

Le journal est en écriture seule : personne, même administrateur, ne peut modifier ou supprimer une ligne. Filtres par personne, par section, par type d'action et par période.

## 7. Bouton ADMIN

Après connexion, un bouton « ESPACE ADMIN » bien visible apparaît dans l'en-tête pour les modérateurs, administrateurs et super administrateurs uniquement. Les visiteurs et les comptes professionnels sans permission ne le voient pas.

## Détails techniques

- Migration : enum `app_role` (`professionnel`, `moderateur`, `administrateur`, `super_admin`), table `user_roles` (rôles hors table profils, pour éviter toute élévation de privilège), table `user_permissions` (permission par personne) + colonne `admin_suspendu`.
- Fonctions `SECURITY DEFINER` : `a_role(uuid, app_role)`, `a_permission(uuid, text)` (vraie pour un super admin), utilisées dans toutes les policies RLS ; `profiles.role` reste alimenté pour compatibilité, sans être la source d'autorité.
- Table `journal_admin` (acteur, rôle, action, section, cible, résultat, `avant`/`apres` en JSON, horodatage) : `INSERT` par le personnel autorisé, `SELECT` limité à la permission « activité », aucune policy `UPDATE`/`DELETE`. Écriture via une fonction serveur unique appelée par chaque action sensible.
- Colonne `statut_soumission` sur `places` (`en_attente`, `en_examen`, `valide`, `refuse`) + `motif_refus`, avec remplissage des lignes existantes ; la publication publique n'affiche que `valide` (ou les lieux importés déjà fiables).
- Grants explicites sur chaque nouvelle table ; fonctions serveur `createServerFn` avec `requireSupabaseAuth` et vérification de permission dans le handler.
- Front : hook `useAutorisations` (rôle + permissions), `AdminShell` filtrant les onglets, nouvelles routes `/admin/comptes` et `/admin/activite`, bouton ESPACE ADMIN dans l'en-tête public.
