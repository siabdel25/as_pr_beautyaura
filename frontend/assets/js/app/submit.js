// Envoi de la demande. L'adresse d'envoi (Formspree, fonction serverless...) vient de data/reservation.json.
// Sans endpoint, rien n'est envoyé et l'erreur le dit clairement : on n'affiche jamais « envoyée » à tort.

export class EnvoiNonConfigure extends Error {}
/** 409 : le créneau a été pris entre-temps (l'API revérifie toujours côté serveur). */
export class CreneauPris extends Error {}
/** 429 : limitation de fréquence atteinte. */
export class TropDeDemandes extends Error {}

export async function envoyerDemande(payload, endpoint, fetchFn = fetch) {
  if (!endpoint) throw new EnvoiNonConfigure('Aucun point d’envoi configuré.');
  const reponse = await fetchFn(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  if (reponse.status === 409) throw new CreneauPris('Créneau déjà pris.');
  if (reponse.status === 429) throw new TropDeDemandes('Trop de demandes.');
  if (!reponse.ok) throw new Error(`Envoi refusé (${reponse.status}).`);
  return true;
}

/** Créneaux libres d'un jour selon l'API (qui connaît les réservations réelles). */
export async function chargerCreneaux(api, date, ids, fetchFn = fetch) {
  const q = new URLSearchParams({ date, services: ids.join(',') });
  const reponse = await fetchFn(`${api}/creneaux/?${q}`, { headers: { Accept: 'application/json' } });
  if (!reponse.ok) throw new Error(`Créneaux indisponibles (${reponse.status}).`);
  return (await reponse.json()).creneaux;
}
