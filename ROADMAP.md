# Roadmap — Site Lash & Brow

Vue d'ensemble. Le détail des tâches est dans `TODO.md`, le périmètre dans `docs/CAHIER_DES_CHARGES.md`.

## Fait

- **Fondations** : design system « courbe du cil », gabarit, polices auto-hébergées.
- **Pages** : accueil, prestations, tarifs, à propos, FAQ, conseils, contact, 404, pages légales.
- **Réservation (phase 1)** : tunnel en 4 étapes, calcul de créneaux (tampon, délai 12 h, horizon 60 jours, changements d'heure), `.ics`, honeypot, tests.
- **Galerie, SEO, accessibilité, performance** : avant/après, données structurées, sitemap, CSP, bandeau cookies, mesure sans cookie, audits.
- **PWA** : manifeste, service worker, page hors ligne, installation.
- **Déploiement** : `.htaccess` Hostinger, guide de déploiement, recette, fiche Google documentée.
- **Démo Docker** : nginx et fausses données Python, avec tests.
- **Structure (04/11/2026)** : dépôt scindé en `frontend/` (site statique) et `backend/` (squelette Django/DRF/Celery), pile `docker-compose.yml` (nginx, gunicorn, PostgreSQL, Redis, worker Celery).
- **Backend de réservation (04/11/2026)** : API DRF (`/api/v1/`), créneaux recalculés côté serveur (identiques au front), anti double réservation par verrou de jour, tunnel branché sur l'API (désactivé par défaut), calendrier des disponibilités par mois.
- **Courriers automatiques (04/11/2026)** : notification de la praticienne, e-mail de confirmation avec invitation `.ics`, e-mail de refus ou d'annulation, rappel J-1, demande d'avis J+2, relance de retouche J+18, rattrapage des courriers perdus (Celery + beat).
- **Arbitrage d'architecture (04/11/2026)** : statique d'abord, Wagtail et plateforme multi-métiers sur déclencheurs (ADR 0001), config métier isolée dans `backend/reservations/vertical.py`.
- **Contenu prêt (04/11/2026)** : textes des 4 premiers articles de blog (`docs/blog/`, à valider) et questionnaire unique pour le client (`docs/QUESTIONNAIRE-CLIENT.md`).

## En cours : mise en ligne (bloquée par le client)

- Coordonnées réelles (rue, téléphone, e-mail, SIRET), prestations et tarifs réels, horaires.
- Renseigner `endpoint` dans `data/reservation.json` pour l'envoi des demandes.
- Relecture des textes par la praticienne, remplacement des marqueurs `[À COMPLÉTER]` et `[À REMPLACER]` (`node tools/verifier-mise-en-ligne.mjs --liste`).
- Déploiement, HTTPS, redirections ; fiche Google Business Profile ; vérification Rich Results.
- Photos avec consentements écrits ; décisions sur l'acompte et l'offre de première visite ; confirmation sur le microblading.

## Phase 2 : réservation automatisée (Django + DRF + Celery)

Stack décidée le 04/11/2026 : API Django REST Framework, tâches planifiées Celery + Redis, PostgreSQL. La phase 1 reste statique et publiée seule (le backend n'est pas nécessaire à la mise en ligne). Hébergement à prévoir : un mutualisé ne suffit pas pour la phase 2 (VPS ou PaaS compatible Docker).

Le code de la phase 2 est écrit et testé (70 tests Django). Reste, et tout dépend d'une décision ou d'une information externe :

- Brancher un vrai SMTP (fournisseur à choisir), renseigner `STUDIO_EMAIL`, `STUDIO_NOM`, `AVIS_URL`, `SITE_URL` en production.
- Décider l'hébergement (VPS ou PaaS Docker), puis activer `"api": "/api/v1"` dans `frontend/data/reservation.json`.
- SMS de confirmation et de rappel (service à choisir).
- Faire relire par la praticienne les textes d'e-mails (refus, annulation, avis, retouche) et les 4 articles de blog, puis choisir le support du blog (pages `.mjs` ou Wagtail).
- Flux Instagram après consentement.
- À décider : système de réservation existant à remplacer ou à garder.

### Déclencheurs de bascule (ADR 0001)

- **Wagtail** quand les trois sont vrais : hébergement phase 2 décidé, réservation validée en production avec un vrai SMTP, la praticienne publie ou modifie du contenu plus d'une fois par mois.
- **Plateforme multi-métiers** seulement avec un second métier signé (un déploiement par client).

### Doublon avec as_shoppy_frm_v2 (à trancher)

My Beauty Aura existe déjà dans l'autre dépôt (booking, Wagtail, multi-établissements). Comparaison : `docs/COMPARAISON-AS-SHOPPY-FRM-V2.md`. Diagnostic de l'API : `docs/DIAGNOSTIC-API-BOOKING.md` (faisable avec un adaptateur, ~3 jours, 4 décisions préalables). Aucune refonte avant la décision.

## Phase 3 : gestion complète

- Acompte en ligne (Stripe).
- Espace praticienne avec Vue Cal (vues jour et semaine).
- Liste d'attente, cartes cadeaux, parrainage, version anglaise.
