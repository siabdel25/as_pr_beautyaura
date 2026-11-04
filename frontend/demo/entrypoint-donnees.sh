#!/bin/sh
# Exécuté au démarrage par l'entrypoint nginx : régénère les fausses données à la date du jour,
# pour que la démo ait toujours des créneaux dans l'horizon de 60 jours.
set -eu
cp -r /opt/demo/base/. /usr/share/nginx/html/data/
python3 /opt/demo/generate_fake_data.py --source /opt/demo/base --out /usr/share/nginx/html/data --seed "${DEMO_SEED:-2026}"
