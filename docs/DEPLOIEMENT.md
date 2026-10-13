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
