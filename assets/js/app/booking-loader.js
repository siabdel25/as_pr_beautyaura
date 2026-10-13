// Ouvre le tunnel de réservation dans un offcanvas depuis n'importe quelle page.
// Vue et V-Calendar ne sont chargés qu'au premier clic. Sans JavaScript, le lien mène à /reservation.html.

const CIBLE = 'a[href="/reservation.html"]';
const panneau = document.getElementById('lb-offcanvas-reserver');
let pret = null;

function chargerStyles() {
  for (const href of ['/assets/css/v-calendar-3.1.2.css', '/assets/css/booking.css']) {
    if (document.querySelector(`link[href="${href}"]`)) continue;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.append(l);
  }
}

async function preparer() {
  chargerStyles();
  const { monter } = await import('/assets/js/app/booking.js');
  monter('#booking-app');
}

if (panneau && document.body.dataset.page !== 'reservation') {
  document.addEventListener('click', async (e) => {
    const lien = e.target.closest(CIBLE);
    if (!lien || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (!window.bootstrap) return; // Bootstrap pas encore chargé : on laisse le lien agir
    e.preventDefault();
    window.bootstrap.Offcanvas.getOrCreateInstance(panneau).show();
    // Rendre le focus au bouton d'origine à la fermeture (Bootstrap ne le fait pas pour une ouverture par script)
    panneau.addEventListener('hidden.bs.offcanvas', () => lien.focus(), { once: true });
    pret ??= preparer().catch(() => { window.location.href = lien.href; });
    await pret;
  });
}
