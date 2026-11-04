import re
from datetime import date

from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from . import services as svc
from .models import Service
from .serializers import DemandeReservationSerializer, ServiceSerializer


class ReservationThrottle(AnonRateThrottle):
    scope = 'reservation'


@api_view(['GET'])
def health(request):
    """Sonde de disponibilité (Docker, supervision). Aucune donnée métier."""
    return Response({'status': 'ok'})


@api_view(['GET'])
def liste_services(request):
    return Response(ServiceSerializer(Service.objects.all(), many=True).data)


@api_view(['GET'])
def liste_creneaux(request):
    """?date=YYYY-MM-DD&services=id1,id2 -> heures de début libres."""
    try:
        jour = date.fromisoformat(request.query_params.get('date', ''))
    except ValueError:
        return Response({'detail': 'Paramètre date invalide (YYYY-MM-DD).'}, status=400)
    duree = _duree_demandee(request)
    if duree is None:
        return Response({'detail': 'Paramètre services invalide.'}, status=400)
    return Response({'date': jour.isoformat(), 'duree_min': duree, 'creneaux': svc.creneaux(jour, duree)})


@api_view(['GET'])
def liste_disponibilites(request):
    """?month=YYYY-MM&services=id1,id2 -> jours du mois qui ont au moins un créneau (pour griser le calendrier)."""
    m = re.fullmatch(r'(\d{4})-(0[1-9]|1[0-2])', request.query_params.get('month', ''))
    if not m:
        return Response({'detail': 'Paramètre month invalide (YYYY-MM).'}, status=400)
    duree = _duree_demandee(request)
    if duree is None:
        return Response({'detail': 'Paramètre services invalide.'}, status=400)
    annee, mois = int(m[1]), int(m[2])
    return Response({'month': request.query_params['month'], 'duree_min': duree,
                     'dates': svc.disponibilites_du_mois(annee, mois, duree)})


def _duree_demandee(request):
    """Durée totale des prestations du paramètre `services`, ou None s'il est absent ou contient un identifiant inconnu."""
    ids = [i for i in request.query_params.get('services', '').split(',') if i]
    services = list(Service.objects.filter(pk__in=ids))
    if not ids or len(services) != len(set(ids)):
        return None
    return sum(s.duree_min for s in services)


@api_view(['POST'])
@throttle_classes([ReservationThrottle])
def creer_reservation(request):
    s = DemandeReservationSerializer(data=request.data)
    s.is_valid(raise_exception=True)
    # Honeypot rempli : robot. Même réponse qu'un succès, rien n'est enregistré.
    if s.validated_data.get('site_web'):
        return Response({'statut': 'a_confirmer'}, status=status.HTTP_201_CREATED)
    donnees, services = s.donnees_creation()
    try:
        resa = svc.creer_reservation(donnees, services)
    except svc.CreneauIndisponible:
        return Response({'detail': 'Ce créneau n’est plus disponible.'}, status=status.HTTP_409_CONFLICT)
    # Toujours « à confirmer » : jamais « confirmé » sans validation de la praticienne.
    return Response({'id': resa.pk, 'statut': resa.statut}, status=status.HTTP_201_CREATED)
