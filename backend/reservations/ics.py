"""Invitation calendrier (.ics) d'un rendez-vous. Miroir simplifié de frontend/assets/js/app/ics.js."""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo


def _echapper(texte):
    return texte.replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\n', '\\n')


def _plier(ligne):
    """RFC 5545 : lignes de 75 octets au plus ; la suite commence par une espace."""
    brut = ligne.encode('utf-8')
    if len(brut) <= 75:
        return ligne
    morceaux, debut = [], 0
    while debut < len(brut):
        fin = min(debut + (75 if not morceaux else 74), len(brut))
        while fin < len(brut) and (brut[fin] & 0xC0) == 0x80:  # ne pas couper un caractère UTF-8
            fin -= 1
        morceaux.append(brut[debut:fin].decode('utf-8'))
        debut = fin
    return '\r\n '.join(morceaux)


def _utc(d, h, fuseau):
    return datetime.combine(d, h, tzinfo=ZoneInfo(fuseau)).astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')


def generer_ics(resa, studio, fuseau, domaine='rendez-vous.invalid'):
    debut = datetime.combine(resa.date, resa.debut, tzinfo=ZoneInfo(fuseau))
    fin_ts = (debut + timedelta(minutes=resa.duree_min)).astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    prestations = ', '.join(p.nom for p in resa.prestations.all())
    lignes = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lash and Brow//Reservations//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        f'UID:reservation-{resa.pk}@{domaine}',
        f'DTSTAMP:{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")}',
        f'DTSTART:{_utc(resa.date, resa.debut, fuseau)}',
        f'DTEND:{fin_ts}',
        f'SUMMARY:{_echapper(prestations + " · " + studio)}',
        f'DESCRIPTION:{_echapper("Rendez-vous confirmé par " + studio + ".")}',
        'END:VEVENT', 'END:VCALENDAR',
    ]
    return '\r\n'.join(_plier(l) for l in lignes) + '\r\n'
