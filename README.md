# Site Lash & Brow

Site vitrine et prise de rendez-vous en ligne pour un studio de soins des cils et des sourcils : extensions de cils, rehaussement, soins des sourcils.

> Nom de travail : `[NOM_DU_STUDIO]`. À remplacer partout avant la mise en ligne.

## Fonctionnalités

- Pages prestations, tarifs, galerie avant/après, FAQ, conseils après-soin, contact
- **Réservation en ligne** en 4 étapes (prestation, date, créneau, coordonnées) avec V-Calendar
- Design responsive mobile-first, accessible, optimisé pour la performance
- SEO local : données structurées schema.org, une page par prestation
- Conforme RGPD : bandeau cookies, mesure d'audience sans cookie
- **Application installable (PWA)** : manifeste, service worker (pages réseau d'abord, ressources en cache, page hors ligne), bouton « Installer l'application » dans le pied de page
- **Démos Docker** : site statique avec fausses données, et pile complète (API, e-mails capturés, administration) pour tester la réservation de bout en bout (voir « Démos Docker »)

## Stack

| Couche | Technologie |
|---|---|
| Structure | HTML5 |
| Style | CSS3 + Bootstrap 5.3 |
| Interactivité | Vue 3 (ES modules, sans bundler) |
| Calendrier | V-Calendar 3.x |
| Données | JSON dans `frontend/data` (phase 1) |
| Backend (phase 2) | Django, Django REST Framework, Celery + Redis, PostgreSQL. API cible de production : celle du dépôt `as_shoppy_frm_v2` (ADR 0002) |

## Démarrage rapide

Prérequis : Node.js 20 ou plus récent (uniquement pour le serveur local et les audits).

```bash
git clone <url-du-depot> lash-brow-studio
cd lash-brow-studio/frontend
npx serve .
```

Ouvrir `http://localhost:3000`. Toutes les commandes `node`, `npx` et `python3 -m unittest` de ce README se lancent depuis `frontend/`.

> Vue et V-Calendar sont chargés en modules navigateur. Le site doit être servi en HTTP (pas en `file://`).

## Structure du projet

```
lash-brow-studio/
├── frontend/               # site statique (phase 1) : publié tel quel
│   ├── index.html, tarifs.html, reservation.html, galerie.html, faq.html, ...
│   ├── prestations/        # une page par prestation
│   ├── assets/             # css, js, img, fonts
│   ├── data/               # services, horaires, indisponibilités, avis
│   ├── tools/              # build des pages, service worker, sprite, vérifications
│   ├── tests/              # tests Node (créneaux, validation, build, démo)
│   ├── demo/               # démo Docker autonome : nginx et fausses données
│   ├── manifest.webmanifest, sw.js, offline.html   # PWA (sw.js est généré par le build)
│   └── .htaccess, _headers # générés par le build (Hostinger, Netlify)
├── backend/                # Django + DRF + Celery (phase 2)
│   ├── pr_beautyaura/      # réglages par variables d'environnement, Celery
│   └── reservations/       # API /api/v1/ : créneaux, demandes, e-mails, métier isolé dans vertical.py
├── docker/                 # image web (nginx : statique + proxy /api et /admin) ; docker/demo/ : pile de démonstration
├── docker-compose.yml      # pile de développement
├── docker-compose.demo.yml # pile de démonstration complète avec fausses données (scripts/demo.sh)
├── scripts/demo.sh         # up, status, logs, down, reset de la démonstration
├── docs/                   # cahier des charges, ADR, guides (API, déploiement VPS, PWA), recette
├── CLAUDE.md, TODO.md, ROADMAP.md, HANDOFF.md
```

## Mettre à jour le contenu

Tout se modifie dans `frontend/data`, sans toucher au code.

| Fichier | Contenu |
|---|---|
| `services.json` | Prestations, durées, prix « à partir de » |
| `horaires.json` | Horaires d'ouverture par jour |
| `indisponibilites.json` | Congés, fermetures exceptionnelles |
| `avis.json` | Avis clientes publiés avec accord |
| `galerie.json` | Comparaisons avant/après. Une réalisation de cliente s'affiche seulement avec `"consentement": true` (accord écrit) |
| `site.json` | URL publique du site (sitemap, balises canoniques), domaine de mesure d'audience, URL d'intégration de la carte |

Après toute modification de `site.json` ou de `reservation.json` (champ `endpoint`), relancer `node tools/build-pages.mjs` : le sitemap, `robots.txt`, les balises canoniques et les en-têtes de sécurité (`_headers`, `serve.json`) en dépendent.

Exemple, ajouter un jour de fermeture :

```json
{ "date": "2026-12-25", "motif": "Fermeture" }
```

## Fonctionnement de la réservation (phase 1)

1. La cliente choisit sa prestation, sa date (V-Calendar) et son créneau.
2. La demande est envoyée à la praticienne par e-mail via une fonction serverless.
3. La praticienne **confirme manuellement**. Le site affiche « demande envoyée », jamais « confirmé ».

La phase 2 ajoute une API pour bloquer les créneaux automatiquement et envoyer les confirmations. Décision du 04/11/2026 (`docs/adr/0002-api-booking-d-as-shoppy-frm-v2-sur-vps-docker.md`) : en production, le site appellera l'API `booking` du dépôt `as_shoppy_frm_v2`, hébergée sur un VPS Docker ; l'adaptateur est prêt (`"api_format": "booking"`), pas encore activé.

## Qualité

```bash
npx lighthouse http://localhost:3000 --view    # performance, SEO, accessibilité
npx pa11y http://localhost:3000                # accessibilité
npx html-validate "**/*.html"                  # validation HTML
node --test "tests/*.test.mjs"                   # tests unitaires (créneaux, validation, .ics, envoi, créneaux sur données de démo)
python3 -m unittest discover -s demo/tests -v   # cohérence des fausses données de démo
bash demo/tests/test_container.sh               # image Docker : pages, en-têtes, données (nécessite docker)
node tools/build-pages.mjs                      # régénère les pages HTML, sw.js, .htaccess, sitemap et en-têtes
node tools/build-sprite.mjs                     # régénère assets/icons/sprite.svg
node tools/verifier-mise-en-ligne.mjs --liste   # ce qui reste à fournir avant la mise en ligne
```

Objectifs : Lighthouse mobile Performance ≥ 90, Accessibilité ≥ 95, SEO ≥ 95. LCP < 2,5 s.

## Déploiement

Le site (phase 1) est statique : publier le dossier `frontend/`. Hébergement prévu : Hostinger (mutualisé, `.htaccess` généré par le build : HTTPS, domaine unique `jmgaura.com`, en-têtes de sécurité, cache, fichiers de développement masqués). Netlify et Cloudflare Pages restent possibles avec `_headers`. Relancer `node tools/build-pages.mjs` avant chaque déploiement : il renouvelle la version du cache du service worker. Marche à suivre complète : `docs/DEPLOIEMENT.md`. Phase 2 (API sur VPS Hostinger, Debian 13, HTTPS, sauvegardes, e-mails authentifiés) : `docs/DEPLOIEMENT-VPS.md`.

Étapes générales :

1. Connecter le dépôt Git à l'hébergeur.
2. Dossier de publication : la racine (`/`).
3. Activer HTTPS et la compression Brotli.
4. En-têtes de sécurité : `_headers` (Netlify, Cloudflare Pages) est généré par le build. Sur un autre hébergeur, reprendre les mêmes en-têtes. La CSP autorise `'unsafe-eval'` parce que Vue compile ses gabarits dans le navigateur ; la supprimer demanderait de précompiler les gabarits (donc un build).
5. Mesure d'audience : renseigner `mesure.domaine` dans `data/site.json` pour activer Plausible (sans cookie). Tant que le champ est `null`, aucun script de mesure n'est chargé.

## Backend et pile Docker (phase 2)

La phase 1 se publie sans backend. Le dossier `backend/` porte l'API de réservation de la phase 2 (Django REST Framework, Celery, PostgreSQL). Elle expose `GET /api/v1/health/`, `GET /api/v1/services/`, `GET /api/v1/disponibilites/?month=YYYY-MM&services=…`, `GET /api/v1/creneaux/?date=YYYY-MM-DD&services=…` et `POST /api/v1/reservations/`. Détail des charges utiles, des erreurs et de l'API cible `booking` : `docs/GUIDE-API-FRONTEND.md`.

Règles métier :
- Toute demande est « à confirmer » ; le créneau est revérifié côté serveur (verrou par jour) ; 5 demandes par heure et par IP.
- La praticienne confirme dans l'administration Django (`/admin/`, action « Confirmer »). Seule la confirmation emploie le mot « confirmé ».
- E-mails Celery : notification de la praticienne, confirmation avec `.ics`, refus et annulation, rappel J-1, demande d'avis J+2 et relance de retouche J+18 (si `AVIS_URL` est renseigné). Un rattrapage toutes les 10 minutes reprend les e-mails perdus. Ne lancer qu'un seul `beat` par pile.
- Données de santé minimales : seul un indicateur « réponse à risque » est conservé, jamais le détail du questionnaire.
- Le métier cils et sourcils est isolé dans `backend/reservations/vertical.py`.

Le tunnel du site appelle l'API quand `"api"` est renseigné dans `frontend/data/reservation.json` ; avec `null` (par défaut), il garde le comportement de la phase 1. `"api_format": "booking"` choisit l'API de `as_shoppy_frm_v2`. L'API doit être sur la même origine que le site (cas de la pile Docker) ou sur une origine autorisée par la CSP et par CORS.

Pile de développement :

```bash
cp backend/.env.example backend/.env       # renseigner DJANGO_SECRET_KEY (obligatoire si DJANGO_DEBUG=false)
docker compose up --build                  # http://localhost:8080 (site) et /api/v1/health/
docker compose exec backend python manage.py charger_donnees --data-dir /data   # prestations, horaires, fermetures
```

La pile lance nginx (site statique, proxy `/api/` et `/admin/`), gunicorn, PostgreSQL, Redis, un worker et un `beat` Celery. Tests : `cd backend && pip install -r requirements.txt && DJANGO_DEBUG=true python manage.py test`.

## Démos Docker

**Pile complète avec fausses données** (recommandée pour tester la réservation) : site, API, Celery, PostgreSQL, Redis, administration et boîte e-mail de capture (Mailpit, aucun e-mail ne sort). Aucune configuration à faire.

```bash
bash scripts/demo.sh up        # puis http://localhost:8082/reservation.html
bash scripts/demo.sh reset     # tout effacer et repartir de zéro
```

Administration : `http://localhost:8082/admin/` (compte `studio`, mot de passe `demo-studio`). E-mails capturés : `http://localhost:8026/`. Parcours à tester : `docs/DEMO-DOCKER.md`.

**Démo statique** (sans API, les demandes ne partent pas) : nginx sert le site avec de fausses données régénérées à chaque démarrage. Réservée à la démonstration.

```bash
docker build -f frontend/demo/Dockerfile -t lb-demo frontend   # depuis la racine du dépôt
docker run --rm -p 8080:80 lb-demo              # http://localhost:8080
```

Détails et tests : `docs/DEPLOIEMENT.md`. Aucune des deux n'est destinée à la production.

## PWA

Le site est une PWA Vue 3 sans bundler (manifeste, service worker généré, page hors ligne), servie par nginx dans Docker. `/api/` et `/data/` ne sont jamais mis en cache. État, vérifications restantes (installation sur appareil, Lighthouse) et prévision d'une application d'agenda pour la praticienne : `docs/PWA-DOCKER.md`.

## Conformité et contenus

- Les photos de clientes ne sont publiées qu'avec **consentement écrit**.
- Aucun avis ni note fictive en production.
- Mentions légales, CGV, politique de confidentialité à compléter avec les informations réelles du studio.

## Documentation

- `docs/GUIDE-MISE-A-JOUR.md`, `docs/DEPLOIEMENT.md`, `docs/GOOGLE-BUSINESS-PROFILE.md`, `docs/RECETTE.md`
- `docs/GUIDE-API-FRONTEND.md` : endpoints DRF (API actuelle et API cible `booking`)
- `docs/DEMO-DOCKER.md` : démonstration complète avec fausses données
- `docs/DEPLOIEMENT-VPS.md` : VPS Hostinger (Debian 13), HTTPS, sauvegardes, e-mails
- `docs/PWA-DOCKER.md` : PWA Vue dans Docker
- `docs/adr/` : décisions d'architecture (0001 statique d'abord, 0002 API `booking` sur VPS Docker)
- `docs/COMPARAISON-AS-SHOPPY-FRM-V2.md`, `docs/DIAGNOSTIC-API-BOOKING.md` : lien avec le dépôt `as_shoppy_frm_v2`
- `docs/QUESTIONNAIRE-CLIENT.md` : informations à obtenir du client avant la mise en ligne
- `docs/CAHIER_DES_CHARGES.md` : besoins, architecture, marketing, planning, recette
- `CLAUDE.md` : règles pour travailler avec Claude Code
- `TODO.md` : suivi des tâches par phase
- `ROADMAP.md` : vue d'ensemble des étapes (en cours, à venir)
- `HANDOFF.md` : passation, état du projet et par où reprendre

## Licence

À définir par le propriétaire du projet. Les polices (Bodoni Moda, Figtree) sont sous licence SIL Open Font License.
