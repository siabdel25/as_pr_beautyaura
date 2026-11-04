from django.core.management.base import BaseCommand

from reservations.models import Reservation
from reservations.tasks import notifier_praticienne


class Command(BaseCommand):
    help = 'Relance la notification des demandes à confirmer jamais notifiées (broker ou SMTP indisponible).'

    def handle(self, *args, **opts):
        ids = list(Reservation.objects.filter(statut=Reservation.A_CONFIRMER, notifiee_le__isnull=True)
                   .values_list('pk', flat=True))
        for pk in ids:
            notifier_praticienne.delay(pk)
        self.stdout.write(f'{len(ids)} notification(s) relancée(s).')
