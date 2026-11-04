# TODO — Site Lash & Brow

Légende : `[ ]` à faire, `[x]` terminé. Ordre de priorité : de haut en bas dans chaque phase. Mettre à jour après chaque tâche.

## Lot 0 — Cadrage (bloquant, à obtenir du client)

Questionnaire prêt à envoyer au client, qui regroupe les 136 marqueurs en une seule liste : `docs/QUESTIONNAIRE-CLIENT.md`.

- [ ] Nom du studio, logo, adresse, téléphone, e-mail, SIRET (acquis : ville Lyon, responsable indiqué dans `data/studio.json` ; reste rue, code postal, téléphone, e-mail, SIRET)
- [ ] Liste réelle des prestations, durées et tarifs
- [ ] Horaires d'ouverture, jours de fermeture, règles d'annulation
- [ ] Photos : praticienne, lieu, réalisations (avec consentements écrits)
- [ ] Certifications et formations
- [ ] Comptes Instagram, TikTok, fiche Google Business Profile
- [ ] Décisions : acompte, offre de première visite
- [ ] Confirmer si le microblading est proposé (activité réglementée)

## Lot 1 — Fondations et design system

- [x] Initialiser le dépôt Git, `.gitignore`, `.editorconfig`
- [x] Créer l'arborescence (voir `CAHIER_DES_CHARGES.md` 1.1.2)
- [x] `assets/css/variables.css` : palette, typographie, espacements
- [x] `assets/css/custom.css` : surcharge Bootstrap, préfixe `lb-`
- [x] Polices Bodoni Moda et Figtree en WOFF2 auto-hébergées
- [x] Gabarit de page : header, navigation, footer, bouton « Réserver » collant mobile
- [x] Composant SVG « courbe du cil » (C, CC, D, L) réutilisable
- [x] Vérifier le contraste de la palette (≥ 4,5:1)

## Lot 2 — Pages statiques

