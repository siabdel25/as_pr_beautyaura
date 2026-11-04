from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def health(request):
    """Sonde de disponibilité (Docker, supervision). Aucune donnée métier."""
    return Response({'status': 'ok'})
