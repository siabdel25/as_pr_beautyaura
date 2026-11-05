# Guide du tableau de bord : configurer la plateforme pour qu'elle soit prête

Date : 05/11/2026. Public : l'opérateur (propriétaire du studio ou administrateur) qui met la plateforme en service puis la tient à jour : agenda, prestations, tarifs, horaires, fermetures, e-mails.

Il y a **deux tableaux de bord**, selon l'API utilisée (ADR 0002) :

| | **Plateforme cible** (dépôt `as_shoppy_frm_v2`) | **Backend d'ici** (`backend/`) |
|---|---|---|
| Statut | Retenue pour la production | Utilisé par la démo (`scripts/demo.sh`), appelé à être remplacé |
| Administration | `https://<domaine>/gestion/` en production (`/admin/` en développement) | `http://localhost:8082/admin/` (démo) |
| Agenda | `https://<domaine>/agenda/` | Pas d'agenda graphique |
| Site | éditeur Wagtail `https://<domaine>/cms/` | site statique : fichiers de `frontend/data/` |
| Sections | Parties 1 à 9 | Partie 10 |

Les écrans ci-dessous sont décrits **d'après le code** de l'autre dépôt (`booking/admin.py`, `booking/models.py`, `docs/ADMIN_ACCES.md`, `docs/PREPROD_MBA.md`) : je ne les ai pas parcourus dans un navigateur. Les libellés exacts peuvent légèrement différer.

## 1. Avant de commencer : accès et rôles

| | Propriétaire | Assistante |
|---|---|---|
| Réservations et agenda : consulter, confirmer, annuler | oui | oui |
| Prestations, ressources, horaires, fermetures | modifier | consulter seulement |
| Réglages de l'établissement | modifier | non |
| Paiements, journal des e-mails, journal d'audit | consulter (e-mails : relancer) | non |

- Un **super-utilisateur** (compte technique) voit tous les établissements ; le propriétaire ne voit que le sien.
- **Double authentification (TOTP) obligatoire** pour le propriétaire et le super-utilisateur en production : à la première connexion, scanner le QR code avec une application d'authentification et **noter les codes de secours**. Téléphone perdu : code de secours, sinon un super-utilisateur supprime l'authentificateur (procédure dans `docs/ADMIN_ACCES.md`).
- 5 mots de passe erronés bloquent le compte 5 minutes.
- Le statut d'une réservation ne se modifie **jamais** dans un formulaire : seules les actions « Confirmer » et « Annuler » le changent.
- Toute modification (création, changement avec avant/après, suppression) est écrite dans le **Journal d'audit**, qui n'est pas modifiable.

## 2. Ordre de mise en place (la plateforme est prête quand tout est coché)

- [ ] 1. **Réglages de réservation** (partie 3) : e-mail de notification, adresse, mode « Demande ».
- [ ] 2. **Ressource** (partie 4) : la praticienne, active.
- [ ] 3. **Horaires hebdomadaires** (partie 5).
- [ ] 4. **Prestations, durées et tarifs** (partie 6), activées en dernier.
- [ ] 5. **Fermetures et ouvertures exceptionnelles** (partie 7).
- [ ] 6. **E-mails** : Brevo, boîte réelle, Reply-To (`docs/EMAIL-BREVO-BOITE.md`).
- [ ] 7. **Site** (partie 8) : coordonnées, textes, thème.
- [ ] 8. **Réservation d'essai** de bout en bout, puis **annulation** de l'essai (partie 9).
- [ ] 9. Sauvegarde chiffrée **restaurée** une fois (`docs/DEPLOIEMENT-VPS.md`).

L'ordre compte : une prestation active sans horaire ne propose aucun créneau, et sans e-mail de notification le studio n'est pas prévenu.

## 3. Réglages de réservation

Administration, **Réglages de réservation** : un seul enregistrement par établissement.

