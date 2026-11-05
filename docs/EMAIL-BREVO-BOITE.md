# E-mails : envoyer avec Brevo, recevoir les réponses dans une vraie boîte

Date : 05/11/2026. Deux besoins distincts, à mettre en place séparément (le premier ne remplace pas le second) :

| Besoin | Solution | Où | Adresse type |
|---|---|---|---|
| **Envoyer** les e-mails de l'application (accusé, confirmation, rappel, annulation) | **Brevo**, par API | service externe, appelé par l'application | `reservations@<domaine>` (expéditeur, `From`) |
| **Recevoir** les réponses des clientes et les alertes du studio | **Une vraie boîte mail, hors du VPS** | messagerie du domaine | `contact@<domaine>` (destinataire, `Reply-To`) |

Pourquoi pas de serveur de messagerie sur le VPS : le port 25 sortant est souvent bloqué, une IP de VPS neuve est mal réputée (spam), et SPF, DKIM, DMARC, rebonds et listes noires seraient à votre charge. Le VPS reste dédié à l'application.

> **Domaine** : `<domaine>` vaut `dimatlas.com` pour la préproduction (voir `docs/DEPLOIEMENT-VPS.md`). Pour la mise en ligne, refaire toute la procédure sur le **domaine du studio**, pas sur `dimatlas.com`.
>
> Cette procédure vise l'API cible (`booking`, dépôt `as_shoppy_frm_v2`, ADR 0002). Elle complète son guide `docs/EMAIL_DELIVERABILITY.md`, que j'ai lu : en cas d'écart, **ce guide prime**. Les écrans de Brevo changent : les intitulés ci-dessous sont indicatifs.

## 1. Comment les messages circulent

```
Cliente réserve ──► application ──► Brevo ──► boîte de la cliente
                     (From: reservations@<domaine>, Reply-To: contact@<domaine>)
Cliente répond ─────────────────────────────► contact@<domaine>   (boîte réelle, lue par le studio)

Alerte au studio : application ──► Brevo ──► contact@<domaine>
                     (Reply-To: adresse de la cliente → « Répondre » écrit à la cliente)
```

- `From` : l'adresse d'envoi, qui doit appartenir au domaine **authentifié chez Brevo**. Personne ne lit forcément cette adresse.
- `Reply-To` : l'adresse à laquelle part une réponse. C'est elle qui amène les réponses dans la boîte réelle. Réglage : un seul champ, **E-mail de notification de l'établissement** (étape 7).

## 2. Partie A : Brevo envoie les e-mails

1. **Créer le compte Brevo et le faire vérifier.** Prévoir quelques jours : un contrôle manuel est possible avant d'autoriser l'envoi.
2. **Ajouter le domaine** (Brevo, section des expéditeurs et domaines) puis l'**authentifier** (étape 3).
3. **Créer une clé API v3** (Brevo, « SMTP et API »). Elle ne va **jamais** dans Git : seulement dans le `.env` du serveur (droits 600).
4. **Renseigner le `.env`** du serveur (dépôt `as_shoppy_frm_v2`) :
   ```ini
   EMAIL_BACKEND=anymail.backends.brevo.EmailBackend
   BREVO_API_KEY=<clé API>
   DEFAULT_FROM_EMAIL=reservations@<domaine>
   ```
5. **Redémarrer** `web`, `celeryworker` et `celerybeat` (ils lisent `.env` au démarrage) :
   ```bash
   docker compose -f docker-compose.yml up -d
   docker compose -f docker-compose.yml --profile celery up -d
   ```
6. **Vérifier** : `bash scripts/check_deploy.sh` ne doit plus afficher `booking.W001` ni `booking.W002` (avertissements « backend e-mail factice » ou « clé API vide »).
7. **Données personnelles** : Brevo est un **sous-traitant**. Signer l'accord de traitement (DPA), choisir l'hébergement UE, le citer dans la politique de confidentialité.

Le fonctionnement : l'action métier écrit l'e-mail dans une file (`EmailOutbox`), et la tâche Celery `process_outbox` l'envoie chaque minute. Si Brevo est indisponible, nouvelles tentatives à +1 min, +10 min, +1 h, puis le message passe en « Abandonné » (à relancer dans l'administration, « E-mails en file »). Quota gratuit indicatif : environ 300 e-mails par jour, à vérifier sur la page tarifs de Brevo.

