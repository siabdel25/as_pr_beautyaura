import re

from rest_framework import serializers

from .models import Reservation, Service
from .vertical import QUESTIONS_A_RISQUE


def telephone_valide(brut):
    s = re.sub(r'[\s.\-()]', '', brut)
    return bool(re.fullmatch(r'0[1-9]\d{8}', s) or re.fullmatch(r'\+33[1-9]\d{8}', s))


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'nom', 'categorie', 'duree_min', 'prix_a_partir_de', 'description']


class PrestationRefSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=60)
    nom = serializers.CharField(required=False, allow_blank=True)  # ignoré : le serveur fait foi


class ClientSerializer(serializers.Serializer):
    prenom = serializers.CharField(max_length=80)
    nom = serializers.CharField(max_length=80)
    telephone = serializers.CharField(max_length=20)
    email = serializers.EmailField()

    def validate_telephone(self, v):
        if not telephone_valide(v):
            raise serializers.ValidationError('Numéro de téléphone français invalide.')
        return v


class DemandeReservationSerializer(serializers.Serializer):
    """Contrat du payload envoyé par frontend/assets/js/app/booking.js. Le serveur refait tous les contrôles."""
    prestations = PrestationRefSerializer(many=True, allow_empty=False, max_length=10)
    date = serializers.DateField()
    heure = serializers.RegexField(r'^([01]\d|2[0-3]):[0-5]\d$')
    client = ClientSerializer()
    premiere_visite = serializers.ChoiceField(choices=['oui', 'non'])
    questionnaire = serializers.DictField(child=serializers.ChoiceField(choices=['oui', 'non']), required=False)
    consentement_rgpd = serializers.BooleanField()
    cgv_acceptees = serializers.BooleanField()
    site_web = serializers.CharField(required=False, allow_blank=True)  # honeypot

    def validate_consentement_rgpd(self, v):
        if v is not True:
            raise serializers.ValidationError('Le consentement est nécessaire.')
        return v

    def validate_cgv_acceptees(self, v):
        if v is not True:
            raise serializers.ValidationError('Les CGV doivent être acceptées.')
        return v

    def validate_prestations(self, valeurs):
        ids = [p['id'] for p in valeurs]
        if len(set(ids)) != len(ids):
            raise serializers.ValidationError('Prestation en double.')
        services = list(Service.objects.filter(pk__in=ids))
        if len(services) != len(ids):
            raise serializers.ValidationError('Prestation inconnue.')
        self._services = services
        return valeurs

    def validate(self, data):
        if data['premiere_visite'] == 'oui':
            manquantes = [q for q in QUESTIONS_A_RISQUE if q not in data.get('questionnaire', {})]
            if manquantes:
                raise serializers.ValidationError({'questionnaire': f'Réponses manquantes : {", ".join(manquantes)}.'})
        return data

    def donnees_creation(self):
        d = self.validated_data
        c = d['client']
        return {
            'date': d['date'], 'heure': d['heure'],
            'client_champs': {
                'prenom': c['prenom'].strip(), 'nom': c['nom'].strip(), 'telephone': c['telephone'].strip(),
                'email': c['email'].strip(), 'premiere_visite': d['premiere_visite'] == 'oui',
                'reponse_a_risque': d['premiere_visite'] == 'oui'
                                    and any(d.get('questionnaire', {}).get(q) == 'oui' for q in QUESTIONS_A_RISQUE),
                'consentement_rgpd': True, 'cgv_acceptees': True,
            },
        }, self._services
