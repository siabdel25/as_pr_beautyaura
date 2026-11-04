"""Réglages propres au métier du studio (cils et sourcils).

Tout ce qui est spécifique à ce métier vit ici, et nulle part ailleurs dans le backend : un autre
métier remplace ce fichier sans toucher aux tâches, aux sérialiseurs ni au moteur de créneaux.
Les identifiants de questions sont le miroir de `frontend/assets/js/app/validation.js`
(vérifié par un test).
"""

# Questions de première visite dont une réponse « oui » est signalée à la praticienne.
# Identifiant -> libellé utilisé dans l'e-mail de notification.
QUESTIONS_A_RISQUE = {
    'allergie_colle': 'allergie connue à la colle ou aux produits de pose',
    'traitement_oculaire': 'traitement oculaire en cours',
    'grossesse': 'grossesse en cours',
}

# Catégories de prestations qui déclenchent la relance de retouche.
CATEGORIES_RETOUCHE = ('extensions',)
