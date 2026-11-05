# Tests de bout en bout (Playwright)

Ils s'exécutent contre la **démo Docker** (`docs/DEMO-DOCKER.md`), pas contre un site en production : ils créent une vraie demande de réservation.

```bash
scripts/demo.sh up                 # depuis la racine du dépôt
cd frontend/tests/e2e
npm install
npx playwright install chromium
npm test                           # 43 contrôles, code de sortie 1 au premier échec
```

Variables : `E2E_BASE` (défaut `http://localhost:8082`), `E2E_MAIL` (Mailpit, défaut `http://localhost:8026`), `E2E_OUT` (captures, défaut `/tmp/lb-e2e`).

Couvert : 12 pages, tunnel complet en mobile, validation, réponse à risque, honeypot, statut `a_confirmer`, notification studio dans Mailpit, PWA, connexion admin (`studio` / `demo-studio`), accessibilité de base.
Non couvert : concurrence sur un même créneau, action « Confirmer », mode `api_format: booking`, Lighthouse, installation PWA sur appareil.

Les comptes et l'adresse `studio@demo.test` sont ceux de la démo. `scripts/demo.sh reset` efface les demandes de test.
