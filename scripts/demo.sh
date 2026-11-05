#!/usr/bin/env bash
# Pilote la démonstration Docker (docker-compose.demo.yml).
#   bash scripts/demo.sh up      construit et démarre, attend que le site réponde
#   bash scripts/demo.sh status  état des conteneurs
#   bash scripts/demo.sh logs    journaux (suivi)
#   bash scripts/demo.sh down    arrête (données conservées)
#   bash scripts/demo.sh reset   arrête ET efface la base et les données pour repartir de zéro
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
PORT="${DEMO_PORT:-8082}"; MAIL="${MAILPIT_PORT:-8026}"
C=(docker compose -f docker-compose.demo.yml)
case "${1:-}" in
  up)
    "${C[@]}" up -d --build
    echo "→ attente du site…"
    for _ in $(seq 1 90); do curl -fsS -o /dev/null "http://localhost:$PORT/api/v1/health/" 2>/dev/null && break; sleep 2; done
    cat <<TXT

✓ Démo prête.
  Site et réservation   http://localhost:$PORT/reservation.html
  Administration        http://localhost:$PORT/admin/      compte « studio » / « demo-studio »
  E-mails capturés      http://localhost:$MAIL/
TXT
    ;;
  status) "${C[@]}" ps ;;
  logs) "${C[@]}" logs -f --tail=100 ;;
  down) "${C[@]}" down ;;
  reset) "${C[@]}" down -v ;;
  *) sed -n 2,7p "$0"; exit 1 ;;
esac
