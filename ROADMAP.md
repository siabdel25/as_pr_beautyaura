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

## En cours : mise en ligne (bloquée par le client)

- Coordonnées réelles (rue, téléphone, e-mail, SIRET), prestations et tarifs réels, horaires.
- Renseigner `endpoint` dans `data/reservation.json` pour l'envoi des demandes.
- Relecture des textes par la praticienne, remplacement des marqueurs `[À COMPLÉTER]` et `[À REMPLACER]` (`node tools/verifier-mise-en-ligne.mjs --liste`).
- Déploiement, HTTPS, redirections ; fiche Google Business Profile ; vérification Rich Results.
- Photos avec consentements écrits ; décisions sur l'acompte et l'offre de première visite ; confirmation sur le microblading.

## Phase 2 : réservation automatisée (Django + DRF + Celery)

Stack décidée le 04/11/2026 : API Django REST Framework, tâches planifiées Celery + Redis, PostgreSQL. La phase 1 reste statique et publiée seule (le backend n'est pas nécessaire à la mise en ligne). Hébergement à prévoir : un mutualisé ne suffit pas pour la phase 2 (VPS ou PaaS compatible Docker).

- API de réservation (`/api/v1/`), blocage des créneaux, anti double réservation : faits sur `dev`, avec notification Celery de la praticienne. Reste : brancher le tunnel, SMTP réel, rappels.
- E-mails et SMS de confirmation et de rappel J-1 ; demande d'avis J+2 ; relance retouche J+18.
- Blog (4 articles SEO) ; flux Instagram après consentement.
- À décider avant : service d'e-mail et de SMS, système de réservation existant à remplacer ou à garder.

## Phase 3 : gestion complète

- Acompte en ligne (Stripe).
- Espace praticienne avec Vue Cal (vues jour et semaine).
- Liste d'attente, cartes cadeaux, parrainage, version anglaise.
