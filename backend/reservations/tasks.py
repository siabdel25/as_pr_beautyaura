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
