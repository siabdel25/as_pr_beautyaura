// Configuration du site lue par le build : URL publique, mesure d'audience, en-têtes de sécurité.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
export const site = JSON.parse(readFileSync(join(racine, 'data', 'site.json'), 'utf8'));
const reservation = JSON.parse(readFileSync(join(racine, 'data', 'reservation.json'), 'utf8'));

export const IMPORTMAP = '{"imports":{"vue":"/assets/js/vendor/vue.esm-browser.prod.js","v-calendar":"/assets/js/vendor/v-calendar-3.1.2.esm.js","@popperjs/core":"/assets/js/vendor/popperjs-core-2.11.8.esm.js"}}';
const hashImportmap = `'sha256-${createHash('sha256').update(IMPORTMAP).digest('base64')}'`;

const origine = (u) => (u ? new URL(u).origin : '');

export function csp() {
  const mesure = site.mesure.domaine ? origine(site.mesure.script) : '';
  const carte = origine(site.carte_embed_url);
  const envoi = origine(reservation.endpoint);
  return [
    "default-src 'self'",
    // 'unsafe-eval' : Vue compile ses gabarits de chaînes dans le navigateur (pas de bundler)
    `script-src 'self' 'unsafe-eval' ${hashImportmap} ${mesure}`.trim(),
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${mesure} ${envoi}`.trim(),
    `frame-src ${carte || "'none'"}`,
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "base-uri 'self'",
    `form-action 'self' ${envoi}`.trim(),
    "frame-ancestors 'none'"
  ].join('; ');
}

export const entetes = () => ({
  'Content-Security-Policy': csp(),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
});
