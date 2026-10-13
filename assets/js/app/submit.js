// Envoi de la demande. L'adresse d'envoi (Formspree, fonction serverless...) vient de data/reservation.json.
// Sans endpoint, rien n'est envoyé et l'erreur le dit clairement : on n'affiche jamais « envoyée » à tort.

export class EnvoiNonConfigure extends Error {}

export async function envoyerDemande(payload, endpoint, fetchFn = fetch) {
  if (!endpoint) throw new EnvoiNonConfigure('Aucun point d’envoi configuré.');
  const reponse = await fetchFn(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!reponse.ok) throw new Error(`Envoi refusé (${reponse.status}).`);
  return true;
}
