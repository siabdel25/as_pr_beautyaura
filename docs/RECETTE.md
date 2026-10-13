# Recette : critères d'acceptation (cahier des charges, section 4)

État au 13/10/2026. « Vérifié » = mesuré ou testé dans le dépôt. « À faire » = dépend du client ou d'un outil externe.

| Critère | État | Preuve ou reste à faire |
|---|---|---|
| Lighthouse mobile conforme (accueil, prestation, réservation) | Vérifié | Perf 98–99, Accessibilité 100, Bonnes pratiques 100, SEO 100, LCP 2,0–2,3 s, CLS 0. À refaire sur le domaine réel. |
| Tunnel utilisable au clavier et au lecteur d'écran | Partiel | Clavier vérifié (calendrier, créneaux, formulaire), pa11y sans erreur. **À faire** : essai avec NVDA ou VoiceOver. |
| Aucun créneau hors horaires, jour fermé ou chevauchant un RDV | Vérifié | `tests/slots.test.mjs` (31 tests du module, dont fermetures, indisponibilités, chevauchement, tampon) |
| Calendrier en français, semaine commençant le lundi | Vérifié | Parcours Playwright, V-Calendar `fr` |
| Test de changement d'heure (octobre et mars) | Vérifié | Deux tests DST ; ils échouent si le calcul repasse en heure murale |
| Affichage de 360 à 1920 px | Vérifié | 16 pages × 6 largeurs, aucun débordement. **À faire** : essai sur appareils réels (iOS Safari). |
| Bandeau cookies conforme, mesure sans cookie | Vérifié | Refuser et Accepter identiques, 0 cookie déposé, Plausible chargé seulement si configuré |
| Mentions légales, CGV, confidentialité en ligne | **À faire** | Pages présentes, textes à compléter (SIRET, forme juridique, hébergeur…) et à faire valider juridiquement |
| Données structurées valides (Rich Results) | Partiel | JSON-LD présent et sans note ni avis. **À faire** : test Google Rich Results sur le domaine public (outil externe). |
| Aucune photo de cliente sans consentement archivé | Vérifié | Aucune photo de cliente ; galerie bloquée sans `consentement: true`. Le registre des consentements reste à tenir par la praticienne. |

## Bloquants avant mise en ligne

`node tools/verifier-mise-en-ligne.mjs --liste` : marqueurs `[À COMPLÉTER]`, `[À REMPLACER]`, `[À CONFIRMER]`, données d'exemple, URL factice, `endpoint` vide.

## Relecture par la praticienne

Pages à relire : conseils après-soin, FAQ, prestations (durées, tenue, entretien), à propos (hygiène), CGV. Vérifier qu'aucune phrase ne promet un effet médical ou la croissance des cils.