## 3. DNS du domaine d'envoi (SPF, DKIM, DMARC)

Sans cela, les confirmations finissent en spam. Chez le gestionnaire DNS du domaine. **Copier les valeurs fournies par Brevo** (surtout DKIM), pas celles de ce document, qui donnent la forme attendue.

| Enregistrement | Type | Rôle |
|---|---|---|
| Code de vérification du domaine | `TXT` fourni par Brevo | Prouve que vous possédez le domaine |
| **SPF** | `TXT` sur `@` | Liste les services autorisés à envoyer pour le domaine |
| **DKIM** | `CNAME` ou `TXT` fournis par Brevo | Signe chaque message |
| **DMARC** | `TXT` sur `_dmarc` | Politique en cas d'échec, rapports |

**SPF : un seul enregistrement par domaine.** Si la boîte mail de la partie B est chez un fournisseur qui impose aussi son `include:`, il faut **fusionner** :
```
@  TXT  "v=spf1 include:spf.brevo.com include:<include du fournisseur de la boîte> ~all"
```
Deux enregistrements SPF distincts invalident SPF.

**DMARC**, d'abord en observation :
```
_dmarc  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@<domaine>; adkim=s; aspf=s"
```
Après 2 à 4 semaines sans anomalie dans les rapports : `p=quarantine`, puis `p=reject`. L'adresse `dmarc@<domaine>` doit exister (alias ou boîte, partie B).

Contrôles : l'adresse `From` appartient bien au domaine authentifié ; envoyer un message de test à une adresse Gmail, « Afficher l'original » : `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.

> Ne jamais utiliser une adresse `@gmail.com`, `@outlook.com` ou `@yahoo.fr` comme `From` : DMARC échouerait.

## 4. Partie B : une vraie boîte mail, hors du VPS

Il faut une boîte (ou un alias qui redirige vers une boîte) que le studio **lit vraiment**. C'est elle qui reçoit les alertes du studio et les réponses des clientes.

### 4.1 Choisir où l'héberger

Critères : pas sur le VPS ; l'adresse est sur **votre domaine** ; accès par webmail et téléphone ; SPF/DKIM propres au fournisseur ; coût mensuel prévisible.

| Option | Remarque |
|---|---|
| Messagerie de l'hébergeur du domaine (Hostinger propose des boîtes e-mail avec certaines offres) | Simple si le DNS est déjà chez lui ; **offre et prix à vérifier dans hPanel**, non consultés ici |
| Zoho Mail, Google Workspace ou équivalent | Plus de fonctions, abonnement ; Zoho a une offre gratuite limitée (à vérifier) |
| Simple redirection (alias) vers une boîte existante du studio | Gratuit, mais « Répondre » depuis la boîte d'origine ne sortira pas avec l'adresse du domaine |

**Le choix du service et son coût sont à valider avec vous** : aucun abonnement n'est pris sans votre accord.

### 4.2 Mise en place

1. Créer `contact@<domaine>` (la boîte lue par le studio) et `dmarc@<domaine>` (peut être un alias vers la même boîte).
2. Créer aussi `reservations@<domaine>` **comme alias vers `contact@`**, pas comme adresse inexistante : si une cliente répond au `From` malgré le `Reply-To` (certains clients de messagerie l'ignorent), le message arrive quand même.
3. Ajouter chez le DNS les enregistrements **MX** et les enregistrements SPF/DKIM demandés par le fournisseur de la boîte (SPF : fusionner avec Brevo, section 3).
4. Test de réception : envoyer un message depuis une adresse externe vers `contact@<domaine>` ; vérifier qu'il arrive. Test d'émission : répondre depuis la boîte, vérifier la réception côté externe sans passage en spam.

## 5. Brancher les réponses : le champ Reply-To

Dans l'administration de l'API (`https://<domaine>/gestion/`, voir `docs/GUIDE-DASHBOARD.md`) : **Réglages de réservation**, champ **E-mail de notification de l'établissement** = `contact@<domaine>`.

Ce champ sert à trois choses (lu dans `booking/notifications.py` et `booking/models.py`) :

| Message | Destinataire | `Reply-To` |
|---|---|---|
| Accusé de demande, confirmation, annulation, remboursement, déplacement, rappel | la cliente | `contact@<domaine>` (le champ) |
| Nouvelle demande, annulation, déplacement | le studio (`contact@`) | l'adresse **de la cliente** : « Répondre » écrit à la cliente |
| Message du formulaire de contact | le studio | l'adresse de l'expéditrice |

