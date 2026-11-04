# ADR 0001 : site statique d'abord, Wagtail et plateforme multi-métiers sur déclencheurs

- Statut : accepté
- Date : 04/11/2026
- Décideur : l'utilisateur du projet, après revue stratégie (`/plan-ceo-review`, mode HOLD SCOPE) et architecture (`/plan-eng-review`)
- Remplace : aucune décision antérieure. Précise la décision du 04/11/2026 « Django pour la phase 2 » (`docs/CAHIER_DES_CHARGES.md`).

## Contexte

Le projet est un site vitrine statique avec réservation en ligne pour un studio de cils et de sourcils. La phase 1 (statique, Hostinger mutualisé) n'est pas encore en ligne : elle attend des informations du client (coordonnées, tarifs, textes). La phase 2 (Django, DRF, Celery, Redis, PostgreSQL) est largement codée : API de réservation, anti double réservation, notifications, confirmation, refus/annulation, avis J+2 et retouche J+18.

Deux questions se posent :

1. Faut-il intégrer un CMS (Wagtail) pour que la praticienne édite le contenu, notamment le blog ?
2. Faut-il viser dès maintenant une architecture standard réutilisable pour d'autres métiers similaires ?

Faits vérifiés :

- Aucun deuxième métier ni second client n'existe dans le dépôt ni dans le cahier des charges.
- L'hébergement de la phase 2 (VPS ou PaaS Docker) n'est pas décidé.
- Wagtail 8.1 déclare `Django>=5.2` sans plafond (métadonnées lues). Son installation avec Django 6.1 n'a **pas** été testée.
- Le métier « lash & brow » est en dur à trois endroits seulement : `backend/reservations/serializers.py:7` (`QUESTIONS_A_RISQUE`), `backend/reservations/tasks.py:11` (`QUESTIONS`) et `backend/reservations/tasks.py:282` (catégorie `'extensions'`).
- `CLAUDE.md` interdit d'ajouter une dépendance ou un service sans accord.

## Options étudiées

| Option | Résumé | Effort (CC) | Risque |
|---|---|---|---|
| **A** | Statique d'abord, config métier minimale, blog en pages `.mjs`, Wagtail sur déclencheurs | ~1 h | Faible |
| B | Wagtail dans `backend/` dès maintenant, blog en premier | ~3 h | Moyen |
| C | Plateforme complète (`core_booking`, `site_cms`, packs métier, multisite) | ~1 j | Élevé |

## Décision

Retenir **A**.

1. La mise en ligne de la phase 1 reste le chemin critique ; aucune plateforme n'est construite avant un premier client en ligne.
2. Sortir le métier du code dans un seul module `backend/reservations/vertical.py` (questions à risque, libellés, catégorie de retouche), sans modèle ni migration.
3. Écrire le blog en pages `frontend/tools/pages/06-blog.mjs`, comme les autres pages. Ni parseur Markdown, ni CMS Git : l'un ajouterait une dépendance, l'autre un service d'authentification, tous deux interdits sans accord par `CLAUDE.md`.
4. Corriger le défaut de rattrapage constaté pendant la revue : les e-mails de confirmation et de refus/annulation n'ont aucun filet si le broker ou le SMTP est arrêté (`renvoyer_notifications.py` ne couvre que les demandes à confirmer).
5. Pour d'autres métiers, viser **un déploiement par client** (même image, métier choisi par configuration), pas un multi-tenant.

## Déclencheurs de bascule (à ne pas re-débattre avant)

- **Vers Wagtail**, quand les trois sont vrais : hébergement phase 2 décidé, réservation validée en production avec un vrai SMTP, la praticienne publie ou modifie du contenu plus d'une fois par mois.
- **Vers une plateforme multi-métiers**, seulement avec un second métier signé. L'extraction de `core_booking` se fait alors à partir de deux cas réels.

## Conséquences

Positives : la mise en ligne n'est pas retardée ; aucune dépendance ni service ajouté ; pas d'abstraction sans second cas ; la porte vers Wagtail reste ouverte et réversible (réversibilité 4/5).

Négatives : jusqu'au passage à Wagtail, toute modification de texte ou tout nouvel article passe par un développeur ; le blog est repoussé après la mise en ligne de la phase 1 ; un second métier avant les déclencheurs obligerait à forker le dépôt.

## Points à vérifier avant d'appliquer les déclencheurs

- Installer Wagtail avec Django 6.1 dans la pile Docker (spike d'une demi-journée) avant toute décision.
- Confirmer auprès de Hostinger que Wagtail ne peut pas tourner sur l'offre mutualisée (non vérifié).
- Changer la pile exige une décision explicite et la mise à jour de `CLAUDE.md` et du cahier des charges.

## Références

- Tâches issues de la revue : `TODO.md` (phase 2, entrées « Rattrapage… », « Config métier… », « Blog… », « Déclencheurs de bascule… »).
- Analyse complète : `docs/ANALYSE-ARCHITECTURE-2026-11-04.md`.
- Journal de revue gstack : décision enregistrée le 04/11/2026.
