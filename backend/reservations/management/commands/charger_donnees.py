import json
from datetime import time
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from reservations.models import HoraireOuverture, Indisponibilite, Service


def _t(s):
    return time(int(s[:2]), int(s[3:5]))


class Command(BaseCommand):
    help = 'Charge services, horaires et indisponibilités depuis frontend/data (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--data-dir', default='../frontend/data')

    @transaction.atomic
    def handle(self, *args, data_dir, **opts):
        base = Path(data_dir)
        if not base.is_dir():
            raise CommandError(f'Dossier introuvable : {base}')
        lire = lambda nom: json.loads((base / nom).read_text(encoding='utf-8'))

        for s in lire('services.json')['services']:
            Service.objects.update_or_create(id=s['id'], defaults={
                'nom': s['nom'], 'categorie': s['categorie'], 'duree_min': s['duree_min'],
                'prix_a_partir_de': s.get('prix_a_partir_de'), 'description': s.get('description', '')})

        HoraireOuverture.objects.all().delete()
        for jour, plages in lire('horaires.json')['hebdo'].items():
            for plage in plages:
                d, f = plage.split('-')
                HoraireOuverture.objects.create(jour=jour, debut=_t(d), fin=_t(f))

        Indisponibilite.objects.all().delete()
        for i in lire('indisponibilites.json')['indisponibilites']:
            Indisponibilite.objects.create(date=i['date'], debut=_t(i['debut']) if i.get('debut') else None,
                                           fin=_t(i['fin']) if i.get('fin') else None, motif=i.get('motif', ''))
        self.stdout.write(self.style.SUCCESS('Données chargées.'))
