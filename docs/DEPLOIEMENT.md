# Déploiement

Site statique : la racine du dépôt est le dossier à publier. Hébergeurs prévus : Netlify ou Cloudflare Pages (le fichier `_headers` est lu tel quel). Sur un autre hébergeur, reprendre les en-têtes de `_headers`.

## Avant la mise en ligne

1. `node tools/verifier-mise-en-ligne.mjs --liste` : doit répondre « Rien à signaler » (hors mesure d'audience, facultative).
2. `data/site.json` : `url` = domaine réel, `carte_embed_url` si carte, `mesure.domaine` si Plausible.
3. `data/reservation.json` : `endpoint` = service d'envoi retenu (Formspree, fonction serverless). Faire un envoi réel de bout en bout. Limitation de fréquence : à régler chez le service d'envoi.
4. `node tools/build-pages.mjs` puis `node --test "tests/*.test.mjs"`.

## Hébergement

1. Connecter le dépôt, dossier de publication `/`, aucune commande de build.
2. Domaine : une seule adresse canonique (avec ou sans `www`), l'autre redirige en 301. HTTPS obligatoire, redirection HTTP vers HTTPS.
3. La page `404.html` est servie automatiquement par Netlify et Cloudflare Pages.
4. Vérifier les en-têtes : `curl -sI https://domaine/ | grep -i "content-security\|referrer\|nosniff"`.
5. Soumettre `https://domaine/sitemap.xml` dans Google Search Console.

## Après la mise en ligne

- Test Google Rich Results sur `/`, `/faq.html` et une page de prestation.
- Lighthouse mobile sur accueil, une prestation et réservation.
- Demande de réservation de test, puis la supprimer côté praticienne.

## Démo Docker (nginx, fausses données)

Version de démonstration : nginx sert le site statique et un script Python génère de fausses données (services, indisponibilités, réservations « à confirmer »). Les données du dépôt dans `data/` ne sont jamais modifiées. Ne pas utiliser cette image en production.

```bash
docker build -f demo/Dockerfile -t lb-demo .      # depuis la racine du dépôt
docker run --rm -p 8080:80 lb-demo                # http://localhost:8080
```

- Les fausses données sont régénérées à chaque démarrage, à la date du jour : la démo propose toujours des créneaux sur les 60 jours à venir. `DEMO_SEED` (défaut 2026) change le jeu de données : `docker run --rm -e DEMO_SEED=7 -p 8080:80 lb-demo`.
- Les services et horaires viennent de `data/`, les prix sont fictifs. Les clientes sont `Cliente démo NN` avec des adresses en `@example.test`.
- Les en-têtes de sécurité sont convertis depuis `_headers` au build de l'image : une seule source à maintenir.
- L'image ne contient que les pages, `assets/` et `prestations/` (ni `tools/`, `tests/`, `docs/`).
- Après un changement de pages, relancer `node tools/build-pages.mjs` avant de reconstruire l'image.

Tests :

```bash
python3 -m unittest discover -s demo/tests -v     # cohérence des fausses données
node --test "tests/*.test.mjs"                    # dont tests/demo-slots.test.mjs (créneaux sur données de démo)
bash demo/tests/test_container.sh                 # construit l'image, vérifie pages, en-têtes et données (port 8089, DEMO_PORT pour changer)
```
