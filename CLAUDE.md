# CLAUDE.md — Site Lash & Brow

Ce fichier donne à Claude Code le contexte et les règles du projet. Source de vérité fonctionnelle : `CAHIER_DES_CHARGES.md`. En cas de conflit, le cahier des charges prime, sauf décision explicite de l'utilisateur.

## Projet

Site vitrine avec prise de rendez-vous en ligne pour un studio de soins des cils et des sourcils (extensions, rehaussement, soins sourcils). Nom de travail : `[NOM_DU_STUDIO]`. Langue : français. Vouvoiement.

Objectif n°1 : réservation en ligne en moins de 60 secondes sur mobile.

## Stack (ne pas en sortir sans demander)

- HTML5 sémantique, CSS3, **Bootstrap 5.3**
- **Vue 3** intégré dans le navigateur (ES modules + importmap), sans bundler en phase 1
- **V-Calendar 3.x** (`DatePicker`) pour le choix de la date
- **Vue Cal** réservé à l'agenda praticienne (phase 3, ne pas l'installer avant)
- Données en JSON dans `/data`, pas de base de données en phase 1
- Pas de jQuery, pas de framework CSS supplémentaire, pas de bibliothèque d'animation lourde

Avant d'intégrer V-Calendar : vérifier la version stable et l'URL CDN réelles (la doc `v2.vcalendar.io` référencée dans le cahier des charges est une ancienne branche). Figer la version, ajouter SRI, prévoir un plan B auto-hébergé dans `assets/js/vendor/`.

## Architecture

- Site multi-pages statiques, une page HTML par prestation (SEO).
- Vue sert uniquement d'**îlots** montés sur des `div` identifiés (`#booking-app`, `#gallery-app`, `#tarifs-app`). Le contenu SEO reste en HTML statique.
- Utiliser `v-cloak` et des squelettes de chargement pour éviter le flash de template.
- Charger Vue et V-Calendar seulement sur les pages qui les utilisent.
- État local avec `reactive()`. Pas de Pinia en phase 1.

Arborescence cible : voir `CAHIER_DES_CHARGES.md`, section 1.1.2.

## Conventions de code

- Fichiers et dossiers en `kebab-case`. Composants Vue en `PascalCase`.
- Classes CSS maison préfixées `lb-`, nommage BEM léger (`lb-card__title`).
- Couleurs, espacements et typographie via variables CSS dans `assets/css/variables.css`. Surcharger Bootstrap par ces variables, jamais avec `!important` sans raison écrite en commentaire.
- Pas de CSS ni de JavaScript inline dans le HTML (sauf JSON-LD et importmap).
- Attention à la spécificité CSS : éviter les sélecteurs qui s'annulent entre eux (ex. `.section` contre `.cta`).
- JavaScript : ES modules, `const` par défaut, fonctions courtes, commentaires en français uniquement pour expliquer le « pourquoi ».
- Indentation : 2 espaces. Fin de ligne LF. UTF-8.

## Design (direction « courbe du cil »)

- Palette : Encre `#1F1A24`, Soie `#F6F1F3`, Mauve fumé `#7A5C74`, Bronze doux `#B07D55`, Sauge pâle `#BFCABA`.
- Titres : **Bodoni Moda**. Texte : **Figtree**. Polices en WOFF2 auto-hébergées, `font-display: swap`, 2 graisses maximum par famille.
- Motif signature : trait fin courbé comme un cil (courbures C, CC, D, L), utilisé en séparateur, icône et dans le hero (SVG dessiné au trait, une seule animation au chargement).
- Alignement à gauche, grille asymétrique, photos grand format. Éviter : cartes toutes identiques, ombres grises génériques, étiquettes en majuscules au-dessus de chaque titre, animations d'entrée sur chaque section.
- Respecter `prefers-reduced-motion`.
- Mobile-first. Bouton « Réserver » collant en bas d'écran sur mobile.

## Réservation — règles métier

- Les créneaux se manipulent en chaînes `YYYY-MM-DD` et `HH:mm`, fuseau **Europe/Paris**. Ne pas se fier aux `Date` JavaScript pour l'arithmétique de jours (risque de bug au changement d'heure).
- Durées, tampon (15 min), délai minimum (12 h), horizon (60 jours) : tous dans `data/*.json` ou une constante de configuration, jamais en dur dans les composants.
- Un créneau ne doit jamais chevaucher une réservation existante, une indisponibilité ou la fermeture.
- En phase 1, toute demande est **« à confirmer »** par la praticienne. Ne jamais afficher « confirmé » sans validation réelle.
- Anti-spam : champ honeypot + limitation côté serveur.
- Questionnaire de première visite : une réponse à risque (allergie à la colle, traitement oculaire, grossesse) affiche un message invitant à contacter le studio.

## Performance, accessibilité, conformité (critères de recette)

- Lighthouse mobile : Performance ≥ 90, Accessibilité ≥ 95, SEO ≥ 95, Bonnes pratiques ≥ 95. LCP < 2,5 s, CLS < 0,05.
- Images : AVIF et WebP avec `srcset`, `width` et `height` explicites, `loading="lazy"` sauf l'image LCP.
- Accessibilité : contrastes ≥ 4,5:1, focus visible, calendrier et créneaux utilisables au clavier, `aria-live` pour les messages du tunnel, `alt` descriptifs.
- RGPD : consentement explicite dans le formulaire, bandeau cookies avec refus aussi simple que l'acceptation, mesure d'audience sans cookie (Plausible ou Matomo). Tout contenu tiers (carte, flux Instagram) chargé seulement après consentement.
- Sécurité : SRI sur les ressources tierces, en-têtes CSP et Referrer-Policy, validation côté client et côté serveur.

## Contenu : interdits

- Aucune promesse médicale ni de croissance des cils. Parler de « soin esthétique ».
- Aucun avis, note ou chiffre inventé en production. Le texte d'exemple est marqué `[À REMPLACER]`.
- Aucune photo de cliente sans consentement écrit.
- Ne pas proposer de microblading ou de micro-pigmentation tant que le client ne confirme pas qu'il est formé et déclaré.
- Ne pas inventer d'adresse, de SIRET, de numéro de téléphone ni de certification : utiliser des marqueurs `[À COMPLÉTER]`.

## Commandes

Phase 1 sans bundler :

```bash
npx serve .                      # serveur local
npx lighthouse http://localhost:3000 --view   # audit performance
npx pa11y http://localhost:3000  # audit accessibilité
npx html-validate "**/*.html"    # validation HTML
```

Les outils sont lancés avec `npx`, rien n'est ajouté aux dépendances du projet.

## Façon de travailler

1. Lire `TODO.md` et prendre la première tâche non cochée de la phase en cours.
2. Pour toute tâche touchant plusieurs fichiers ou le tunnel de réservation, proposer un court plan avant de coder.
3. Faire des commits petits et atomiques, au format `type(portée): message` (ex. `feat(booking): grille de créneaux`).
4. Après chaque tâche : cocher la case dans `TODO.md`, relancer l'audit concerné, signaler les écarts aux critères de recette.
5. Ne pas ajouter de dépendance, de page ou de fonctionnalité hors du cahier des charges sans demander.
6. En cas de doute sur un contenu ou un choix métier, poser la question au lieu de deviner.
