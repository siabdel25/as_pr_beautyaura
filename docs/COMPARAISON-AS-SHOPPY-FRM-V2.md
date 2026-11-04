# Comparaison avec `as_shoppy_frm_v2` : réutilisable, doublons, coût d'une extraction

Date : 04/11/2026. Complément à `docs/adr/0001-statique-d-abord-wagtail-sur-declencheurs.md`, qui ne tranchait pas ce cas : l'ADR a été écrit sans avoir lu l'autre dépôt.

Dépôt comparé : `/home/django/Depot/www/APPS/as_shoppy_frm_v2` (version `v0.14.0-beta`, dernier commit `6554ba7`). Lu : `booking/` (modèles, créneaux, services, notifications, tâches, vérifications), `clientsite/`, `clients/mba.yaml`, `docs/DEMO_MY_BEAUTY_AURA.md`, `HANDOFF.md`, `requirements.txt`. Non lu en détail : les serializers et vues de l'API `booking`, le widget Vue, `tenants/`, `core/`.

## 1. Constat principal : ce n'est pas un second métier, c'est le même client

`as_shoppy_frm_v2` contient déjà **My Beauty Aura** : `clients/mba.yaml` (6 prestations, horaires mardi–samedi, thème avec la palette Encre/Soie/Mauve), un site client, une démo Docker (`docs/DEMO_MY_BEAUTY_AURA.md`) et une recette (`docs/RECETTE_BOOKING.md`). Les deux dépôts construisent donc **le même produit pour le même studio**, avec deux piles différentes.

Trois prémisses de l'ADR 0001 sont à revoir :

| Prémisse de l'ADR 0001 | Ce que montre l'autre dépôt |
|---|---|
| « Wagtail non testé avec nos versions » | Wagtail 7.0.9 tourne avec Django 5.2.18 (démo `/cms/`). Avec Django 6.1 (notre `backend/`) : toujours non testé. |
| « Aucun second métier, pas de multi-tenant » | Un modèle multi-établissements existe (`tenants/`, clé `tenant` sur chaque modèle `booking`) et un second client d'exemple (`clients/exemple-garage.yaml`). |
| « Un déploiement par client » | L'autre dépôt a choisi un déploiement partagé. Les deux options sont ouvertes. |

## 2. Tableau comparatif

| Sujet | `as_pr_beautyaura` (ici) | `as_shoppy_frm_v2` (`booking` + `clientsite`) |
|---|---|---|
| Site public | Statique (HTML, Bootstrap, Vue sans bundler), prêt pour l'hébergement mutualisé | Gabarits Django + Wagtail (`/cms/`), widget de réservation Vue/Vite |
| Base de données | SQLite par défaut ou PostgreSQL | PostgreSQL requis pour la contrainte d'exclusion (`ExclusionConstraint`) ; 12 tests réservés à PostgreSQL |
| Anti double réservation | `JourVerrou` + `select_for_update`, testé en séquentiel seulement | Verrou de la ressource + contrainte PostgreSQL `booking_no_overlap` en filet ; tests de concurrence sur PostgreSQL |
| Créneaux | `slots.py` (64 lignes), miroir exact de `slots.js`, chaînes `YYYY-MM-DD` | `slots.py` (117 lignes), fonction pure, arithmétique en UTC, mêmes règles (tampon, délai, horizon) |
| Statuts | a_confirmer, confirmée, annulée, refusée | machine à états (`WorkflowMixin`), blocage temporaire (`held`) avec expiration chaque minute |
| E-mails | Tâches Celery à garde horodatée + rattrapage toutes les 10 min | File d'envoi en base (`EmailOutbox`) avec reprise, purge à 30 jours, vérification de déploiement si le backend e-mail est factice |
| Confirmation / `.ics` | oui (45 lignes) | oui (52 lignes) |
| Rappel | J-1 à 10 h | rappel configurable (`reminder_hours`), toutes les 15 min |
| Gestion par la cliente | non | lien de gestion (jeton haché), déplacer ou annuler |
| Acompte | non (phase 3) | Stripe et PayPal codés ; recette en bac à sable absente |
| Agenda praticienne | non (phase 3, Vue Cal) | agenda en semaine, glisser-déposer, reçu PDF |
| RGPD | consentement, bandeau | consentement versionné, conservation, anonymisation, export et effacement |
| Sécurité d'accès | admin Django | rôles, journal d'audit, TOTP |
| Avis J+2, retouche J+18 | **oui** | **non trouvé** dans `notifications.py` ni `models.py` |
| Config métier | `vertical.py` + `services.json` | `clients/*.yaml` validé en bloc, commande `seed_client` |
| Tests | 70 Django + 49 Node | `booking` 134 (suite complète 1478, annoncée dans leur `HANDOFF.md`) |
| Taille du code `booking` hors tests | ~870 lignes (`backend/reservations`) | ~3 100 lignes (`booking/*.py` 2 211 + `booking/services/` 897) |

## 3. Ce qui est réutilisable

Dans le sens autre dépôt → ici :

- **Contrainte d'exclusion PostgreSQL** : filet que `JourVerrou` n'offre pas sous vraie concurrence. Utile seulement si PostgreSQL devient obligatoire ici.
- **Arithmétique de créneaux en UTC** : même résultat, avec des durées réelles autour des changements d'heure. Notre parité de 2 450 cas avec `slots.js` reste notre garde-fou.
- **File d'envoi (`EmailOutbox`)** : plus propre que nos horodatages + rattrapage, avec journal consultable.
- **Lien de gestion** (voir, déplacer, annuler) et **expiration des blocages** : fonctions absentes ici.
- **Contrôle `check --deploy` sur le backend e-mail** : évite d'oublier le SMTP de production.
- **Fichier client YAML** : même idée que notre `vertical.py` + JSON, plus complète.

