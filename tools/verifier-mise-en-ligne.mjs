// Barrière avant mise en ligne : liste ce qui reste à fournir ou à valider.
// Usage : node tools/verifier-mise-en-ligne.mjs [--liste]   (code 1 tant que la liste n'est pas vide)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { racine, site } from './site.mjs';

const lire = (f) => JSON.parse(readFileSync(join(racine, f), 'utf8'));
const problemes = [];
const marqueurs = {};

(function parcourir(d) {
  for (const n of readdirSync(d)) {
    if (['node_modules', 'docs', 'assets', 'tools', 'tests', 'data', '.git', 'pr_beautyaura'].includes(n)) continue;
    const c = join(d, n);
    if (statSync(c).isDirectory()) { parcourir(c); continue; }
    if (!n.endsWith('.html')) continue;
    const html = readFileSync(c, 'utf8');
    for (const m of html.matchAll(/<span class="lb-todo">\[(À [A-ZÉ]+)\] ([^<]*)<\/span>/g)) {
      (marqueurs[relative(racine, c)] ||= []).push(`${m[1]} ${m[2]}`);
    }
  }
})(racine);

const nb = Object.values(marqueurs).flat().length;
if (nb) problemes.push(`${nb} marqueur(s) [À COMPLÉTER / À REMPLACER / À CONFIRMER] dans ${Object.keys(marqueurs).length} page(s)`);

for (const f of ['reservation.json', 'services.json', 'horaires.json', 'galerie.json', 'site.json']) {
  if (lire(`data/${f}`).statut === 'exemple') problemes.push(`data/${f} : données d'exemple (supprimer "statut": "exemple" après remplacement)`);
}
if (/\.example/.test(site.url)) problemes.push(`data/site.json : url factice (${site.url})`);
if (!lire('data/reservation.json').endpoint) problemes.push('data/reservation.json : endpoint d\'envoi non renseigné, les demandes ne partent pas');
if (!site.mesure.domaine) problemes.push('data/site.json : mesure d\'audience non configurée (facultatif)');
if (lire('data/galerie.json').items.some((i) => i.type !== 'illustration' && i.consentement !== true)) {
  problemes.push('data/galerie.json : une réalisation sans consentement (elle ne sera pas affichée)');
}

if (process.argv.includes('--liste')) {
  for (const [page, l] of Object.entries(marqueurs)) { console.log(`\n${page}`); l.forEach((x) => console.log(`  - ${x}`)); }
}
console.log(problemes.length ? `\nÀ traiter avant mise en ligne :\n${problemes.map((p) => `  - ${p}`).join('\n')}` : 'Rien à signaler.');
process.exit(problemes.length ? 1 : 0);
