# Cahier des charges — Site web Lash & Brow

> **Projet** : site vitrine + prise de rendez-vous en ligne pour un studio de soins des cils et des sourcils
> **Version** : 1.0 — 13 octobre 2026
> **Nom de travail** : `[NOM_DU_STUDIO]` (à remplacer partout)
> **Méthode** : rédigé en 2 rounds. Round 1 = architecture. Round 2 = marketing. Chaque round contient une proposition, une revue critique et des décisions arrêtées.

---

## 0. Synthèse du projet

| Élément | Décision |
|---|---|
| Secteur | Beauté — extensions de cils, rehaussement, soins des sourcils |
| Cible | Femmes 22–50 ans (et public masculin pour les sourcils), clientèle locale, forte part de mobile |
| Objectif n°1 | **Réservation en ligne** : maximiser le nombre de RDV pris depuis le site |
| Objectif n°2 | Inspirer confiance (hygiène, certification, résultats avant/après) |
| Objectif n°3 | Être trouvé localement (SEO local, Google Business Profile) |
| Stack | HTML5, CSS3, Bootstrap 5.3, Vue 3 intégré (sans build obligatoire), V-Calendar 3 pour la réservation |
| Langue | Français (structure prête pour l'anglais) |
| Contraintes | Performant (Lighthouse ≥ 90), responsive mobile-first, accessible (RGAA / WCAG 2.1 AA), conforme RGPD |

**Principe directeur** : un site rapide, sobre et précis, à l'image du métier. Le visiteur doit pouvoir réserver en moins de 60 secondes depuis son téléphone.

---

# ROUND 1 — ARCHITECTURE

## 1.1 Proposition

### 1.1.1 Choix techniques

| Couche | Choix | Justification |
|---|---|---|
| Markup | HTML5 sémantique, multi-pages statiques | SEO optimal, chaque prestation a sa page indexable |
| Style | Bootstrap 5.3 (CDN avec SRI ou Sass) + `custom.css` | Grille et composants rapides, thème surchargé par variables CSS |
| Interactivité | Vue 3 en build navigateur (ES modules + importmap) | « Intégré » : pas de bundler obligatoire, îlots Vue montés sur des zones précises |
| Réservation | **V-Calendar 3.x (Vue 3)** : composant `DatePicker` | Léger, accessible, localisable en français, dates désactivables |
| Agenda pro (option) | **Vue Cal** (v4, Vue 3) | Vue agenda jour/semaine pour l'espace praticienne en phase 2 |
| Données | JSON statiques (`/data/*.json`) en phase 1, API en phase 2 | Démarrage rapide, migration facile |
| Hébergement | Netlify, Cloudflare Pages ou OVH mutualisé | CDN, HTTPS, déploiement Git |

> **Note sur V-Calendar** : le lien fourni (`v2.vcalendar.io/vue-3.html`) correspond à la documentation de la branche v2 compatible Vue 3. La version stable actuelle est la 3.x pour Vue 3. Claude Code doit **vérifier la version et l'URL CDN réelles** avant l'intégration, puis figer la version (pas de `latest`).

> **Pourquoi V-Calendar pour la réservation et Vue Cal pour l'agenda** : V-Calendar est conçu pour choisir une date. Vue Cal est conçu pour afficher des événements sur une grille horaire. Le client choisit un jour (V-Calendar) puis un créneau (boutons personnalisés). La praticienne gère ses RDV dans une vue agenda (Vue Cal), plus tard.

### 1.1.2 Arborescence

```
lash-brow-studio/
├── index.html                  # Accueil
├── prestations/
│   ├── index.html              # Vue d'ensemble
│   ├── extensions-de-cils.html
│   ├── rehaussement-de-cils.html
│   ├── soins-des-sourcils.html
│   └── epilation-sourcils.html
├── tarifs.html
├── reservation.html            # Widget Vue + V-Calendar
├── galerie.html                # Avant / après, filtres Vue
├── a-propos.html
├── faq.html
├── conseils-apres-soin.html
├── contact.html
├── blog/                       # Articles SEO (phase 2)
├── mentions-legales.html
├── politique-confidentialite.html
├── cgv-annulation.html
├── 404.html
├── assets/
│   ├── css/ (variables.css, custom.css)
│   ├── js/
│   │   ├── app/ (booking.js, gallery.js, tarifs.js, faq.js)
│   │   └── vendor/ (versions figées si auto-hébergées)
│   ├── img/ (webp + avif, 3 tailles)
│   ├── fonts/ (woff2 auto-hébergées)
│   └── icons/
├── data/
│   ├── services.json
│   ├── horaires.json
│   ├── indisponibilites.json
│   └── avis.json
├── sitemap.xml
├── robots.txt
├── CLAUDE.md
├── README.md
└── TODO.md
```

### 1.1.3 Pages et contenu

| Page | Rôle | Éléments clés |
|---|---|---|
| Accueil | Convaincre en 5 secondes | Hero, 3 prestations phares, avant/après, avis, bandeau « Réserver », adresse et horaires |
| Prestations | Expliquer | Une fiche par prestation : à qui ça convient, durée, tenue, entretien, prix « à partir de » |
| Tarifs | Rassurer | Tableau filtrable (Vue), forfaits, prix de retouche |
| Réservation | Convertir | Tunnel en 4 étapes (voir 1.1.4) |
| Galerie | Prouver | Avant/après avec curseur, filtres par type de prestation |
| À propos | Créer le lien | Parcours, certifications, protocole d'hygiène, le lieu |
| FAQ | Lever les freins | Accordéon Bootstrap, balisage `FAQPage` |
| Conseils après-soin | Fidéliser et réduire le SAV | Checklist des 48 h, entretien |
| Contact | Joindre | Carte, itinéraire, téléphone, formulaire |

### 1.1.4 Tunnel de réservation (fonctionnalité centrale)

Composant Vue `BookingWidget`, monté sur `reservation.html` et ouvert aussi en offcanvas depuis tout bouton « Réserver ».

1. **Prestation** : choix d'une ou plusieurs prestations (cartes). Le total durée + prix se met à jour.
2. **Date** : `DatePicker` V-Calendar, `locale: 'fr'`, semaine commençant le lundi, jours fermés et passés désactivés, `min-date` = aujourd'hui + délai minimum de réservation.
3. **Créneau** : boutons horaires calculés selon la durée totale, les horaires d'ouverture et les indisponibilités.
4. **Coordonnées** : prénom, nom, téléphone, e-mail, première visite (oui/non), allergies connues, case de consentement RGPD, acceptation des CGV.
5. **Confirmation** : récapitulatif, fichier `.ics` à télécharger, rappel de la politique d'annulation.

**Règles métier à implémenter**
- Durée des prestations : pose complète ≈ 2 h 30, retouche ≈ 1 h 15, rehaussement ≈ 1 h, sourcils ≈ 45 min (valeurs configurables dans `services.json`).
- Temps tampon entre deux clientes : 15 min (configurable).
- Délai minimum de réservation : 12 h. Horizon maximum : 60 jours.
- Questionnaire de première visite : allergies à la colle, lentilles, grossesse, traitement oculaire en cours. Une réponse « oui » affiche un message invitant à contacter le studio.
- Annulation gratuite jusqu'à 24 h avant. Acompte optionnel (phase 3).
- Anti-spam : champ honeypot + limitation de fréquence côté serveur.

**Modèle de données (JSON)**

```json
{
  "services": [
    { "id": "pose-cil-a-cil", "nom": "Pose cil à cil", "categorie": "extensions",
      "duree_min": 150, "prix_a_partir_de": 0, "description": "" }
  ],
  "horaires": { "mar": ["09:30-18:30"], "dim": [] },
  "indisponibilites": [ { "date": "2026-12-25", "motif": "Fermeture" } ],
  "reservations_existantes": [ { "date": "2026-11-03", "debut": "10:00", "fin": "12:30" } ]
}
```

**Stratégie backend par phases**

| Phase | Fonctionnement | Livrable |
|---|---|---|
| 1 (MVP) | Créneaux calculés depuis les JSON. La demande part par fonction serverless (Netlify Function ou Formspree) vers l'e-mail de la praticienne. La demande est « à confirmer » par la praticienne. | Site en ligne, demandes de RDV fonctionnelles |
| 2 | API légère (Node/Express ou Supabase) : créneaux réels, blocage automatique, e-mail et SMS de confirmation et de rappel | Réservation automatisée |
| 3 | Acompte (Stripe), espace praticienne avec Vue Cal, liste d'attente | Gestion complète |

### 1.1.5 Architecture front

- **Îlots Vue** : chaque zone interactive est un `createApp` monté sur un `div` identifié (`#booking-app`, `#gallery-app`, `#tarifs-app`). Le reste de la page est du HTML statique, donc rapide et indexable.
- **Composants** : `BookingWidget`, `ServicePicker`, `SlotGrid`, `CustomerForm`, `BeforeAfterSlider`, `GalleryFilter`, `PriceTable`.
- **État** : `reactive()` local par îlot. Pas de Pinia en phase 1.
- **Chargement** : Vue et V-Calendar chargés uniquement sur les pages qui en ont besoin, avec `type="module"` et `defer`.
- **CSS** : variables CSS pour les couleurs, surcharge Bootstrap par variables, pas de CSS inline.
- **Convention** : composants en PascalCase, classes CSS en BEM léger préfixées `lb-` (ex. `lb-hero`, `lb-card`).

### 1.1.6 Direction artistique

Contexte : les sites de beauté se ressemblent (crème, serif doré, rose poudré). Le studio doit se distinguer sans perdre le côté rassurant et haut de gamme.

| Élément | Choix |
|---|---|
| Idée forte | **La courbe du cil**. Le motif graphique est un trait fin, courbé comme un cil (courbures C, CC, D, L), utilisé comme séparateur, icône et animation. |
| Palette | Encre `#1F1A24` (texte), Soie `#F6F1F3` (fond), Mauve fumé `#7A5C74` (accent principal), Bronze doux `#B07D55` (accent secondaire, CTA), Sauge pâle `#BFCABA` (touches et états) |
| Typographie titres | **Bodoni Moda** (didone à hauts contrastes, ses empattements ultra-fins évoquent la finesse d'un cil) |
| Typographie texte | **Figtree** (sans-serif lisible, chiffres nets pour les prix) |
| Moment mémorable | Dans le hero, un cil est dessiné au trait (SVG animé une seule fois au chargement). Ailleurs, le design reste calme. |
| Interaction signature | Un sélecteur de courbure (C / CC / D / L) sur la page extensions, qui montre l'effet sur l'œil. |
| Mise en page | Texte aligné à gauche, grille asymétrique, photos grand format, peu de cartes identiques |
| Mouvement | Pas d'animations d'entrée sur chaque section. Seulement : le hero, les retours visuels des actions (sélection d'un créneau, validation) et `prefers-reduced-motion` respecté. |

### 1.1.7 Performance

| Indicateur | Objectif |
|---|---|
| Lighthouse (mobile) Performance / Accessibilité / SEO / Bonnes pratiques | ≥ 90 / ≥ 95 / ≥ 95 / ≥ 95 |
| LCP | < 2,5 s sur 4G |
| CLS | < 0,05 |
| INP | < 200 ms |
| Poids de page d'accueil | < 800 Ko hors vidéo |

Moyens :
- Images AVIF et WebP avec `srcset` (400, 800, 1600 px), `loading="lazy"` sauf image LCP, dimensions explicites.
- Polices WOFF2 auto-hébergées avec `font-display: swap`, 2 graisses maximum par famille, sous-ensemble latin.
- Bootstrap : n'importer que les modules nécessaires si Sass est utilisé. Sinon CDN avec SRI.
- Pas de jQuery. Pas de bibliothèque d'animation lourde.
- Cache HTTP long sur `/assets` avec noms versionnés. Compression Brotli.
- Pas de vidéo en autoplay avec son. Si vidéo : 6 s, muette, `poster`, chargée après l'interaction.

### 1.1.8 Accessibilité, sécurité, conformité

- **Accessibilité** : contrastes ≥ 4,5:1, focus visible, navigation clavier complète (y compris le calendrier et les créneaux), `aria-live` pour les messages du tunnel, textes alternatifs descriptifs pour les avant/après.
- **Sécurité** : HTTPS, en-têtes CSP/X-Content-Type-Options/Referrer-Policy, SRI sur les ressources tierces, validation des formulaires côté client et serveur.
- **RGPD** : consentement explicite à la collecte, bandeau cookies avec refus aussi simple que l'acceptation, mesure d'audience sans cookie recommandée (Plausible ou Matomo), durée de conservation des données indiquée, droit d'accès et de suppression.
- **Légal France** : mentions légales, CGV, politique d'annulation, SIRET, assurance RC pro. Les photos de clientes publiées exigent un **consentement écrit**.
- **Santé et hygiène** : afficher le protocole (matériel stérilisé ou à usage unique). Le micro-pigmentation/microblading est une activité réglementée : ne la proposer sur le site que si la praticienne est formée et déclarée.

## 1.2 Revue critique du Round 1

| Risque identifié | Gravité | Réponse retenue |
|---|---|---|
| Vue « intégré » sans build : le template dans le DOM oblige à embarquer le compilateur (poids), et le contenu n'est pas visible avant le montage | Moyenne | Réserver Vue aux îlots interactifs. Le contenu SEO (prestations, tarifs, FAQ) reste en HTML statique. Utiliser `v-cloak` et des squelettes de chargement. |
| V-Calendar : doc fournie = v2, version actuelle = 3.x | Moyenne | Vérifier avant de coder, figer la version, tester la localisation française. |
| Sans backend, risque de double réservation | **Haute** | Phase 1 : toute demande est « à confirmer » par la praticienne. Ne jamais afficher « confirmé » sans validation. |
| Dépendance à des CDN tiers | Faible | SRI + plan B d'auto-hébergement des fichiers dans `assets/js/vendor`. |
| Trop de pages à produire pour la phase 1 | Moyenne | Lancer avec 9 pages. Le blog arrive en phase 2. |
| Fuseau horaire des dates (bug classique avec `Date`) | Moyenne | Manipuler les créneaux en chaînes `YYYY-MM-DD` et `HH:mm`, fuseau Europe/Paris, tests unitaires sur le changement d'heure d'octobre et mars. |

## 1.3 Décisions arrêtées — Round 1

1. Site **multi-pages statiques** avec **îlots Vue 3** (réservation, galerie, tarifs).
2. **V-Calendar 3.x** pour le choix de date. **Vue Cal** réservé à l'agenda praticienne (phase 3).
3. Bootstrap 5.3 surchargé par variables CSS, préfixe `lb-` pour le CSS maison.
4. Backend en **3 phases** ; la phase 1 fonctionne sans base de données, avec validation manuelle.
5. Direction artistique « courbe du cil » avec Bodoni Moda + Figtree.
6. Objectifs Lighthouse et accessibilité inscrits comme critères de recette.

---

# ROUND 2 — MARKETING

## 2.1 Proposition

### 2.1.1 Positionnement

| Axe | Proposition |
|---|---|
| Promesse | « Un regard soigné, un résultat qui tient, une pose qui préserve vos cils naturels. » |
| Différenciation | Précision, hygiène visible, cartographie personnalisée de l'œil, conseils d'entretien clairs |
| Gamme de prix | Milieu à haut de gamme (à valider avec la praticienne) |
| Ton | Chaleureux, expert, sans jargon. Vouvoiement. Phrases courtes. |
| Preuves à montrer | Certifications, nombre de poses réalisées, avis vérifiés, photos avant/après (avec accord), protocole d'hygiène |

### 2.1.2 Personas

| Persona | Profil | Besoin | Frein | Message |
|---|---|---|---|---|
| **Camille, 28 ans** | Active, gain de temps le matin | Un regard défini sans maquillage | Peur d'abîmer ses cils | « Posé cil par cil, sans abîmer vos cils naturels » |
| **Sofia, 35 ans** | Cadre, événement à venir | Un résultat naturel et durable | Prix, entretien contraignant | « Un entretien simple, un rendez-vous de retouche toutes les 3 semaines » |
| **Karim, 40 ans** | Sourcils clairsemés ou irréguliers | Un soin discret | Se sentir « hors cible » | « Des sourcils nets et naturels, pour toutes et tous » |
| **Léa, 22 ans** | Étudiante, active sur les réseaux | Une pose tendance, budget serré | Budget | « Forfaits et offre première visite » |

### 2.1.3 Parcours de conversion

```
Recherche Google / Instagram / bouche-à-oreille
        ↓
Page prestation ou Accueil  →  Preuve (avant/après + avis)
        ↓
Tarifs clairs  →  Bouton « Réserver » (visible en permanence sur mobile)
        ↓
Tunnel 4 étapes  →  Confirmation + .ics
        ↓
Rappel J-1 (SMS/e-mail)  →  Conseils après-soin  →  Demande d'avis  →  Retouche à J+21
```

**Leviers de conversion sur le site**
- Bouton « Réserver » collant en bas d'écran sur mobile, et dans la barre de navigation sur desktop.
- Prochaine disponibilité affichée sur l'accueil (« Prochain créneau : mardi 14h30 »).
- Avis clients en preuve sociale, près de chaque CTA.
- Prix « à partir de » toujours visibles. Durée indiquée.
- Réponses aux objections sur chaque page prestation (douleur, allergies, tenue, entretien).
- Tunnel sans création de compte.

### 2.1.4 SEO

**Mots-clés principaux (à affiner avec un outil de volumes)**
- extensions de cils [ville], pose de cils [ville], cil à cil, volume russe
- rehaussement de cils [ville], lash lift, browlift, lamination sourcils
- épilation sourcils [ville], teinture sourcils, restructuration des sourcils
- institut / studio lash & brow [ville]

**Actions**
- Une page par prestation avec un titre `<title>` de moins de 60 caractères et une meta description de moins de 155 caractères.
- Un seul `<h1>` par page. Hiérarchie de titres propre.
- **Balisage schema.org** : `HealthAndBeautyBusiness` (adresse, horaires, tarifs), `Service`, `FAQPage`, `AggregateRating` (uniquement avec de vrais avis).
- **Google Business Profile** : fiche complète, catégories, photos, lien de réservation, publications mensuelles. C'est le canal n°1 du SEO local.
- Blog (phase 2) : « Combien de temps tiennent les extensions de cils ? », « Cil à cil ou volume russe ? », « Entretenir ses extensions », « Rehaussement ou extensions ? ».
- Fichiers `sitemap.xml` et `robots.txt`, balises Open Graph, URLs propres.
- Mention cohérente du nom, de l'adresse et du téléphone sur tous les supports (NAP).

### 2.1.5 Réseaux sociaux et contenu

| Canal | Usage | Rythme |
|---|---|---|
| Instagram | Avant/après, réels de pose en accéléré, coulisses, avis | 3 à 4 publications/semaine |
| TikTok | Contenus courts, conseils, mythes sur les cils | 2/semaine |
| Google Business Profile | Photos, offres, nouveautés | 1/semaine |
| Pinterest (option) | Inspirations de regards, renvoi vers le site | Programmé |

Le site intègre un lien Instagram et, en phase 2, un flux de photos **chargé seulement après consentement** (pour ne pas alourdir la page ni enfreindre le RGPD).

### 2.1.6 Offres et fidélisation

- **Première visite** : avantage de bienvenue (ex. remise sur le premier rendez-vous ou soin offert). À valider financièrement.
- **Retouches** : tarif dégressif si effectuées dans les 21 jours.
- **Forfaits** : pose + retouches, ou rehaussement + teinture sourcils.
- **Parrainage** : avantage pour la marraine et la filleule.
- **Carte cadeau** : vente en ligne en phase 3. Forte saisonnalité (fêtes de fin d'année, Saint-Valentin, fête des mères).
- **Calendrier marketing** : mariages (printemps-été), rentrée, fêtes de fin d'année.

### 2.1.7 Mesure et tableau de bord

| Indicateur | Outil | Cible à 3 mois |
|---|---|---|
| Visiteurs et provenance | Plausible ou Matomo (sans cookie) | Référence à établir |
| Taux de conversion visite → demande de RDV | Événements personnalisés | ≥ 4 % |
| Abandon par étape du tunnel | Événements `booking_step_*` | Abandon < 40 % entre étapes 1 et 5 |
| Appels et clics itinéraire depuis Google | Google Business Profile | Croissance mensuelle |
| Avis Google | Google Business Profile | ≥ 30 avis, note ≥ 4,7 |
| Taux de retour à 3 semaines | Agenda | ≥ 60 % |

Événements à émettre : `booking_start`, `booking_step_service`, `booking_step_date`, `booking_step_slot`, `booking_step_details`, `booking_submit`, `click_phone`, `click_directions`.

### 2.1.8 Contenus rédactionnels à produire

- Accroche hero (3 variantes à tester).
- Textes de chaque prestation : pour qui, déroulé, durée, tenue, entretien, prix.
- FAQ de 12 à 15 questions (douleur, allergie, lentilles, eau, mascara, durée, retouche, retrait).
- Page « Conseils après-soin ».
- Protocole d'hygiène en 5 points.
- Messages types : confirmation, rappel J-1, demande d'avis J+2, relance retouche J+18.
- Photos : portrait de la praticienne, lieu, détails gros plan, avant/après avec consentements.

## 2.2 Revue critique du Round 2

| Risque identifié | Gravité | Réponse retenue |
|---|---|---|
| Promesses de résultat excessives, ou allégations de santé | Haute | Parler de « soin esthétique ». Jamais de promesse de croissance des cils ou de guérison. Relecture par la praticienne. |
| Avis ou notes inventés pour le balisage | **Haute** | Le balisage `AggregateRating` n'est ajouté qu'avec de vrais avis vérifiables. Avis publiés avec accord. |
| Photos avant/après sans consentement | **Haute** | Formulaire de consentement signé. Aucune photo sans accord écrit. |
| Dépendance à Instagram | Moyenne | Le site et la fiche Google restent les piliers. Newsletter à ajouter en phase 3. |
| Offre de bienvenue qui dégrade la marge | Moyenne | Simuler la rentabilité avant de la publier. Offre limitée dans le temps. |
| Suivi d'audience non conforme | Moyenne | Outil sans cookie, ou consentement préalable. |

## 2.3 Décisions arrêtées — Round 2

1. Positionnement « précision et préservation des cils naturels », ton chaleureux et expert, vouvoiement.
2. Quatre personas retenus ; le message sourcils s'adresse aussi aux hommes.
3. SEO local en priorité : une page par prestation, schema.org, fiche Google Business Profile complète.
4. Parcours de conversion centré sur le bouton « Réserver » collant et la preuve sociale.
5. Mesure d'audience **sans cookie**, avec les 8 événements listés en 2.1.7.
6. Aucune promesse médicale. Aucun avis fictif. Aucune photo sans consentement écrit.

---

# 3. Planning et livrables

| Lot | Contenu | Durée indicative |
|---|---|---|
| Lot 0 | Cadrage : nom, logo, photos, textes, tarifs, horaires, mentions légales | 1 semaine |
| Lot 1 | Maquette et design system (variables, composants, typographie) | 1 semaine |
| Lot 2 | Pages statiques : accueil, prestations, tarifs, à propos, FAQ, contact | 2 semaines |
| Lot 3 | Tunnel de réservation Vue + V-Calendar, phase 1 | 1,5 semaine |
| Lot 4 | Galerie avant/après, SEO technique, accessibilité, performance | 1 semaine |
| Lot 5 | Recette, correctifs, mise en ligne, fiche Google | 1 semaine |
| Phase 2 | Backend de réservation, notifications, blog | À planifier |
| Phase 3 | Acompte, espace praticienne (Vue Cal), cartes cadeaux | À planifier |

**Livrables** : code source versionné (Git), site déployé, `README.md`, guide de mise à jour des tarifs, horaires et indisponibilités (édition des JSON), rapport Lighthouse.

# 4. Critères d'acceptation (recette)

- [ ] Lighthouse mobile conforme aux objectifs du 1.1.7 sur accueil, prestation et réservation
- [ ] Tunnel de réservation utilisable au clavier et au lecteur d'écran
- [ ] Aucun créneau proposé en dehors des horaires, sur un jour fermé ou chevauchant un RDV existant
- [ ] Calendrier en français, semaine commençant le lundi
- [ ] Le test de changement d'heure (dernier dimanche d'octobre et de mars) passe
- [ ] Affichage correct de 360 px à 1920 px
- [ ] Bandeau cookies conforme, mesure d'audience sans dépôt de cookie avant consentement
- [ ] Mentions légales, CGV et politique de confidentialité en ligne
- [ ] Données structurées valides (test Google Rich Results)
- [ ] Aucune photo de cliente sans consentement archivé

# 5. Informations à fournir par le client (bloquant pour le lot 0)

1. Nom du studio, logo éventuel, adresse, téléphone, e-mail, SIRET
2. Liste des prestations, durées et tarifs réels
3. Horaires d'ouverture, jours de fermeture, délais d'annulation
4. Photos professionnelles (praticienne, lieu, réalisations avec consentement)
5. Certifications et formations
6. Comptes Instagram, TikTok et fiche Google Business Profile
7. Préférence sur l'acompte et sur l'offre de première visite
