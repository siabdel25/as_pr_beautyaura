// Installation de l'application : enregistrement du service worker et bouton « Installer » quand le navigateur le propose.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}

let invite = null;
const boutons = () => document.querySelectorAll('[data-lb-installer]');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  invite = e;
  boutons().forEach((b) => { b.hidden = false; });
});

document.addEventListener('click', async (e) => {
  if (!e.target.closest('[data-lb-installer]') || !invite) return;
  invite.prompt();
  await invite.userChoice;
  invite = null;
  boutons().forEach((b) => { b.hidden = true; });
});

window.addEventListener('appinstalled', () => boutons().forEach((b) => { b.hidden = true; }));
