// Gabarit commun : en-tête, navigation, pied de page, barre « Réserver » collante.

export const STUDIO = 'My Beauty Aura';
export const todo = (t) => `<span class="lb-todo">[À COMPLÉTER] ${t}</span>`;
export const remplacer = (t) => `<span class="lb-todo">[À REMPLACER] ${t}</span>`;
export const confirmer = (t) => `<span class="lb-todo">[À CONFIRMER] ${t}</span>`;

const NAV = [
  ['/prestations/', 'Prestations'],
  ['/tarifs.html', 'Tarifs'],
  ['/a-propos.html', 'À propos'],
  ['/faq.html', 'FAQ'],
  ['/contact.html', 'Contact']
];

const sprite = (id, cls = '') =>
  `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="/assets/icons/sprite.svg#${id}"/></svg>`;
export { sprite };

const estActif = (href, chemin) =>
  href === '/prestations/' ? chemin.startsWith('/prestations/') : href === chemin;

export function page({ chemin, titre, description, corps, vue = false, scripts = [], robots = '' }) {
  const nav = NAV.map(([href, label]) => {
    const cur = estActif(href, chemin) ? ' aria-current="page"' : '';
    return `<li class="nav-item"><a class="nav-link" href="${href}"${cur}>${label}</a></li>`;
  }).join('');
  const importmap = vue
    ? `<script type="importmap">{"imports":{"vue":"/assets/js/vendor/vue.esm-browser.prod.js"}}</script>`
    : '';
  const modules = scripts.map((s) => `<script type="module" src="${s}"></script>`).join('\n  ');
  const meta = robots ? `<meta name="robots" content="${robots}">` : '';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titre}</title>
  <meta name="description" content="${description}">
  ${meta}
  <meta name="theme-color" content="#1F1A24">
  <link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/bodoni-moda-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/figtree-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/bootstrap.min.css">
  <link rel="stylesheet" href="/assets/css/variables.css">
  <link rel="stylesheet" href="/assets/css/custom.css">
  ${importmap}
</head>
<body>
  <a class="lb-skip" href="#contenu">Aller au contenu</a>
  <header class="lb-header">
    <nav class="navbar navbar-expand-lg container" aria-label="Navigation principale">
      <a class="lb-logo" href="/">${sprite('logo')}<span>${STUDIO}</span></a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu" aria-controls="menu" aria-expanded="false" aria-label="Ouvrir le menu">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse lb-nav" id="menu">
        <ul class="navbar-nav ms-lg-auto me-lg-3">${nav}</ul>
        <a class="btn lb-btn lb-btn--primaire lb-header__cta" href="/reservation.html">Réserver</a>
      </div>
    </nav>
  </header>

  <main id="contenu">
${corps}
  </main>

  <footer class="lb-footer">
    <div class="container">
      <div class="row g-5">
        <div class="col-lg-5">
          <p class="lb-titre fs-3 mb-2">${STUDIO}</p>
          <p>Studio de soins esthétiques des cils et des sourcils.</p>
          <p>${todo('adresse du studio')}<br>${todo('téléphone')}<br>${todo('e-mail')}</p>
        </div>
        <div class="col-6 col-lg-3 offset-lg-1">
          <h2>Le studio</h2>
          <ul>
            <li><a href="/prestations/">Prestations</a></li>
            <li><a href="/tarifs.html">Tarifs</a></li>
            <li><a href="/a-propos.html">À propos</a></li>
            <li><a href="/conseils-apres-soin.html">Conseils après-soin</a></li>
            <li><a href="/faq.html">FAQ</a></li>
            <li><a href="/contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="col-6 col-lg-3">
          <h2>Informations</h2>
          <ul>
            <li><a href="/mentions-legales.html">Mentions légales</a></li>
            <li><a href="/politique-confidentialite.html">Confidentialité</a></li>
            <li><a href="/cgv-annulation.html">CGV et annulation</a></li>
          </ul>
        </div>
      </div>
      <p class="lb-footer__legal mb-0">© ${STUDIO}. Les soins proposés sont des soins esthétiques.</p>
    </div>
  </footer>

  <section class="lb-sticky" aria-label="Réserver">
    <a class="btn lb-btn lb-btn--primaire" href="/reservation.html">Réserver</a>
    <a class="btn lb-btn lb-btn--contour" href="/contact.html">Contact</a>
  </section>

  <script src="/assets/js/vendor/bootstrap.bundle.min.js" defer></script>
  ${modules}
</body>
</html>
`;
}
