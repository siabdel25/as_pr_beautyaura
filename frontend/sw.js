// Service worker généré par tools/build-pages.mjs (ne pas modifier sw.js à la main).
// Pages : réseau d'abord, repli sur le cache puis sur offline.html. Ressources statiques : cache d'abord.
// Données de réservation (/data/) : jamais servies depuis le cache, un créneau périmé serait trompeur.
const VERSION = '896676acfb7a';
const CACHE = `lb-${VERSION}`;
const SOCLE = ['/offline.html', '/assets/css/bootstrap.min.css', '/assets/css/variables.css', '/assets/css/custom.css',
  '/assets/fonts/bodoni-moda-latin-wght-normal.woff2', '/assets/fonts/figtree-latin-wght-normal.woff2', '/assets/icons/sprite.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SOCLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((k) => k.startsWith('lb-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/data/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      const copie = r.clone();
      if (r.ok) caches.open(CACHE).then((c) => c.put(req, copie));
      return r;
    }).catch(() => caches.match(req).then((r) => r || caches.match('/offline.html'))));
    return;
  }

  e.respondWith(caches.match(req).then((r) => r || fetch(req).then((rep) => {
    const copie = rep.clone();
    if (rep.ok) caches.open(CACHE).then((c) => c.put(req, copie));
    return rep;
  })));
});
