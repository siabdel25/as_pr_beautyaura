import test from 'node:test';
import assert from 'node:assert/strict';
import { validerClient, telephoneValide, reponsesARisque } from '../assets/js/app/validation.js';
import { genererIcs } from '../assets/js/app/ics.js';
import { envoyerDemande, EnvoiNonConfigure } from '../assets/js/app/submit.js';
import { totalSelection, formaterDuree } from '../assets/js/app/slots.js';

const VALIDE = {
  prenom: 'Camille', nom: 'Test', telephone: '06 12 34 56 78', email: 'camille@example.com',
  premiereVisite: 'non', questionnaire: {}, consentementRgpd: true, acceptationCgv: true
};

test('formulaire valide : aucune erreur', () => assert.deepEqual(validerClient(VALIDE), {}));

test('champs obligatoires manquants', () => {
  const e = validerClient({ questionnaire: {} });
  for (const k of ['prenom', 'nom', 'telephone', 'email', 'premiereVisite', 'consentementRgpd', 'acceptationCgv']) assert.ok(e[k], k);
});

test('téléphone français', () => {
  assert.ok(telephoneValide('0612345678'));
  assert.ok(telephoneValide('06 12 34 56 78'));
  assert.ok(telephoneValide('+33 6 12 34 56 78'));
  assert.ok(!telephoneValide('12345'));
  assert.ok(!telephoneValide('0012345678'));
});

test('e-mail invalide', () => assert.ok(validerClient({ ...VALIDE, email: 'camille@' }).email));

test('première visite : le questionnaire devient obligatoire', () => {
  const e = validerClient({ ...VALIDE, premiereVisite: 'oui' });
  assert.ok(e.allergie_colle && e.traitement_oculaire && e.grossesse);
});

test('réponse à risque : message de contact (allergie, traitement oculaire, grossesse)', () => {
  const c = { ...VALIDE, premiereVisite: 'oui', questionnaire: { allergie_colle: 'oui', traitement_oculaire: 'non', grossesse: 'oui' } };
  assert.deepEqual(reponsesARisque(c).map((q) => q.id), ['allergie_colle', 'grossesse']);
  assert.deepEqual(reponsesARisque({ ...c, premiereVisite: 'non' }), []);
});

test('ics : heure d\'été, durée, statut provisoire', () => {
  const ics = genererIcs({ date: '2026-07-01', heure: '10:00', dureeMin: 150, prestations: ['Pose cil à cil'], studio: 'My Beauty Aura', uid: 'abc@mba', maintenantMs: Date.parse('2026-06-01T06:00:00Z') });
  assert.match(ics, /DTSTART:20260701T080000Z/);
  assert.match(ics, /DTEND:20260701T103000Z/);
  assert.match(ics, /STATUS:TENTATIVE/);
  assert.match(ics, /à confirmer/);
  assert.ok(!/confirmé/i.test(ics));
  assert.ok(ics.endsWith('\r\n'));
  for (const l of ics.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75, l);
});

test('ics : heure d\'hiver', () => {
  const ics = genererIcs({ date: '2026-12-02', heure: '09:30', dureeMin: 60, prestations: ['x'], studio: 'S', uid: 'u', maintenantMs: 0 });
  assert.match(ics, /DTSTART:20261202T083000Z/);
});

test('envoi sans endpoint : erreur explicite, aucun appel réseau', async () => {
  let appele = false;
  await assert.rejects(envoyerDemande({}, null, async () => { appele = true; }), EnvoiNonConfigure);
  assert.equal(appele, false);
});

test('envoi : succès seulement si le serveur répond ok', async () => {
  assert.equal(await envoyerDemande({ a: 1 }, 'https://x', async () => ({ ok: true })), true);
  await assert.rejects(envoyerDemande({}, 'https://x', async () => ({ ok: false, status: 500 })), /500/);
});

test('total de la sélection : durée et prix à confirmer', () => {
  const services = [{ id: 'a', duree_min: 60, prix_a_partir_de: null }, { id: 'b', duree_min: 45, prix_a_partir_de: 30 }];
  assert.deepEqual(totalSelection(services, ['a', 'b']), { dureeMin: 105, prix: null });
  assert.deepEqual(totalSelection(services, ['b']), { dureeMin: 45, prix: 30 });
  assert.deepEqual(totalSelection(services, []), { dureeMin: 0, prix: null });
  assert.equal(formaterDuree(150), '2 h 30');
  assert.equal(formaterDuree(45), '45 min');
  assert.equal(formaterDuree(120), '2 h');
});
