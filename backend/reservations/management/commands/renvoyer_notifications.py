from django.core.management.base import BaseCommand

from reservations.tasks import relancer_courriers


class Command(BaseCommand):
    help = ('Relance les courriers jamais partis : notification de la praticienne, confirmation et '
            'refus/annulation à la cliente (broker ou SMTP indisponible).')

    def handle(self, *args, **opts):
        compte = relancer_courriers(avec_delai=False)
        self.stdout.write(
            f'{compte["notifications"]} notification(s), {compte["confirmations"]} confirmation(s), '
            f'{compte["annulations"]} refus/annulation(s) relancé(s).')
