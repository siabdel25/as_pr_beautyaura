import test from 'node:test';
import assert from 'node:assert/strict';
import { heureLocale, chargerCreneaux, chargerDisponibilites, versChargeBooking, envoyerDemande } from '../assets/js/app/api-booking.js';
import { CreneauPris, TropDeDemandes } from '../assets/js/app/submit.js';

const reponseJson = (corps, status = 200) => ({ ok: status < 400, status, json: async () => corps });
const faux = (corps, status) => { const appels = []; const f = async (url, opts) => { appels.push({ url, opts }); return reponseJson(corps, status); }; f.appels = appels; return f; };

test('heureLocale : heure d’hiver (UTC+1) et d’été (UTC+2)', () => {
  assert.equal(heureLocale('2026-11-10T08:30:00Z', 'Europe/Paris'), '09:30');
  assert.equal(heureLocale('2026-07-10T07:30:00Z', 'Europe/Paris'), '09:30');
});

test('heureLocale : changements d’heure du 29/03/2026 et du 25/10/2026', () => {
  // 25/10/2026 : retour à l’heure d’hiver à 3 h. 08:30 UTC = 09:30 locale (UTC+1) ; la veille 07:30 UTC = 09:30 locale (UTC+2)
  assert.equal(heureLocale('2026-10-25T08:30:00Z', 'Europe/Paris'), '09:30');
  assert.equal(heureLocale('2026-10-24T07:30:00Z', 'Europe/Paris'), '09:30');
  // 29/03/2026 : passage à l’heure d’été
  assert.equal(heureLocale('2026-03-29T07:30:00Z', 'Europe/Paris'), '09:30');
  assert.equal(heureLocale('2026-03-28T08:30:00Z', 'Europe/Paris'), '09:30');
});

test('chargerCreneaux : appelle /availability/ et rend des « HH:mm »', async () => {
  const f = faux({ date: '2026-11-10', timezone: 'Europe/Paris', booking_mode: 'request', slots: [
    { start_at: '2026-11-10T08:30:00Z', end_at: '2026-11-10T11:00:00Z', resource: 1 },
    { start_at: '2026-11-10T08:45:00Z', end_at: '2026-11-10T11:15:00Z', resource: 1 }
  ] });
  const heures = await chargerCreneaux('https://api.test/api/v1/booking', '2026-11-10', ['pose-cil-a-cil', 'browlift'], f);
  assert.deepEqual(heures, ['09:30', '09:45']);
  assert.equal(f.appels[0].url, 'https://api.test/api/v1/booking/availability/?date=2026-11-10&services=pose-cil-a-cil%2Cbrowlift');
});

test('chargerCreneaux : erreur HTTP -> exception', async () => {
  await assert.rejects(chargerCreneaux('/x', '2026-11-10', ['a'], faux({}, 500)));
});

test('chargerDisponibilites : ne garde que les jours disponibles', async () => {
  const f = faux({ month: '2026-11', timezone: 'Europe/Paris', booking_mode: 'request', days: [
    { date: '2026-11-09', available: false }, { date: '2026-11-10', available: true }, { date: '2026-11-11', available: true }
  ] });
  assert.deepEqual(await chargerDisponibilites('/b', '2026-11', ['a'], f), ['2026-11-10', '2026-11-11']);
  assert.match(f.appels[0].url, /\/b\/availability\/days\/\?month=2026-11&services=a$/);
});

const DEMANDE = {
  statut: 'a_confirmer', prestations: [{ id: 'pose-cil-a-cil', nom: 'Pose cil à cil' }], date: '2026-11-10', heure: '09:30',
  duree_min: 150, client: { prenom: 'Camille', nom: 'Test', telephone: '0612345678', email: 'c@example.com' },
  premiere_visite: 'oui', questionnaire: { allergie_colle: 'non', traitement_oculaire: 'non', grossesse: 'non', lentilles: 'oui' },
  consentement_rgpd: true, cgv_acceptees: true, envoye_le: '2026-11-04T10:00:00Z'
};

async function preparer() {
  await chargerCreneaux('/b', '2026-11-10', ['pose-cil-a-cil'], faux({ timezone: 'Europe/Paris', slots: [{ start_at: '2026-11-10T08:30:00Z' }] }));
}

test('versChargeBooking : champs attendus, rien de plus (ni prix ni statut)', async () => {
  await preparer();
  const c = versChargeBooking(DEMANDE);
  assert.deepEqual(c, {
    services: ['pose-cil-a-cil'], start_at: '2026-11-10T08:30:00Z', customer_name: 'Camille Test',
    customer_email: 'c@example.com', customer_phone: '0612345678', allergy: false, consent: true, website: ''
  });
});

test('versChargeBooking : une réponse à risque lève l’indicateur, sans en dire le détail', async () => {
  await preparer();
  const c = versChargeBooking({ ...DEMANDE, questionnaire: { ...DEMANDE.questionnaire, grossesse: 'oui' } });
  assert.equal(c.allergy, true);
  assert.ok(!JSON.stringify(c).includes('grossesse'));
});

test('versChargeBooking : « lentilles » n’est pas une réponse à risque ; hors première visite, jamais d’indicateur', async () => {
  await preparer();
  assert.equal(versChargeBooking({ ...DEMANDE, questionnaire: { lentilles: 'oui' } }).allergy, false);
  assert.equal(versChargeBooking({ ...DEMANDE, premiere_visite: 'non', questionnaire: { grossesse: 'oui' } }).allergy, false);
});

test('versChargeBooking : créneau jamais chargé -> erreur claire, rien n’est deviné', () => {
  assert.throws(() => versChargeBooking({ ...DEMANDE, heure: '23:00' }), /Créneau inconnu/);
});

test('envoyerDemande : POST /bookings/ ; 409 -> CreneauPris, 429 -> TropDeDemandes', async () => {
  await preparer();
  const ok = faux({ booking: { status: 'pending' }, management_token: 't' }, 201);
  assert.equal(await envoyerDemande(DEMANDE, 'https://api.test/api/v1/booking', ok), true);
  assert.equal(ok.appels[0].url, 'https://api.test/api/v1/booking/bookings/');
  assert.equal(ok.appels[0].opts.method, 'POST');
  assert.equal(JSON.parse(ok.appels[0].opts.body).start_at, '2026-11-10T08:30:00Z');
  await assert.rejects(envoyerDemande(DEMANDE, '/b', faux({ error: { code: 'slot_unavailable' } }, 409)), CreneauPris);
  await assert.rejects(envoyerDemande(DEMANDE, '/b', faux({}, 429)), TropDeDemandes);
});
