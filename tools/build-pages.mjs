// Assemble les pages HTML statiques à partir de tools/pages/*.mjs et du gabarit.
// Usage : node tools/build-pages.mjs  (les HTML générés sont versionnés)
import { readdirSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

// Service worker : la version change avec le contenu des pages et des ressources, ce qui renouvelle le cache
const empreinte = createHash('sha256');
(function parcourir(d) {
  for (const n of readdirSync(d).sort()) {
    if (['node_modules', 'docs', 'tools', 'tests', 'data', '.git', 'pr_beautyaura', 'blog'].includes(n)) continue;
    const c = join(d, n);
    if (statSync(c).isDirectory()) parcourir(c);
    else if (/\.(html|css|js|svg|woff2|webmanifest)$/.test(n) && n !== 'sw.js') empreinte.update(n).update(readFileSync(c));
  }
})(racine);
writeFileSync(join(racine, 'sw.js'), readFileSync(join(racine, 'tools', 'sw.template.js'), 'utf8').replace('__VERSION__', empreinte.digest('hex').slice(0, 12)));

// .htaccess (Hostinger : Apache/LiteSpeed). Mêmes en-têtes que _headers, plus HTTPS, domaine unique, types MIME et cache.
const domaine = new URL(site.url).hostname.replace(/^www\./, '');
writeFileSync(join(racine, '.htaccess'), `# Généré par tools/build-pages.mjs
RewriteEngine On
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} ^www\\. [NC]
RewriteRule ^ https://${domaine}%{REQUEST_URI} [L,R=301]

ErrorDocument 404 /404.html
DirectoryIndex index.html

<IfModule mod_headers.c>
${Object.entries(h).map(([k, v]) => `  Header always set ${k} "${v.replace(/"/g, '\\"')}"`).join('\n')}
  <FilesMatch "^sw\\.js$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  <FilesMatch "\\.(woff2|avif|webp|png|svg)$">
    Header set Cache-Control "public, max-age=604800"
  </FilesMatch>
  <FilesMatch "\\.(css|js|json|webmanifest)$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
</IfModule>

<IfModule mod_mime.c>
  AddType application/manifest+json .webmanifest
  AddType image/avif .avif
  AddType font/woff2 .woff2
  AddType text/javascript .js .mjs
</IfModule>

# Fichiers de développement jamais publiés
RedirectMatch 404 ^/(tools|tests|docs|node_modules|\\.git)(/|$)
RedirectMatch 404 ^/(manage\\.py|pr_beautyaura|TODO\\.md|CLAUDE\\.md|README\\.md|package.*\\.json)$
`);
