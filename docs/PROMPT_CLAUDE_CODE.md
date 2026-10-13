# Prompt de lancement — Claude Code

## Mise en place (une seule fois)

```bash
mkdir lash-brow-studio && cd lash-brow-studio
git init
# Copier ici : CAHIER_DES_CHARGES.md, CLAUDE.md, README.md, TODO.md
claude
```

## Prompt à coller dans Claude Code

```
Tu travailles sur un site web pour un studio de soins des cils et des sourcils (Lash & Brow) son nom "My Beauty Aura"

Lis d'abord, dans cet ordre : CLAUDE.md, CAHIER_DES_CHARGES.md, TODO.md. Ils font foi. CLAUDE.md contient tes règles de travail, le cahier des charges contient les besoins, TODO.md contient les tâches.

Stack imposée : HTML5, CSS3, Bootstrap 5.3, Vue 3 intégré (ES modules + importmap, sans bundler), V-Calendar 3.x pour la réservation. N'ajoute aucune autre dépendance sans me demander.

Mission de cette session : réaliser le Lot 1 (fondations et design system) puis le Lot 2 (pages statiques) de TODO.md.

Méthode :
1. Avant de coder, propose-moi un court plan (10 lignes maximum) et attends mon accord.
2. Initialise le dépôt et l'arborescence décrite en 1.1.2 du cahier des charges.
3. Applique la direction artistique « courbe du cil » : palette, Bodoni Moda + Figtree auto-hébergées, motif SVG du cil, bouton « Réserver » collant sur mobile. Évite le look générique des sites de beauté (fond crème, serif doré, rose poudré, cartes toutes identiques).
4. Construis les pages dans l'ordre de TODO.md. Texte d'exemple en français, marqué [À REMPLACER]. N'invente ni adresse, ni SIRET, ni avis, ni certification.
5. Après chaque tâche : coche-la dans TODO.md, fais un commit atomique (type(portée): message), puis résume en 2 lignes.
6. À la fin de chaque lot : lance Lighthouse et pa11y, donne les scores et liste les écarts aux objectifs du cahier des charges (Performance ≥ 90, Accessibilité ≥ 95, SEO ≥ 95, LCP < 2,5 s).

Règles non négociables :
- Mobile-first, accessible au clavier, prefers-reduced-motion respecté.
- Aucune promesse médicale. Aucune photo de cliente sans consentement. Aucun contenu tiers chargé avant consentement.
- Si une information métier te manque (tarifs, horaires, nom), pose-moi la question au lieu de deviner.

Ne commence pas le Lot 3 (réservation) dans cette session. Je te le demanderai ensuite.
```

## Prompts pour les sessions suivantes

**Session 2 : réservation (Lot 3)**

```
Lis CLAUDE.md, la section 1.1.4 du cahier des charges et TODO.md. Réalise le Lot 3.
Commence par vérifier la version stable de V-Calendar et l'URL CDN réelle (la doc v2 citée dans le cahier est une ancienne branche), figer la version avec SRI, puis propose un plan.
Écris d'abord les tests unitaires du calcul de créneaux (durée, tampon 15 min, délai 12 h, horizon 60 jours, changement d'heure d'octobre et de mars), puis les composants.
Toute demande est « à confirmer » : n'affiche jamais « confirmé ».
```

**Session 3 : galerie, SEO, accessibilité (Lot 4)**

```
Lis CLAUDE.md et TODO.md. Réalise le Lot 4. Optimise toutes les images, ajoute les données structurées (HealthAndBeautyBusiness, Service, FAQPage) sans AggregateRating tant qu'il n'y a pas de vrais avis, mets en place le bandeau cookies et la mesure sans cookie, puis audite. Donne un tableau avant/après des scores.
```

**Session 4 : recette (Lot 5)**

```
Lis CLAUDE.md et la section 4 du cahier des charges. Passe chaque critère d'acceptation en revue, coche ou liste ce qui échoue avec la cause. Liste tous les marqueurs [À COMPLÉTER] et [À REMPLACER] restants, par fichier.
```
