# Blog : textes des articles

Brouillons des 4 premiers articles SEO prévus au cahier des charges (`docs/CAHIER_DES_CHARGES.md`, section SEO). **Statut : à faire relire par la praticienne.** Rien n'est publié.

| Article | Fichier |
|---|---|
| Combien de temps tiennent les extensions de cils ? | `combien-de-temps-tiennent-les-extensions-de-cils.md` |
| Cil à cil ou volume russe ? | `cil-a-cil-ou-volume-russe.md` |
| Entretenir ses extensions de cils | `entretenir-ses-extensions-de-cils.md` |
| Rehaussement ou extensions de cils ? | `rehaussement-ou-extensions.md` |

## Règles suivies

- Vouvoiement, « soin esthétique », aucune promesse médicale ni de croissance des cils.
- Aucun chiffre, prix, durée ou avis inventé : tout ce qui dépend du studio est marqué `[À COMPLÉTER]` ou `[À VALIDER]`.
- Le microblading et la micro-pigmentation ne sont pas évoqués.
- Les précautions (allergie, traitement oculaire, grossesse, gêne ou rougeur) renvoient vers le studio et un professionnel de santé.
- Chaque fichier porte son en-tête (`slug`, `titre`, `meta_title`, `meta_description`, auteur, dates) pour être repris tel quel, que ce soit dans une page `.mjs` ou dans Wagtail (voir `docs/adr/0001-statique-d-abord-wagtail-sur-declencheurs.md`).

## Avant publication

1. La praticienne relit les 4 textes et tranche chaque `[À VALIDER]`.
2. Renseigner chaque `[À COMPLÉTER]` (durées, tarifs, délai de retouche, volume russe proposé ou non, teinture, auteur, date de publication).
3. Vérifier que « Entretenir ses extensions » reste cohérent avec la page `conseils-apres-soin.html`.
4. Choisir le support (pages `.mjs` ou Wagtail) selon les déclencheurs de l'ADR.
