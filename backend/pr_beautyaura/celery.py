import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pr_beautyaura.settings')

app = Celery('pr_beautyaura')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
