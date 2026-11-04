// Tests du calcul de créneaux. Lancer : node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  jourNum, isoDepuisJourNum, ajouterJours, jourSemaine,
  parisVersInstant, parisMaintenant, creneauxDuJour, datesDisponibles
} from '../assets/js/app/slots.js';

const CONFIG = { fuseau: 'Europe/Paris', tampon_min: 15, delai_min_heures: 12, horizon_jours: 60, pas_creneau_min: 30 };
const TOUS_LES_JOURS = ['09:30-18:30'];
const HORAIRES = { lun: TOUS_LES_JOURS, mar: TOUS_LES_JOURS, mer: TOUS_LES_JOURS, jeu: TOUS_LES_JOURS, ven: TOUS_LES_JOURS, sam: TOUS_LES_JOURS, dim: TOUS_LES_JOURS };
const utc = (s) => Date.parse(s);
// Lundi 2026-06-01 à 06:00 UTC = 08:00 à Paris (heure d'été) : loin de tout changement d'heure
const MAINTENANT = utc('2026-06-01T06:00:00Z');
const base = (extra = {}) => ({ config: CONFIG, horaires: HORAIRES, maintenantMs: MAINTENANT, ...extra });

test('arithmétique de jours : aller-retour et jours de semaine', () => {
  assert.equal(jourNum('1970-01-01'), 0);
  assert.equal(isoDepuisJourNum(jourNum('2026-10-13')), '2026-10-13');
  assert.equal(jourSemaine('2026-10-13'), 'mar');
  assert.equal(jourSemaine('2026-10-25'), 'dim');
  assert.equal(jourSemaine('2024-02-29'), 'jeu');
});

test('arithmétique de jours : pas de décalage aux changements d\'heure', () => {
  assert.equal(ajouterJours('2026-10-24', 1), '2026-10-25');
  assert.equal(ajouterJours('2026-10-24', 2), '2026-10-26');
  assert.equal(ajouterJours('2026-03-28', 1), '2026-03-29');
  assert.equal(ajouterJours('2026-03-28', 2), '2026-03-30');
  assert.equal(ajouterJours('2026-12-31', 1), '2027-01-01');
  assert.equal(ajouterJours('2026-03-01', 60), '2026-04-30');
  assert.equal(jourNum('2026-10-26') - jourNum('2026-10-24'), 2);
});

test('Paris vers instant : heure d\'été, heure d\'hiver, trou et doublon', () => {
  assert.equal(parisVersInstant('2026-07-01', '10:00'), utc('2026-07-01T08:00:00Z'));
  assert.equal(parisVersInstant('2026-01-15', '10:00'), utc('2026-01-15T09:00:00Z'));
  // 2026-03-29 : 02:00 devient 03:00. 02:30 n'existe pas, on prend l'heure qui suit.
  assert.equal(parisVersInstant('2026-03-29', '01:30'), utc('2026-03-29T00:30:00Z'));
  assert.equal(parisVersInstant('2026-03-29', '02:30'), utc('2026-03-29T01:30:00Z'));
  assert.equal(parisVersInstant('2026-03-29', '03:30'), utc('2026-03-29T01:30:00Z'));
  // 2026-10-25 : 03:00 redevient 02:00. 02:30 existe deux fois, on prend la première.
  assert.equal(parisVersInstant('2026-10-25', '02:30'), utc('2026-10-25T00:30:00Z'));
  assert.equal(parisVersInstant('2026-10-25', '09:30'), utc('2026-10-25T08:30:00Z'));
});

test('Paris maintenant : date et heure locales', () => {
  assert.deepEqual(parisMaintenant(utc('2026-10-24T22:30:00Z')), { date: '2026-10-25', heure: '00:30' });
  assert.deepEqual(parisMaintenant(utc('2026-10-25T23:30:00Z')), { date: '2026-10-26', heure: '00:30' });
  assert.deepEqual(parisMaintenant(utc('2026-03-28T23:30:00Z')), { date: '2026-03-29', heure: '00:30' });
});

