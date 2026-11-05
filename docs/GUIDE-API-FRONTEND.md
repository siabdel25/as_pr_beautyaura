# Guide des endpoints DRF pour le frontend

Date : 05/11/2026. Deux API existent, avec deux contrats différents (ADR 0002) :

| | API **actuelle** (`backend/reservations`) | API **cible** (`booking`, dépôt `as_shoppy_frm_v2`) |
|---|---|---|
| Rôle | Contrat de la phase 2 d'ici, utilisé quand `"api_format"` est `null` | Contrat retenu pour la production, utilisé quand `"api_format": "booking"` |
| Préfixe | `/api/v1/` | `/api/v1/booking/` |
| Lieu | Ce dépôt, démo `bash scripts/demo.sh up` (port 8082) | Autre dépôt, démo `mba-demo` (port 8081) |
| Sélection | Aucune (une seule route par ressource) | Par le **nom de domaine** de la requête (établissement) |

Le frontend choisit le contrat dans `frontend/data/reservation.json` (`api`, `api_format`) ; le code est dans `frontend/assets/js/app/submit.js` (actuelle) et `api-booking.js` (cible). Écart détaillé entre les deux : `docs/DIAGNOSTIC-API-BOOKING.md`.

Conventions communes : JSON uniquement, aucune authentification pour les routes publiques, **toute demande est « à confirmer »** (jamais « confirmé » avant validation du studio), le serveur refait tous les contrôles, un 429 signale la limitation de fréquence.

---

## A. API actuelle : `/api/v1/`

Exemples vérifiés sur la démo (`http://localhost:8082`). Dates `YYYY-MM-DD`, heures `HH:mm`, fuseau Europe/Paris, identifiants de prestation = slugs (`pose-cil-a-cil`).

| Méthode et chemin | Rôle | Succès | Erreurs |
|---|---|---|---|
| `GET /health/` | Sonde (Docker, supervision) | 200 `{"status":"ok"}` | n/a |
| `GET /services/` | Prestations | 200 `[{id, nom, categorie, duree_min, prix_a_partir_de, description}]` (`prix_a_partir_de` : chaîne ou `null`) | n/a |
| `GET /disponibilites/?month=YYYY-MM&services=id1,id2` | Jours du mois ayant au moins un créneau (grise le calendrier) | 200 `{month, duree_min, dates:["YYYY-MM-DD"]}` | 400 `{detail}` mois ou prestations invalides |
| `GET /creneaux/?date=YYYY-MM-DD&services=id1,id2` | Heures de début libres du jour | 200 `{date, duree_min, creneaux:["09:30",…]}` | 400 `{detail}` |
| `POST /reservations/` | Crée une demande | 201 `{id, statut:"a_confirmer"}` | 400 erreurs par champ, 409 `{detail}` créneau pris, 429 |

Charge utile de `POST /reservations/` :

```json
{
  "prestations": [{"id": "rehaussement-cils"}],
  "date": "2026-11-10", "heure": "11:00",
  "client": {"prenom": "Léa", "nom": "Martin", "telephone": "0612345678", "email": "lea@example.test"},
  "premiere_visite": "oui",
  "questionnaire": {"allergie_colle": "non", "traitement_oculaire": "non", "grossesse": "non"},
  "consentement_rgpd": true, "cgv_acceptees": true,
  "site_web": ""
}
```

- `premiere_visite: "oui"` rend les trois réponses du questionnaire obligatoires. Seul l'indicateur « au moins une réponse à risque » est conservé, jamais le détail.
- `site_web` est un piège anti-robot : rempli, la réponse reste un 201 `{statut}` **sans `id`** et rien n'est enregistré.
- `statut`, `duree_min`, `nom` de prestation envoyés par le client sont ignorés : le serveur fait foi.
- Limite : **5 créations par heure et par IP** (60 requêtes par minute pour les lectures). Réglages : `REST_FRAMEWORK` dans `backend/pr_beautyaura/settings.py`.
- Un champ `precisions` envoyé par un ancien client est ignoré (donnée de santé non conservée).