- [x] Accueil (hero avec cil dessiné au trait, prestations phares, avis, horaires)
- [x] Page prestations (vue d'ensemble)
- [x] Extensions de cils (avec sélecteur de courbure)
- [x] Rehaussement de cils
- [x] Soins des sourcils
- [x] Épilation des sourcils
- [x] Tarifs (tableau filtrable Vue)
- [x] À propos (parcours, certifications, protocole d'hygiène)
- [x] FAQ (accordéon Bootstrap, 12 à 15 questions)
- [x] Conseils après-soin
- [x] Contact (carte chargée après consentement, itinéraire, formulaire)
- [x] Page 404
- [x] Mentions légales, politique de confidentialité, CGV et annulation

## Lot 3 — Réservation (phase 1)

- [x] Vérifier la version stable de V-Calendar et l'URL CDN, figer la version avec SRI
- [x] Importmap Vue 3, structure `assets/js/app/booking.js`
- [x] Fichiers `data/services.json`, `horaires.json`, `indisponibilites.json`
- [x] Composant `ServicePicker` (multi-sélection, total durée et prix)
- [x] `DatePicker` V-Calendar : locale `fr`, lundi premier jour, jours fermés et passés désactivés
- [x] Calcul des créneaux (durée totale, tampon 15 min, délai 12 h, horizon 60 jours)
- [x] Composant `SlotGrid` (accessible au clavier)
- [x] Composant `CustomerForm` : champs, questionnaire première visite, consentement RGPD, CGV
- [x] Anti-spam : honeypot
- [ ] Envoi via fonction serverless ou Formspree, message « demande envoyée » (adaptateur `submit.js` prêt et testé ; reste à renseigner `endpoint` dans `data/reservation.json`)
- [x] Génération du fichier `.ics`
- [x] Offcanvas « Réserver » ouvrable depuis toute la page
- [x] Tests unitaires du calcul de créneaux, dont le changement d'heure (octobre et mars)
- [x] `v-cloak` et squelette de chargement

## Lot 4 — Galerie, SEO, accessibilité, performance

- [x] Galerie avant/après avec curseur et filtres par prestation
- [x] Optimisation des images (AVIF, WebP, `srcset`, dimensions explicites)
- [x] Données structurées : `HealthAndBeautyBusiness`, `Service`, `FAQPage`
- [x] Titres et meta descriptions uniques par page
- [x] Balises Open Graph, `sitemap.xml`, `robots.txt`
- [x] Bandeau cookies conforme, mesure d'audience sans cookie
- [x] Événements : `booking_start`, `booking_step_service`, `booking_step_date`, `booking_step_slot`, `booking_step_details`, `booking_submit`, `click_phone`, `click_directions`
- [x] Audit Lighthouse mobile sur accueil, prestation, réservation
- [x] Audit accessibilité (pa11y + test clavier + lecteur d'écran)
- [x] En-têtes de sécurité (CSP, Referrer-Policy, X-Content-Type-Options)
- [x] Test d'affichage de 360 px à 1920 px
- [x] PWA : manifeste, icônes, service worker généré par le build (version = empreinte du contenu), page hors ligne, bouton « Installer l'application »
- [x] `.htaccess` généré (Hostinger) : HTTPS, domaine unique `jmgaura.com`, en-têtes de sécurité, cache, fichiers de développement masqués
- [x] Démo Docker : nginx, fausses données Python régénérées au démarrage, tests (`demo/tests/`, `tests/demo-slots.test.mjs`), section dans `docs/DEPLOIEMENT.md`
- [ ] Audit Lighthouse (PWA, installabilité) et test hors ligne sur appareil réel après mise en ligne

## Lot 5 — Recette et mise en ligne

- [x] Parcourir tous les critères d'acceptation du cahier des charges (section 4) : voir `docs/RECETTE.md`
- [ ] Relecture des textes par la praticienne (aucune promesse médicale) : pages listées dans `docs/RECETTE.md`
- [ ] Remplacer tous les marqueurs `[À COMPLÉTER]` et `[À REMPLACER]` : `node tools/verifier-mise-en-ligne.mjs --liste` (coordonnées dans `data/studio.json`)
- [ ] Déploiement, HTTPS, redirections, nom de domaine : marche à suivre dans `docs/DEPLOIEMENT.md`
- [ ] Fiche Google Business Profile : catégories, photos, lien de réservation : `docs/GOOGLE-BUSINESS-PROFILE.md`
- [ ] Vérifier les données structurées avec Google Rich Results
- [x] Guide de mise à jour des tarifs, horaires et indisponibilités : `docs/GUIDE-MISE-A-JOUR.md`

## Phase 2 — Réservation automatisée

- [x] Décision de stack : Django + DRF + Celery + PostgreSQL (04/11/2026)
- [x] Restructuration `frontend/` / `backend/`, squelette Django configuré par environnement, `docker-compose.yml`
- [x] API de réservation DRF : modèles, `POST /api/v1/reservations/` (toujours « à confirmer »), validation côté serveur, honeypot, limitation 5/heure par IP, verrou par jour contre la double réservation, admin avec action « Confirmer »
- [x] Recalcul des créneaux côté serveur (`backend/reservations/slots.py`, identique à `slots.js` : 0 écart sur 2 450 cas dont changements d'heure) et `GET /api/v1/creneaux/`
- [x] Tunnel branché sur l'API, activé par `"api": "/api/v1"` dans `frontend/data/reservation.json` (`null` = comportement de la phase 1 inchangé) : créneaux lus via `GET /creneaux/`, 409 « créneau pris » avec retour à l'étape 2, 429 géré, service worker et CSP adaptés. Vérifié dans Chrome sur la pile Docker (deux visiteuses sur le même créneau)
- [x] Calendrier : `GET /api/v1/disponibilites/?month=YYYY-MM&services=…` (4 requêtes SQL par mois, cohérent avec `/creneaux/` par test) ; en mode API, le tunnel grise les jours fermés ou complets (une requête par mois de l'horizon)
- [x] Notification de la praticienne à chaque nouvelle demande : tâche Celery `notifier_praticienne` après commit, sans doublon (`notifiee_le`), 6 reprises avec attente croissante, rattrapage par `manage.py renvoyer_notifications`
- [x] Celery beat (service `beat` du compose) : rattrapage des notifications toutes les 10 min, rappel J-1 chaque jour à 10 h aux clientes dont le rendez-vous est **confirmé**
- [ ] Brancher un vrai SMTP et `STUDIO_EMAIL` en production ; renseigner `STUDIO_NOM` (variable d'environnement) avec le nom réel du studio
- [x] E-mail à la cliente quand la praticienne confirme (action admin ou statut changé dans le formulaire) : tâche Celery `envoyer_confirmation`, invitation `.ics` jointe, sans doublon, jamais envoyé si la demande n'est pas réellement confirmée
- [ ] SMS de confirmation (service à choisir)
- [x] E-mail à la cliente quand une demande est refusée ou annulée : actions admin « Refuser » et « Annuler » (ou statut changé dans le formulaire), tâche Celery `envoyer_annulation`, sans doublon, jamais envoyé pour une demande encore active. **Texte provisoire `[À VALIDER]` par la praticienne** (`PHRASES_CLOTURE` dans `tasks.py`)
- [x] Blocage automatique des créneaux, anti double réservation (verrou par jour, voir plus haut)
- [ ] SMS de confirmation et de rappel (e-mails de confirmation et de rappel J-1 faits)
- [x] Demande d'avis J+2 et relance retouche J+18 : tâche Celery quotidienne à 11 h (`envoyer_suivis`), rendez-vous **confirmés** seulement, une fois par réservation, rattrapage sur 7 jours. Avis envoyé seulement si `AVIS_URL` est renseigné ; retouche limitée à la catégorie « extensions » et ignorée si la cliente a déjà un prochain rendez-vous. Textes provisoires `[À VALIDER]` ; délais réglables (`SUIVI_AVIS_JOURS`, `SUIVI_RETOUCHE_JOURS`)
- [ ] Renseigner `AVIS_URL` (fiche Google Business Profile) et `SITE_URL` en production ; confirmer le délai de retouche réel (le cahier des charges dit J+18 et J+21 selon l'endroit)
- [x] Rattrapage des e-mails de confirmation et de refus/annulation perdus (revue du 04/11/2026) : `rattraper_notifications` (beat, toutes les 10 min) et `renvoyer_notifications` relancent aussi les réservations `CONFIRMEE` sans `confirmation_envoyee_le` et `REFUSEE`/`ANNULEE` sans `annulation_envoyee_le`, pour les rendez-vous d'aujourd'hui ou à venir (pas de marge de 5 min ni de fenêtre de 7 jours : aucune date de changement de statut n'est stockée). Un doublon est possible lors d'une longue panne SMTP, préféré à un message perdu. Journal d'avertissement par type, 6 tests
- [x] Config métier dans `backend/reservations/vertical.py` (revue du 04/11/2026) : `QUESTIONS_A_RISQUE` (identifiants et libellés) et `CATEGORIES_RETOUCHE`, seul endroit propre au métier, sans modèle ni migration ; 2 tests vérifient le miroir avec `frontend/assets/js/app/validation.js` et `data/services.json`
- [ ] Blog : 4 premiers articles SEO. **Textes rédigés** dans `docs/blog/` (brouillons `[À VALIDER]`, relecture par la praticienne à faire, voir `docs/blog/README.md`) ; reste à choisir le support, pages `tools/pages/06-blog.mjs` ou Wagtail, selon les déclencheurs de l'ADR 0001
- [ ] Flux Instagram chargé après consentement
- [ ] **Déclencheurs de bascule (revue du 04/11/2026, à ne pas re-débattre avant)** : passer à **Wagtail** dans `backend/` quand les trois sont vrais : hébergement phase 2 décidé, réservation validée en production avec un vrai SMTP, la praticienne publie ou modifie du contenu plus d'une fois par mois. Passer à une **plateforme multi-métiers** (`core_booking` + packs) seulement avec un second métier signé. À vérifier avant : Wagtail 8.1 annonce `Django>=5.2` (métadonnées lues, installation avec Django 6.1 non testée) ; l'impossibilité d'héberger Wagtail sur le mutualisé Hostinger n'est pas vérifiée auprès de l'hébergeur ; changer la pile exige une décision explicite et la mise à jour de `CLAUDE.md` et du cahier des charges. Décision complète : `docs/adr/0001-statique-d-abord-wagtail-sur-declencheurs.md`

## Phase 3 — Gestion complète

- [ ] Acompte en ligne (Stripe)
- [ ] Espace praticienne avec **Vue Cal** (vues jour et semaine)
- [ ] Liste d'attente
- [ ] Cartes cadeaux en ligne
- [ ] Programme de parrainage
- [ ] Version anglaise du site

## Questions ouvertes

- [x] Hébergement retenu : Hostinger (mutualisé, `.htaccess`), domaine `jmgaura.com` (d'après `data/studio.json` et `data/site.json`, à confirmer avec le client)
- [ ] Service d'e-mail et de SMS pour la phase 2 ?
- [ ] Hébergement de la phase 2 (VPS ou PaaS Docker) : Hostinger mutualisé ne convient pas à Django + Celery + Redis
- [ ] Le studio a-t-il déjà un système de réservation à remplacer ou à garder ?
