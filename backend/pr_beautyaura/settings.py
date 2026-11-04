"""
Réglages Django du backend (phase 2 : API de réservation).

Tout ce qui change selon l'environnement vient de variables d'environnement
(voir .env.example). Aucun secret n'est écrit dans le dépôt.
"""

import os
from pathlib import Path

from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(nom, defaut=False):
    return os.environ.get(nom, str(defaut)).strip().lower() in ('1', 'true', 'oui', 'yes')


def env_liste(nom, defaut=''):
    return [v.strip() for v in os.environ.get(nom, defaut).split(',') if v.strip()]


DEBUG = env_bool('DJANGO_DEBUG', False)

# Hors développement, l'absence de clé doit faire échouer le démarrage plutôt que
# d'utiliser une clé connue.
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError('DJANGO_SECRET_KEY est obligatoire quand DJANGO_DEBUG est faux.')
    SECRET_KEY = 'dev-only-not-for-production'

ALLOWED_HOSTS = env_liste('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1' if DEBUG else '')
CSRF_TRUSTED_ORIGINS = env_liste('DJANGO_CSRF_TRUSTED_ORIGINS')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'reservations',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'pr_beautyaura.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'pr_beautyaura.wsgi.application'

# SQLite par défaut (développement, tests) ; PostgreSQL en production via DATABASE_*.
if os.environ.get('DATABASE_HOST'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DATABASE_NAME', 'beautyaura'),
            'USER': os.environ.get('DATABASE_USER', 'beautyaura'),
            'PASSWORD': os.environ.get('DATABASE_PASSWORD', ''),
            'HOST': os.environ['DATABASE_HOST'],
            'PORT': os.environ.get('DATABASE_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Site en français, créneaux en heure de Paris (voir CLAUDE.md, règles de réservation).
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    # Phase 2 : l'API publique ne crée que des demandes ; pas d'authentification par session ici.
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.AnonRateThrottle'],
    'DEFAULT_THROTTLE_RATES': {'anon': '60/min', 'reservation': '5/hour'},
    # Nombre de proxys de confiance devant gunicorn (nginx = 1) : sans cela, tous les clients
    # partagent l'adresse du proxy et la limitation de fréquence est inefficace.
    'NUM_PROXIES': int(os.environ.get('DRF_NUM_PROXIES', '0')),
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
}

# Règles de réservation. Miroir de frontend/data/reservation.json (un test détecte tout écart).
RESERVATION = {
    'fuseau': TIME_ZONE,
    'tampon_min': int(os.environ.get('RESERVATION_TAMPON_MIN', '15')),
    'delai_min_heures': int(os.environ.get('RESERVATION_DELAI_MIN_HEURES', '12')),
    'horizon_jours': int(os.environ.get('RESERVATION_HORIZON_JOURS', '60')),
    'pas_creneau_min': int(os.environ.get('RESERVATION_PAS_CRENEAU_MIN', '30')),
}

# Celery : tâches planifiées de la phase 2 (rappels J-1, avis J+2, relance J+18).
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', CELERY_BROKER_URL)
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = env_bool('CELERY_TASK_ALWAYS_EAGER', False)
CELERY_BEAT_SCHEDULE = {
    # Filet de sécurité : renotifie les demandes dont l'envoi a échoué (broker ou SMTP indisponible).
    'rattraper-notifications': {
        'task': 'reservations.tasks.rattraper_notifications',
        'schedule': 600.0,
    },
    # Rappel envoyé la veille : la tâche s'exécute chaque jour à 10 h, heure de Paris (CELERY_TIMEZONE).
    'rappels-j-1': {
        'task': 'reservations.tasks.envoyer_rappels_j1',
        'schedule': crontab(hour=10, minute=0),
    },
    'suivi-apres-rendez-vous': {
        'task': 'reservations.tasks.envoyer_suivis',
        'schedule': crontab(hour=11, minute=0),
    },
}

# E-mail : console en développement ; SMTP en production (EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER...).
EMAIL_BACKEND = os.environ.get('DJANGO_EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '25'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = env_bool('EMAIL_USE_TLS', False)
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'reservations@localhost')
# Destinataire des nouvelles demandes (la praticienne). Vide : aucune notification, avertissement dans les logs.
STUDIO_EMAIL = os.environ.get('STUDIO_EMAIL', '')
# Suivi après rendez-vous. Délais en jours ; J+18 est une valeur par défaut, à ajuster avec la praticienne.
SUIVI = {
    'avis_apres_jours': int(os.environ.get('SUIVI_AVIS_JOURS', '2')),
    'retouche_apres_jours': int(os.environ.get('SUIVI_RETOUCHE_JOURS', '18')),
    # Rattrape les jours manqués (beat arrêté) sans jamais renvoyer : les envois sont marqués en base.
    'fenetre_rattrapage_jours': 7,
}
# [À COMPLÉTER] lien d'avis de la fiche Google Business Profile. Vide : aucune demande d'avis n'est envoyée.
AVIS_URL = os.environ.get('AVIS_URL', '')
# [À COMPLÉTER] lien de réservation du site, repris dans la relance de retouche.
SITE_URL = os.environ.get('SITE_URL', '')
# [À COMPLÉTER] nom réel du studio, utilisé dans les e-mails aux clientes.
STUDIO_NOM = os.environ.get('STUDIO_NOM', '[NOM_DU_STUDIO]')

if not DEBUG:
    SECURE_SSL_REDIRECT = env_bool('DJANGO_SECURE_SSL_REDIRECT', True)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_HSTS_SECONDS', '0'))
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
