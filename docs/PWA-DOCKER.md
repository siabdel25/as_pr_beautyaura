# PWA Vue.js dans Docker : état, vérifications et prévision

Date : 05/11/2026.

## 1. État actuel (vérifié)

Le site **est déjà une PWA Vue 3** : pas de bundler (modules ES + importmap), manifeste, service worker, page hors ligne, bouton « Installer l'application ». Docker ne fait que la servir.

| Élément | Où | Remarque |
|---|---|---|
| Manifeste | `frontend/manifest.webmanifest` | `display: standalone`, icônes 192 et 512 px dont une maskable, raccourcis « Réserver » et « Tarifs » |
| Service worker | `frontend/sw.js` | **Généré** par `node tools/build-pages.mjs`, ne pas l'éditer. Pages : réseau d'abord, repli cache puis `offline.html`. Ressources statiques : cache d'abord. **`/api/` et `/data/` ne sont jamais mis en cache.** |
| Îlot Vue | `frontend/assets/js/app/` (`booking.js`, composants) | Monté sur `#booking-app` ; Vue et V-Calendar chargés seulement sur la page de réservation |
| Image de développement | `docker/web.Dockerfile` + `docker/web.nginx.conf` | nginx : statique et proxy `/api/`, `/admin/` |
| Image de démo complète | `docker-compose.demo.yml` + `docker/demo/web.nginx.conf` | Voir `docs/DEMO-DOCKER.md` |
| Image de démo statique | `frontend/demo/Dockerfile` | Sans API |

Vérifié le 05/11/2026 sur la démo (`http://localhost:8082`), après correction :

| Contrôle | Résultat |
|---|---|
| `GET /manifest.webmanifest` | `Content-Type: application/manifest+json`, `Cache-Control: public, max-age=0, must-revalidate` |
| `GET /sw.js` | `Cache-Control: no-cache` (une nouvelle version est reprise au rechargement) |
| Pages, `/api/v1/health/`, CSS de l'administration | 200 |

**Corrigé dans ce lot** : avant, nginx servait le manifeste en `application/octet-stream` et ne forçait pas `no-cache` sur `sw.js` (les deux configurations `docker/web.nginx.conf` et `docker/demo/web.nginx.conf`). La démo statique `frontend/demo/nginx.conf` était déjà correcte.

## 2. Pas encore vérifié

- Installation réelle sur téléphone et test hors ligne (item ouvert du Lot 4 de `TODO.md`). `localhost` est accepté par les navigateurs pour le service worker, mais l'installation sur appareil mobile demande le **HTTPS** : à faire sur le VPS (`docs/DEPLOIEMENT-VPS.md`).
- Audit Lighthouse (catégorie PWA incluse) : `npx lighthouse http://localhost:8082 --view`, à lancer depuis `frontend/`.
- Comportement du service worker après une mise à jour de version : le build renouvelle `VERSION`, l'ancien cache est supprimé à l'activation ; à constater sur un navigateur.

## 3. Règles à garder quand l'API est branchée

- Ne jamais ajouter `/api/` ni `/data/` au cache du service worker.
- Une demande de réservation hors ligne n'est **pas** mise en file : le site doit dire que l'envoi a échoué, jamais « envoyée » (règle du tunnel).
- Si l'API est sur une autre origine : `connect-src` dans `frontend/_headers` **et** CORS côté API (`docs/GUIDE-API-FRONTEND.md`, section D).

## 4. Prévision : une seconde application Vue (agenda de la praticienne)

Non commencée. La phase 3 prévoit un espace praticienne avec Vue Cal. `CLAUDE.md` interdit pour l'instant d'en sortir : pas de bundler en phase 1, Vue Cal « à ne pas installer avant ». Il faut donc une décision avant tout code.

| Option | Principe | Effort | Remarque |
|---|---|---|---|
| **A. Réutiliser l'agenda de l'autre dépôt** (recommandée) | `booking/frontend/agenda` (Vue + Vite) existe déjà derrière l'API `staff/…` (rôles, TOTP) ; ADR 0002 place la réservation dans cet autre dépôt | Faible ici | Aucune dépendance ajoutée ici |
| B. Application Vue + Vite dans ce dépôt | Étape de build Node dans l'image, fichiers statiques servis par nginx | Moyen à élevé | Introduit Node, `package.json` et un bundler : accord explicite requis |
| C. Sans bundler | Vue Cal en module navigateur (CDN avec SRI, plan B auto-hébergé), comme le reste du site | Moyen | Reste dans la pile ; l'agenda est une SPA authentifiée, donc à servir à part du site public |

Si l'option B est retenue, forme prévue de l'image (**esquisse, non implémentée**) :

```dockerfile
# Étape 1 : build de l'application (Node n'existe que dans cette étape)
FROM node:20-alpine AS build
WORKDIR /app
COPY agenda/package.json agenda/package-lock.json ./
RUN npm ci
COPY agenda/ ./
RUN npm run build                      # produit dist/

# Étape 2 : image finale, nginx seul
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html/agenda
COPY docker/web.nginx.conf /etc/nginx/conf.d/default.conf
```

et dans `docker-compose.yml` un service `agenda` (ou le même `web` avec une copie en plus), `/agenda/` servi par nginx, `/api/` proxifié. Pour être une vraie PWA : son propre manifeste, un `scope: /agenda/`, un service worker qui exclut `/api/`, et une authentification de la praticienne côté API.

## 5. Décision attendue

Option A, B ou C pour l'agenda de la praticienne. Rien n'est à faire pour la PWA du site public tant que l'audit sur appareil réel n'est pas passé.
