"""Réglages propres au métier du studio (cils et sourcils).

Tout ce qui est spécifique à ce métier vit ici, et nulle part ailleurs dans le backend : un autre
métier remplace ce fichier sans toucher aux tâches, aux sérialiseurs ni au moteur de créneaux.
Les identifiants de questions sont le miroir de `frontend/assets/js/app/validation.js`
(vérifié par un test).
"""

# Questions de première visite dont une réponse « oui » est signalée à la praticienne.
# Seul le fait qu'il y ait au moins un « oui » est conservé, jamais quelle question ni le détail.
QUESTIONS_A_RISQUE = ('allergie_colle', 'traitement_oculaire', 'grossesse')

# Catégories de prestations qui déclenchent la relance de retouche.
CATEGORIES_RETOUCHE = ('extensions',)