| Champ | Valeur conseillée | Explication |
|---|---|---|
| E-mail de notification | `contact@<domaine>` | Reçoit les demandes et messages **et** sert de `Reply-To` aux clientes. Vide : aucune notification |
| Adresse de l'établissement | adresse **réelle**, fournie par le client | Affichée dans les e-mails et le fichier `.ics`. Ne jamais inventer : laisser vide tant qu'elle n'est pas connue |
| Fuseau horaire | `Europe/Paris` | Toutes les heures d'ouverture sont dans ce fuseau |
| Devise | `EUR` | |
| **Mode de réservation** | **Demande** | « Demande » : le créneau est bloqué et le studio confirme ou refuse. « Immédiate » confirme après acompte : **ne pas l'utiliser**, la règle du projet est de ne jamais afficher « confirmé » sans validation du studio |
| Délai minimum (h) | 12 | Pas de réservation à moins de 12 h |
| Horizon (jours) | 60 | Jusqu'où le calendrier propose des dates |
| Tampon entre rendez-vous (min) | 15 | Marge après chaque rendez-vous |
| Durée du blocage (min) | 15 | Durée pendant laquelle un créneau est retenu avant paiement ou validation |
| Blocages simultanés max. par e-mail / par IP | 2 / 5 | Limite anti-abus |
| Délai d'annulation avec remboursement (h) | 24 | Concerne l'acompte, s'il y en a un |
| Rappel avant le rendez-vous (h) | 24 | `0` : pas de rappel |
| Moyens de paiement, durée de la page de paiement, chemins de retour | laisser les valeurs par défaut | Sans objet tant qu'aucun acompte n'est configuré |
| Conservation des données (mois) | à fixer avec le conseil juridique | Défaut 36 ; passé ce délai après le rendez-vous, les données sont anonymisées ; `0` : jamais (à éviter) |

Le site statique d'ici affiche un délai de 12 h, un tampon de 15 min et un horizon de 60 jours depuis `frontend/data/reservation.json` : les garder **identiques** à ces réglages pour que le calendrier affiché et les créneaux réels coïncident.

## 4. Ressource (la praticienne)

Administration, **Ressources** : `Nom` (par exemple le prénom de la praticienne) et `Active`. Une ressource est ce qui se réserve. Une seule suffit pour un studio individuel. Désactiver une ressource retire ses créneaux sans effacer l'historique.

## 5. Horaires hebdomadaires (agenda de base)

Administration, **Règles de disponibilité** : une ligne par plage d'ouverture.

| Champ | Règle |
|---|---|
| Ressource | la praticienne |
| Jour | **0 = lundi** … 6 = dimanche |
| Début / Fin | heures locales (Paris) ; la fin doit être **après** le début |

- Deux plages le même jour = une pause (par exemple 09:30–12:30 et 14:00–18:30).
- Un jour sans ligne est fermé (le dimanche et le lundi n'ont aucune ligne chez le client d'exemple).
- Les horaires sont ceux **fournis par le client** (`docs/QUESTIONNAIRE-CLIENT.md`, B1) : ne pas en inventer.

## 6. Prestations, durées et tarifs

Administration, **Services réservables**.

| Champ | Explication |
|---|---|
| Nom | affiché aux clientes |
| Slug | identifiant technique (ex. `pose-cil-a-cil`). **Ne plus le changer** une fois le site publié : voir « Deux listes à garder alignées » |
| Description | sans promesse médicale ni de résultat (règle du projet : parler de « soin esthétique ») |
| Prix | en **euros** (décimal). Calculé et facturé côté serveur, jamais lu depuis le navigateur |
| Durée (min) | durée **réelle** du soin ; c'est elle qui bloque l'agenda (avec le tampon) |
| Acompte (%) / Acompte fixe (centimes) | `0` et vide : pas d'acompte en ligne. L'acompte fixe est prioritaire et plafonné au prix. Aucun paiement en bac à sable n'a été testé : ne rien activer sans recette |
| Active | décocher pour retirer une prestation de la réservation sans la supprimer |

**Mettre à jour un tarif** : modifier « Prix », enregistrer. Les réservations déjà prises gardent leur prix (`unit_price_cents` figé sur la ligne). **Ajouter une prestation** : renseigner tous les champs, activer en dernier. **Combiner des prestations** : le site permet d'en choisir plusieurs ; la durée réservée est la **somme**.

