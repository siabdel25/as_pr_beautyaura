import { studioDonnees, coord, STUDIO, urlAbsolue, sprite, todo, remplacer, confirmer } from '../layout.mjs';

const photoHero = (lcp) => `<picture>
              <source type="image/avif" srcset="/assets/img/hero-sourcils-400.avif 400w, /assets/img/hero-sourcils-800.avif 800w, /assets/img/hero-sourcils-1600.avif 1600w" sizes="(min-width: 1200px) 1140px, 100vw">
              <source type="image/webp" srcset="/assets/img/hero-sourcils-400.webp 400w, /assets/img/hero-sourcils-800.webp 800w, /assets/img/hero-sourcils-1600.webp 1600w" sizes="(min-width: 1200px) 1140px, 100vw">
              <img src="/assets/img/hero-sourcils-800.webp" width="1600" height="900" alt="Gros plan sur un regard : sourcils restructurés et lissés, cils recourbés" ${lcp ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
            </picture>`;

const corps = `
    <section class="lb-hero">
      <svg class="lb-hero__cil" viewBox="0 0 300 720" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path class="lb-cil-trace" pathLength="1" d="M8 716 C 20 520, 120 300, 292 6"/>
        <path d="M44 716 C 60 560, 140 380, 262 150" opacity=".5"/>
        <path d="M84 716 C 100 600, 160 470, 236 330" opacity=".3"/>
      </svg>
      <div class="container position-relative">
        <div class="row g-4 g-lg-5">
          <div class="col-lg-7 lb-hero__texte">
            <h1 class="lb-hero__titre">Un regard soigné, <em>tracé au trait fin</em>.</h1>
          </div>
          <div class="col-lg-5 lb-hero__corps">
            <p class="lb-intro">My Beauty Aura est un studio de soins esthétiques des cils et des sourcils : extensions, rehaussement et soins des sourcils, sur rendez-vous. ${remplacer('texte de présentation à valider avec la praticienne')}</p>
            <p class="d-flex flex-wrap gap-3 mt-4">
              <a class="btn lb-btn lb-btn--primaire" href="/reservation.html">Réserver un soin</a>
              <a class="btn lb-btn lb-btn--contour" href="/prestations/">Découvrir les prestations</a>
            </p>
          </div>
        </div>
        <figure class="lb-hero__photo">
          ${photoHero(true)}
          <figcaption class="visually-hidden">Photo d'illustration ${'[À REMPLACER]'}</figcaption>
        </figure>
      </div>
    </section>

    <section class="lb-section" aria-labelledby="t-presta">
      <div class="container">
        <div class="row g-5">
          <div class="col-lg-4">
            <h2 id="t-presta">Trois soins, un même soin du détail</h2>
            <svg class="lb-trait" viewBox="0 0 112 24" aria-hidden="true" focusable="false"><path d="M2 20 C30 22 70 14 110 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <p>Chaque rendez-vous commence par un échange sur la forme de votre regard et le rendu que vous souhaitez.</p>
          </div>
          <div class="col-lg-8">
            <ul class="lb-liste-presta">
              <li><a href="/prestations/extensions-de-cils.html">${sprite('curve-cc')}<span><span class="lb-liste-presta__nom">Extensions de cils</span>Cil à cil, volume, hybride : un effet adapté à votre regard.</span><span class="lb-liste-presta__duree">environ 2 h 30</span></a></li>
              <li><a href="/prestations/rehaussement-de-cils.html">${sprite('curve-c')}<span><span class="lb-liste-presta__nom">Rehaussement de cils</span>Vos cils naturels relevés, sans extensions.</span><span class="lb-liste-presta__duree">environ 1 h</span></a></li>
              <li><a href="/prestations/soins-des-sourcils.html">${sprite('brow-doux')}<span><span class="lb-liste-presta__nom">Soins des sourcils</span>Restructuration, teinture, lissage : une ligne qui vous ressemble.</span><span class="lb-liste-presta__duree">environ 45 min</span></a></li>
            </ul>
            <p class="mt-3 small">Durées indicatives ${confirmer('à valider par la praticienne')}.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="lb-section lb-section--sauge lb-section--courbes" aria-labelledby="t-courbure">
      <div class="container">
        <div class="row g-5 align-items-end">
          <div class="col-lg-5">
            <h2 id="t-courbure">Quelle courbure pour votre regard ?</h2>
            <p>Les cils se posent en quatre courbures : C, CC, D et L. Elles changent l'ouverture du regard. Essayez-les avant de choisir.</p>
            <a class="btn lb-btn lb-btn--contour" href="/prestations/extensions-de-cils.html#courbure">Comparer les courbures</a>
          </div>
          <div class="col-lg-7">
            <ul class="lb-profils lb-profils--asym lb-profils--courbes" aria-label="Les quatre courbures">
              <li class="lb-profil">${sprite('curve-c')}<h3>C</h3><p>Relevé doux.</p></li>
              <li class="lb-profil">${sprite('curve-cc')}<h3>CC</h3><p>Relevé marqué.</p></li>
              <li class="lb-profil">${sprite('curve-d')}<h3>D</h3><p>Relevé prononcé.</p></li>
              <li class="lb-profil">${sprite('curve-l')}<h3>L</h3><p>Base droite, relevé net.</p></li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="lb-section lb-section--compact" aria-labelledby="t-avis">
      <div class="container">
        <div class="row g-5">
          <div class="col-lg-5">
            <h2 id="t-avis">Ce que disent les clientes</h2>
          </div>
          <div class="col-lg-7">
            <p>${remplacer('Aucun avis n’est publié pour le moment. Les avis réels de clientes, avec leur accord, seront affichés ici.')}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="lb-section lb-section--sombre lb-section--compact" aria-labelledby="t-infos">
      <div class="container">
        <div class="row g-5">
          <div class="col-lg-5">
            <h2 id="t-infos">Venir au studio</h2>
            <svg class="lb-trait" viewBox="0 0 112 24" aria-hidden="true" focusable="false"><path d="M2 20 C30 22 70 14 110 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <p>${coord.adresse}</p>
          </div>
          <div class="col-lg-6 offset-lg-1">
            <h3 class="fs-4">Horaires</h3>
            <p>${todo('horaires d’ouverture et jours de fermeture')}</p>
            <p class="d-flex flex-wrap gap-3 mt-4">
              <a class="btn lb-btn lb-btn--primaire" href="/reservation.html">Réserver</a>
              <a class="btn lb-btn lb-btn--contour" style-off href="/contact.html">Nous contacter</a>
            </p>
          </div>
        </div>
      </div>
    </section>`.replace(' style-off', '');

export default [{
  chemin: '/',
  titre: 'My Beauty Aura | Cils et sourcils : extensions, rehaussement',
  description: 'Studio de soins esthétiques des cils et des sourcils : extensions, rehaussement, restructuration. Réservation en ligne sur rendez-vous.',
  corps,
  // Adresse, téléphone et horaires ajoutés au lot 5, quand le client les fournit : rien n'est inventé
  jsonld: [{
    '@type': 'HealthAndBeautyBusiness',
    '@id': urlAbsolue('/#studio'),
    name: STUDIO,
    url: urlAbsolue('/'),
    description: 'Studio de soins esthétiques des cils et des sourcils : extensions, rehaussement, restructuration.',
    image: urlAbsolue('/assets/img/hero-sourcils-1600.webp'),
    knowsLanguage: 'fr',
    ...(studioDonnees.telephone && { telephone: studioDonnees.telephone }),
    ...(studioDonnees.email && { email: studioDonnees.email }),
    ...(studioDonnees.adresse && { address: { '@type': 'PostalAddress', streetAddress: studioDonnees.adresse.rue, postalCode: studioDonnees.adresse.code_postal, addressLocality: studioDonnees.adresse.ville, addressCountry: 'FR' } })
  }]
}];
