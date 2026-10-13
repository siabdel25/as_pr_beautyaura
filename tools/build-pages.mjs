// Assemble les pages HTML statiques à partir de tools/pages/*.mjs et du gabarit.
// Usage : node tools/build-pages.mjs  (les HTML générés sont versionnés)
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { page } from './layout.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const dossier = join(racine, 'tools', 'pages');
let total = 0;

for (const f of readdirSync(dossier).filter((n) => n.endsWith('.mjs')).sort()) {
  const { default: pages } = await import(pathToFileURL(join(dossier, f)));
  for (const p of pages) {
    const sortie = join(racine, p.chemin.endsWith('/') ? p.chemin + 'index.html' : p.chemin);
    mkdirSync(dirname(sortie), { recursive: true });
    writeFileSync(sortie, page(p).replace(/[ \t]+$/gm, ''));
    total += 1;
  }
}
console.log(`${total} pages générées`);
