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

- [ ] Initialiser le dépôt Git, `.gitignore`, `.editorconfig`
- [ ] Créer l'arborescence (voir `CAHIER_DES_CHARGES.md` 1.1.2)
- [ ] `assets/css/variables.css` : palette, typographie, espacements
- [ ] `assets/css/custom.css` : surcharge Bootstrap, préfixe `lb-`
- [ ] Polices Bodoni Moda et Figtree en WOFF2 auto-hébergées
- [ ] Gabarit de page : header, navigation, footer, bouton « Réserver » collant mobile
- [ ] Composant SVG « courbe du cil » (C, CC, D, L) réutilisable
- [ ] Vérifier le contraste de la palette (≥ 4,5:1)

## Lot 2 — Pages statiques

- [ ] Accueil (hero avec cil dessiné au trait, prestations phares, avis, horaires)
- [ ] Page prestations (vue d'ensemble)
- [ ] Extensions de cils (avec sélecteur de courbure)
- [ ] Rehaussement de cils
- [ ] Soins des sourcils
- [ ] Épilation des sourcils
- [ ] Tarifs (tableau filtrable Vue)
- [ ] À propos (parcours, certifications, protocole d'hygiène)
- [ ] FAQ (accordéon Bootstrap, 12 à 15 questions)
- [ ] Conseils après-soin
- [ ] Contact (carte chargée après consentement, itinéraire, formulaire)
- [ ] Page 404
- [ ] Mentions légales, politique de confidentialité, CGV et annulation

## Lot 3 — Réservation (phase 1)

- [ ] Vérifier la version stable de V-Calendar et l'URL CDN, figer la version avec SRI
- [ ] Importmap Vue 3, structure `assets/js/app/booking.js`
- [ ] Fichiers `data/services.json`, `horaires.json`, `indisponibilites.json`
- [ ] Composant `ServicePicker` (multi-sélection, total durée et prix)
- [ ] `DatePicker` V-Calendar : locale `fr`, lundi premier jour, jours fermés et passés désactivés
- [ ] Calcul des créneaux (durée totale, tampon 15 min, délai 12 h, horizon 60 jours)
- [ ] Composant `SlotGrid` (accessible au clavier)
- [ ] Composant `CustomerForm` : champs, questionnaire première visite, consentement RGPD, CGV
- [ ] Anti-spam : honeypot
- [ ] Envoi via fonction serverless ou Formspree, message « demande envoyée »
- [ ] Génération du fichier `.ics`
- [ ] Offcanvas « Réserver » ouvrable depuis toute la page
- [ ] Tests unitaires du calcul de créneaux, dont le changement d'heure (octobre et mars)
- [ ] `v-cloak` et squelette de chargement

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
