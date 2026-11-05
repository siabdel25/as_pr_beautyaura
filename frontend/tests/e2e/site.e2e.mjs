import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.E2E_BASE || 'http://localhost:8082';
const MAIL = process.env.E2E_MAIL || 'http://localhost:8026';
const OUT = (process.env.E2E_OUT || '/tmp/lb-e2e') + '/';
fs.mkdirSync(OUT, { recursive: true });

const resultats = [];
const ok = (nom, cond, detail = '') => {
  resultats.push({ nom, ok: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${nom}${detail ? '  — ' + detail : ''}`);
};

const browser = await chromium.launch();

// Collecte les erreurs console / réseau d'une page.
function surveiller(page, bucket) {
  page.on('console', (m) => { if (m.type() === 'error') bucket.push('console: ' + m.text()); });
  page.on('pageerror', (e) => bucket.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) bucket.push(`${r.status()} ${r.url()}`); });
}

// 1. Toutes les pages se chargent sans erreur
const pages = ['index', 'reservation', 'tarifs', 'a-propos', 'faq', 'contact', 'galerie', 'conseils-apres-soin',
  'cgv-annulation', 'mentions-legales', 'politique-confidentialite', 'offline'];
{
  const ctx = await browser.newContext();
  for (const p of pages) {
    const page = await ctx.newPage();
    const erreurs = [];
    surveiller(page, erreurs);
    const r = await page.goto(`${BASE}/${p}.html`, { waitUntil: 'networkidle' });
    const h1 = await page.locator('h1').count();
    ok(`page ${p}.html`, r.status() === 200 && h1 >= 1 && !erreurs.length, erreurs.join(' | '));
    await page.close();
  }
  await ctx.close();
}

// 2. Tunnel de réservation complet (viewport mobile)
const email = `playwright-${Date.now()}@example.test`;
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage();
  const erreurs = [];
  surveiller(page, erreurs);
  const appels = [];
  page.on('request', (r) => { if (r.url().includes('/api/v1/')) appels.push(`${r.method()} ${new URL(r.url()).pathname}`); });
  await page.goto(`${BASE}/reservation.html`, { waitUntil: 'networkidle' });
  // Bandeau cookies éventuel
  const refus = page.getByRole('button', { name: /refuser|continuer sans accepter/i });
  if (await refus.count()) { await refus.first().click(); ok('bandeau cookies : refus en un clic', true); }

  await page.locator('#booking-app input[type=checkbox]').first().waitFor({ timeout: 10000 });
  ok('étape 1 : prestations listées', (await page.locator('.lb-bk-choix').count()) >= 2);
  const continuer = page.getByRole('button', { name: 'Continuer' });
  ok('étape 1 : Continuer désactivé sans prestation', await continuer.isDisabled());
  await page.locator('.lb-bk-choix').first().click();
  ok('étape 1 : Continuer actif après choix', await continuer.isEnabled());
  await page.screenshot({ path: OUT + '1-prestations.png' });
  await continuer.click();

  // Étape 2 : date via la liste, puis créneau
  await page.locator('#bk-date-liste').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('#bk-date-liste option').length > 1, null, { timeout: 15000 });
  const nbDates = await page.locator('#bk-date-liste option').count() - 1;
  ok('étape 2 : dates disponibles chargées via l’API', nbDates > 0, `${nbDates} dates`);
  const val = await page.locator('#bk-date-liste option').nth(1).getAttribute('value');
  await page.selectOption('#bk-date-liste', val);
  await page.locator('input[name=creneau]').first().waitFor({ timeout: 10000 });
  const nbCren = await page.locator('input[name=creneau]').count();
  ok('étape 2 : créneaux affichés', nbCren > 0, `${val} → ${nbCren} créneaux`);
  await page.locator('.lb-bk-heure').first().click();
  await page.screenshot({ path: OUT + '2-creneaux.png' });
  await page.getByRole('button', { name: 'Continuer' }).click();

  // Étape 3 : validation à vide
  await page.locator('#bk-prenom').waitFor();
  await page.getByRole('button', { name: /envoyer|demander|valider/i }).last().click();
  ok('étape 3 : erreurs de validation affichées', (await page.locator('.lb-bk-erreur').count()) >= 3);
  ok('étape 3 : résumé d’erreurs annoncé (role=alert)', await page.locator('.alert-danger[role=alert]').count() >= 1);
  await page.screenshot({ path: OUT + '3-validation.png' });

  // Réponse à risque -> message invitant à contacter le studio
  await page.fill('#bk-prenom', 'Camille');
  await page.fill('#bk-nom', 'Test');
  await page.fill('#bk-tel', '0612345678');
  await page.fill('#bk-mail', email);
  await page.check('#bk-pv-oui');
  await page.locator('.lb-bk-questionnaire').waitFor();
  for (const q of await page.locator('.lb-bk-questionnaire fieldset').all()) {
    const non = q.locator('input[value=non]');
    if (await non.count()) await non.first().check();
  }
  await page.check('#bk-allergie_colle-oui');
  ok('réponse à risque : alerte « contacter le studio »', await page.locator('.lb-bk-questionnaire .alert-warning').isVisible());
  await page.screenshot({ path: OUT + '4-risque.png' });

  // Honeypot invisible pour l’utilisateur
  const hp = await page.locator('.lb-hp').boundingBox();
  ok('honeypot hors écran / invisible', !hp || hp.x < -100 || hp.width <= 1 || hp.height <= 1 || (await page.locator('.lb-hp').evaluate((e) => getComputedStyle(e).position)) === 'absolute');

  await page.check('#bk-rgpd');
  await page.check('#bk-cgv');
  const reqPost = page.waitForResponse((r) => r.url().includes('/api/v1/') && r.request().method() === 'POST', { timeout: 15000 });
  await page.getByRole('button', { name: /envoyer|demander|valider/i }).last().click();
  const rep = await reqPost;
  ok('envoi : POST API en 201', rep.status() === 201, `status ${rep.status()}`);
  const corps = await rep.json().catch(() => ({}));
  ok('envoi : statut « a_confirmer » (jamais confirmé)', JSON.stringify(corps).includes('a_confirmer') || JSON.stringify(corps).includes('pending'), JSON.stringify(corps).slice(0, 160));
  await page.locator('.lb-bk-confirmation').waitFor({ timeout: 10000 });
  const txt = await page.locator('.lb-bk-confirmation').innerText();
  ok('confirmation : « pas encore confirmée »', /pas encore confirm/i.test(txt));
  ok('confirmation : aucune mention « confirmé » trompeuse', !/votre rendez-vous est confirmé/i.test(txt));
  await page.screenshot({ path: OUT + '5-confirmation.png', fullPage: true });
  ok('confirmation : lien .ics présent', await page.locator('a[download$=".ics"]').count() === 1);
  // Débordement horizontal mobile
  const debord = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok('mobile : pas de défilement horizontal', !debord);
  ok('tunnel : aucune erreur console/réseau', !erreurs.length, erreurs.join(' | '));
  console.log('   appels API :', [...new Set(appels)].join(', '));
  await ctx.close();
}

// 3. Courriels reçus dans Mailpit
{
  await new Promise((r) => setTimeout(r, 6000));
  const liste = await (await fetch(`${MAIL}/api/v1/messages?limit=50`)).json();
  const m = liste.messages.filter((x) => x.To.some((t) => t.Address === email) || (x.Snippet || '').includes('Camille'));
  ok('mail : message reçu pour la demande', m.length >= 1, `${m.length} message(s)`);
  const studio = liste.messages.find((x) => x.To.some((t) => t.Address === 'studio@demo.test') && (x.Snippet || '').includes('Camille'));
  ok('mail : notification studio émise', !!studio, studio?.Subject || '');
  if (studio) {
    const det = await (await fetch(`${MAIL}/api/v1/message/${studio.ID}`)).json();
    ok('mail studio : mention « réponse à risque »', /risque/i.test(det.Text || ''));
    ok('mail studio : aucun détail de santé conservé', !/allergie_colle/.test(det.Text || ''));
  }
}

// 4. PWA : manifeste, service worker, hors ligne
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  const man = await page.evaluate(async () => {
    const l = document.querySelector('link[rel=manifest]');
    if (!l) return null;
    const r = await fetch(l.href); return { ct: r.headers.get('content-type'), j: await r.json() };
  });
  ok('PWA : manifeste valide', man && man.ct.includes('manifest') && man.j.name, man?.ct);
  const sw = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return 'absent';
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? 'enregistré' : 'non enregistré';
  });
  ok('PWA : service worker', sw === 'enregistré', sw);
  const cc = await (await ctx.request.get(`${BASE}/sw.js`)).headers()['cache-control'];
  ok('PWA : sw.js en no-cache', /no-cache/.test(cc || ''), cc);
  await ctx.close();
}

// 5. Admin Django (studio / demo-studio)
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const r = await page.goto(`${BASE}/admin/login/`);
  ok('admin : page de connexion', r.status() === 200);
  await page.fill('#id_username', 'studio');
  await page.fill('#id_password', 'demo-studio');
  await page.click('input[type=submit]');
  ok('admin : connexion réussie', await page.locator('#user-tools, #logout-form').count() > 0);
  await page.goto(`${BASE}/admin/reservations/reservation/`);
  const lignes = await page.locator('#result_list tbody tr').count();
  ok('admin : réservations listées', lignes > 0, `${lignes} lignes`);
  const dernier = await page.locator('#result_list').innerText();
  ok('admin : la demande de test y figure', dernier.includes('Camille') || dernier.includes('Test'));
  await page.screenshot({ path: OUT + '6-admin.png' });
  await ctx.close();
}

// 6. Accessibilité rapide + navigation clavier du tunnel
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/reservation.html`, { waitUntil: 'networkidle' });
  await page.locator('.lb-bk-choix input').first().focus();
  await page.keyboard.press('Space');
  ok('clavier : prestation cochable à l’espace', await page.locator('.lb-bk-choix--actif').count() === 1);
  const sansAlt = await page.locator('img:not([alt])').count();
  ok('a11y : images sans attribut alt = 0', sansAlt === 0, `${sansAlt}`);
  const lang = await page.locator('html').getAttribute('lang');
  ok('a11y : <html lang="fr">', lang === 'fr');
  await ctx.close();
}

await browser.close();
const echecs = resultats.filter((r) => !r.ok);
console.log(`\n${resultats.length - echecs.length}/${resultats.length} contrôles réussis`);
process.exit(echecs.length ? 1 : 0);