Dans le sens ici → autre dépôt :

- **Avis J+2 et retouche J+18**, avec leurs garde-fous (statut revérifié, client déjà reprogrammé).
- **Textes d'e-mails** de refus, d'annulation, d'avis et de retouche (à valider par la praticienne).
- **Contenu** : questionnaire client, 4 articles de blog, pages légales, catalogue sans prix inventés.
- **Règles de contenu** (`CLAUDE.md`) : aucune promesse médicale, aucun avis inventé, marqueurs `[À COMPLÉTER]`.

## 4. Doublons

Même fonction écrite deux fois : calcul des créneaux, anti double réservation, `.ics`, confirmation, rappel, annulation, notification du studio, configuration des prestations et des horaires, site vitrine pour le même studio.

Écart de données à vérifier : `clients/mba.yaml` contient une adresse (« 36 rue de la République, 69200 Vénissieux ») et des prix de démonstration. Ni le client ni nos documents ne l'ont confirmée. **Ne pas la reprendre ici** (règle `CLAUDE.md` : aucune adresse inventée) tant que le client ne l'a pas donnée.

## 5. Ce que coûterait une extraction commune

Constat de couplage : `booking` ne s'extrait pas seul. Il importe `core` (`ServiceResult`, `WorkflowMixin`, énumérations), `product.Product` (le service **hérite** de `Product`, polymorphe) et `tenants` (isolation, rôles, audit). Une bibliothèque commune « `core_booking` » obligerait à découper ces trois dépendances.

Les estimations ci-dessous sont des ordres de grandeur, **non mesurés**.

| Option | Principe | Effort | Risque | Remarque |
|---|---|---|---|---|
| **0** | Ne rien changer, deux dépôts | 0 | Divergence croissante, travail dupliqué | Acceptable seulement si l'un des deux est abandonné vite |
| **1** | Extraire une bibliothèque commune | Élevé (jours à semaines) | Élevé | Découpe de `core`, `product`, `tenants`. À éviter : le travail d'extraction serait plus coûteux que de réutiliser directement l'implémentation qui existe déjà et qui est recettée |
| **2** | Le site statique d'ici appelle l'API de `booking` de l'autre dépôt ; on porte avis/retouche là-bas ; `backend/` d'ici est retiré | Moyen (plusieurs jours) | Moyen | Exige PostgreSQL et un hébergement Python (déjà la cible phase 2). Contrat d'API à comparer avec notre `reservation.js` |
| **3** | Tout dans l'autre dépôt (site Wagtail inclus), celui-ci devient archive de contenu | Moyen à élevé | Moyen | Sort de la pile `CLAUDE.md` (statique, sans bundler). Décision explicite requise |
| **4** | Tout ici, on abandonne `booking` de l'autre dépôt | Élevé | Élevé | Perd Stripe, agenda, rôles, RGPD, lien de gestion, déjà recettés |

**Recommandation : option 2, après un court diagnostic de compatibilité, et rien avant la décision du client sur l'hébergement.** Raison : l'autre dépôt couvre déjà ce qui est au programme de notre phase 3 (acompte, agenda, RGPD), avec une recette. Notre `backend/` n'a pas d'avance sauf avis/retouche, qui se portent en une journée. La phase 1 statique reste notre chemin critique et n'est pas touchée.

## 6. Faut-il une branche de refonte ici ?

**Pas maintenant.** Une refonte du code d'ici avant la décision serait du travail jeté si l'option 2 ou 3 est retenue.

- Cette comparaison est faite sur la branche `docs/comparaison-shoppy-frm` (aucun code).
- **Si option 2 retenue** : la refonte se fait dans l'**autre** dépôt (porter avis/retouche), et ici seulement un adaptateur dans `frontend/assets/js/app/` : branche dédiée à ce moment.
- **Si option 0** (statu quo) : aucune refonte, mais figer l'ADR et accepter les doublons.
- **Si option 1** : branche longue, à ne pas ouvrir sans décision écrite (ADR 0002).

## 7. Diagnostic à faire avant de choisir (≈ 1 demi-journée, lecture seule)

1. Lire les serializers et vues de l'API `booking` de l'autre dépôt, et comparer le contrat à notre `frontend/assets/js/app/` (champs, erreurs, jours disponibles).
2. Vérifier la compatibilité de nos règles : délai 12 h, tampon 15 min, horizon 60 jours (ici dans `reservation.json` ; là-bas dans `BookingSettings`).
3. Lancer la démo Docker de l'autre dépôt (`scripts/demo_mba.sh up`) et dérouler le scénario de réservation.
4. Chercher dans leur code un équivalent d'avis et de retouche (non trouvé dans les deux fichiers lus).
5. Confirmer avec le client : un seul des deux sites est-il attendu ? L'adresse de `mba.yaml` est-elle réelle ?

## 8. Limites de cette comparaison

- Le widget de réservation, `tenants/` et `core/` n'ont pas été lus en détail. Le couplage décrit vient des imports et des en-têtes de fichiers.
- Les tailles de code sont des comptages de lignes, pas une mesure de complexité.
- Le fonctionnement réel de la démo de l'autre dépôt n'a pas été testé ici.
- Aucun second avis indépendant n'a été demandé.
