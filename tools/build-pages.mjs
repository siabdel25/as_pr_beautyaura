// Assemble les pages HTML statiques à partir de tools/pages/*.mjs et du gabarit.
// Usage : node tools/build-pages.mjs  (les HTML générés sont versionnés)
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { page } from './layout.mjs';
import { site, entetes } from './site.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const dossier = join(racine, 'tools', 'pages');
let total = 0;
const urls = [];

for (const f of readdirSync(dossier).filter((n) => n.endsWith('.mjs')).sort()) {
  const { default: pages } = await import(pathToFileURL(join(dossier, f)));
  for (const p of pages) {
    const sortie = join(racine, p.chemin.endsWith('/') ? p.chemin + 'index.html' : p.chemin);
    mkdirSync(dirname(sortie), { recursive: true });
    writeFileSync(sortie, page(p).replace(/[ \t]+$/gm, ''));
    total += 1;
    if (!(p.robots || '').includes('noindex')) urls.push(p.chemin.endsWith('index.html') ? p.chemin.slice(0, -10) : p.chemin);
  }
}
console.log(`${total} pages générées`);

// sitemap.xml, robots.txt et en-têtes de sécurité (Netlify/Cloudflare `_headers`, et `serve.json` pour le test local)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.sort().map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(racine, 'sitemap.xml'), sitemap);
writeFileSync(join(racine, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /docs/\n\nSitemap: ${site.url}/sitemap.xml\n`);

const h = entetes();
writeFileSync(join(racine, '_headers'), `/*\n${Object.entries(h).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`);
writeFileSync(join(racine, 'serve.json'), JSON.stringify({
  headers: [{ source: '**', headers: Object.entries(h).map(([key, value]) => ({ key, value })) }]
}, null, 2) + '\n');
console.log(`${urls.length} URL dans le sitemap`);
