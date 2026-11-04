"""
Calcul des créneaux de réservation. Module pur (pas d'accès base), miroir de
frontend/assets/js/app/slots.js : toute règle modifiée ici l'est aussi là-bas.

Les jours sont des `date`, les heures des minutes depuis minuit (heure du studio).
Seul le délai minimum passe par un instant réel, car « 12 h » est une durée réelle.
"""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']  # date.weekday() : lundi = 0


def hhmm_en_min(h):
    return int(h[:2]) * 60 + int(h[3:5])


def min_en_hhmm(m):
    return f'{m // 60:02d}:{m % 60:02d}'


def creneaux_du_jour(jour, duree_min, config, horaires, indisponibilites, reservations, maintenant):
    """
    Heures de début possibles (« HH:mm ») pour une prestation de duree_min minutes.

    config : tampon_min, delai_min_heures, horizon_jours, pas_creneau_min, fuseau
    horaires : {'lun': ['09:30-18:30'], ...}
    indisponibilites : [(date, debut|None, fin|None)] en « HH:mm » ; debut None = journée entière
    reservations : [(date, debut, fin)] en « HH:mm »
    maintenant : datetime avec fuseau
    """
    tz = ZoneInfo(config['fuseau'])
    aujourdhui = maintenant.astimezone(tz).date()
    ecart = (jour - aujourdhui).days
    if ecart < 0 or ecart > config['horizon_jours']:
        return []

    tampon = config['tampon_min']
    bloques = []  # (début, fin, tampon) ; le tampon protège les réservations, pas les indisponibilités
    for d, debut, fin in indisponibilites:
        if d != jour:
            continue
        if debut is None:
            return []
        bloques.append((hhmm_en_min(debut), hhmm_en_min(fin), 0))
    for d, debut, fin in reservations:
        if d == jour:
            bloques.append((hhmm_en_min(debut), hhmm_en_min(fin), tampon))

    limite = maintenant + timedelta(hours=config['delai_min_heures'])
    trouves = set()
    for plage in horaires.get(JOURS[jour.weekday()], []):
        ouverture, fermeture = (hhmm_en_min(x) for x in plage.split('-'))
        debut = ouverture
        while debut + duree_min <= fermeture:
            fin = debut + duree_min
            libre = not any(debut < bf + t and fin + t > bd for bd, bf, t in bloques)
            # fold=0 : à l'heure en double (passage à l'heure d'hiver) on prend la première occurrence
            instant = datetime.combine(jour, time(debut // 60, debut % 60), tzinfo=tz)
            if libre and instant >= limite:
                trouves.add(min_en_hhmm(debut))
            debut += config['pas_creneau_min']
    return sorted(trouves)
