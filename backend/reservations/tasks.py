import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone


logger = logging.getLogger(__name__)

QUESTIONS = {
    'allergie_colle': 'allergie connue à la colle ou aux produits de pose',
    'traitement_oculaire': 'traitement oculaire en cours',
    'grossesse': 'grossesse en cours',
}
JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']


def composer_message(resa):
    """Texte brut de la notification. Reste sobre : le détail se lit dans l'admin."""
    prestations = ', '.join(p.nom for p in resa.prestations.all())
    jour = f'{JOURS[resa.date.weekday()]} {resa.date:%d/%m/%Y}'
    lignes = [
        'Nouvelle demande de rendez-vous, À CONFIRMER.',
        '',
        f'Date : {jour}, {resa.debut:%H:%M} à {resa.fin:%H:%M} ({resa.duree_min} min)',
        f'Prestations : {prestations}',
        f'Cliente : {resa.prenom} {resa.nom}',
        f'Téléphone : {resa.telephone}',
        f'E-mail : {resa.email}',
        f'Première visite : {"oui" if resa.premiere_visite else "non"}',
    ]
    risques = [QUESTIONS[q] for q, r in resa.questionnaire.items() if r == 'oui' and q in QUESTIONS]
    if risques:
        lignes += ['', 'ATTENTION, réponses à risque (contacter la cliente avant de confirmer) :']
        lignes += [f'- {r}' for r in risques]
    if resa.precisions:
        lignes += ['', f'Précisions : {resa.precisions}']
    lignes += ['', 'Le créneau est réservé pour cette demande tant qu’elle n’est pas annulée ou refusée.',
               'Confirmez-la dans l’administration (action « Confirmer »).']
    return '\n'.join(lignes)


@shared_task(autoretry_for=(OSError,), retry_backoff=True, retry_backoff_max=900, max_retries=6)
def notifier_praticienne(reservation_id):
    from .models import Reservation

    resa = Reservation.objects.prefetch_related('prestations').filter(pk=reservation_id).first()
    if resa is None or resa.notifiee_le:
        return 'ignoree'
    if not settings.STUDIO_EMAIL:
        logger.warning('STUDIO_EMAIL non défini : la demande %s n’a pas été notifiée.', reservation_id)
        return 'sans_destinataire'
    send_mail(
        subject=f'Demande de rendez-vous à confirmer : {resa.date:%d/%m} {resa.debut:%H:%M}',
        message=composer_message(resa),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.STUDIO_EMAIL],
    )
    # Conditionnel : deux exécutions simultanées n'écrivent pas deux fois
    Reservation.objects.filter(pk=resa.pk, notifiee_le__isnull=True).update(notifiee_le=timezone.now())
    return 'envoyee'


@shared_task
def rattraper_notifications():
    """Relance les demandes à confirmer jamais notifiées, hors les toutes dernières secondes (tâche en vol)."""
    from datetime import timedelta

    from .models import Reservation

    limite = timezone.now() - timedelta(minutes=5)
    ids = list(Reservation.objects.filter(statut=Reservation.A_CONFIRMER, notifiee_le__isnull=True,
                                          cree_le__lt=limite).values_list('pk', flat=True))
    for pk in ids:
        notifier_praticienne.delay(pk)
    return len(ids)


def composer_rappel(resa):
    jour = f'{JOURS[resa.date.weekday()]} {resa.date:%d/%m/%Y}'
    return '\n'.join([
        f'Bonjour {resa.prenom},',
        '',
        f'Nous vous rappelons votre rendez-vous demain, {jour}, à {resa.debut:%H:%M}.',
        f'Prestations : {", ".join(p.nom for p in resa.prestations.all())}',
        '',
        'En cas d’empêchement, merci de nous prévenir au plus tôt en répondant à ce message ou par téléphone.',
        '',
        settings.STUDIO_NOM,
    ])


@shared_task(autoretry_for=(OSError,), retry_backoff=True, retry_backoff_max=900, max_retries=3)
def envoyer_rappel(reservation_id):
    from .models import Reservation

    resa = Reservation.objects.prefetch_related('prestations').filter(pk=reservation_id).first()
    # Seules les réservations réellement confirmées reçoivent un rappel : jamais pour une demande à confirmer.
    if resa is None or resa.statut != Reservation.CONFIRMEE or resa.rappel_envoye_le:
        return 'ignoree'
    send_mail(subject=f'Rappel de votre rendez-vous demain à {resa.debut:%H:%M}', message=composer_rappel(resa),
              from_email=settings.DEFAULT_FROM_EMAIL, recipient_list=[resa.email])
    Reservation.objects.filter(pk=resa.pk, rappel_envoye_le__isnull=True).update(rappel_envoye_le=timezone.now())
    return 'envoyee'


@shared_task
def envoyer_rappels_j1(maintenant=None):
    """Planifiée chaque jour : rappelle les rendez-vous confirmés de demain (jour civil du studio)."""
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo

    from .models import Reservation

    now = datetime.fromisoformat(maintenant) if maintenant else timezone.now()
    demain = now.astimezone(ZoneInfo(settings.RESERVATION['fuseau'])).date() + timedelta(days=1)
    ids = list(Reservation.objects.filter(statut=Reservation.CONFIRMEE, date=demain, rappel_envoye_le__isnull=True)
               .values_list('pk', flat=True))
    for pk in ids:
        envoyer_rappel.delay(pk)
    return len(ids)


def composer_confirmation(resa):
    jour = f'{JOURS[resa.date.weekday()]} {resa.date:%d/%m/%Y}'
    return '\n'.join([
        f'Bonjour {resa.prenom},',
        '',
        'Votre rendez-vous est confirmé par la praticienne.',
        '',
        f'Date : {jour}, de {resa.debut:%H:%M} à {resa.fin:%H:%M}',
        f'Prestations : {", ".join(p.nom for p in resa.prestations.all())}',
        '',
        'Vous trouverez en pièce jointe une invitation à ajouter à votre agenda.',
        'En cas d’empêchement, merci de nous prévenir au plus tôt en répondant à ce message ou par téléphone.',
        '',
        settings.STUDIO_NOM,
    ])


@shared_task(autoretry_for=(OSError,), retry_backoff=True, retry_backoff_max=900, max_retries=6)
def envoyer_confirmation(reservation_id):
    from django.core.mail import EmailMessage

    from .ics import generer_ics
    from .models import Reservation

    resa = Reservation.objects.prefetch_related('prestations').filter(pk=reservation_id).first()
    # Jamais « confirmé » sans validation réelle : on revérifie le statut au moment de l'envoi.
    if resa is None or resa.statut != Reservation.CONFIRMEE or resa.confirmation_envoyee_le:
        return 'ignoree'
    message = EmailMessage(
        subject=f'Votre rendez-vous du {resa.date:%d/%m} à {resa.debut:%H:%M} est confirmé',
        body=composer_confirmation(resa), from_email=settings.DEFAULT_FROM_EMAIL, to=[resa.email],
        reply_to=[settings.STUDIO_EMAIL] if settings.STUDIO_EMAIL else None)
    message.attach('rendez-vous.ics', generer_ics(resa, settings.STUDIO_NOM, settings.RESERVATION['fuseau']), 'text/calendar')
    message.send()
    Reservation.objects.filter(pk=resa.pk, confirmation_envoyee_le__isnull=True).update(confirmation_envoyee_le=timezone.now())
    return 'envoyee'