test('durée : un créneau doit finir avant la fermeture', () => {
  const s = creneauxDuJour(base({ date: '2026-06-03', dureeMin: 150 }));
  assert.equal(s[0], '09:30');
  assert.equal(s.at(-1), '16:00'); // 16:00 + 2 h 30 = 18:30
  assert.ok(!s.includes('16:30'));
});

test('durée : une durée plus longue que la journée ne donne aucun créneau', () => {
  assert.deepEqual(creneauxDuJour(base({ date: '2026-06-03', dureeMin: 600 })), []);
});

test('tampon : 15 min avant et après une réservation existante', () => {
  const reservations = [{ date: '2026-06-03', debut: '12:00', fin: '13:00' }];
  const s = creneauxDuJour(base({ date: '2026-06-03', dureeMin: 60, reservations }));
  assert.ok(s.includes('10:30')); // finit 11:30, tampon jusqu'à 11:45 : libre
  assert.ok(!s.includes('11:00')); // finirait 12:00, collé à la réservation : tampon violé
  assert.ok(!s.includes('12:30'));
  assert.ok(!s.includes('13:00')); // doit attendre 13:15
  assert.ok(s.includes('13:30'));
});

test('tampon : jamais de chevauchement avec une réservation', () => {
  const reservations = [{ date: '2026-06-03', debut: '12:00', fin: '14:30' }];
  const s = creneauxDuJour(base({ date: '2026-06-03', dureeMin: 150, reservations }));
  for (const h of s) {
    const debut = Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
    const fin = debut + 150;
    assert.ok(fin + 15 <= 12 * 60 || debut >= 14 * 60 + 30 + 15, `chevauchement à ${h}`);
  }
});

test('indisponibilité : journée entière et plage horaire', () => {
  const jour = [{ date: '2026-06-03', motif: 'Fermeture' }];
  assert.deepEqual(creneauxDuJour(base({ date: '2026-06-03', dureeMin: 60, indisponibilites: jour })), []);
  const plage = [{ date: '2026-06-03', debut: '14:00', fin: '16:00' }];
  const s = creneauxDuJour(base({ date: '2026-06-03', dureeMin: 60, indisponibilites: plage }));
  assert.ok(s.includes('13:00'));
  assert.ok(!s.includes('13:30'));
  assert.ok(!s.includes('15:30'));
  assert.ok(s.includes('16:00'));
});

test('fermeture : jour sans horaires', () => {
  const horaires = { ...HORAIRES, mer: [] };
  assert.deepEqual(creneauxDuJour(base({ date: '2026-06-03', dureeMin: 60, horaires })), []);
});

test('plusieurs plages dans la journée (pause déjeuner)', () => {
  const horaires = { ...HORAIRES, mer: ['09:30-12:30', '14:00-18:00'] };
  const s = creneauxDuJour(base({ date: '2026-06-03', dureeMin: 60, horaires }));
  assert.ok(s.includes('11:30'));
  assert.ok(!s.includes('12:00'));
  assert.ok(s.includes('14:00'));
});

test('délai minimum de 12 h', () => {
  // Maintenant = lundi 08:00 Paris. Limite = 20:00 le lundi : rien le lundi.
  assert.deepEqual(creneauxDuJour(base({ date: '2026-06-01', dureeMin: 60 })), []);
  // Maintenant = lundi 20:00 Paris. Limite = mardi 08:00 : tout le mardi est possible.
  const soir = utc('2026-06-01T18:00:00Z');
  assert.equal(creneauxDuJour(base({ date: '2026-06-02', dureeMin: 60, maintenantMs: soir }))[0], '09:30');
  // Maintenant = lundi 23:00 Paris. Limite = mardi 11:00 : premier créneau 11:00.
  const tard = utc('2026-06-01T21:00:00Z');
  assert.equal(creneauxDuJour(base({ date: '2026-06-02', dureeMin: 60, maintenantMs: tard }))[0], '11:00');
});

