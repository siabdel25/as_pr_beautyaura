"""Tests des fausses données de démo. Lancer : python3 -m unittest discover -s demo/tests -v

Aucune dépendance : bibliothèque standard uniquement. Les tests décrivent le contrat du
générateur `demo/generate_fake_data.py` (fonction `generer`) avant son écriture.
"""
import json
import re
import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RACINE / "demo"))

import generate_fake_data as gen  # noqa: E402

AUJOURDHUI = date(2026, 10, 1)
JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
# Règles métier : la configuration réelle du site fait foi, pas de valeur recopiée ici
CONFIG = json.loads((RACINE / "data" / "reservation.json").read_text(encoding="utf-8"))
CATEGORIES = {s["categorie"] for s in json.loads((RACINE / "data" / "services.json").read_text(encoding="utf-8"))["services"]}


def minutes(hhmm):
    return int(hhmm[:2]) * 60 + int(hhmm[3:5])


def plages(horaires, jour_iso):
    nom = JOURS[date.fromisoformat(jour_iso).weekday()]
    return [tuple(minutes(h) for h in p.split("-")) for p in horaires["hebdo"][nom]]


def tout_le_texte(valeur):
    if isinstance(valeur, str):
        yield valeur
    elif isinstance(valeur, dict):
        for v in valeur.values():
            yield from tout_le_texte(v)
    elif isinstance(valeur, list):
        for v in valeur:
            yield from tout_le_texte(v)