Les prestations créées par `seed_mba` **sans** `--demo-prices` restent **inactives** tant que le vrai prix n'est pas saisi : c'est voulu. Avec `--demo-prices` elles sont réservables à prix fictifs (préproduction uniquement).

### Deux listes à garder alignées

Le site statique d'ici lit `frontend/data/services.json` pour **afficher** noms, durées et prix, et envoie à l'API les **slugs**. L'API est la source de vérité pour la durée bloquée et le prix. Donc, tant qu'aucune synchronisation automatique n'existe :
- toute modification de prestation se fait **aux deux endroits** (administration et `services.json`, puis `node tools/build-pages.mjs`) ;
- un slug absent de l'API fait échouer la réservation (« Prestation inconnue ou indisponible », 400) ;
- une durée différente entre les deux montre une durée fausse à la cliente, sans bloquer l'agenda de travers (le serveur fait foi).

## 7. Fermetures et jours exceptionnels

Administration, **Exceptions de disponibilité**.

| Cas | Réglage |
|---|---|
| Fermé toute la journée (congé, jour férié) | Date + « Fermeture » coché, **sans heures** |
| Fermé sur une plage (fermeture anticipée, formation) | Date + « Fermeture » coché + début et fin |
| Ouverture exceptionnelle (un lundi, par exemple) | Date + « Fermeture » **décoché** + début et fin |
| S'applique à toute l'équipe | laisser « Ressource » vide ; sinon choisir la ressource concernée |

Début et fin vont **ensemble** : les deux ou aucun. Une fermeture n'annule pas les rendez-vous déjà pris ce jour-là : les traiter à la main (partie 9) et prévenir les clientes. Pour des congés d'été, créer une ligne par jour.

## 8. Le site (textes, coordonnées, thème)

