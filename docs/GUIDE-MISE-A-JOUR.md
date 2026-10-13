# Guide de mise à jour (tarifs, horaires, indisponibilités)

Tout se modifie dans le dossier `data/`, dans un éditeur de texte. Aucun autre fichier à toucher. Après modification, publier le site (voir `DEPLOIEMENT.md`).

Règles du format JSON : guillemets droits `"`, une virgule entre deux éléments, pas de virgule après le dernier. En cas de doute, coller le fichier dans un validateur JSON avant de publier.

## Horaires d'ouverture : `data/horaires.json`

Un jour fermé : `[]`. Plusieurs plages : `["09:30-12:30", "14:00-18:30"]`. Heures en `HH:mm`, heure de Paris.

## Fermetures et congés : `data/indisponibilites.json`

```json
{ "date": "2026-12-25", "motif": "Fermeture" }
{ "date": "2026-12-31", "debut": "14:00", "fin": "18:30", "motif": "Fermeture anticipée" }
```

Sans `debut` et `fin`, la journée entière est fermée. Les créneaux concernés disparaissent du tunnel.

## Rendez-vous confirmés : `data/reservations.json`

En phase 1, le site ne connaît pas vos rendez-vous. Après avoir **confirmé** une demande, ajoutez-la ici pour bloquer le créneau :

```json
{ "date": "2026-11-03", "debut": "10:00", "fin": "12:30" }
```

`fin` = fin du soin. Le tampon de 15 minutes s'ajoute automatiquement.

## Prestations réservables : `data/services.json`

Champs : `id` (unique, sans espace), `nom`, `categorie` (`extensions`, `rehaussement` ou `sourcils`), `duree_min` (minutes), `prix_a_partir_de` (nombre en euros, ou `null` si non affiché), `description`. La durée sert à calculer les créneaux : elle doit être réelle.

Le tableau de la page Tarifs est du texte dans `tools/pages/03-infos.mjs`, puis régénéré (`node tools/build-pages.mjs`) : prix et durées s'y modifient séparément.

## Règles de réservation : `data/reservation.json`

`tampon_min`, `delai_min_heures` (délai minimum avant un rendez-vous), `horizon_jours` (jusqu'où réserver), `pas_creneau_min`, `endpoint` (adresse du service qui reçoit les demandes).

## Coordonnées : `data/studio.json`

```json
{ "adresse": { "rue": "…", "code_postal": "…", "ville": "…" }, "telephone": "+33…", "telephone_affiche": "01 23 45 67 89", "email": "…" }
```

Ensuite : `node tools/build-pages.mjs` (met à jour pied de page, contact, données structurées).

## Passer en réel

Quand un fichier contient des données réelles, supprimer la ligne `"statut": "exemple"`. Le bandeau « créneaux d'exemple » disparaît. `node tools/verifier-mise-en-ligne.mjs --liste` donne ce qu'il reste à traiter.
