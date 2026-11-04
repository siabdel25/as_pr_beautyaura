# Diagnostic : notre site statique peut-il appeler l'API `booking` de `as_shoppy_frm_v2` ?

Date : 04/11/2026. Suite de `docs/COMPARAISON-AS-SHOPPY-FRM-V2.md` (option 2). Lecture seule : aucun code modifié, la démo Docker de l'autre dépôt n'a **pas** été lancée.

Lu : `booking/urls.py`, `serializers.py`, `api_errors.py`, `services/reservation.py` (créneaux, mode demande), `models.py` (`BookingSettings`), `tenants/middleware.py`, réglages CORS ; côté ici : `backend/reservations/urls.py`, `views.py`, `serializers.py`, `frontend/assets/js/app/submit.js`, `booking.js`, `data/reservation.json`.

## Verdict

**Faisable, mais pas « branchable » tel quel.** Le tunnel d'ici (`booking.js`) n'a besoin que de 3 appels, et l'autre API les couvre, avec des contrats différents. Il faut un **adaptateur** (`submit.js` : environ 100 lignes) et **4 écarts fonctionnels** à trancher, dont un touche au RGPD.

## 1. Les 3 appels, côte à côte

| Besoin | Ici | Là-bas |
|---|---|---|
| Jours d'un mois ayant un créneau | `GET /disponibilites/?month=YYYY-MM&services=id,id` → `{dates: ["YYYY-MM-DD"]}` | `GET /availability/days/?month=…&services=slug,slug` → `{days: [{date, available}], timezone, booking_mode}` |
| Créneaux d'un jour | `GET /creneaux/?date=…&services=…` → `{creneaux: ["HH:mm"]}` | `GET /availability/?date=…&services=…` → `{slots: [{start_at, end_at, resource}], booking_mode}` (instants **UTC**) |
| Créer la demande | `POST /reservations/` `{prestations:[{id}], date, heure, client:{prenom,nom,telephone,email}, premiere_visite, questionnaire, precisions, consentement_rgpd, cgv_acceptees, site_web}` → `201 {id, statut}` | `POST /bookings/` `{services:[slug], start_at, resource?, customer_name, customer_email, customer_phone, allergy, consent, website}` → `201 {booking, management_token}` |
| Erreur | `{detail}`, 409 si créneau pris | `{error:{code,message}}`, 409 `slot_taken` |

Correspondance directe : identifiants de prestation = `slug` (nos ids sont déjà des slugs : `pose-cil-a-cil`), honeypot (`site_web` ↔ `website`), 409 sur créneau pris, durée = somme des prestations (`sum(...)` dans `services/reservation.py:191`), tampon, délai, horizon.

## 2. Écarts à trancher

| # | Écart | Gravité | Piste |
|---|---|---|---|
| 1 | **Pas de questionnaire de première visite côté serveur.** Là-bas : un seul booléen `allergy`. Ici : 3 réponses (allergie à la colle, traitement oculaire, grossesse) et un texte libre `precisions`. | Haute (règle `CLAUDE.md`) | Le message « contactez le studio » est calculé côté navigateur (`validation.js`) : il reste possible. Mais le serveur ne stockerait plus que `allergy`. Décider avec la praticienne si seul l'oui/non allergie suffit, ou étendre le modèle là-bas. |
| 2 | **RGPD : notre `precisions` et nos réponses grossesse/traitement sont des données de santé.** L'autre dépôt les a écartées exprès (décision D17, champ `notes` purgé, « aucun détail médical »). | Haute | À réexaminer **ici aussi** : stocker moins. Plaide pour le modèle de là-bas. |
| 3 | **Pas de pas de 30 min.** Là-bas, le pas de créneau est fixé à 15 min (`SlotConfig.step_minutes`, non exposé dans `BookingSettings`). Ici : 30 (`reservation.json`). | Moyenne | Ajouter un réglage `step_minutes` là-bas (petit changement + migration), ou accepter 15 min. |
| 4 | **Instants UTC contre chaînes locales.** Notre règle (`CLAUDE.md`) : `YYYY-MM-DD` et `HH:mm` en Europe/Paris, pas d'arithmétique `Date`. L'API renvoie `start_at` en UTC avec le fuseau dans `timezone`. | Moyenne | L'adaptateur convertit pour l'affichage seulement (`Intl.DateTimeFormat`, fuseau renvoyé) et renvoie `start_at` tel quel à la création. Aucune arithmétique de jours. À couvrir par des tests au changement d'heure. |
| 5 | **Séparation prénom / nom** : là-bas un seul `customer_name`. | Faible | Concaténer. |
| 6 | **CGV acceptées** : pas de champ équivalent (seulement `consent` + version du texte). | Faible | Garder la case côté navigateur, ou ajouter un champ là-bas. |

## 3. Infrastructure

- **Résolution de l'établissement par nom de domaine** (`tenants/middleware.py` : `Domain.objects.get(domain=host)`). Un site statique sur Hostinger qui appelle `api.exemple.fr` envoie le domaine de l'API : il faut y enregistrer un `Domain` qui pointe vers l'établissement My Beauty Aura, ou un en-tête dédié.
- **CORS** : l'autre dépôt a `CORS_ORIGIN_ALLOW_ALL = True` avec `CORS_ALLOW_CREDENTIALS = True` dans `settings/base.py` (lignes 347–358). C'est trop large pour la production : à restreindre à notre domaine, et à refléter dans notre CSP (`connect-src` du fichier `_headers`).
- **PostgreSQL obligatoire** (contrainte d'exclusion) et hébergement Python : décision d'hébergement de la phase 2 toujours ouverte.
- **Limitation de débit** par portée (`booking_availability` 60/min, `booking_create` 10/min) : suffisant pour un studio.

## 4. Ce qui n'existe pas là-bas (à porter)

Recherche dans le code hors tests de `booking/` : aucun e-mail d'**avis J+2** ni de **relance de retouche J+18**. À porter si l'option 2 est retenue : `composer_avis`, `composer_retouche`, `envoyer_suivis` (`backend/reservations/tasks.py`) et leurs champs d'horodatage, vers leur `EmailOutbox` + tâche planifiée.

## 5. Estimation (ordre de grandeur, non mesuré)

| Travail | Où | Effort |
|---|---|---|
| Adaptateur API dans `submit.js` + tests Node | ici | ~½ journée |
| Réglage `step_minutes`, éventuel champ questionnaire | là-bas | ~½ journée |
| Domaine / CORS / CSP | là-bas + ici | ~2 h |
| Porter avis J+2 et retouche J+18 | là-bas | ~1 journée |
| Retirer `backend/reservations` d'ici (ou le geler) | ici | ~1 h, après validation |
| Recette de bout en bout (démo Docker + tunnel réel) | les deux | ~½ journée |

Total d'environ 3 jours, **dont aucun ne bloque la mise en ligne de la phase 1** (le tunnel reste en mode `api: null`).

## 6. Décisions à prendre avant tout code

1. **Option 2 retenue ?** (le site d'ici appelle `booking` de l'autre dépôt). Dépend de l'hébergement phase 2.
2. **Questionnaire** : garder 3 questions côté navigateur seulement, ou étendre le modèle là-bas ? (avis du client et d'un juriste RGPD)
3. **Pas de créneau** : 15 ou 30 minutes ?
4. **Quel dépôt porte les avis et retouches ?**

## 7. Limites

- Contrats lus dans le code, pas exécutés : aucun appel réel n'a été fait.
- `BookingCreateView`, le widget Vue et la gestion de `management_token` n'ont pas été lus en détail.
- Les estimations viennent du volume de code lu, pas d'un essai.
