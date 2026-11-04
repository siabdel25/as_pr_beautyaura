// Calcul de créneaux rejoué sur les fausses données de démo (demo/generate_fake_data.py).
// Lancer : node --test tests/   (nécessite python3 ; aucune autre dépendance)
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ajouterJours, jourSemaine, hhmmEnMin, parisVersInstant, creneauxDuJour, datesDisponibles
} from '../assets/js/app/slots.js';

const racine = fileURLToPath(new URL('..', import.meta.url));
const lire = (chemin) => JSON.parse(readFileSync(chemin, 'utf8'));
const CONFIG = lire(join(racine, 'data', 'reservation.json'));

// Deux départs encadrant un changement d'heure : fin octobre 2026 et fin mars 2027 (dans l'horizon de 60 jours)
const SCENARIOS = [
  { depart: '2026-10-01', changement: '2026-10-25' },
  { depart: '2027-03-01', changement: '2027-03-28' }
];

function generer(depart) {
  const dossier = mkdtempSync(join(tmpdir(), 'lb-demo-'));
  try {
    execFileSync('python3', ['-I', join(racine, 'demo', 'generate_fake_data.py'), '--date', depart, '--out', dossier], { stdio: 'pipe' });
    const f = (nom) => lire(join(dossier, nom));
    return {
      services: f('services.json').services,
      horaires: f('horaires.json').hebdo,
      indisponibilites: f('indisponibilites.json').indisponibilites,
      reservations: f('reservations.json').reservations_existantes
    };
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

for (const { depart, changement } of SCENARIOS) {
  const demo = generer(depart);
  // 08:00 à Paris le jour de départ : le délai minimum de 12 h joue sur le premier jour
  const maintenantMs = parisVersInstant(depart, '08:00');
  const params = (date, dureeMin) => ({
    date, dureeMin, config: CONFIG, horaires: demo.horaires,
    indisponibilites: demo.indisponibilites, reservations: demo.reservations, maintenantMs
  });
  const jours = Array.from({ length: CONFIG.horizon_jours + 1 }, (_, i) => ajouterJours(depart, i));
  const durees = [...new Set(demo.services.map((s) => s.duree_min))];

  test(`démo ${depart} : le jeu de données couvre le changement d'heure du ${changement}`, () => {
    assert.ok(jours.includes(changement));
    assert.ok(demo.reservations.some((r) => r.date >= ajouterJours(changement, -3) && r.date <= ajouterJours(changement, 3)),
      'au moins une fausse réservation autour du changement d\'heure');
  });

  test(`démo ${depart} : aucun créneau ne chevauche réservation (tampon), indisponibilité ou fermeture`, () => {
    for (const date of jours) {
      for (const duree of durees) {
        for (const debutHhmm of creneauxDuJour(params(date, duree))) {
          const debut = hhmmEnMin(debutHhmm);
          const fin = debut + duree;
          const plages = (demo.horaires[jourSemaine(date)] ?? []).map((p) => p.split('-').map(hhmmEnMin));
          assert.ok(plages.some(([o, f]) => o <= debut && fin <= f), `${date} ${debutHhmm} hors horaires`);
          for (const r of demo.reservations.filter((x) => x.date === date)) {
            const t = CONFIG.tampon_min;
            assert.ok(!(debut < hhmmEnMin(r.fin) + t && fin + t > hhmmEnMin(r.debut)), `${date} ${debutHhmm} chevauche ${r.debut}-${r.fin}`);
          }
          for (const i of demo.indisponibilites.filter((x) => x.date === date)) {
            assert.ok(i.debut, `${date} proposé un jour de fermeture`);
            assert.ok(!(debut < hhmmEnMin(i.fin) && fin > hhmmEnMin(i.debut)), `${date} ${debutHhmm} chevauche l'indisponibilité`);
          }
        }
      }
    }
  });

  test(`démo ${depart} : le début d'une fausse réservation n'est plus proposé`, () => {
    for (const r of demo.reservations) {
      const duree = hhmmEnMin(r.fin) - hhmmEnMin(r.debut);
      assert.ok(!creneauxDuJour(params(r.date, duree)).includes(r.debut), `${r.date} ${r.debut} encore proposé`);
    }
  });

  test(`démo ${depart} : jours fermés, délai de 12 h et horizon de ${CONFIG.horizon_jours} jours`, () => {
    const premier = creneauxDuJour(params(depart, Math.min(...durees)));
    const limite = maintenantMs + CONFIG.delai_min_heures * 3600000;
    for (const h of premier) assert.ok(parisVersInstant(depart, h) >= limite, `${depart} ${h} avant le délai minimum`);
    for (const date of jours.filter((d) => (demo.horaires[jourSemaine(d)] ?? []).length === 0)) {
      assert.deepEqual(creneauxDuJour(params(date, Math.min(...durees))), [], `${date} fermé`);
    }
    assert.deepEqual(creneauxDuJour(params(ajouterJours(depart, CONFIG.horizon_jours + 1), Math.min(...durees))), []);
    assert.deepEqual(creneauxDuJour(params(ajouterJours(depart, -1), Math.min(...durees))), []);
  });

  test(`démo ${depart} : la page de réservation a des dates disponibles et les jours d'indisponibilité totale sont exclus`, () => {
    const dispo = datesDisponibles({
      dureeMin: Math.min(...durees), config: CONFIG, horaires: demo.horaires,
      indisponibilites: demo.indisponibilites, reservations: demo.reservations, maintenantMs
    });
    assert.ok(dispo.length > 10, 'assez de jours réservables pour une démo');
    for (const i of demo.indisponibilites.filter((x) => !x.debut)) assert.ok(!dispo.includes(i.date), `${i.date} fermé`);
  });
}