Si le champ est **vide**, aucune notification n'est envoyée au studio : à renseigner avant la mise en service.

**Test de bout en bout** (à faire sur le VPS, avec un vrai e-mail) :
1. Réserver depuis le site avec une adresse personnelle (Gmail, par exemple).
2. Contrôler : accusé reçu dans la **boîte de réception** (pas les indésirables), alerte reçue dans `contact@`.
3. Dans l'accusé, cliquer « Répondre » : le destinataire proposé doit être `contact@<domaine>`.
4. Dans l'alerte du studio, cliquer « Répondre » : le destinataire doit être l'adresse de la cliente.

## 6. Cas du backend de ce dépôt (`backend/`)

Le backend d'ici (utilisé par la démo `scripts/demo.sh`, appelé à être remplacé selon l'ADR 0002) se configure par variables d'environnement, pas par l'administration : `STUDIO_EMAIL` (destinataire des alertes), `STUDIO_NOM`, `DEFAULT_FROM_EMAIL`, et le SMTP (`DJANGO_EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`). Il envoie par SMTP, pas par l'API Brevo : les identifiants SMTP de Brevo (hôte, port, identifiant, clé SMTP) conviennent.

**Écart constaté dans le code** (`backend/reservations/tasks.py`) :
- Seul l'e-mail de **confirmation** porte un `Reply-To` (`STUDIO_EMAIL`).
- Le refus, l'annulation, le rappel, l'avis et la relance de retouche n'en ont **pas** : une réponse part vers `DEFAULT_FROM_EMAIL`.
- La relance de retouche dit pourtant « Vous pouvez aussi nous répondre directement à ce message » (ligne 255).
- La notification à la praticienne n'a pas non plus de `Reply-To` vers la cliente.

Tant que ce n'est pas corrigé, `DEFAULT_FROM_EMAIL` doit être une adresse lue (alias vers `contact@`, étape 4.2.2). Un correctif est petit (envoyer ces messages avec `EmailMessage(..., reply_to=[STUDIO_EMAIL])`) mais n'est pas fait : à décider, puisque ce backend est appelé à disparaître.

## 7. Exploitation

- **Messages « Abandonné »** : administration, « E-mails en file », corriger la cause (clé API, quota, domaine), puis action « Relancer les envois abandonnés ». À surveiller chaque semaine.
- **Rapports DMARC** (`rua`) : arrivent dans `dmarc@<domaine>` ; lire les premiers pour repérer un service d'envoi oublié avant de durcir la politique.
- **Rebonds et plaintes** : non traités par l'application (limite connue du guide de l'autre dépôt).
- **Clé API compromise ou perdue** : la révoquer dans Brevo, en créer une autre, la mettre dans `.env`, redémarrer.
- Les messages envoyés sont purgés de la file après 30 jours.

## 8. Liste de contrôle

- [ ] Compte Brevo vérifié, DPA signé, hébergement UE choisi.
- [ ] Domaine authentifié chez Brevo : SPF fusionné (un seul), DKIM, code de vérification, DMARC en `p=none`.
- [ ] Boîte `contact@<domaine>` créée et testée en réception et en envoi ; alias `reservations@` et `dmarc@`.
- [ ] `.env` : `EMAIL_BACKEND`, `BREVO_API_KEY`, `DEFAULT_FROM_EMAIL` ; services redémarrés ; `check_deploy.sh` sans avertissement.
- [ ] Champ « E-mail de notification » = `contact@<domaine>`.
- [ ] Test Gmail : `SPF`, `DKIM`, `DMARC` à `PASS`, message en boîte de réception.
- [ ] Test « Répondre » dans les deux sens (étape 5).
- [ ] Après 2 à 4 semaines : DMARC durci.

## 9. Non vérifié

- Aucun compte Brevo ni aucune boîte n'a été créé ; aucune commande de ce guide n'a été exécutée.
- Les intitulés des écrans Brevo et les offres de messagerie (Hostinger, Zoho, Google) sont à vérifier au moment de la mise en place.
- Les `Reply-To` du tableau de l'étape 5 sont lus dans le code pour les messages cités ; le formulaire de contact et les messages de remboursement n'ont pas été envoyés en conditions réelles.
- La délivrabilité réelle (placement en boîte de réception) ne se constate qu'avec le vrai domaine et le vrai serveur.
