# Questionnaire client : informations nécessaires à la mise en ligne

Ce document regroupe tout ce dont le site a besoin pour être publié. Il remplace la lecture page par page des 136 marqueurs `[À COMPLÉTER]`, `[À REMPLACER]` et `[À CONFIRMER]` repérés dans 18 pages (`node tools/verifier-mise-en-ligne.mjs --liste`). Beaucoup se répètent (adresse, téléphone et e-mail apparaissent sur chaque page) : une seule réponse suffit.

Ce que vous nous fournissez, nous l'intégrons. Ce que vous ne pouvez pas encore donner, dites-le simplement : nous le laisserons masqué plutôt que d'inventer.

**Rappel de ce que nous n'inventons jamais** : adresse, numéro de téléphone, SIRET, certifications, avis de clientes, résultats ou promesses de croissance des cils.

## A. Identité et coordonnées (bloquant)

| # | Information | Apparaît sur |
|---|---|---|
| A1 | Nom du studio et logo | toutes les pages, mentions légales |
| A2 | Rue et code postal (la ville, Lyon, est déjà connue) | pied de page, contact, mentions légales, carte |
| A3 | Numéro de téléphone (et sa forme d'affichage) | toutes les pages, contact |
| A4 | Adresse e-mail de contact du studio | toutes les pages, politique de confidentialité |
| A5 | Adresse e-mail qui reçoit les demandes de rendez-vous | notifications de réservation |
| A6 | Forme juridique et numéro SIRET (14 chiffres) | mentions légales |
| A7 | Assureur et numéro de contrat | mentions légales |
| A8 | Médiateur de la consommation choisi | conditions de vente et d'annulation |

## B. Horaires

| # | Information | Apparaît sur |
|---|---|---|
| B1 | Horaires d'ouverture par jour | accueil, contact, calendrier de réservation |
| B2 | Jours de fermeture et congés connus | accueil, calendrier |
| B3 | Délai de réservation : le site impose aujourd'hui 12 h minimum, 15 min de tampon entre deux rendez-vous, 60 jours d'horizon. Cela vous convient-il ? | réservation |

## C. Prestations, durées et tarifs

La grille actuelle est un **exemple** : elle sera remplacée telle que vous la donnez.

| # | Information | Apparaît sur |
|---|---|---|
| C1 | Liste exacte de vos prestations (nom, courte description) | tarifs, pages prestations, réservation |
| C2 | Pour chacune : durée en minutes et prix « à partir de » | tarifs, pages prestations |
| C3 | Extensions : effets réellement proposés (cil à cil, volume russe, autres), courbures et longueurs | page extensions, blog |
| C4 | Proposez-vous le rehaussement avec teinture ? | page rehaussement, blog |
| C5 | Épilation des sourcils : technique utilisée (pince, fil, cire) | page épilation |
| C6 | Durée de tenue habituelle et rythme de retouche conseillés, pour chaque prestation | pages prestations, FAQ, blog |
| C7 | Microblading ou micro-pigmentation : proposés ? (à ne mentionner que si vous êtes formée et déclarée) | aucune page tant que la réponse n'est pas oui |

## D. Après le soin

| # | Information | Apparaît sur |
|---|---|---|
| D1 | Délai exact à respecter avant de mouiller les cils ou les sourcils | conseils après-soin, FAQ |
| D2 | Produit ou type de produit d'entretien que vous conseillez | conseils après-soin |
| D3 | Rythme de retouche ou de nouveau soin conseillé | conseils après-soin, FAQ, e-mail de relance |

## E. Hygiène et sécurité

| # | Information | Apparaît sur |
|---|---|---|
| E1 | Matériel stérilisé ou à usage unique : que faites-vous exactement ? | à propos |
| E2 | Désinfection du poste entre chaque cliente : confirmez-vous ? | à propos |
| E3 | Questionnaire de première visite (allergie à la colle, traitement oculaire, grossesse) : le validez-vous tel quel ? | réservation, à propos |

## F. Présentation et parcours

| # | Information | Apparaît sur |
|---|---|---|
| F1 | Texte de présentation du studio (quelques lignes, dans vos mots) | accueil, à propos |
| F2 | Parcours et années d'expérience | à propos |
| F3 | Certifications et formations obtenues (**uniquement si vous pouvez les justifier**) | à propos |

## G. Photos et avis

| # | Information | Apparaît sur |
|---|---|---|
| G1 | Photos du studio et de la praticienne | accueil, à propos |
| G2 | Photos de réalisations, avec **consentement écrit** de chaque cliente | galerie, pages prestations |
| G3 | Avis de clientes réelles, avec leur accord | accueil |
| G4 | Lien d'avis de votre fiche Google (une fois la fiche créée) | e-mail de demande d'avis |

Sans photos de vos réalisations, la galerie reste masquée ou garde des illustrations explicitement étiquetées.

## H. Conditions, paiement et données

| # | Information | Apparaît sur |
|---|---|---|
| H1 | Moyens de paiement acceptés | CGV, FAQ |
| H2 | Conditions d'annulation : délai gratuit, ce qui se passe au-delà et en cas de retard | CGV, réservation |
| H3 | Acompte ou offre de première visite : oui ou non ? | réservation, tarifs |
| H4 | Durée de conservation des données des clientes | politique de confidentialité |
| H5 | Les textes juridiques (mentions légales, CGV, confidentialité) seront à **faire relire par un professionnel** avant publication | pages légales |

## I. Présence en ligne et décisions techniques

| # | Information | Remarque |
|---|---|---|
| I1 | Comptes Instagram et TikTok, fiche Google Business Profile | liens du pied de page ; fiche à créer avec `docs/GOOGLE-BUSINESS-PROFILE.md` |
| I2 | Outil de mesure d'audience sans cookie (Plausible ou Matomo) | facultatif |
| I3 | Le studio utilise-t-il déjà un système de réservation à remplacer ou à garder ? | décision de la phase 2 |
| I4 | Adresse e-mail et compte d'envoi pour les messages automatiques (confirmation, rappel) | fournisseur à choisir |

## Ce que nous faisons à la réception

1. Nous renseignons `frontend/data/studio.json`, `services.json` et `horaires.json`, puis nous regénérons les pages.
2. Nous supprimons chaque marqueur renseigné et relançons `node tools/verifier-mise-en-ligne.mjs` jusqu'à zéro marqueur.
3. Nous vous envoyons le site pour relecture : **rien n'est publié sans votre validation** des textes et des tarifs.
4. Nous déployons selon `docs/DEPLOIEMENT.md`, puis nous vérifions les données structurées.

## Ordre de priorité

1. **Bloquant** : A, B, C1 à C2, H5. Sans cela, aucune mise en ligne.
2. **Avant l'ouverture des réservations** : C3 à C6, D, E, H1 à H2.
3. **Pour le confort et le référencement** : F, G, I.
