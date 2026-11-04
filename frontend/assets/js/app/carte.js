// Carte tierce : l'iframe n'est créée qu'après consentement, et seulement si une adresse est configurée.
const zone = document.querySelector('[data-lb-carte]');
const reponse = await fetch('/data/site.json');
const { carte_embed_url: url } = await reponse.json();

if (zone && url) {
  const afficher = () => {
    const f = document.createElement('iframe');
    f.src = url;
    f.title = 'Carte : emplacement du studio';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer';
    f.className = 'lb-carte';
    zone.replaceChildren(f);
  };
  const proposer = () => {
    zone.innerHTML = '<p class="mb-0"><strong>Carte et itinéraire</strong></p><p class="mb-0">La carte fait appel à un service tiers : elle s\'affiche avec votre accord.</p><button type="button" class="btn lb-btn lb-btn--primaire">Accepter et afficher la carte</button>';
    zone.querySelector('button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('lb:consentement-demande')));
  };
  window.lbConsentement.tiers() ? afficher() : proposer();
  window.addEventListener('lb:consentement', (e) => { if (e.detail.tiers) afficher(); });
  // Le bouton de la zone accepte directement : un seul clic suffit
  window.addEventListener('lb:consentement-demande', () => window.lbConsentement.accepter());
}
