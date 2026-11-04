#!/usr/bin/env bash
# Test de la démo Docker : construit l'image, démarre nginx, vérifie pages, en-têtes et données.
# Usage : demo/tests/test_container.sh   (nécessite docker et curl)
set -euo pipefail

racine="$(cd "$(dirname "$0")/../.." && pwd)"
image="lb-demo-test"
nom="lb-demo-test-$$"
port="${DEMO_PORT:-8089}"
base="http://127.0.0.1:${port}"
echec=0

nettoyer() { docker rm -f "$nom" >/dev/null 2>&1 || true; }
trap nettoyer EXIT

verifier() { # verifier "description" commande...
  local desc="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "ok   $desc"; else echo "ECHEC $desc"; echec=1; fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$base$1"; }
entetes() { curl -s -D - -o /dev/null "$base$1"; }

docker build -q -f "$racine/demo/Dockerfile" -t "$image" "$racine" >/dev/null
docker run -d --rm --name "$nom" -p "127.0.0.1:${port}:80" "$image" >/dev/null
for _ in $(seq 1 30); do curl -sf -o /dev/null "$base/" && break; sleep 0.5; done

for p in / /reservation.html /tarifs.html /prestations/ /prestations/extensions-de-cils.html /offline.html /manifest.webmanifest /sw.js /sitemap.xml; do
  verifier "GET $p -> 200" test "$(code "$p")" = 200
done
verifier "page inconnue -> 404" test "$(code /introuvable.html)" = 404
verifier "contenu de la 404 servi" bash -c "curl -s '$base/introuvable.html' | grep -qi '<html'"

verifier "CSP présente" bash -c "curl -sI '$base/' | grep -qi '^content-security-policy:.*manifest-src'"
verifier "Referrer-Policy présente" bash -c "curl -sI '$base/' | grep -qi '^referrer-policy:'"
verifier "X-Content-Type-Options présent" bash -c "curl -sI '$base/' | grep -qi '^x-content-type-options: nosniff'"
verifier "sw.js sans cache" bash -c "curl -sI '$base/sw.js' | grep -qi '^cache-control:.*no-cache'"
verifier "manifeste en application/manifest+json" bash -c "curl -sI '$base/manifest.webmanifest' | grep -qi '^content-type:.*manifest+json'"
verifier "JavaScript en text/javascript" bash -c "curl -sI '$base/assets/js/app/slots.js' | grep -qi '^content-type:.*javascript'"

# Les données servies sont celles de la démo, jamais celles de /data du dépôt
verifier "services de démo servis" bash -c "curl -s '$base/data/services.json' | grep -q '\"statut\": *\"exemple\"'"
verifier "réservations de démo servies" bash -c "curl -s '$base/data/reservations.json' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert len(d[\"reservations_existantes\"])>=10'"

# Fichiers de développement jamais publiés
for p in /tools/build-pages.mjs /tests/slots.test.mjs /docs/RECETTE.md /TODO.md /CLAUDE.md /manage.py /demo/generate_fake_data.py /.git/config; do
  verifier "$p non publié" test "$(code "$p")" = 404
done

exit "$echec"
