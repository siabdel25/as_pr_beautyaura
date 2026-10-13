# Site Lash & Brow

Site vitrine et prise de rendez-vous en ligne pour un studio de soins des cils et des sourcils : extensions de cils, rehaussement, soins des sourcils.

> Nom de travail : `[NOM_DU_STUDIO]`. À remplacer partout avant la mise en ligne.

## Fonctionnalités

- Pages prestations, tarifs, galerie avant/après, FAQ, conseils après-soin, contact
- **Réservation en ligne** en 4 étapes (prestation, date, créneau, coordonnées) avec V-Calendar
- Design responsive mobile-first, accessible, optimisé pour la performance
- SEO local : données structurées schema.org, une page par prestation
- Conforme RGPD : bandeau cookies, mesure d'audience sans cookie

## Stack

| Couche | Technologie |
|---|---|
| Structure | HTML5 |
| Style | CSS3 + Bootstrap 5.3 |
| Interactivité | Vue 3 (ES modules, sans bundler) |
| Calendrier | V-Calendar 3.x |
| Données | JSON dans `/data` (phase 1) |

## Démarrage rapide

Prérequis : Node.js 20 ou plus récent (uniquement pour le serveur local et les audits).

```bash
git clone <url-du-depot> lash-brow-studio
cd lash-brow-studio
npx serve .
```

Ouvrir `http://localhost:3000`.

> Vue et V-Calendar sont chargés en modules navigateur. Le site doit être servi en HTTP (pas en `file://`).

## Structure du projet

```
lash-brow-studio/
├── index.html
├── prestations/        # une page par prestation
├── tarifs.html
├── reservation.html    # tunnel Vue + V-Calendar
├── galerie.html
├── a-propos.html
├── faq.html
├── conseils-apres-soin.html
├── contact.html
├── assets/             # css, js, img, fonts
├── data/               # services, horaires, indisponibilités, avis
├── CAHIER_DES_CHARGES.md
├── CLAUDE.md
└── TODO.md
```

## Mettre à jour le contenu

Tout se modifie dans `/data`, sans toucher au code.

| Fichier | Contenu |
|---|---|
| `services.json` | Prestations, durées, prix « à partir de » |
| `horaires.json` | Horaires d'ouverture par jour |
| `indisponibilites.json` | Congés, fermetures exceptionnelles |
| `avis.json` | Avis clientes publiés avec accord |

Exemple, ajouter un jour de fermeture :

```json
{ "date": "2026-12-25", "motif": "Fermeture" }
```

## Fonctionnement de la réservation (phase 1)

1. La cliente choisit sa prestation, sa date (V-Calendar) et son créneau.
2. La demande est envoyée à la praticienne par e-mail via une fonction serverless.
3. La praticienne **confirme manuellement**. Le site affiche « demande envoyée », jamais « confirmé ».

La phase 2 ajoute une API pour bloquer les créneaux automatiquement et envoyer les confirmations.

## Qualité

```bash
npx lighthouse http://localhost:3000 --view    # performance, SEO, accessibilité
npx pa11y http://localhost:3000                # accessibilité
npx html-validate "**/*.html"                  # validation HTML
node --test "tests/*.test.mjs"                   # tests unitaires (créneaux, validation, .ics, envoi)
node tools/build-pages.mjs                      # régénère les pages HTML depuis tools/pages/
node tools/build-sprite.mjs                     # régénère assets/icons/sprite.svg
```

Objectifs : Lighthouse mobile Performance ≥ 90, Accessibilité ≥ 95, SEO ≥ 95. LCP < 2,5 s.

## Déploiement

Le site est statique. Il se déploie sur Netlify, Cloudflare Pages ou un hébergement mutualisé :

1. Connecter le dépôt Git à l'hébergeur.
2. Dossier de publication : la racine (`/`).
3. Activer HTTPS et la compression Brotli.
4. Ajouter les en-têtes de sécurité (CSP, Referrer-Policy, X-Content-Type-Options).

## Conformité et contenus

- Les photos de clientes ne sont publiées qu'avec **consentement écrit**.
- Aucun avis ni note fictive en production.
- Mentions légales, CGV, politique de confidentialité à compléter avec les informations réelles du studio.

## Documentation

- `CAHIER_DES_CHARGES.md` : besoins, architecture, marketing, planning, recette
- `CLAUDE.md` : règles pour travailler avec Claude Code
- `TODO.md` : suivi des tâches par phase

## Licence

À définir par le propriétaire du projet. Les polices (Bodoni Moda, Figtree) sont sous licence SIL Open Font License.
