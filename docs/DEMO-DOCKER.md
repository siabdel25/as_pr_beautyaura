# Démonstration Docker avec fausses données

Pile complète et autonome pour **tester la réservation de bout en bout** : site, API Django, Celery (worker et planificateur), PostgreSQL, Redis et une boîte e-mail de capture (Mailpit). Les e-mails ne sortent jamais. Ne pas utiliser en production.

Différence avec `frontend/demo/` : cette démo statique ne peut pas envoyer de demande (aucune API). Celle-ci le peut.

## Lancer

```bash
bash scripts/demo.sh up       # 1er lancement : quelques minutes (construction de l'image)
bash scripts/demo.sh status   # état des conteneurs
bash scripts/demo.sh logs     # journaux
bash scripts/demo.sh down     # arrêter, données conservées
bash scripts/demo.sh reset    # tout effacer et repartir de zéro
```

| Quoi | Adresse |
|---|---|
| Site et réservation | http://localhost:8082/reservation.html |
| Administration du studio | http://localhost:8082/admin/ : compte `studio`, mot de passe `demo-studio` |
| E-mails capturés | http://localhost:8026/ |

Ports modifiables : `DEMO_PORT` (8082) et `MAILPIT_PORT` (8026). La démo `mba-demo` de l'autre dépôt utilise 8081 et 8025 : les deux piles peuvent tourner ensemble.

## Parcours à tester

1. **Réserver** : ouvrir la page de réservation, choisir une prestation, un jour, un créneau, remplir les coordonnées, cocher le consentement et les CGV. Les jours et créneaux déjà pris par les fausses réservations sont grisés.
2. **Première visite** : répondre « oui » à une question à risque (grossesse, par exemple) : le message « contactez le studio » s'affiche. La demande part quand même ; seul l'indicateur « réponse à risque » est conservé.
3. **E-mail du studio** : dans Mailpit, « Demande de rendez-vous à confirmer », adressé à `studio@demo.test`.
4. **Confirmer** : dans l'administration, Réservations, sélectionner la demande, action « Confirmer les demandes sélectionnées ». Mailpit reçoit « Votre rendez-vous … est confirmé » avec le fichier `.ics`. Le site ne dit jamais « confirmé » avant cette étape.
5. **Refuser ou annuler** : mêmes actions, e-mail de refus ou d'annulation.
6. **Double réservation** : réserver deux fois le même créneau dans deux onglets : la seconde reçoit « Ce créneau vient d'être pris ».
7. **Rappel J-1, avis J+2, retouche J+18** : ils partent via le planificateur (10 h et 11 h, heure de Paris) et ne se voient pas en quelques minutes. Pour forcer l'envoi : `docker compose -f docker-compose.demo.yml exec backend python manage.py renvoyer_notifications`.

## Ce que contiennent les fausses données

Services et horaires de `frontend/data/` (prix absents, comme dans le dépôt). Environ 29 réservations fictives (`Cliente démo NN`, adresses `@example.test`), dont une sur trois déjà confirmée, décalées à la date du jour à chaque démarrage. `DEMO_SEED=7 bash scripts/demo.sh up` change le jeu.

## Limites

- Limitation de fréquence : 5 demandes par heure et par adresse IP. Au-delà, l'API répond 429 : `reset` ou attendre.
- Les réservations fictives sont recréées seulement après `reset` (la base est conservée entre deux `up`).
- Le contenu du site reste celui du dépôt : marqueurs `[À COMPLÉTER]` visibles, volontairement.
- Le backend de cette démo est celui de ce dépôt. L'API cible de l'ADR 0002 est celle d'`as_shoppy_frm_v2` (démo `mba-demo`, voir `docs/DIAGNOSTIC-API-BOOKING.md`). L'adaptateur `"api_format": "booking"` n'est pas activé ici.
- Non testé : le parcours dans un navigateur réel (vérifié ici par appels HTTP : pages, API, création, confirmation, e-mails).
