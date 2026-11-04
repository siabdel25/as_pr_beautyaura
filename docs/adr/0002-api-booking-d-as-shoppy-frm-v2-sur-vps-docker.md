# ADR 0002 : le site statique appelle l'API `booking` d'as_shoppy_frm_v2, hébergée sur un VPS Docker

- Statut : accepté
- Date : 04/11/2026
- Décideur : l'utilisateur du projet
- Complète : `docs/adr/0001-statique-d-abord-wagtail-sur-declencheurs.md` (lève la question de l'hébergement de la phase 2 et celle du doublon)
- Analyses : `docs/COMPARAISON-AS-SHOPPY-FRM-V2.md`, `docs/DIAGNOSTIC-API-BOOKING.md`

## Contexte

My Beauty Aura existe dans deux dépôts : celui-ci (site statique + `backend/` Django minimal) et `as_shoppy_frm_v2` (module `booking` complet : créneaux, contrainte PostgreSQL anti-chevauchement, file d'e-mails, lien de gestion, acompte, agenda, RGPD, rôles, Wagtail). Le diagnostic a montré que le site statique d'ici peut appeler l'API de l'autre dépôt avec un adaptateur, et que ses contrats ont été confirmés sur la démo Docker.

## Décision

1. **Option 2 retenue** : le site statique d'ici (`frontend/`) appelle l'API `booking` d'`as_shoppy_frm_v2`. Ce dépôt ne porte plus de backend de réservation.
2. **Hébergement de la phase 2 : VPS avec Docker** (pile PostgreSQL, Redis, Celery, nginx de l'autre dépôt). Cela supprime l'obstacle PostgreSQL et Python que posait l'hébergement mutualisé.
3. Le déclencheur « hébergement phase 2 décidé » de l'ADR 0001 est atteint. Les deux autres (réservation validée en production avec un vrai SMTP, publication par la praticienne plus d'une fois par mois) ne le sont pas.

## Ce que cela implique (à planifier, rien n'est commencé)

| Travail | Où | Remarque |
|---|---|---|
| Adaptateur API dans `submit.js` (+ tests Node) | ici | Conversion UTC vers Europe/Paris pour l'affichage seulement, sans arithmétique de jours |
| Domaine de l'API enregistré comme `Domain` de l'établissement ; `CORS_ALLOWED_ORIGINS` et CSP `connect-src` | là-bas et ici | `production.py` est déjà restreint |
| Réglage du pas de créneau (15 ou 30 min) | là-bas | Aujourd'hui fixé à 15 min, non exposé |
| Avis J+2 et retouche J+18 | là-bas | Absents de leur code hors tests, à porter depuis `backend/reservations/tasks.py` |
| Retrait ou gel de `backend/reservations` | ici | Seulement après recette de bout en bout |
| Recette : démo Docker puis VPS | les deux | Contenu des e-mails non encore vérifié |

## Questions encore ouvertes

1. **Questionnaire de première visite** : le navigateur le contrôle et le message « contactez le studio » reste. Côté serveur, ici on conserve `reponse_a_risque` (oui/non), là-bas `allergy` (oui/non). Faut-il aligner ? À valider avec la praticienne.
2. **Pas de créneau** : 15 ou 30 minutes ?
3. **Porteur des avis et retouches** : proposition ici = l'autre dépôt, à confirmer.
4. **Site statique** : reste sur Hostinger ou passe sur le VPS ? Dépend du domaine et de la CSP.
5. **Un seul site attendu par le client ?** Adresse de `clients/mba.yaml` à confirmer (non reprise ici).
6. **Fournisseur d'e-mail** : l'autre dépôt prévoit Anymail/Brevo ; non validé.

## Conséquences

Positives : une seule implémentation de la réservation, déjà recettée ; acompte, agenda et RGPD disponibles sans les réécrire ; PostgreSQL garantit l'anti double réservation.

Négatives : dépendance à un autre dépôt et à son rythme ; la phase 1 reste sans réservation automatique tant que l'API n'est pas déployée (le tunnel reste en mode `api: null`) ; le travail de `backend/` d'ici (72 tests) devient obsolète après la migration ; un VPS est à administrer (sauvegardes, mises à jour, supervision).

## Ce qui ne change pas

La phase 1 statique et sa mise en ligne (bloquée par le client) ne dépendent pas de cette décision. Aucune refonte de `backend/` n'est lancée avant la recette de l'adaptateur.

## Points à vérifier

- Coût et choix du VPS (non étudiés ici).
- Sauvegardes, TLS et supervision du VPS : voir `docs/DEPLOIEMENT.md` de l'autre dépôt, non relu.
- Recette des e-mails de l'autre dépôt avec un vrai SMTP.
