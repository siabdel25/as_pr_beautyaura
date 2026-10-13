# TODO — Site Lash & Brow

Légende : `[ ]` à faire, `[x]` terminé. Ordre de priorité : de haut en bas dans chaque phase. Mettre à jour après chaque tâche.

## Lot 0 — Cadrage (bloquant, à obtenir du client)

- [ ] Nom du studio, logo, adresse, téléphone, e-mail, SIRET
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

- [ ] Galerie avant/après avec curseur et filtres par prestation
- [ ] Optimisation des images (AVIF, WebP, `srcset`, dimensions explicites)
- [ ] Données structurées : `HealthAndBeautyBusiness`, `Service`, `FAQPage`
- [ ] Titres et meta descriptions uniques par page
- [ ] Balises Open Graph, `sitemap.xml`, `robots.txt`
- [ ] Bandeau cookies conforme, mesure d'audience sans cookie
- [ ] Événements : `booking_start`, `booking_step_service`, `booking_step_date`, `booking_step_slot`, `booking_step_details`, `booking_submit`, `click_phone`, `click_directions`
- [ ] Audit Lighthouse mobile sur accueil, prestation, réservation
- [ ] Audit accessibilité (pa11y + test clavier + lecteur d'écran)
- [ ] En-têtes de sécurité (CSP, Referrer-Policy, X-Content-Type-Options)
- [ ] Test d'affichage de 360 px à 1920 px

## Lot 5 — Recette et mise en ligne

- [ ] Parcourir tous les critères d'acceptation du cahier des charges (section 4)
- [ ] Relecture des textes par la praticienne (aucune promesse médicale)
- [ ] Remplacer tous les marqueurs `[À COMPLÉTER]` et `[À REMPLACER]`
- [ ] Déploiement, HTTPS, redirections, nom de domaine
- [ ] Fiche Google Business Profile : catégories, photos, lien de réservation
- [ ] Vérifier les données structurées avec Google Rich Results
- [ ] Guide de mise à jour des tarifs, horaires et indisponibilités

## Phase 2 — Réservation automatisée

- [ ] API de réservation (Node/Express ou Supabase)
- [ ] Blocage automatique des créneaux, anti double réservation
- [ ] E-mail et SMS de confirmation et rappel J-1
- [ ] Demande d'avis J+2 et relance retouche J+18
- [ ] Blog : 4 premiers articles SEO
- [ ] Flux Instagram chargé après consentement

## Phase 3 — Gestion complète

- [ ] Acompte en ligne (Stripe)
- [ ] Espace praticienne avec **Vue Cal** (vues jour et semaine)
- [ ] Liste d'attente
- [ ] Cartes cadeaux en ligne
- [ ] Programme de parrainage
- [ ] Version anglaise du site

## Questions ouvertes

- [ ] Hébergement retenu : Netlify, Cloudflare Pages ou mutualisé ?
- [ ] Service d'e-mail et de SMS pour la phase 2 ?
- [ ] Le studio a-t-il déjà un système de réservation à remplacer ou à garder ?
