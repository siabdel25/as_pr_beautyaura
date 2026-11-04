// Calcul des créneaux de réservation. Module pur, sans dépendance, utilisable dans le navigateur et sous Node.
//
// Règle : les jours et heures se manipulent en chaînes « YYYY-MM-DD » et « HH:mm » (fuseau du studio).
// Aucune arithmétique de jours sur Date : elle se trompe aux changements d'heure.
// Seul le délai minimum passe par un instant réel (ms UTC), car « 12 h » est une durée réelle.

const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const pad = (n) => String(n).padStart(2, '0');

// ---------- Jours civils (algorithme de H. Hinnant, sans Date) ----------

export function jourNum(iso) {
  const [y0, m, d] = iso.split('-').map(Number);
  const y = m <= 2 ? y0 - 1 : y0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function isoDepuisJourNum(n) {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

export const ajouterJours = (iso, n) => isoDepuisJourNum(jourNum(iso) + n);
// 1970-01-01 était un jeudi
export const jourSemaine = (iso) => JOURS[(((jourNum(iso) + 4) % 7) + 7) % 7];

export const hhmmEnMin = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
export const minEnHhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

// ---------- Fuseau du studio ----------

const formateurs = new Map();
function murDuFuseau(ms, fuseau) {
  if (!formateurs.has(fuseau)) {
    formateurs.set(fuseau, new Intl.DateTimeFormat('en-US', {
      timeZone: fuseau, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));
  }
  const p = Object.fromEntries(formateurs.get(fuseau).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { ...p, mur: Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) };
}

// Décalage du fuseau par rapport à UTC, en minutes, à l'instant ms
const decalageMin = (ms, fuseau) => Math.round((murDuFuseau(Math.floor(ms / 1000) * 1000, fuseau).mur - Math.floor(ms / 1000) * 1000) / 60000);

/** Date et heure locales du studio à l'instant ms. */
export function parisMaintenant(ms, fuseau = 'Europe/Paris') {
  const p = murDuFuseau(ms, fuseau);
  return { date: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
}

/**
 * Instant réel (ms UTC) d'une heure murale du studio.
 * Heure inexistante (passage à l'heure d'été) : on prend l'instant qui suit le trou.
 * Heure en double (passage à l'heure d'hiver) : on prend la première occurrence.
 */
export function parisVersInstant(iso, hhmm, fuseau = 'Europe/Paris') {
  const [y, m, d] = iso.split('-').map(Number);
  const mur = Date.UTC(y, m - 1, d, Number(hhmm.slice(0, 2)), Number(hhmm.slice(3, 5)));
  const jour = 86400000;
  const o1 = decalageMin(mur - jour, fuseau);
  const o2 = decalageMin(mur + jour, fuseau);
  const c1 = mur - o1 * 60000;
  const c2 = mur - o2 * 60000;
  if (o1 === o2) return c1;
  const v1 = decalageMin(c1, fuseau) === o1;
  const v2 = decalageMin(c2, fuseau) === o2;
  if (v1 && v2) return Math.min(c1, c2);
  if (v1) return c1;
  if (v2) return c2;
  return Math.max(c1, c2);
}

// ---------- Créneaux ----------

/**
 * Heures de début possibles pour une prestation de dureeMin minutes le jour `date`.
 * @param {object} p
 * @param {string} p.date YYYY-MM-DD
 * @param {number} p.dureeMin durée totale des prestations
 * @param {object} p.config { fuseau, tampon_min, delai_min_heures, horizon_jours, pas_creneau_min }
 * @param {object} p.horaires { lun: ['09:30-18:30'], ... }
 * @param {Array} p.indisponibilites [{ date, debut?, fin? }] (sans debut : journée entière)
 * @param {Array} p.reservations [{ date, debut, fin }]
 * @param {number} p.maintenantMs instant courant
 */
export function creneauxDuJour({ date, dureeMin, config, horaires, indisponibilites = [], reservations = [], maintenantMs }) {
  const { fuseau = 'Europe/Paris', tampon_min: tampon, delai_min_heures: delaiH, horizon_jours: horizon, pas_creneau_min: pas } = config;
  const aujourdhui = parisMaintenant(maintenantMs, fuseau).date;
  const ecart = jourNum(date) - jourNum(aujourdhui);
  if (ecart < 0 || ecart > horizon) return [];

  // [début, fin, tampon] en minutes. Le tampon protège les réservations, pas les indisponibilités.
  const bloques = [];
  for (const i of indisponibilites) {
    if (i.date !== date) continue;
    if (!i.debut) return [];
    bloques.push([hhmmEnMin(i.debut), hhmmEnMin(i.fin), 0]);
  }
  for (const r of reservations) {
    if (r.date === date) bloques.push([hhmmEnMin(r.debut), hhmmEnMin(r.fin), tampon]);
  }

  const limite = maintenantMs + delaiH * 3600000;
  const trouves = new Set();
  for (const plage of horaires[jourSemaine(date)] ?? []) {
    const [ouverture, fermeture] = plage.split('-').map(hhmmEnMin);
    for (let debut = ouverture; debut + dureeMin <= fermeture; debut += pas) {
      const fin = debut + dureeMin;
      if (bloques.some(([bd, bf, t]) => debut < bf + t && fin + t > bd)) continue;
      if (parisVersInstant(date, minEnHhmm(debut), fuseau) < limite) continue;
      trouves.add(minEnHhmm(debut));
    }
  }
  return [...trouves].sort();
}

/** Jours de l'horizon qui ont au moins un créneau. */
export function datesDisponibles(p) {
  const aujourdhui = parisMaintenant(p.maintenantMs, p.config.fuseau).date;
  const dates = [];
  for (let i = 0; i <= p.config.horizon_jours; i += 1) {
    const date = ajouterJours(aujourdhui, i);
    if (creneauxDuJour({ ...p, date }).length > 0) dates.push(date);
  }
  return dates;
}

/** Durée et prix cumulés des prestations choisies. prix null = à confirmer. */
export function totalSelection(services, ids) {
  const choisis = services.filter((s) => ids.includes(s.id));
  const prixConnus = choisis.every((s) => typeof s.prix_a_partir_de === 'number');
  return {
    dureeMin: choisis.reduce((t, s) => t + s.duree_min, 0),
    prix: prixConnus && choisis.length ? choisis.reduce((t, s) => t + s.prix_a_partir_de, 0) : null
  };
}

export function formaterDuree(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${pad(m)}` : `${h} h`;
}