## B. API cible : `/api/v1/booking/`

Tous les chemins ci-dessous sont relatifs à ce préfixe. Lue dans le code de l'autre dépôt (`booking/urls.py`, `api_views.py`, `serializers.py`) ; les routes marquées ✔ ont aussi été appelées sur la démo.

### Routes publiques (utilisées par le site)

| Méthode et chemin | Rôle | Réponse |
|---|---|---|
| `GET /services/` ✔ | Prestations actives | 200 `[{name, slug, description, duration_minutes, price_cents, deposit_cents}]` |
| `GET /services/<slug>/` | Détail d'une prestation | 200 ou 404 |
| `GET /availability/days/?services=slug,slug&month=YYYY-MM` ✔ | Jours du mois | 200 `{month, timezone, booking_mode, days:[{date, available}]}` |
| `GET /availability/?services=slug,slug&date=YYYY-MM-DD[&resource=id]` ✔ | Créneaux d'un jour | 200 `{date, timezone, booking_mode, slots:[{start_at, end_at, resource}]}` (**instants UTC**, pas de 15 min) |
| `POST /bookings/` ✔ | Crée la réservation | 201 `{booking:{status, start_at, end_at, hold_expires_at, customer_*, lines, total_cents, deposit_cents, timezone, deposit_paid}, management_token}` |
| `GET /bookings/<token>/` | Consulter | 200 réservation (même forme) |
| `POST /bookings/<token>/cancel/` ✔ | Annuler | 200 réservation + `refund:{outcome, amount_cents}` |
| `POST /bookings/<token>/reschedule/` | Déplacer, corps `{start_at}` | 200 réservation |
| `GET /bookings/<token>/receipt/` | Reçu PDF de l'acompte | 200 `application/pdf` ou 404 `no_receipt` |
| `GET /payment-methods/` | Moyens de paiement | 200 `[{id, label}]` |
| `POST /bookings/<token>/pay/` | Ouvre le paiement de l'acompte, corps `{provider}` | 201 `{provider, checkout_url, amount_cents, currency, expires_at}` |
| `POST /bookings/<token>/pay/return/` | Retour de la page de paiement, corps `{order_id}` | 200 `{outcome, payment_status, booking}` |
| `POST /contact/` | Message à l'établissement, corps `{name, email, message, website}` | 201 |

