# Déploiement sur le VPS Hostinger (Debian 13, domaine `dimatlas.com`)

Procédure de mise en place de la phase 2 (ADR 0002) : l'API de réservation d'`as_shoppy_frm_v2` tourne sur le VPS en Docker, et le site statique d'ici l'appelle. Date : 05/11/2026.

> **État : procédure écrite, rien n'est déployé.** Je n'ai exécuté aucune de ces commandes sur un VPS. Les commandes de déploiement viennent des guides de l'autre dépôt, que j'ai lus : `docs/PREPROD_MBA.md` (v0.14, **référence**), `docs/DEPLOIEMENT_VPS_HOSTINGER.md` (plus ancien, v0.10), `docs/SAUVEGARDES.md` et `docs/EMAIL_DELIVERABILITY.md`. En cas d'écart, **le guide à jour de l'autre dépôt prime**.

## 0. Décisions de cette procédure

| Sujet | Choix retenu ici | Pourquoi |
|---|---|---|
| HTTPS | **nginx + Let's Encrypt (certbot)**, déjà dans la pile de l'autre dépôt | Pas besoin de Caddy : `scripts/init-letsencrypt.sh` et le conteneur `certbot` (renouvellement toutes les 12 h) font déjà le travail. Ajouter Caddy créerait un second point d'entrée sur 80/443. |
| Qui écoute sur 80/443 | Le **nginx du conteneur** (topologie A de l'autre guide) | Aucun nginx installé sur l'hôte. |
| E-mail | **Brevo** par API (Anymail), domaine authentifié | Le port 25 sortant est souvent bloqué sur un VPS et une IP neuve est mal réputée. Pas de serveur de messagerie sur le VPS. |
| Sauvegardes | `scripts/backup.sh` de l'autre dépôt (chiffrement `age`, copie hors VPS) | Déjà écrit, avec restauration d'essai intégrée. |
| Noms de domaine | `mba.dimatlas.com` (**proposition**) | `dimatlas.com` est votre domaine : il sert à la **préproduction**. Le domaine définitif du studio reste à confirmer avec le client. |
| Site statique d'ici | Hébergé à part (Hostinger mutualisé prévu en phase 1), il appelle l'API | Question ouverte n° 3 de l'ADR 0002 : à décider avant l'étape 8. |

Le client choisit l'établissement par le **nom de domaine** de la requête (`tenants/middleware.py`) : l'API doit donc être appelée sur un domaine enregistré pour l'établissement. Ici : `mba.dimatlas.com`, qui sert à la fois le site Wagtail de l'autre dépôt et l'API `/api/v1/booking/`.

## 1. Ce qu'il faut avoir avant de commencer

- [ ] Accès SSH root au VPS (IP fournie par hPanel).
- [ ] Accès au DNS de `dimatlas.com` (hPanel ou autre gestionnaire).
- [ ] Compte Brevo vérifié (prévoir quelques jours : vérification manuelle possible).
- [ ] Un stockage objet UE pour les sauvegardes (OVHcloud, Scaleway…) : **service à choisir et à valider avec vous**.
- [ ] Une paire de clés `age` générée **sur votre poste**, jamais sur le VPS.
- [ ] Le tag de `as_shoppy_frm_v2` à déployer (proposé : `v0.14.0-beta`, à valider avant de le créer ou de l'utiliser).

## 2. DNS

Chez le gestionnaire DNS de `dimatlas.com` :

| Type | Nom | Valeur |
|---|---|---|
| A | `mba` | IP du VPS |
| AAAA | `mba` | IPv6 du VPS, si fournie |

Vérifier avant la suite : `dig +short mba.dimatlas.com` rend l'IP du VPS. Le certificat Let's Encrypt échoue tant que le DNS n'est pas propagé.

Les enregistrements d'e-mail (SPF, DKIM, DMARC) sont à l'étape 7.

## 3. Préparer le VPS (Debian 13)

```bash
ssh root@IP_DU_VPS
adduser deploy && usermod -aG sudo deploy
# Copier votre clé publique dans /home/deploy/.ssh/authorized_keys, tester la connexion de "deploy", PUIS :
#   /etc/ssh/sshd_config : PermitRootLogin no  /  PasswordAuthentication no
systemctl restart ssh

apt update && apt upgrade -y
apt install -y git curl ufw fail2ban unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades          # mises à jour de sécurité automatiques

curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy                           # se reconnecter ensuite
docker compose version                              # doit afficher v2.x
```

Ne fermez la session `root` qu'après avoir vérifié que `deploy` se connecte par clé.

### Pare-feu

Règle visée : **seuls 80 et 443 sont ouverts au public**. Une exception est nécessaire, **SSH**, sans quoi vous n'aurez plus accès au serveur : on l'ouvre par clé uniquement et, si votre IP est fixe, limitée à cette IP.

```bash
ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH            # ou : ufw allow from <votre IP> to any port 22 proto tcp
ufw allow 80/tcp && ufw allow 443/tcp
ufw enable && ufw status
```

> **Docker contourne UFW** (ses propres règles). C'est sans danger ici tant que seul nginx publie des ports. Ne publiez jamais `db`, `redis` ou `web` sur `0.0.0.0`. Contrôle : `sudo ss -ltnp | grep -E ':(80|443|5432|6379|8000) '` ne doit montrer que 80 et 443 (via `docker-proxy`).
> Si le panneau Hostinger propose un pare-feu réseau, y reproduire les mêmes règles : double barrière (à vérifier dans hPanel, non consulté ici).

## 4. Récupérer le code et configurer

```bash
sudo mkdir -p /opt && sudo chown deploy:deploy /opt && cd /opt
git clone <URL du dépôt as_shoppy_frm_v2> asshopy && cd asshopy
git checkout <tag>
cp .env.example .env && chmod 600 .env && nano .env
```

Variables de production (`.env`, **jamais dans Git**) :

```ini
DJANGO_ENVIRONMENT=production
SECRET_KEY=<python3 -c "import secrets; print(secrets.token_urlsafe(50))">
DB_PASSWORD=<aléatoire>
ALLOWED_HOSTS=mba.dimatlas.com
CSRF_TRUSTED_ORIGINS=https://mba.dimatlas.com
DOMAIN=mba.dimatlas.com
CERTBOT_EMAIL=<votre e-mail>
PUBLIC_BASE_URL=https://mba.dimatlas.com
EMAIL_BACKEND=anymail.backends.brevo.EmailBackend
BREVO_API_KEY=<clé Brevo>
DEFAULT_FROM_EMAIL=reservations@dimatlas.com
# Appel depuis le site statique d'ici (étape 8), origine exacte, en https, sans barre finale :
CORS_ALLOWED_ORIGINS=https://<domaine du site statique>
```

Ne copiez pas les réglages de démo (`SECURE_SSL_REDIRECT=False`, cookies non sécurisés). Laissez l'authentification TOTP de l'administration activée (valeur de production).

## 5. Premier démarrage

```bash
bash scripts/init-letsencrypt.sh                          # certificat HTTPS (DNS propagé, port 80 ouvert)
docker compose -f docker-compose.yml up -d --build        # SANS l'override de développement
docker compose -f docker-compose.yml exec web python manage.py setup_roles
docker compose -f docker-compose.yml exec web python manage.py createsuperuser
docker compose -f docker-compose.yml --profile celery up -d   # worker et planificateur : sans eux aucun e-mail ne part
bash scripts/check_deploy.sh                              # doit se terminer sans avertissement
```

Données du studio : `seed_mba` (voir `docs/PREPROD_MBA.md` §3). **Sans** `--demo-prices` : les prestations restent inactives tant que les vrais prix ne sont pas saisis. Avec `--demo-prices` elles sont réservables à prix fictifs : seulement pour une préproduction montrée au client, jamais pour la mise en ligne.

Contrôles : `docker compose -f docker-compose.yml ps` (tous « running ») ; `https://mba.dimatlas.com/` s'ouvre en HTTPS valide.

## 6. Sauvegardes PostgreSQL, testées par une restauration

Une sauvegarde jamais restaurée n'est pas une sauvegarde. Procédure complète : `docs/SAUVEGARDES.md` de l'autre dépôt. Résumé :

1. **Sur votre poste** : `age-keygen -o asshopy-backup.key`. Rangez la clé privée dans un gestionnaire de mots de passe **et** sur un support hors ligne. Sans elle, toutes les sauvegardes sont perdues. Gardez la clé publique (`age1…`) pour le serveur.
2. Créer un seau privé chez l'hébergeur de stockage UE choisi, avec une clé d'accès limitée à ce seau ; verrouillage des objets si proposé.
3. Sur le VPS : `sudo apt install -y age rclone`, puis `rclone config` (destination nommée `offsite`).
4. Fichier `/etc/asshopy-backup.env` (droits 600, root) avec `PG_DOCKER_SERVICE=db`, `BACKUP_DIR`, `BACKUP_AGE_RECIPIENT=<clé publique>`, `BACKUP_REMOTE=offsite:<seau>` et les identifiants de la base.
5. Cron root, chaque nuit : `scripts/backup.sh` (dump, restauration d'essai automatique dans une base jetable, chiffrement, copie hors VPS, rotation).
6. **Exercice de restauration obligatoire avant toute mise en ligne**, puis chaque trimestre : récupérer un fichier hors VPS sur votre poste, le déchiffrer avec la clé privée, le restaurer dans une base jetable (`scripts/restore_check.sh`). Noter date et durée.

Les médias téléversés et le fichier `.env` ne sont **pas** dans ces sauvegardes : à copier à part (chiffrés).

## 7. E-mails : Brevo avec SPF, DKIM, DMARC

Sans authentification du domaine d'envoi, les confirmations finissent en indésirables. Guide : `docs/EMAIL_DELIVERABILITY.md` de l'autre dépôt.

1. Brevo : ajouter et **authentifier le domaine** `dimatlas.com`, créer une clé API v3 (dans `.env`, jamais dans Git).
2. DNS (copier les valeurs **fournies par Brevo**, surtout DKIM) :
   - **SPF** : un seul enregistrement `TXT` SPF par domaine. Si `dimatlas.com` envoie déjà des e-mails (boîte Hostinger, par exemple), **fusionner** les `include:` au lieu d'en ajouter un second, sinon SPF est invalidé.
   - **DKIM** : enregistrements fournis par Brevo, tels quels.
   - **DMARC** : `_dmarc` en `TXT`, `v=DMARC1; p=none; rua=mailto:dmarc@dimatlas.com; adkim=s; aspf=s`, puis durcir (`quarantine`, `reject`) après 2 à 4 semaines sans anomalie.
3. L'adresse `From` (`reservations@dimatlas.com`) doit appartenir au domaine authentifié.
4. Redémarrer `web`, `celeryworker` et `celerybeat` (ils lisent `.env` au démarrage).
5. **Test** : une réservation réelle vers une adresse Gmail, puis « Afficher l'original » : `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`. Le message arrive en boîte de réception, pas en spam.

> Pour la mise en ligne définitive, l'authentification est à refaire sur le **domaine du studio**, pas sur `dimatlas.com`.

## 8. Brancher le site statique d'ici

Prérequis : questions ouvertes de l'ADR 0002 n° 3 (où est hébergé le site statique) et le domaine connu.

Côté API (autre dépôt) : `CORS_ALLOWED_ORIGINS` contient l'origine du site statique (étape 4) ; l'établissement a bien `mba.dimatlas.com` comme domaine.

Côté site statique (ce dépôt), sur une branche dédiée :
- `frontend/data/reservation.json` : `"api": "https://mba.dimatlas.com/api/v1/booking"`, `"api_format": "booking"`, `"pas_creneau_min": 15`.
- `frontend/_headers` : ajouter `https://mba.dimatlas.com` à `connect-src` (aujourd'hui `'self'`, le navigateur bloquerait les appels).
- Régénérer (`node tools/build-pages.mjs`), lancer `node --test "tests/*.test.mjs"`, puis déployer le site.
- Test de bout en bout depuis un navigateur : réservation, e-mails reçus, confirmation dans l'administration.

## 9. Supervision minimale et exploitation

| Quoi | Comment | Fréquence |
|---|---|---|
| Mises à jour de sécurité | `unattended-upgrades` (étape 3) ; redémarrer si un noyau est mis à jour | automatique, contrôle mensuel |
| Mises à jour de l'application | `git pull && docker compose -f docker-compose.yml up -d --build` ; **sauvegarder avant** | à chaque version |
| Services en marche | `docker compose -f docker-compose.yml ps` | après chaque mise à jour |
| Intrusions SSH | `fail2ban` (installé à l'étape 3) | automatique |
| E-mails bloqués | administration, « E-mails en file » : statut « Abandonné » à relancer | hebdomadaire |
| Sauvegarde du soir réussie | journal `/var/log/asshopy-backup.log` ; idéalement un contrôle externe qui alerte si le cron ne passe pas | quotidien |
| Site joignable, certificat valide | un moniteur externe (service à choisir avec vous) | continu |
| Disque | `df -h` ; les images Docker anciennes : `docker image prune` | mensuel |
| Erreurs applicatives | Sentry facultatif, région UE (variable `SENTRY_DSN`) | continu |

Aucun service de supervision n'est ajouté sans votre accord (`CLAUDE.md`).

## 10. Retour arrière

`docker compose -f docker-compose.yml down` (données conservées) ; restauration depuis la sauvegarde chiffrée ; retour au tag précédent (`git checkout <tag précédent> && docker compose -f docker-compose.yml up -d --build`). Les migrations ne sont pas réversibles automatiquement : **sauvegarder avant chaque mise à jour**.

## 11. Liste de contrôle « la préproduction est prête »

- [ ] DNS : `mba.dimatlas.com` rend l'IP du VPS.
- [ ] `ss -ltnp` : seuls 80 et 443 (plus SSH par clé) écoutent depuis l'extérieur.
- [ ] HTTPS valide ; `bash scripts/check_deploy.sh` sans avertissement.
- [ ] SSH : connexion root et mot de passe désactivés ; `fail2ban` actif.
- [ ] Mises à jour de sécurité automatiques actives.
- [ ] Réservation de bout en bout avec un vrai e-mail : accusé, alerte au studio, confirmation avec `.ics` **en boîte de réception**.
- [ ] SPF, DKIM et DMARC à `PASS` sur Gmail.
- [ ] TOTP obligatoire pour les comptes propriétaires et super-utilisateurs.
- [ ] Sauvegarde chiffrée créée **et restaurée** une fois, clé privée hors VPS.
- [ ] Limitation de débit active (429 au-delà du plafond).
- [ ] Site statique branché (étape 8), appel API depuis le navigateur sans erreur CORS ni CSP.

## 12. Ce qui n'a pas été vérifié

- Aucune commande n'a été lancée sur le VPS Hostinger. Le comportement de Debian 13 avec le script `get.docker.com` n'a pas été testé ici.
- Le pare-feu réseau du panneau Hostinger, les règles sur le port 25 et la gestion DNS de hPanel n'ont pas été consultés.
- Les noms `mba.dimatlas.com`, `reservations@dimatlas.com` et `dmarc@dimatlas.com` sont des **propositions** à valider.
- Le tag `v0.14.0-beta`, la version de Docker et celles des images viennent des guides de l'autre dépôt, non recontrôlées sur le dépôt courant.
- Le choix du stockage de sauvegardes, du moniteur externe et du domaine définitif du studio reste ouvert.
