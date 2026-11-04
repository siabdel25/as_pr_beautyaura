// Adaptateur vers l'API `booking` d'as_shoppy_frm_v2 (ADR 0002), activé par "api_format": "booking" dans data/reservation.json.
// Même signature que submit.js pour que le tunnel ne change pas : créneaux « HH:mm » et dates « YYYY-MM-DD » en Europe/Paris.
// L'API parle en instants UTC : on les convertit seulement pour l'affichage (aucune arithmétique de jours ici) et on
// renvoie à la création l'instant d'origine du créneau choisi, pour ne jamais recalculer un fuseau côté navigateur.
import { envoyerDemande as envoyer } from './submit.js';
import { QUESTIONS_A_RISQUE } from './validation.js';

// « date heure » -> start_at (UTC, tel que renvoyé par l'API), rempli à chaque chargement de créneaux.
const instants = new Map();

const entete = { headers: { Accept: 'application/json' } };

/** Heure locale « HH:mm » d'un instant UTC dans le fuseau donné (affichage seulement). */
export function heureLocale(startAt, fuseau) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(startAt));
}

export async function chargerCreneaux(api, date, ids, fetchFn = fetch) {
  const q = new URLSearchParams({ date, services: ids.join(',') });
  const reponse = await fetchFn(`${api}/availability/?${q}`, entete);
  if (!reponse.ok) throw new Error(`Créneaux indisponibles (${reponse.status}).`);
  const { slots, timezone } = await reponse.json();
  const heures = [];
  for (const { start_at: startAt } of slots) {
    const heure = heureLocale(startAt, timezone);
    if (instants.has(`${date} ${heure}`)) continue; // heure répétée au changement d'heure : on garde la première
    instants.set(`${date} ${heure}`, startAt);
    heures.push(heure);
  }
  return heures;
}

export async function chargerDisponibilites(api, mois, ids, fetchFn = fetch) {
  const q = new URLSearchParams({ month: mois, services: ids.join(',') });
  const reponse = await fetchFn(`${api}/availability/days/?${q}`, entete);
  if (!reponse.ok) throw new Error(`Disponibilités indisponibles (${reponse.status}).`);
  return (await reponse.json()).days.filter((j) => j.available).map((j) => j.date);
}

/**
 * Charge utile de POST /bookings/. Le serveur calcule prix, acompte et statut : rien de tout cela n'est envoyé.
 * `allergy` porte « au moins une réponse à risque » (ADR 0002 : nom provisoire, champ dédié à créer côté API).
 */
export function versChargeBooking(payload) {
  const startAt = instants.get(`${payload.date} ${payload.heure}`);
  if (!startAt) throw new Error('Créneau inconnu : rechargez les créneaux.');
  const risque = payload.premiere_visite === 'oui'
    && QUESTIONS_A_RISQUE.some((q) => payload.questionnaire?.[q.id] === 'oui');
  return {
    services: payload.prestations.map((p) => p.id),
    start_at: startAt,
    customer_name: `${payload.client.prenom} ${payload.client.nom}`.trim(),
    customer_email: payload.client.email,
    customer_phone: payload.client.telephone,
    allergy: risque,
    consent: payload.consentement_rgpd === true,
    website: ''
  };
}

export function envoyerDemande(payload, api, fetchFn = fetch) {
  return envoyer(versChargeBooking(payload), `${api}/bookings/`, fetchFn);
}
