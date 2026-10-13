#!/usr/bin/env python3
"""Génère de fausses données de démo (services, horaires, indisponibilités, réservations).

Bibliothèque standard uniquement. Les services et horaires viennent de data/ (source de vérité),
les réservations et indisponibilités sont fictives et décalées à partir d'aujourd'hui.

Usage : python3 demo/generate_fake_data.py [--date AAAA-MM-JJ] [--seed N] [--source DIR] [--out DIR]
"""
import argparse
import json
import random
from datetime import date, timedelta
from pathlib import Path

ICI = Path(__file__).resolve().parent
JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]


def minutes(hhmm):
    return int(hhmm[:2]) * 60 + int(hhmm[3:5])


def hhmm(m):
    return f"{m // 60:02d}:{m % 60:02d}"


def dernier_dimanche(annee, mois):
    d = date(annee + (mois == 12), mois % 12 + 1, 1) - timedelta(days=1)
    return d - timedelta(days=(d.weekday() + 1) % 7)


def proche_changement_heure(jour):
    # Les créneaux autour de l'heure d'été et d'hiver sont le cas à risque : on y force des réservations
    return any(abs((jour - dernier_dimanche(jour.year, m)).days) <= 3 for m in (3, 10))


def plages(horaires, jour):
    return [tuple(minutes(h) for h in p.split("-")) for p in horaires["hebdo"][JOURS[jour.weekday()]]]


def generer(graine=2026, aujourdhui=None, source=None):
    aujourdhui = aujourdhui or date.today()
    source = Path(source) if source else ICI.parent / "data"
    hasard = random.Random(graine)
    config = json.loads((source / "reservation.json").read_text(encoding="utf-8"))
    pas, tampon, horizon = config["pas_creneau_min"], config["tampon_min"], config["horizon_jours"]
    horaires = json.loads((source / "horaires.json").read_text(encoding="utf-8"))
    services = json.loads((source / "services.json").read_text(encoding="utf-8"))
    for s in services["services"]:
        # Prix fictifs de démonstration, jamais ceux du studio
        s["prix_a_partir_de"] = 20 + 5 * (s["duree_min"] // 15)
    horaires["statut"] = services["statut"] = "exemple"
    par_id = {s["id"]: s for s in services["services"]}

    jours = [aujourdhui + timedelta(days=i) for i in range(horizon + 1)]
    ouverts = [j for j in jours if plages(horaires, j)]

    # Une fermeture d'une journée et une fermeture anticipée, sur des jours ouverts
    entier = ouverts[len(ouverts) // 3]
    partiel = ouverts[len(ouverts) // 2]
    fin_partiel = plages(horaires, partiel)[-1][1]
    indispos = [
        {"date": entier.isoformat(), "motif": "Fermeture"},
        {"date": partiel.isoformat(), "debut": hhmm(fin_partiel - 4 * 60), "fin": hhmm(fin_partiel), "motif": "Fermeture anticipée"},
    ]
    bloque = {entier: [(0, 24 * 60)], partiel: [(minutes(indispos[1]["debut"]), fin_partiel)]}

    reservations = []
    for jour in ouverts:
        if jour == entier or not (proche_changement_heure(jour) or hasard.random() < 0.55):
            continue
        pris = list(bloque.get(jour, []))
        for _ in range(hasard.choice([1, 1, 2])):
            ids = hasard.sample(sorted(par_id), k=hasard.choice([1, 1, 2]))
            duree = sum(par_id[i]["duree_min"] for i in ids)
            options = [
                d for o, f in plages(horaires, jour) for d in range(o, f - duree + 1, pas)
                if all(d + duree + tampon <= b or d >= f2 + tampon for b, f2 in pris)
            ]
            if not options:
                continue
            debut = hasard.choice(options)
            pris.append((debut, debut + duree))
            reservations.append({"date": jour.isoformat(), "debut": hhmm(debut), "fin": hhmm(debut + duree),
                                 "statut": "a_confirmer", "service_ids": ids})
    reservations.sort(key=lambda r: (r["date"], r["debut"]))
    for n, r in enumerate(reservations, 1):
        r["client"] = {"nom": f"Cliente démo {n:02d}", "email": f"cliente-{n:02d}@example.test"}

    return {
        "services.json": services,
        "horaires.json": horaires,
        "indisponibilites.json": {"statut": "exemple", "indisponibilites": indispos},
        "reservations.json": {"statut": "exemple", "reservations_existantes": reservations},
    }


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--date", type=date.fromisoformat, default=None, help="jour de départ (défaut : aujourd'hui)")
    p.add_argument("--seed", type=int, default=2026)
    p.add_argument("--source", default=None, help="dossier data/ de référence")
    p.add_argument("--out", default=str(ICI / "data"))
    a = p.parse_args()
    sortie = Path(a.out)
    sortie.mkdir(parents=True, exist_ok=True)
    for nom, contenu in generer(a.seed, a.date, a.source).items():
        (sortie / nom).write_text(json.dumps(contenu, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Données de démo écrites dans {sortie}")


if __name__ == "__main__":
    main()
