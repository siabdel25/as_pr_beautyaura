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

## Couverture fonctionnelle

État au 05/11/2026. Légende : ✅ fait et testé · 🟡 fait mais non activé, ou en attente d'une information du client · ⏳ prévu (phase 3) · ⛔ volontairement exclu. « Autre dépôt » désigne `as_shoppy_frm_v2`, dont l'API `booking` est la cible de production (ADR 0002).

### 1. Site vitrine (phase 1, statique)

| Fonction | État | Détail |
|---|---|---|
| Pages du site | 🟡 | Accueil, à propos, contact, 4 pages prestations (extensions, rehaussement, soins des sourcils, épilation) et leur index, tarifs, galerie, FAQ, conseils après-soin, mentions légales, CGV et annulation, politique de confidentialité, 404, page hors ligne. Les textes comportent des marqueurs `[À COMPLÉTER]` tant que le client n'a pas répondu (`docs/QUESTIONNAIRE-CLIENT.md`) |
| Tarifs | 🟡 | Tableau en HTML statique (SEO), filtrable par catégorie. Prix absents : à fournir par le client |
| Choix de la courbure des cils | ✅ | Outil interactif C, CC, D, L sur la page extensions, avec description de l'effet |
| Galerie avant/après | 🟡 | Curseur natif accessible au clavier. Une réalisation de cliente ne s'affiche qu'avec `"consentement": true` (accord écrit). Aucune photo réelle fournie : illustrations étiquetées |
| Avis des clientes | 🟡 | Emplacement prévu, **aucun avis publié** (jamais d'avis inventé) |
| Blog | 🟡 | 4 articles rédigés (`docs/blog/`), **non publiés** : à faire valider par la praticienne |
| Carte, flux Instagram | 🟡 | Contenu tiers chargé **seulement après consentement** ; carte sans adresse configurée = rien d'affiché ; Instagram non branché (compte à fournir) |
| Bouton « Réserver » collant sur mobile | ✅ | |
| Mentions légales, CGV, confidentialité | 🟡 | Gabarits à compléter, **à faire relire par un professionnel** avant publication |

### 2. Réservation côté cliente

| Fonction | État | Détail |
|---|---|---|
| Tunnel en 4 étapes | ✅ | Prestations (plusieurs possibles, durée = somme), date (V-Calendar), créneau, coordonnées |
| Jours et créneaux | ✅ | Jours indisponibles grisés ; créneaux calculés selon horaires, fermetures, réservations, tampon 15 min, délai 12 h, horizon 60 jours, fuseau Europe/Paris, sûrs au changement d'heure |
| Questionnaire de première visite | ✅ | Allergie à la colle, traitement oculaire, grossesse : une réponse « oui » affiche « contactez le studio avant de réserver » ; rien de médical n'est promis |
| Consentement et anti-spam | ✅ | Case RGPD et CGV obligatoires, champ piège anti-robot, limitation de fréquence côté serveur |
| Message d'après envoi | ✅ | « Demande transmise, **pas encore confirmée** » : jamais « confirmé » avant validation |
| Fichier d'agenda `.ics` | ✅ | Téléchargeable après envoi, marqué « à confirmer » |
| Créneau pris entre-temps | ✅ | Retour au choix de l'heure, créneaux rechargés, demande non envoyée |
| Accessibilité du tunnel | ✅ | Clavier, messages annoncés aux lecteurs d'écran (`aria-live`), squelettes de chargement |
| Mode sans serveur (phase 1) | 🟡 | Créneaux calculés depuis `frontend/data/*.json` ; l'envoi passe par `endpoint` (service tiers) **non renseigné** : tant qu'il n'est pas renseigné, rien n'est envoyé et l'erreur le dit |
| Mode API | 🟡 | Activé par `"api"` dans `reservation.json` ; `"api_format": "booking"` pour l'API de l'autre dépôt (adaptateur prêt, vérifié sur la démo). **Non activé** |

### 3. Côté studio (praticienne, opérateur)

| Fonction | État | Backend d'ici (`/admin/`) | Autre dépôt (`/gestion/`, `/agenda/`) |
|---|---|---|---|
| Voir les demandes, confirmer, refuser, annuler | ✅ | Actions de l'administration | Actions + agenda graphique (glisser-déposer pour déplacer) |
| Gérer prestations, durées, tarifs | ✅ | Services | Services réservables (prix en euros, acompte en pourcentage ou montant fixe) |
| Gérer horaires et fermetures | ✅ | Horaires d'ouverture, indisponibilités | Règles et exceptions de disponibilité, ouvertures exceptionnelles |
| Plusieurs praticiennes | ✅ là-bas seulement | Non géré : un seul agenda | Ressources multiples |
| Réglages (délais, tampon, annulation, rappel) | 🟡 | Variables d'environnement | Écran « Réglages de réservation » |
| Rôles, double authentification, journal d'audit | ✅ là-bas seulement | Compte administrateur Django | Propriétaire/assistante, TOTP obligatoire, journal en ajout seul |
| Éditer les textes du site | 🟡 | Fichiers `frontend/data/` + build | Éditeur Wagtail `/cms/` |

Mode d'emploi pas à pas : `docs/GUIDE-DASHBOARD.md`.

### 4. E-mails automatiques

| Message | État | Détail |
|---|---|---|
| Notification de la praticienne | ✅ | À chaque nouvelle demande |
| Confirmation avec `.ics` | ✅ | Seul moment où le mot « confirmé » est employé ; statut revérifié à l'envoi |
| Refus et annulation | ✅ | Par le studio |
| Rappel la veille | ✅ | Rendez-vous confirmés seulement |
| Demande d'avis J+2 | 🟡 | Envoyée seulement si `AVIS_URL` est renseigné ; textes à valider |
| Relance de retouche J+18 | 🟡 | Catégorie extensions, ignorée si un prochain rendez-vous existe ; délai à confirmer (J+18 ou J+21) |
| Rattrapage des e-mails perdus | ✅ | Toutes les 10 minutes et par commande ; un doublon est possible lors d'une longue panne, préféré à un message perdu |
| Envoi réel (SMTP, Brevo) | 🟡 | Jamais testé avec un vrai serveur d'envoi : `docs/EMAIL-BREVO-BOITE.md` |
| SMS de confirmation et de rappel | ⏳ | Service à choisir |
| Gestion par la cliente (voir, déplacer, annuler par lien) | 🟡 | Absent d'ici ; **disponible dans l'autre dépôt**, activé avec l'API cible |

### 5. Fiabilité des réservations

| Garantie | État |
|---|---|
| Aucune double réservation d'un même créneau | ✅ Verrou par jour (testé en séquence, pas encore sous vraie concurrence) ; contrainte PostgreSQL dans l'autre dépôt |
| Un créneau ne chevauche ni réservation, ni fermeture, ni horaire | ✅ |
| Toute demande « à confirmer », jamais confirmée seule | ✅ |
| Le client ne peut imposer ni statut, ni durée, ni prix | ✅ |
| Parité des créneaux entre navigateur et serveur | ✅ Vérifiée sur 2 450 cas |
| Un courrier envoyé deux fois, ou perdu sans trace | ✅ Garde horodatée par courrier, rattrapage, journal |

### 6. Données personnelles et conformité

| Point | État |
|---|---|
| Données de santé minimales | ✅ Seul un indicateur « réponse à risque » (oui/non) est conservé, jamais le détail ; aucun champ libre médical |
| Consentement explicite dans le formulaire | ✅ |
| Le site ne dépose aucun cookie | ✅ Choix de consentement mémorisé en local ; contenus tiers après consentement |
| Mesure d'audience sans cookie (Plausible) | 🟡 Désactivée tant que `data/site.json` ne renseigne pas le domaine |
| Effacement, anonymisation, durée de conservation | 🟡 Absent d'ici ; disponible dans l'autre dépôt (action d'effacement, conservation en mois) |
| Aucune promesse médicale, aucun avis ni chiffre inventé, aucune photo sans consentement | ⛔ Interdits (voir « Conformité et contenus ») |
| Microblading et micropigmentation | ⛔ Non proposés tant que le client ne confirme pas être formé et déclaré |

### 7. Référencement, performance, installation

| Fonction | État | Détail |
|---|---|---|
| SEO local | ✅ | Une page par prestation, données structurées schema.org (entreprise, service, FAQ), `sitemap.xml`, `robots.txt`, balises canoniques |
| Sécurité du site | ✅ | En-têtes (CSP, Referrer-Policy…) générés par le build |
| PWA installable | 🟡 | Manifeste, service worker, page hors ligne, bouton « Installer » ; `/api/` et `/data/` jamais mis en cache. **Installation sur appareil réel et audit Lighthouse à faire** après mise en ligne en HTTPS |
| Objectifs Lighthouse (mobile) | 🟡 | Performance ≥ 90, Accessibilité ≥ 95, SEO ≥ 95 : cibles, pas encore mesurées sur le site publié |
| Fiche Google Business Profile | 🟡 | Guide prêt (`docs/GOOGLE-BUSINESS-PROFILE.md`), fiche à créer |

### 8. Paiement et fonctions avancées

| Fonction | État | Détail |
|---|---|---|
| Acompte en ligne (Stripe, PayPal) | ⏳ ici / 🟡 là-bas | Codé dans l'autre dépôt, **sans recette en bac à sable** ; acompte à 0 par défaut |
| Espace praticienne avec Vue Cal | ⏳ | Décision attendue : réutiliser l'agenda de l'autre dépôt, Vite ici, ou sans bundler (`docs/PWA-DOCKER.md`) |
| Liste d'attente, cartes cadeaux, parrainage | ⏳ | Phase 3 |
| Version anglaise | ⏳ | Phase 3 |

### 9. Ce qui reste avant la mise en ligne

Réponses du client au questionnaire, remplacement des 136 marqueurs, relecture des textes par la praticienne et des pages légales par un professionnel, choix du fournisseur d'e-mail et de la boîte du studio, activation du mode API sur le VPS, puis recette de bout en bout. Détail et blocages : `TODO.md`, `HANDOFF.md`.

### Écart à corriger

La page de confirmation du tunnel affiche « Annulation gratuite jusqu'à 24 h avant le rendez-vous » en dur (`frontend/assets/js/app/components/Confirmation.js`). Cette condition n'a pas été confirmée par le client (question H2 du questionnaire) : à aligner sur sa réponse.

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
- `docs/GUIDE-DASHBOARD.md` : configurer la plateforme (agenda, prestations, tarifs, horaires, réglages)
- `docs/EMAIL-BREVO-BOITE.md` : Brevo pour envoyer, vraie boîte mail pour recevoir les réponses (Reply-To)
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
