#!/bin/sh
# Prépare les données de démonstration dans le volume partagé (exécuté en root, une fois par démarrage).
# Services, horaires et indisponibilités viennent de frontend/data ; les réservations fictives sont décalées à aujourd'hui.
set -eu
cp /frontend/data/*.json /out/
python3 /frontend/demo/generate_fake_data.py --source /frontend/data --out /out --seed "${DEMO_SEED:-2026}"
# Le site parle à l'API de la pile : même origine, via nginx.
python3 - <<'PY'
import json
p = '/out/reservation.json'
c = json.load(open(p, encoding='utf-8'))
c['api'] = '/api/v1'
c['api_format'] = None
json.dump(c, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
PY
chmod -R a+rX /out
chmod 777 /static
echo "Données de démonstration prêtes."
