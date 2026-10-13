// Mesure d'audience sans cookie (Plausible) + relais des événements du site.
// Rien n'est chargé tant que data/site.json ne renseigne pas le domaine de mesure.
const reponse = await fetch('/data/site.json').catch(() => null);
const site = reponse && reponse.ok ? await reponse.json() : null;
const mesure = site && site.mesure;

if (mesure && mesure.domaine) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = mesure.script;
  s.dataset.domain = mesure.domaine;
  document.head.append(s);
}

const envoyer = (name, props) => {
  // File d'attente de Plausible : fonctionne même si son script n'est pas encore chargé
  if (!mesure || !mesure.domaine) return;
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
  window.plausible(name, props ? { props } : undefined);
};

window.addEventListener('lb:event', (e) => envoyer(e.detail.name, e.detail.props));

// Clics téléphone et itinéraire : détectés par le lien, sans code dans chaque page
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  if (a.getAttribute('href').startsWith('tel:')) envoyer('click_phone');
  else if (a.hasAttribute('data-lb-itineraire')) envoyer('click_directions');
});