- **Plateforme cible** : éditeur Wagtail `https://<domaine>/cms/` (compte `admin`, distinct de l'administration `/gestion/`). *Pages* : modifier un texte ; *Réglages* : couleurs, téléphone, Instagram.
- **Site statique d'ici** : les contenus sont dans `frontend/data/` (`site.json`, `studio.json`, `services.json`, `horaires.json`, `indisponibilites.json`, `galerie.json`) ; après modification, `node tools/build-pages.mjs`, puis publication. Détail : `docs/GUIDE-MISE-A-JOUR.md`.
- Tant qu'une information n'est pas fournie par le client, elle reste un marqueur `[À COMPLÉTER]` : ne rien inventer (adresse, téléphone, SIRET, certifications, avis). Liste restante : `node tools/verifier-mise-en-ligne.mjs --liste` (depuis `frontend/`).

## 9. Exploitation quotidienne

### Traiter les demandes
1. Chaque demande arrive en **« En attente »** et le créneau est déjà retenu. Un e-mail part au studio (`Reply-To` = la cliente).
2. **Réservations**, cocher la demande, action **« Confirmer les réservations sélectionnées »** : la cliente reçoit la confirmation avec le fichier `.ics`. Le mot « confirmé » n'apparaît qu'à cet instant.
3. Réponse « non » ou imprévu : action **« Annuler (par l'établissement) »**. Si la cliente a un acompte, il est remboursé. La cliente est prévenue par e-mail.
4. Dans **Agenda** (`/agenda/`) : la semaine, les demandes à valider en orange, ⚠ quand une réponse à risque est signalée ; cliquer un rendez-vous pour confirmer, refuser, marquer « terminé » ou « absence » ; **glisser-déposer** pour déplacer (la cliente est prévenue).
5. Une réponse à risque au questionnaire (allergie, traitement oculaire, grossesse) : **contacter la cliente avant de confirmer**. Seul un indicateur « oui/non » est conservé, pas le détail.

### Surveiller
| Où | Quoi | Fréquence |
|---|---|---|
| **E-mails en file** | statut « Abandonné » : corriger la cause (clé API, quota, domaine) puis « Relancer les envois abandonnés » | hebdomadaire |
| **Messages de contact** | messages du formulaire (lecture seule) | selon besoin |
| **Journal d'audit** | qui a fait quoi et quand | en cas de doute |
| **Réservations**, filtre par date | rendez-vous du lendemain, absences | quotidienne |

### Données personnelles (RGPD)
- Action **« Effacer les données personnelles de ces clientes »** : **irréversible**, à utiliser sur demande de la cliente. Elle anonymise la réservation. Procédure : `docs/RGPD_PROCEDURES.md` de l'autre dépôt.
- Une donnée effacée reste dans les sauvegardes jusqu'à leur rotation (jusqu'à 12 mois pour les mensuelles) : le consigner au registre des traitements.

### Avant une absence prolongée
Créer les fermetures (partie 7) **avant** de partir, et traiter les demandes « En attente » : une demande non traitée bloque un créneau.

## 10. Backend d'ici (`backend/`, administration `/admin/`)

Même logique, avec des écrans plus simples et **sans agenda graphique**. Compte de la démo : `studio` / `demo-studio` (changer en production).

| Écran | Rôle |
|---|---|
| **Services** | `Id` (slug), nom, catégorie (`extensions`, `rehaussement`, `sourcils`…), durée (min), « prix à partir de » (vide = non affiché), description. La catégorie `extensions` déclenche la relance de retouche |
| **Horaires d'ouverture** | une ligne par plage : jour (`lun`…`dim`), début, fin |
| **Indisponibilités** | date ; sans heures = journée entière ; avec début et fin = plage |
| **Réservations** | actions **« Confirmer »**, **« Refuser »**, **« Annuler »** ; chacune prévient la cliente par e-mail. Le statut peut aussi se changer dans le formulaire : l'e-mail part de la même façon |

À savoir :
- **`manage.py charger_donnees` écrase les horaires et les fermetures** de la base avec les fichiers de `frontend/data/` (les services sont mis à jour, jamais supprimés). Ne le relancer que pour réimporter volontairement ; sinon les changements faits dans l'administration sont perdus.
- Les délais (tampon, délai minimum, horizon) sont des **variables d'environnement** (`RESERVATION_TAMPON_MIN`, `RESERVATION_DELAI_MIN_HEURES`, `RESERVATION_HORIZON_JOURS`), pas des champs de l'administration. Un test contrôle leur cohérence avec `reservation.json`.
- Les e-mails (`STUDIO_EMAIL`, SMTP, `AVIS_URL`) se règlent dans l'environnement : `docs/EMAIL-BREVO-BOITE.md`, partie 6.

## 11. Dépannage rapide

| Symptôme | Cause probable | Action |
|---|---|---|
| Aucun créneau n'apparaît | prestation inactive, pas de règle d'horaire, ressource inactive, délai/horizon trop courts | vérifier parties 4 à 6 |
| Un jour est grisé alors qu'il devrait être ouvert | fermeture, ou tous les créneaux pris | partie 7, liste des réservations |
| « Prestation inconnue » à la réservation | slug du site différent de celui de l'API | aligner (partie 6) |
| Pas d'e-mail de notification au studio | champ « E-mail de notification » vide, ou worker/planificateur arrêté | partie 3 ; `docker compose ps` |
| Les confirmations arrivent en spam | SPF/DKIM/DMARC incomplets | `docs/EMAIL-BREVO-BOITE.md`, partie 3 |
| « Créneau pris » alors qu'il paraissait libre | quelqu'un l'a retenu entre-temps | normal : proposer un autre horaire |
| Impossible de se connecter à l'administration | TOTP, compte bloqué 5 min | `docs/ADMIN_ACCES.md` |

## 12. Non vérifié

- Écrans et libellés lus dans le code, pas dans un navigateur ; la démo `mba-demo` n'a pas été parcourue pour ce guide.
- Les paiements (acompte, remboursement) n'ont pas de recette en bac à sable : ne rien activer côté acompte avant d'en avoir.
- L'agenda `/agenda/` et la procédure d'effacement RGPD sont décrits d'après la documentation de l'autre dépôt.
