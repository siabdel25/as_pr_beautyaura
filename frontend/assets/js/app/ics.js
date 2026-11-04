// Génération du fichier .ics de la demande. Module pur.
// La demande est « à confirmer » : l'événement est marqué TENTATIVE et son titre le dit.
import { parisVersInstant } from './slots.js';

const pad = (n) => String(n).padStart(2, '0');

function formatUtc(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// RFC 5545 : échappement du texte
const echapper = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 5545 : lignes de 75 octets maximum, repliées avec CRLF + espace
function replier(ligne) {
  const enc = new TextEncoder();
  if (enc.encode(ligne).length <= 75) return ligne;
  const morceaux = [];
  let courant = '';
  for (const c of ligne) {
    const limite = morceaux.length ? 74 : 75;
    if (enc.encode(courant + c).length > limite) { morceaux.push(courant); courant = c; } else courant += c;
  }
  morceaux.push(courant);
  return morceaux.join('\r\n ');
}

/**
 * @param {{date: string, heure: string, dureeMin: number, prestations: string[], studio: string, fuseau?: string, uid: string, maintenantMs: number}} p
 */
export function genererIcs({ date, heure, dureeMin, prestations, studio, fuseau = 'Europe/Paris', uid, maintenantMs }) {
  const debut = parisVersInstant(date, heure, fuseau);
  const fin = debut + dureeMin * 60000;
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${echapper(studio)}//Reservation//FR`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatUtc(maintenantMs)}`,
    `DTSTART:${formatUtc(debut)}`,
    `DTEND:${formatUtc(fin)}`,
    `SUMMARY:${echapper(`Demande de rendez-vous à confirmer - ${studio}`)}`,
    `DESCRIPTION:${echapper(`Prestations : ${prestations.join(', ')}. Cette demande est à confirmer par le studio.`)}`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lignes.map(replier).join('\r\n') + '\r\n';
}

