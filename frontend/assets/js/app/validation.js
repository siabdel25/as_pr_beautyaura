// Validation du formulaire de réservation (côté client). Module pur.
// Le serveur doit refaire ces contrôles : ceci n'est qu'une aide à la saisie.

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Téléphone français (06 12 34 56 78, +33 6 12 34 56 78) : 10 chiffres, ou +33 suivi de 9 chiffres
export function telephoneValide(brut) {
  const s = String(brut).replace(/[\s.\-()]/g, '');
  return /^0[1-9]\d{8}$/.test(s) || /^\+33[1-9]\d{8}$/.test(s);
}

/** Questions de première visite qui déclenchent un message « contactez le studio ». */
export const QUESTIONS_A_RISQUE = [
  { id: 'allergie_colle', libelle: 'Allergie connue à la colle ou aux produits de pose' },
  { id: 'traitement_oculaire', libelle: 'Traitement oculaire en cours' },
  { id: 'grossesse', libelle: 'Grossesse en cours' }
];

export function reponsesARisque(client) {
  if (client.premiereVisite !== 'oui') return [];
  return QUESTIONS_A_RISQUE.filter((q) => client.questionnaire?.[q.id] === 'oui');
}

/** Retourne un objet { champ: message } ; vide si tout est valide. */
export function validerClient(client) {
  const e = {};
  if (!client.prenom?.trim()) e.prenom = 'Indiquez votre prénom.';
  if (!client.nom?.trim()) e.nom = 'Indiquez votre nom.';
  if (!client.telephone?.trim()) e.telephone = 'Indiquez votre numéro de téléphone.';
  else if (!telephoneValide(client.telephone)) e.telephone = 'Ce numéro ne semble pas valide. Exemple : 06 12 34 56 78.';
  if (!client.email?.trim()) e.email = 'Indiquez votre adresse e-mail.';
  else if (!RE_EMAIL.test(client.email.trim())) e.email = 'Cette adresse e-mail ne semble pas valide.';
  if (!client.premiereVisite) e.premiereVisite = 'Précisez s’il s’agit de votre première visite.';
  if (client.premiereVisite === 'oui') {
    for (const q of QUESTIONS_A_RISQUE) {
      if (!client.questionnaire?.[q.id]) e[q.id] = 'Répondez à cette question.';
    }
  }
  if (!client.consentementRgpd) e.consentementRgpd = 'Le consentement est nécessaire pour traiter votre demande.';
  if (!client.acceptationCgv) e.acceptationCgv = 'Acceptez les CGV pour envoyer votre demande.';
  return e;
}
