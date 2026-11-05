"""Fausses réservations de démonstration (lues dans /data/reservations.json). À lancer via `manage.py shell`.
Idempotent : ne fait rien s'il existe déjà des réservations. Les clientes sont fictives (@example.test)."""
import json
from datetime import date, time

from reservations.models import Reservation, Service

if Reservation.objects.exists():
    print('Réservations de démonstration déjà présentes.')
else:
    def t(s):
        return time(int(s[:2]), int(s[3:5]))

    donnees = json.load(open('/data/reservations.json', encoding='utf-8'))['reservations_existantes']
    for n, r in enumerate(donnees):
        debut, fin = t(r['debut']), t(r['fin'])
        duree = (fin.hour * 60 + fin.minute) - (debut.hour * 60 + debut.minute)
        resa = Reservation.objects.create(
            statut=Reservation.CONFIRMEE if n % 3 == 0 else Reservation.A_CONFIRMER,
            date=date.fromisoformat(r['date']), debut=debut, fin=fin, duree_min=duree,
            prenom='Cliente', nom=r['client']['nom'].replace('Cliente ', ''), telephone='0612345678',
            email=r['client']['email'], premiere_visite=False, consentement_rgpd=True, cgv_acceptees=True)
        resa.prestations.set(Service.objects.filter(pk__in=r['service_ids']))
    print(f'{len(donnees)} réservations fictives créées.')