test('délai de 12 h à travers le passage à l\'heure d\'hiver (25 octobre)', () => {
  // 24/10 22:00 à Paris (20:00Z). 12 h réelles plus tard : 25/10 08:00Z = 09:00 à Paris (heure d'hiver).
  // Un calcul sur l'horloge murale donnerait 10:00 et bloquerait à tort le créneau de 09:30.
  const maintenantMs = utc('2026-10-24T20:00:00Z');
  const s = creneauxDuJour(base({ date: '2026-10-25', dureeMin: 60, maintenantMs }));
  assert.equal(s[0], '09:30');
});

test('délai de 12 h à travers le passage à l\'heure d\'été (29 mars)', () => {
  // 28/03 21:00 à Paris (20:00Z). 12 h réelles plus tard : 29/03 08:00Z = 10:00 à Paris (heure d'été).
  // Un calcul sur l'horloge murale donnerait 09:00 et autoriserait à tort le créneau de 09:30.
  const maintenantMs = utc('2026-03-28T20:00:00Z');
  const s = creneauxDuJour(base({ date: '2026-03-29', dureeMin: 60, maintenantMs }));
  assert.equal(s[0], '10:00');
});

test('horizon de 60 jours : dernier jour inclus, suivant exclu', () => {
  assert.ok(creneauxDuJour(base({ date: '2026-07-31', dureeMin: 60 })).length > 0); // 2026-06-01 + 60
  assert.deepEqual(creneauxDuJour(base({ date: '2026-08-01', dureeMin: 60 })), []);
});

test('horizon de 60 jours à travers le changement d\'heure d\'octobre', () => {
  const maintenantMs = utc('2026-09-01T08:00:00Z'); // 10:00 à Paris
  assert.equal(ajouterJours('2026-09-01', 60), '2026-10-31');
  assert.ok(creneauxDuJour(base({ date: '2026-10-31', dureeMin: 60, maintenantMs })).length > 0);
  assert.deepEqual(creneauxDuJour(base({ date: '2026-11-01', dureeMin: 60, maintenantMs })), []);
});

test('horizon de 60 jours à travers le changement d\'heure de mars', () => {
  const maintenantMs = utc('2027-02-01T09:00:00Z');
  assert.equal(ajouterJours('2027-02-01', 60), '2027-04-02');
  assert.ok(creneauxDuJour(base({ date: '2027-04-02', dureeMin: 60, maintenantMs })).length > 0);
  assert.deepEqual(creneauxDuJour(base({ date: '2027-04-03', dureeMin: 60, maintenantMs })), []);
});

test('les jours passés n\'ont aucun créneau', () => {
  assert.deepEqual(creneauxDuJour(base({ date: '2026-05-30', dureeMin: 60 })), []);
});

test('le jour de la veille au soir : date de Paris, pas date UTC', () => {
  // 31/05 23:30Z = 01:30 le 1er juin à Paris : « aujourd'hui » est le 1er juin.
  const maintenantMs = utc('2026-05-31T23:30:00Z');
  assert.deepEqual(creneauxDuJour(base({ date: '2026-05-31', dureeMin: 60, maintenantMs })), []);
  assert.ok(creneauxDuJour(base({ date: '2026-06-02', dureeMin: 60, maintenantMs })).length > 0);
});

test('datesDisponibles : liste les jours ouverts dans l\'horizon', () => {
  const horaires = { ...HORAIRES, dim: [], lun: [] };
  const dates = datesDisponibles(base({ dureeMin: 60, horaires }));
  assert.ok(!dates.includes('2026-06-07')); // dimanche
  assert.ok(!dates.includes('2026-06-08')); // lundi
  assert.ok(dates.includes('2026-06-09'));
  assert.ok(dates.at(-1) <= '2026-07-31');
});