Charge utile de `POST /bookings/` (le prix, l'acompte et le statut ne viennent **jamais** du navigateur) :

```json
{
  "services": ["rehaussement"], "start_at": "2026-11-10T13:15:00Z", "resource": 1,
  "customer_name": "Léa Martin", "customer_email": "lea@example.test", "customer_phone": "0612345678",
  "allergy": false, "consent": true, "website": ""
}
```

- `resource` est facultatif : sans lui, la première ressource qui a le créneau est prise.
- `consent` doit valoir `true` ; `website` doit rester vide (piège anti-robot : rempli, 400).
- `management_token` n'est affiché **qu'une fois** à la création (seul son SHA-256 est stocké) ; l'e-mail de confirmation contient un lien équivalent signé. C'est la seule clé pour consulter, déplacer ou annuler : ne pas le journaliser.
- En mode `booking_mode: "request"`, le statut renvoyé est `pending` ; en mode `instant`, la réservation peut être confirmée tout de suite. Notre règle « jamais de confirmé sans validation » suppose le mode `request` : à garder tel quel.

### Routes non destinées au site

- `staff/…` (ressources, réservations, reçu, déplacement, actions) : agenda de la praticienne, **authentifiées** (rôles, TOTP). Hors périmètre de ce guide.
- `webhooks/<fournisseur>/` : appelée par Stripe ou PayPal (signature vérifiée). Le navigateur ne doit jamais l'appeler.

### Format d'erreur et limites

Erreurs métier : `{"error": {"code": "...", "message": "...", "details": ...}}`.

| Code | HTTP | Sens |
|---|---|---|
| `slot_unavailable`, `slot_taken` | 409 | Créneau pris entre-temps : proposer d'autres horaires |
| `invalid_service`, `no_service`, `invalid_resource`, `invalid_provider` | 400 | Prestation, ressource ou moyen de paiement inconnu |
| `invalid_transition`, `invalid_state`, `hold_expired`, `no_deposit_due` | 409 | Action impossible dans l'état actuel |
| `too_many_holds` | 429 | Trop de blocages en cours pour cet e-mail ou cette IP |
| `tenant_not_found` | 404 | Domaine inconnu : l'établissement est choisi par le nom d'hôte de la requête |
| `invalid_order` | 404 | Commande de paiement inconnue |
| `provider_error` | 502 | Le fournisseur de paiement a échoué |

Limitation de débit par portée : lectures 60/min, création 10/min, gestion 30/min, paiement 10/min, contact 5/min.

Schéma OpenAPI : l'autre dépôt déclare `/api/schema/` (JSON) et `/api/docs/` (Swagger) dans `config/urls.py` ; non rappelés sur la démo lors de la rédaction.

## C. Correspondance entre les deux contrats

| Besoin | Actuelle | Cible |
|---|---|---|
| Prestations | `id` (slug) | `slug` |
| Jours du mois | `dates:[…]` | `days:[{date, available}]` |
| Créneaux | `creneaux:["HH:mm"]` | `slots:[{start_at UTC}]` |
| Créer | `prestations`, `date`, `heure`, `client`, `questionnaire`… | `services`, `start_at`, `customer_*`, `allergy`, `consent` |
| Réponse | `{id, statut}` | `{booking, management_token}` |
| Erreur | `{detail}` | `{error:{code,message}}` |
| Créneau pris | 409 | 409 `slot_unavailable` |

L'adaptateur `api-booking.js` fait cette traduction (conversion UTC vers Europe/Paris pour l'affichage seulement ; `start_at` d'origine renvoyé à la création). Il envoie `allergy: true` si au moins une réponse à risque est « oui » (nom provisoire, ADR 0002).

## D. Brancher le frontend : points d'attention

- **Même origine** (pile Docker de démo, ou nginx qui proxifie `/api/`) : rien à autoriser. **Origine différente** : CORS côté API (`CORS_ALLOWED_ORIGINS` en production) **et** `connect-src` dans `frontend/_headers`. Sinon le navigateur bloque l'appel.
- Le service worker **ne met jamais en cache** `/api/` ni `/data/` (un créneau périmé serait trompeur).
- Le calendrier lit un mois par requête : 3 requêtes pour l'horizon de 60 jours, jours grisés pendant le chargement.
- Ne jamais afficher « confirmé » sur la foi d'une réponse de création : seul le statut renvoyé après validation du studio compte.
- Le jeton de gestion ne doit pas partir dans une URL de journal ni dans l'analytique.

## E. Tester

```bash
bash scripts/demo.sh up                                    # API actuelle, http://localhost:8082
curl -s http://localhost:8082/api/v1/services/
# API cible : démo de l'autre dépôt, appel par nom de domaine
curl -s --resolve mba.localhost:8081:127.0.0.1 http://mba.localhost:8081/api/v1/booking/services/
node --test "tests/*.test.mjs"                             # depuis frontend/ : dont tests/api-booking.test.mjs
```

## F. Limites

- Les routes marquées sans ✔ de la section B sont lues dans le code, pas appelées.
- Les montants, l'acompte et les paiements n'ont pas de recette en bac à sable (acompte à 0 sur la démo de l'autre dépôt).
- Ce guide décrit l'état du 05/11/2026 : en cas d'écart, le code fait foi.
