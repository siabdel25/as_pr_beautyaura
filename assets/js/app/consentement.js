// Bandeau de consentement pour les contenus tiers (carte, plus tard Instagram).
// Le site lui-même ne dépose aucun cookie : le choix est mémorisé dans le stockage local.
const CLE = 'lb-consentement';

const lire = () => { try { return localStorage.getItem(CLE); } catch { return null; } };
const ecrire = (v) => { try { localStorage.setItem(CLE, v); } catch { /* stockage bloqué : le choix vaut pour la page */ } };

let choix = lire();
let bandeau = null;

const annoncer = () => window.dispatchEvent(new CustomEvent('lb:consentement', { detail: { tiers: choix === 'accepte' } }));

function fermer() {
  if (bandeau) { bandeau.remove(); bandeau = null; }
}

function decider(valeur) {
  choix = valeur;
  ecrire(valeur);
  fermer();
  annoncer();
}

function ouvrir() {
  if (bandeau) return;
  bandeau = document.createElement('section');
  bandeau.className = 'lb-consent';
  bandeau.setAttribute('aria-labelledby', 'lb-consent-titre');
  bandeau.innerHTML = `
    <p class="lb-consent__titre" id="lb-consent-titre">Vos choix</p>
    <p>Ce site ne dépose aucun cookie de suivi. Certains contenus extérieurs, comme la carte, font appel à un service tiers : ils ne s'affichent qu'avec votre accord. <a href="/politique-confidentialite.html">En savoir plus</a></p>
    <div class="lb-consent__actions">
      <button type="button" class="btn lb-btn lb-btn--contour" data-choix="refuse">Refuser</button>
      <button type="button" class="btn lb-btn lb-btn--contour" data-choix="accepte">Accepter</button>
    </div>`;
  bandeau.addEventListener('click', (e) => {
    const b = e.target.closest('[data-choix]');
    if (b) decider(b.dataset.choix);
  });
  document.body.append(bandeau);
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-lb-consentement]')) ouvrir();
});

// API minimale pour les îlots qui chargent un contenu tiers
window.lbConsentement = { tiers: () => choix === 'accepte', accepter: () => decider('accepte') };

if (choix === null) ouvrir();
