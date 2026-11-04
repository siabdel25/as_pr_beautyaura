# Analyse stratégie et architecture : Wagtail et plateforme multi-métiers

Date : 04/11/2026. Méthode : revue stratégie (`/plan-ceo-review`, mode HOLD SCOPE) et revue d'architecture (`/plan-eng-review`) sur le plan « intégrer Wagtail et viser une architecture standard réutilisable pour d'autres métiers ». Décision formelle : `docs/adr/0001-statique-d-abord-wagtail-sur-declencheurs.md`.

## 1. Conclusion en bref

- **Ne pas intégrer Wagtail maintenant.** Publier d'abord la phase 1 statique, qui attend des informations du client.
- **Ne pas construire de plateforme multi-métiers maintenant.** Aucun second métier n'existe. Faire seulement le travail de préparation à faible coût (config métier).
- **Passer à Wagtail et à la plateforme sur des déclencheurs écrits**, pas sur une date.
- **Corriger d'abord un défaut réel** trouvé dans le backend : les e-mails de confirmation et de refus/annulation peuvent être perdus sans trace.

Cette analyse corrige une première étude trop pressée, qui recommandait un spike Wagtail immédiat.

## 2. Contestation des prémisses

| Question | Réponse |
|---|---|
| Quel problème résout-on ? | Deux besoins mélangés : l'autonomie éditoriale de la praticienne (réel, petit : 9 pages et un blog) et la réutilisation par d'autres métiers (hypothétique). |
| Que se passe-t-il si l'on ne fait rien ? | La phase 1 est bloquée par des informations client, pas par le CMS. Modifier un texte passe par un développeur, ce qui est acceptable à ce stade. |
| Une voie plus sobre existe-t-elle ? | Oui : rester statique, avec une configuration métier minimale. Un CMS basé sur Git a été examiné et écarté (voir §4). |

## 3. État réel du dépôt (faits vérifiés)

- Backend : environ 1 400 lignes, 62 tests Django. Le moteur de créneaux, le verrou par jour, les notifications Celery, l'`.ics` et le suivi sont **génériques**.
- Le métier « lash & brow » est en dur à trois endroits seulement :
  - `backend/reservations/serializers.py:7` : `QUESTIONS_A_RISQUE`
  - `backend/reservations/tasks.py:11` : `QUESTIONS` (libellés)
  - `backend/reservations/tasks.py:282` : catégorie `'extensions'` de la relance de retouche
- Générateur statique : 854 lignes dans `frontend/tools/` (pages en modules `.mjs`).
- Wagtail 8.1 déclare `Django>=5.2` sans plafond (métadonnées lues). **Installation avec Django 6.1 non testée.**
- L'hébergement de la phase 2 n'est pas décidé. Wagtail demande un serveur Python ; son impossibilité sur le mutualisé Hostinger **n'a pas été vérifiée** auprès de l'hébergeur.

## 4. Options et choix

| Option | Résumé | Effort (CC) | Risque | Choix |
|---|---|---|---|---|
| **A** | Statique d'abord, config métier minimale, blog en pages `.mjs`, Wagtail sur déclencheurs | ~1 h | Faible | **Retenue** |
| B | Wagtail dans `backend/` dès maintenant, blog en premier | ~3 h | Moyen | Écartée : exige l'hébergement phase 2 et change la pile |
| C | Plateforme complète (`core_booking`, `site_cms`, packs métier, multisite) | ~1 j | Élevé | Écartée : abstraction sans second cas réel |

