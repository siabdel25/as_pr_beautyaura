# HANDOFF : état du projet au 04/11/2026

Document de passation : où en est le projet, comment le lancer, ce qui a été décidé et ce qui reste. Source de vérité fonctionnelle : `docs/CAHIER_DES_CHARGES.md`. Règles de travail : `CLAUDE.md`. Détail des tâches : `TODO.md`. Vue d'ensemble : `ROADMAP.md`.

## 1. En une phrase

Site vitrine statique avec réservation en ligne pour un studio de cils et de sourcils (Lyon). La phase 1 (statique, Hostinger) est prête mais **pas en ligne**, bloquée par des informations client. Le backend de la phase 2 (Django, DRF, Celery) est écrit et testé, mais non déployé et désactivé par défaut côté site.

## 2. Où en est chaque phase

| Phase | État | Bloqué par |
|---|---|---|
| 1. Site statique + tunnel de réservation | Prêt, 136 marqueurs `[À COMPLÉTER]` / `[À REMPLACER]` / `[À CONFIRMER]` dans 18 pages | Réponses du client : `docs/QUESTIONNAIRE-CLIENT.md` |
| 2. Réservation automatisée | Code et tests faits (72 tests Django) | SMTP, hébergement, SMS, relecture des textes |
| 3. Gestion complète (acompte, agenda, liste d'attente…) | Non commencée | Phases précédentes |

`main` et `origin/main` sont synchronisés. Aucune branche locale en cours.

## 3. Structure du dépôt

- `frontend/` : site statique (HTML, Bootstrap 5.3, Vue 3 sans bundler, V-Calendar). `tools/` génère les pages (`build-pages.mjs`), `tests/` contient les tests Node, `data/` les JSON (services, horaires, réservation…).
- `backend/` : Django + DRF + Celery. Application `reservations` (modèles, `slots.py`, `services.py`, `tasks.py`, `ics.py`, `vertical.py`, admin, API).
- `docker-compose.yml`, `docker/` : pile de développement (db, redis, backend, worker, beat, web sur le port 8080).
- `docs/` : cahier des charges, déploiement, recette, ADR (`docs/adr/`), analyse d'architecture, textes de blog (`docs/blog/`), questionnaire client.

## 4. Lancer et tester

```bash
# Site statique (depuis frontend/)
npx serve .
node tools/build-pages.mjs
node --test "tests/*.test.mjs"                      # 49 tests

# Backend (depuis backend/)
pip install -r requirements.txt
DJANGO_DEBUG=true python manage.py test             # 70 tests

# Pile complète
docker compose up --build                           # http://localhost:8080 et /api/v1/health/
docker compose exec backend python manage.py charger_donnees --data-dir /data

# Liste des marqueurs restants avant mise en ligne (depuis frontend/)
node tools/verifier-mise-en-ligne.mjs --liste
```

`DJANGO_SECRET_KEY` est obligatoire quand `DJANGO_DEBUG` est faux. Variables d'environnement : `backend/.env.example`.

## 5. Décisions structurantes (ne pas re-débattre sans raison)

- **Django pour la phase 2** (04/11/2026). La phase 1 reste statique : la stack de `CLAUDE.md` ne change pas.
- **ADR 0001** (`docs/adr/0001-statique-d-abord-wagtail-sur-declencheurs.md`) : statique d'abord ; Wagtail seulement quand l'hébergement phase 2 est décidé, que la réservation est validée en production et que la praticienne publie plus d'une fois par mois ; plateforme multi-métiers seulement avec un second métier signé ; un déploiement par client. Analyse complète : `docs/ANALYSE-ARCHITECTURE-2026-11-04.md`.
- **Toute demande est « à confirmer »** : jamais « confirmé » sans validation réelle de la praticienne. Le client ne peut pas imposer `statut` ni `duree_min`.
- **Anti double réservation** : un verrou par jour (`JourVerrou`, `select_for_update`). Les statuts « à confirmer » et « confirmée » bloquent les créneaux.
- **Créneaux** : `backend/reservations/slots.py` est le miroir de `frontend/.../slots.js` (15 min de tampon, 12 h de délai, 60 jours d'horizon, pas de 30 min, Europe/Paris, sûr aux changements d'heure). Parité vérifiée sur 2 450 cas.
- **Mode API du site** : activé seulement par `"api": "/api/v1"` dans `frontend/data/reservation.json` (`null` = comportement de la phase 1). Ne fonctionne pas sur Hostinger mutualisé.
- **Métier isolé** : tout ce qui est propre aux cils et sourcils (questions à risque, catégorie de retouche) est dans `backend/reservations/vertical.py`.
- **Aucune dépendance ni service ajouté sans accord** (`CLAUDE.md`). C'est pourquoi le blog n'utilise ni parseur Markdown ni CMS Git.

## 6. Courriers automatiques (Celery)

| Courrier | Déclencheur | Garde |
|---|---|---|
| Notification de la praticienne | nouvelle demande | `notifiee_le` |
| Confirmation avec `.ics` | action « Confirmer » ou statut changé | `confirmation_envoyee_le`, statut revérifié à l'envoi |
| Refus / annulation | action « Refuser » ou « Annuler », ou statut changé | `annulation_envoyee_le`, statut revérifié |
| Rappel J-1 | beat, 10 h, rendez-vous confirmés de demain | `rappel_envoye_le` |
| Demande d'avis J+2 | beat, 11 h, seulement si `AVIS_URL` est renseigné | `avis_demande_le` |
| Relance de retouche J+18 | beat, 11 h, catégorie extensions, ignorée si déjà un prochain rendez-vous | `retouche_proposee_le` |
| Rattrapage des courriers perdus | beat, toutes les 10 min, et `manage.py renvoyer_notifications` | idempotent, rendez-vous du jour ou à venir |

Un broker ou un SMTP arrêté ne bloque jamais une réservation. Limite connue : lors d'une longue panne SMTP, un même courrier peut partir deux fois (préféré à un message perdu).

## 7. Ce qui reste, et ce qui le bloque

| Tâche | Bloquée par |
|---|---|
| Mise en ligne de la phase 1 | Réponses du client (`docs/QUESTIONNAIRE-CLIENT.md`) ; relecture des textes légaux par un professionnel |
| SMTP de production, `STUDIO_EMAIL`, `STUDIO_NOM`, `AVIS_URL`, `SITE_URL` | Choix du fournisseur d'e-mail et nom réel du studio |
| Hébergement de la phase 2 | Décidé : VPS Docker (ADR 0002) ; reste à choisir le VPS et le fournisseur d'e-mail |
| SMS de confirmation et de rappel | Choix d'un service (coût, dépendance) |
| Blog : afficher les 4 articles | Relecture par la praticienne ; choix pages `.mjs` ou Wagtail (ADR 0001) |
| Flux Instagram après consentement | Compte Instagram |
| Adaptateur API et portage avis/retouche (ADR 0002) | Pas de créneau, questionnaire serveur, porteur des avis (questions ouvertes de l'ADR) |
| Spike Wagtail avec Django 6.1 | Déclencheurs de l'ADR (non recommandé avant) |

## 8. Points d'attention

- **Données de santé minimales** : `Reservation.reponse_a_risque` (booléen) remplace `questionnaire` et `precisions`. Le questionnaire reste contrôlé côté serveur pour calculer ce booléen, mais n'est pas stocké.
- **Données d'exemple** : `reservation.json`, `services.json`, `horaires.json` et `galerie.json` portent `"statut": "exemple"`, prix à `null`. Ni `api` ni `endpoint` n'est renseigné : les demandes ne partent pas.
- **Textes provisoires `[À VALIDER]`** : e-mails de refus, d'annulation, d'avis et de retouche (`tasks.py`), 4 articles de blog. Aucun n'est validé par la praticienne.
- **Délai de retouche** : le cahier des charges dit J+18 à un endroit et J+21 à un autre. J+18 retenu, à confirmer.
- **Décision du 04/11/2026 (ADR 0002)** : option 2 et hébergement VPS Docker. Le site statique appellera l'API `booking` d'`as_shoppy_frm_v2` ; `backend/` d'ici sera gelé après recette. Questions encore ouvertes dans l'ADR.
- **Doublon** : l'autre dépôt `as_shoppy_frm_v2` contient déjà My Beauty Aura (booking, Wagtail 7.0.9 sur Django 5.2). Voir `docs/COMPARAISON-AS-SHOPPY-FRM-V2.md` et `docs/DIAGNOSTIC-API-BOOKING.md`. Ne lancer aucune refonte avant décision.
- **Wagtail** : compatibilité avec Django 6.1 lue dans les métadonnées (`Django>=5.2`), pas testée. L'impossibilité de l'héberger sur le mutualisé Hostinger n'est pas vérifiée.
- **Non testé** : e-mails avec un vrai SMTP (seulement le backend console), verrou de jour sous vraie concurrence (testé en séquentiel sur SQLite), test de navigateur automatisé dans le dépôt (vérifié à la main dans Chrome sur la pile Docker).
- **Limites du mode API** : le calendrier fait 3 requêtes (une par mois de l'horizon) et reste grisé pendant le chargement ; pas de SMS ; pas de `LOCATION` dans l'`.ics` (adresse inconnue).
- **Interdits de contenu** : aucune promesse médicale ni de croissance des cils, aucun avis ou chiffre inventé, aucune photo sans consentement écrit, pas de microblading sans confirmation, pas d'adresse, SIRET ou téléphone inventés (`[À COMPLÉTER]`).

## 9. Conventions de travail

Vouvoiement. Commits petits et atomiques `type(portée): message`, avec le trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Un court plan avant toute tâche touchant plusieurs fichiers. Cocher `TODO.md` après chaque tâche. Une branche par tâche, fusion en avance rapide dans `main`, puis suppression de la branche. En cas de doute sur un contenu ou un choix métier : poser la question.

## 10. Par où reprendre

1. Envoyer `docs/QUESTIONNAIRE-CLIENT.md` au client (le relire avant : ton et prénom à adapter).
2. À réception, renseigner `frontend/data/*.json`, regénérer les pages, relancer `verifier-mise-en-ligne.mjs` jusqu'à zéro marqueur.
3. Décider l'hébergement de la phase 2 et le fournisseur d'e-mail, puis passer `"api": "/api/v1"` et tester sur la pile Docker.
4. Faire relire les textes provisoires, puis publier le blog.