class DonneesDeDemo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = gen.generer(graine=2026, aujourdhui=AUJOURDHUI)
        cls.services = cls.d["services.json"]["services"]
        cls.horaires = cls.d["horaires.json"]
        cls.indispos = cls.d["indisponibilites.json"]["indisponibilites"]
        cls.resas = cls.d["reservations.json"]["reservations_existantes"]
        cls.par_id = {s["id"]: s for s in cls.services}

    def test_fichiers_attendus_et_marquage_exemple(self):
        self.assertEqual(
            set(self.d), {"services.json", "horaires.json", "indisponibilites.json", "reservations.json"})
        for nom, contenu in self.d.items():
            self.assertEqual(contenu["statut"], "exemple", nom)
            json.dumps(contenu, ensure_ascii=False)  # doit être sérialisable

    def test_services(self):
        self.assertGreaterEqual(len(self.services), 5)
        ids = [s["id"] for s in self.services]
        self.assertEqual(len(ids), len(set(ids)), "identifiants uniques")
        for s in self.services:
            self.assertRegex(s["id"], r"^[a-z0-9]+(-[a-z0-9]+)*$")
            self.assertIn(s["categorie"], CATEGORIES)
            self.assertGreater(s["duree_min"], 0)
            self.assertEqual(s["duree_min"] % CONFIG["pas_creneau_min"], 0, s["id"])
            self.assertTrue(s["nom"] and s["description"])
            prix = s.get("prix_a_partir_de")
            self.assertTrue(prix is None or (isinstance(prix, (int, float)) and prix > 0), s["id"])

    def test_horaires(self):
        self.assertEqual(set(self.horaires["hebdo"]), set(JOURS))
        ouverts = 0
        for jour, liste in self.horaires["hebdo"].items():
            for p in liste:
                self.assertRegex(p, r"^\d\d:\d\d-\d\d:\d\d$", jour)
                debut, fin = (minutes(h) for h in p.split("-"))
                self.assertLess(debut, fin)
            ouverts += bool(liste)
        self.assertTrue(0 < ouverts < 7, "au moins un jour ouvert et un jour fermé")

    def test_indisponibilites(self):
        jours_entiers = [i for i in self.indispos if "debut" not in i]
        plages_ = [i for i in self.indispos if "debut" in i]
        self.assertTrue(jours_entiers and plages_, "un cas de chaque type")
        for i in self.indispos:
            d = date.fromisoformat(i["date"])
            self.assertTrue(AUJOURDHUI <= d <= AUJOURDHUI + timedelta(days=CONFIG["horizon_jours"]), i)
            self.assertTrue(i["motif"])
        for i in plages_:
            self.assertLess(minutes(i["debut"]), minutes(i["fin"]))

    def test_reservations_champs_et_statut(self):
        self.assertGreaterEqual(len(self.resas), 10)
        for r in self.resas:
            date.fromisoformat(r["date"])
            self.assertRegex(r["debut"], r"^\d\d:\d\d$")
            self.assertRegex(r["fin"], r"^\d\d:\d\d$")
            # Phase 1 : jamais « confirmé » sans validation réelle de la praticienne
            self.assertEqual(r["statut"], "a_confirmer")
            self.assertTrue(r["service_ids"])
            for sid in r["service_ids"]:
                self.assertIn(sid, self.par_id)

    def test_reservations_dans_l_horizon(self):
        for r in self.resas:
            d = date.fromisoformat(r["date"])
            self.assertTrue(AUJOURDHUI <= d <= AUJOURDHUI + timedelta(days=CONFIG["horizon_jours"]), r)

    def test_duree_egale_a_la_somme_des_services(self):
        for r in self.resas:
            attendu = sum(self.par_id[s]["duree_min"] for s in r["service_ids"])
            self.assertEqual(minutes(r["fin"]) - minutes(r["debut"]), attendu, r)

    def test_reservations_dans_les_horaires_d_ouverture(self):
        for r in self.resas:
            debut, fin = minutes(r["debut"]), minutes(r["fin"])
            self.assertTrue(any(o <= debut and fin <= f for o, f in plages(self.horaires, r["date"])), r)

    def test_reservations_hors_indisponibilites(self):
        for r in self.resas:
            for i in self.indispos:
                if i["date"] != r["date"]:
                    continue
                if "debut" not in i:
                    self.fail(f"réservation un jour de fermeture : {r}")
                chevauche = minutes(r["debut"]) < minutes(i["fin"]) and minutes(r["fin"]) > minutes(i["debut"])
                self.assertFalse(chevauche, f"{r} chevauche {i}")

    def test_pas_de_chevauchement_ni_sans_tampon(self):
        tampon = CONFIG["tampon_min"]
        par_jour = {}
        for r in self.resas:
            par_jour.setdefault(r["date"], []).append((minutes(r["debut"]), minutes(r["fin"])))
        for jour, liste in par_jour.items():
            liste.sort()
            for (_, fin_a), (debut_b, _) in zip(liste, liste[1:]):
                self.assertGreaterEqual(debut_b - fin_a, tampon, f"{jour} : tampon de {tampon} min non respecté")

    def test_le_generateur_est_reproductible(self):
        self.assertEqual(self.d, gen.generer(graine=2026, aujourdhui=AUJOURDHUI))
        autre = gen.generer(graine=7, aujourdhui=AUJOURDHUI)
        self.assertNotEqual(self.d["reservations.json"], autre["reservations.json"])

    def test_les_dates_suivent_aujourdhui(self):
        plus_tard = gen.generer(graine=2026, aujourdhui=AUJOURDHUI + timedelta(days=30))
        premiere = min(r["date"] for r in plus_tard["reservations.json"]["reservations_existantes"])
        self.assertGreaterEqual(premiere, (AUJOURDHUI + timedelta(days=30)).isoformat())

    def test_aucune_donnee_inventee_ni_personnelle(self):
        textes = list(tout_le_texte(self.d))
        for t in textes:
            self.assertNotRegex(t, r"(?<!\d)0[1-9]([ .]?\d{2}){4}(?!\d)", f"numéro de téléphone : {t}")
            self.assertNotRegex(t, r"\b\d{14}\b", f"SIRET : {t}")
            self.assertNotRegex(t.lower(), r"confirm[ée]e?s?\b(?<!à confirmer)", f"« confirmé » interdit : {t}")
        for r in self.resas:
            client = r["client"]
            self.assertTrue(client["email"].endswith("@example.test"), client)
            self.assertTrue(client["nom"].startswith("Cliente démo"), client)
        self.assertFalse(any(re.search(r"\b(avis|siret)\b", t, re.I) for t in textes))


if __name__ == "__main__":
    unittest.main()
