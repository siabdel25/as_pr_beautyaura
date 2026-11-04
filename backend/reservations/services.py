"""Accès aux données et création d'une réservation (le calcul pur est dans slots.py)."""

from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from . import slots
from .models import HoraireOuverture, Indisponibilite, JourVerrou, Reservation, Service
from .tasks import envoyer_confirmation, notifier_praticienne


class CreneauIndisponible(Exception):
    pass


def _hhmm(t):
    return t.strftime('%H:%M') if t else None


def charger_contexte(jour):
    horaires = {}
    for h in HoraireOuverture.objects.all():
        horaires.setdefault(h.jour, []).append(f'{_hhmm(h.debut)}-{_hhmm(h.fin)}')
    indispos = [(i.date, _hhmm(i.debut), _hhmm(i.fin)) for i in Indisponibilite.objects.filter(date=jour)]
    resas = [(r.date, _hhmm(r.debut), _hhmm(r.fin))
             for r in Reservation.objects.filter(date=jour, statut__in=Reservation.STATUTS_BLOQUANTS)]
    return horaires, indispos, resas


def disponibilites_du_mois(annee, mois, duree_min, maintenant=None):
    """Jours du mois qui ont au moins un créneau. Un seul chargement des données pour tout le mois."""
    from calendar import monthrange

    premier, dernier = date(annee, mois, 1), date(annee, mois, monthrange(annee, mois)[1])
    horaires = {}
    for h in HoraireOuverture.objects.all():
        horaires.setdefault(h.jour, []).append(f'{_hhmm(h.debut)}-{_hhmm(h.fin)}')
    indispos = [(i.date, _hhmm(i.debut), _hhmm(i.fin)) for i in Indisponibilite.objects.filter(date__range=(premier, dernier))]
    resas = [(r.date, _hhmm(r.debut), _hhmm(r.fin)) for r in
             Reservation.objects.filter(date__range=(premier, dernier), statut__in=Reservation.STATUTS_BLOQUANTS)]
    maintenant = maintenant or timezone.now()
    jours = []
    for n in range(dernier.day):
        jour = premier + timedelta(days=n)
        if slots.creneaux_du_jour(jour, duree_min, settings.RESERVATION, horaires, indispos, resas, maintenant):
            jours.append(jour.isoformat())
    return jours


def duree_totale(ids):
    return sum(Service.objects.filter(pk__in=ids).values_list('duree_min', flat=True))


def creneaux(jour, duree_min, maintenant=None):
    horaires, indispos, resas = charger_contexte(jour)
    return slots.creneaux_du_jour(jour, duree_min, settings.RESERVATION, horaires, indispos, resas,
                                  maintenant or timezone.now())


def creer_reservation(donnees, services, maintenant=None):
    """Crée une demande « à confirmer ». Revérifie le créneau sous verrou du jour."""
    jour, heure = donnees['date'], donnees['heure']
    duree = sum(s.duree_min for s in services)
    with transaction.atomic():
        JourVerrou.objects.get_or_create(date=jour)
        JourVerrou.objects.select_for_update().get(date=jour)
        if heure not in creneaux(jour, duree, maintenant):
            raise CreneauIndisponible()
        debut_min = slots.hhmm_en_min(heure)
        resa = Reservation.objects.create(
            date=jour, debut=time(debut_min // 60, debut_min % 60),
            fin=(datetime.combine(jour, time(debut_min // 60, debut_min % 60)) + timedelta(minutes=duree)).time(),
            duree_min=duree, **donnees['client_champs'])
        resa.prestations.set(services)
        # robust=True : si le broker est arrêté, la demande reste enregistrée et la cliente reçoit sa réponse ;
        # la commande renvoyer_notifications rattrape les oublis.
        transaction.on_commit(lambda: notifier_praticienne.delay(resa.pk), robust=True)
    return resa


def planifier_confirmation(resa):
    """Programme l'e-mail de confirmation après le commit (robust : un broker arrêté ne bloque pas l'admin)."""
    transaction.on_commit(lambda: envoyer_confirmation.delay(resa.pk), robust=True)


def confirmer_reservation(resa):
    """Passe une demande « à confirmer » à « confirmée » et prévient la cliente. False si le statut ne le permet pas."""
    with transaction.atomic():
        modifie = Reservation.objects.filter(pk=resa.pk, statut=Reservation.A_CONFIRMER).update(statut=Reservation.CONFIRMEE)
        if not modifie:
            return False
        resa.statut = Reservation.CONFIRMEE
        planifier_confirmation(resa)
    return True
