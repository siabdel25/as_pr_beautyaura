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


# [À VALIDER] Texte neutre à faire relire par la praticienne : ni motif, ni promesse.
PHRASES_CLOTURE = {
    'refusee': 'Nous ne pouvons malheureusement pas donner suite à votre demande de rendez-vous',
    'annulee': 'Votre rendez-vous est annulé',
}


def composer_annulation(resa):
    jour = f'{JOURS[resa.date.weekday()]} {resa.date:%d/%m/%Y}'
    return '\n'.join([
        f'Bonjour {resa.prenom},',
        '',
        f'{PHRASES_CLOTURE[resa.statut]} du {jour}, à {resa.debut:%H:%M}.',
        f'Prestations : {", ".join(p.nom for p in resa.prestations.all())}',
        '',
        'Vous pouvez choisir un autre créneau sur notre site, ou nous contacter en répondant à ce message.',
        '',
        settings.STUDIO_NOM,
    ])


@shared_task(autoretry_for=(OSError,), retry_backoff=True, retry_backoff_max=900, max_retries=6)
def envoyer_annulation(reservation_id):
    from .models import Reservation

    resa = Reservation.objects.prefetch_related('prestations').filter(pk=reservation_id).first()
    # On revérifie le statut à l'envoi : jamais d'annulation annoncée pour une demande encore active.
    if resa is None or resa.statut not in PHRASES_CLOTURE or resa.annulation_envoyee_le:
        return 'ignoree'
    sujet = 'Votre demande de rendez-vous' if resa.statut == Reservation.REFUSEE else 'Votre rendez-vous est annulé'
    send_mail(subject=f'{sujet} du {resa.date:%d/%m}', message=composer_annulation(resa),
              from_email=settings.DEFAULT_FROM_EMAIL, recipient_list=[resa.email],
              )
    Reservation.objects.filter(pk=resa.pk, annulation_envoyee_le__isnull=True).update(annulation_envoyee_le=timezone.now())
    return 'envoyee'


# --- Suivi après rendez-vous : demande d'avis (J+2) et relance de retouche (J+18) ---
# Textes provisoires [À VALIDER] par la praticienne : aucune promesse, aucun avantage en échange d'un avis.

def composer_avis(resa):
    return '\n'.join([
        f'Bonjour {resa.prenom},',
        '',
        f'Merci de votre visite chez {settings.STUDIO_NOM}.',
        'Si vous le souhaitez, vous pouvez partager votre expérience en laissant un avis :',
        settings.AVIS_URL,
        '',
        'Votre retour est libre et nous aide à nous améliorer. Si quelque chose ne vous a pas convenu,',
        'répondez simplement à ce message, nous en parlerons avec plaisir.',
        '',
        settings.STUDIO_NOM,
    ])


def composer_retouche(resa):
    lignes = [
        f'Bonjour {resa.prenom},',
        '',
        'Votre dernière pose date de quelques semaines : si vous souhaitez une retouche,',
        'c’est le bon moment pour prendre rendez-vous.',
    ]
    if settings.SITE_URL:
        lignes += ['', f'Réserver en ligne : {settings.SITE_URL}']
    lignes += ['', 'Vous pouvez aussi nous répondre directement à ce message.', '', settings.STUDIO_NOM]
    return '\n'.join(lignes)


def _envoyer_suivi(reservation_id, champ, sujet, composer):
    from .models import Reservation

    resa = Reservation.objects.prefetch_related('prestations').filter(pk=reservation_id).first()
    # Seuls les rendez-vous réellement confirmés ont un suivi, une seule fois.
    if resa is None or resa.statut != Reservation.CONFIRMEE or getattr(resa, champ):
        return 'ignoree'
    send_mail(subject=sujet, message=composer(resa), from_email=settings.DEFAULT_FROM_EMAIL,
              recipient_list=[resa.email])
    Reservation.objects.filter(pk=resa.pk, **{f'{champ}__isnull': True}).update(**{champ: timezone.now()})
    return 'envoyee'


@shared_task(autoretry_for=(OSError,), retry_backoff=True, retry_backoff_max=900, max_retries=3)
def envoyer_avis(reservation_id):
    if not settings.AVIS_URL:
        return 'sans_lien'
    return _envoyer_suivi(reservation_id, 'avis_demande_le', 'Comment s’est passé votre rendez-vous ?', composer_avis)


@shared_task(autoretry_for=(OSError,), retry_backoff=True, retry_backoff_max=900, max_retries=3)
def envoyer_relance_retouche(reservation_id):
    return _envoyer_suivi(reservation_id, 'retouche_proposee_le', 'Une retouche vous ferait plaisir ?', composer_retouche)


@shared_task
def envoyer_suivis(maintenant=None):
    """Planifiée chaque jour : lance avis et relances arrivés à échéance, avec une fenêtre de rattrapage."""
    from datetime import datetime, timedelta
    from zoneinfo import ZoneInfo

    from .models import Reservation

    now = datetime.fromisoformat(maintenant) if maintenant else timezone.now()
    aujourdhui = now.astimezone(ZoneInfo(settings.RESERVATION['fuseau'])).date()
    cfg = settings.SUIVI
    confirmees = Reservation.objects.filter(statut=Reservation.CONFIRMEE)
    envoyes = {'avis': 0, 'retouche': 0}

    def fenetre(jours):
        fin = aujourdhui - timedelta(days=jours)
        return fin - timedelta(days=cfg['fenetre_rattrapage_jours']), fin

    if settings.AVIS_URL:
        debut, fin = fenetre(cfg['avis_apres_jours'])
        for pk in confirmees.filter(date__range=(debut, fin), avis_demande_le__isnull=True).values_list('pk', flat=True):
            envoyer_avis.delay(pk)
            envoyes['avis'] += 1

    debut, fin = fenetre(cfg['retouche_apres_jours'])
    candidates = (confirmees.filter(date__range=(debut, fin), retouche_proposee_le__isnull=True,
                                    prestations__categorie='extensions').distinct())
    for resa in candidates:
        # Inutile de relancer une cliente qui a déjà un prochain rendez-vous.
        deja_reservee = Reservation.objects.filter(
            email__iexact=resa.email, date__gt=aujourdhui,
            statut__in=Reservation.STATUTS_BLOQUANTS).exists()
        if not deja_reservee:
            envoyer_relance_retouche.delay(resa.pk)
            envoyes['retouche'] += 1
    return envoyes