Mode de revue retenu : **HOLD SCOPE** (le périmètre A est accepté, on cherche les angles morts sans l'élargir).

## 5. Décisions

1. **Approche A** retenue.
2. **Rattrapage des e-mails** (constat 1) : étendre le rattrapage `beat` et la commande `renvoyer_notifications`.
3. **Config métier** (constat 2) : un seul module `backend/reservations/vertical.py`, sans modèle ni migration.
4. **Blog** (constat 3) : articles en pages `frontend/tools/pages/06-blog.mjs`, comme les autres pages. Écartés : parseur Markdown (dépendance) et CMS Git (compte GitHub et authentification), tous deux interdits sans accord par `CLAUDE.md`.
5. **Déclencheurs** consignés dans `TODO.md` et dans l'ADR (voir §7).
6. **ADR 0001** rédigée.
7. Pour d'autres métiers : **un déploiement par client** (même image, métier par configuration), pas de multi-tenant.

## 6. Constats de la revue

| # | Gravité | Constat | Confiance | Décision |
|---|---|---|---|---|
| 1 | CRITICAL GAP | `renvoyer_notifications.py:11` et la tâche beat `rattraper_notifications` ne rattrapent que les demandes `A_CONFIRMER`. Les e-mails de **confirmation** et de **refus/annulation** n'ont aucun filet : si le broker est arrêté au clic dans l'admin, `transaction.on_commit(..., robust=True)` avale l'erreur et la cliente ne reçoit rien, sans trace. Les reprises s'arrêtent aussi après 6 essais. | 9/10 | Corriger (option A : beat + commande) |
| 2 | Moyenne | Le métier est en dur à 3 endroits (§3). Seul vrai verrou technique pour un autre métier. | 9/10 | Extraire dans `vertical.py` |
| 3 | Moyenne | Mon plan initial (Markdown + CMS Git) contredisait `CLAUDE.md` (aucune dépendance ni service ajouté sans accord). | 8/10 | Blog en pages `.mjs` |

### Registre des modes de panne

| Chemin | Panne | Rattrapé ? | Testé ? | La cliente voit |
|---|---|---|---|---|
| `notifier_praticienne` | SMTP ou broker arrêté | Oui (reprises + beat) | Oui | Rien (transparent) |
| `envoyer_confirmation` | SMTP ou broker arrêté | **Non** (corrigé par la décision 2) | Partiel | Rien, message perdu |
| `envoyer_annulation` | SMTP ou broker arrêté | **Non** (corrigé par la décision 2) | Partiel | Rien, message perdu |
| `envoyer_suivis` | beat arrêté | Oui (fenêtre de 7 jours) | Oui | Rien |
| Blog au build | front-matter absent, slug en double, corps vide | À prévoir : échec bruyant | À écrire | Build en erreur |

### Autres sections de la revue

- Sécurité : aucune nouvelle surface avec l'approche A.
- Performance : l'index `(date, statut)` existe, tables petites. Rien à signaler.
- Observabilité : le rattrapage doit journaliser un compte par type (intégré à la décision 2).
- Déploiement : aucune migration pour les décisions 2 et 3, retour arrière par `git revert`.
- Trajectoire : réversibilité 4/5. La dette principale est de ne pas perdre les déclencheurs, d'où l'ADR.
- Interface : le blog reprend le gabarit existant. `/plan-design-review` conseillé plus tard pour la page d'index, sans bloquer.

## 7. Déclencheurs de bascule

- **Vers Wagtail**, quand les trois sont vrais : hébergement phase 2 décidé, réservation validée en production avec un vrai SMTP, la praticienne publie ou modifie du contenu plus d'une fois par mois.
- **Vers une plateforme multi-métiers** : seulement avec un second métier signé. On extrait alors `core_booking` à partir de deux cas réels.

À vérifier avant toute bascule :

- Spike d'une demi-journée : installer Wagtail avec Django 6.1 dans la pile Docker.
- Confirmer auprès de Hostinger que Wagtail ne peut pas tourner sur le mutualisé.
- Changer la pile exige une décision explicite et la mise à jour de `CLAUDE.md` et du cahier des charges.

## 8. Architecture cible à terme (indicative, non engagée)

```
 Aujourd'hui (approche A)                  Après déclencheurs
 -------------------------------           ---------------------------------------
 frontend/ statique (Hostinger)            Wagtail (pages, blog, SEO) dans backend/
 backend/ Django (hôte phase 2)            + core_booking (créneaux, verrou, mails)
   reservations + vertical.py              + vertical_<métier> (config, textes, thème)
                                           un déploiement par client, même image
```

Ce schéma est une direction, pas un engagement : `core_booking` et les packs ne se créent qu'avec un second métier signé.

## 9. Hors périmètre

- Wagtail, `core_booking`, multisite ou multi-tenant (déclencheurs non atteints).
- CMS Git et parseur Markdown (dépendances interdites sans accord).
- SMS, SMTP de production, hébergement de la phase 2 : décisions client déjà listées dans `TODO.md`.
- Flux Instagram.

## 10. Tâches issues de la revue

Consignées dans `TODO.md` (phase 2) :

- [ ] **P1** Rattrapage des e-mails de confirmation et de refus/annulation (beat, commande, journal, tests).
- [ ] **P2** `backend/reservations/vertical.py` (config métier).
- [ ] **P2** Blog : 4 articles en `06-blog.mjs`, textes marqués `[À VALIDER]`.
- [ ] **P2** Déclencheurs de bascule (déjà consignés).

## 11. Limites de l'analyse

- Le second avis indépendant (Codex ou sous-agent) n'a pas été exécuté : CLI Codex absent, sous-agent non lancé sans votre demande.
- Aucune mesure de charge ni installation de Wagtail n'a été faite ; les affirmations sur Wagtail viennent des métadonnées du paquet.
- Aucun second client ni métier cible n'est connu : l'architecture multi-métiers reste hypothétique.
