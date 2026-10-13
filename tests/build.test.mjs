import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { racine, csp } from '../tools/site.mjs';

const pages = [];
(function parcourir(d) {
  for (const n of readdirSync(d)) {
    if (['node_modules', 'docs', 'assets', 'tools', 'tests', 'data', '.git'].includes(n)) continue;
    const c = join(d, n);
    statSync(c).isDirectory() ? parcourir(c) : n.endsWith('.html') && pages.push(c);
  }
})(racine);

test('le hash CSP correspond à l\'importmap de chaque page', () => {
  for (const p of pages) {
    const m = readFileSync(p, 'utf8').match(/<script type="importmap">(.*?)<\/script>/s);
    assert.ok(m, p);
    const h = `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`;
    assert.ok(csp().includes(h), `${p} : importmap hors CSP`);
  }
});

test('aucun style ni gestionnaire inline dans les pages', () => {
  for (const p of pages) {
    const html = readFileSync(p, 'utf8');
    assert.doesNotMatch(html, /\sstyle="/, p);
    assert.doesNotMatch(html, /\son[a-z]+="/, p);
    assert.doesNotMatch(html, /<script(?![^>]*(src=|type="(importmap|application\/ld\+json)"))/, p);
  }
});

test('titres et descriptions uniques, une seule balise h1', () => {
  const titres = new Set(); const descs = new Set();
  for (const p of pages) {
    const html = readFileSync(p, 'utf8');
    const t = html.match(/<title>(.*?)<\/title>/)[1];
    const d = html.match(/<meta name="description" content="(.*?)"/)[1];
    assert.ok(!titres.has(t), `titre en double : ${t}`); titres.add(t);
    assert.ok(!descs.has(d), `description en double : ${d}`); descs.add(d);
    assert.ok(d.length <= 170, `description trop longue (${d.length}) : ${p}`);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, p);
  }
});

test('aucune donnée structurée ne contient de note ou d\'avis', () => {
  for (const p of pages) {
    const html = readFileSync(p, 'utf8');
    assert.doesNotMatch(html, /AggregateRating|"Review"|ratingValue/, p);
  }
});
