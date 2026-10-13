import { sprite, todo, remplacer, confirmer } from '../layout.mjs';

const cta = (texte = 'Réserver ce soin') => `
    <section class="lb-section lb-section--sombre">
      <div class="container">
        <div class="row">
          <div class="col-lg-7">
            <h2>Prête à réserver ?</h2>
            <p>Choisissez votre soin, une date et un créneau. Votre demande est ensuite à confirmer par la praticienne.</p>
            <p class="d-flex flex-wrap gap-3 mt-4">
              <a class="btn lb-btn lb-btn--primaire" href="/reservation.html">${texte}</a>
              <a class="btn lb-btn lb-btn--contour" href="/faq.html">Lire la FAQ</a>
            </p>
          </div>
        </div>
      </div>
    </section>`;

const fiche = (duree, tenue, entretien, prix = '/tarifs.html') => `
          <dl class="lb-fiche">
            <dt>Durée</dt><dd>${duree}</dd>
            <dt>Tenue</dt><dd>${tenue}</dd>
            <dt>Entretien</dt><dd>${entretien}</dd>
            <dt>Tarif</dt><dd>À partir de ${todo('prix')} · <a href="${prix}">voir les tarifs</a></dd>
          </dl>`;

const entete = (h1, intro) => `
    <section class="lb-section pb-4">
      <div class="container">
        <div class="row">
          <div class="col-lg-8">
            <h1>${h1}</h1>
            <p class="lb-intro">${intro}</p>
          </div>
        </div>
      </div>
    </section>`;

const index = `
${entete('Les prestations', 'Des soins esthétiques des cils et des sourcils, choisis avec vous selon la forme de votre regard et le rendu souhaité.')}
    <section class="lb-section pt-3">
      <div class="container">
        <ul class="lb-liste-presta">
          <li><a href="/prestations/extensions-de-cils.html">${sprite('curve-cc')}<span><span class="lb-liste-presta__nom">Extensions de cils</span>Cil à cil, volume ou hybride, en quatre courbures.</span><span class="lb-liste-presta__duree">environ 2 h 30</span></a></li>
          <li><a href="/prestations/rehaussement-de-cils.html">${sprite('curve-c')}<span><span class="lb-liste-presta__nom">Rehaussement de cils</span>Vos cils naturels relevés, sans extensions.</span><span class="lb-liste-presta__duree">environ 1 h</span></a></li>
          <li><a href="/prestations/soins-des-sourcils.html">${sprite('brow-doux')}<span><span class="lb-liste-presta__nom">Soins des sourcils</span>Restructuration, teinture et lissage.</span><span class="lb-liste-presta__duree">environ 45 min</span></a></li>
          <li><a href="/prestations/epilation-sourcils.html">${sprite('brow-arque')}<span><span class="lb-liste-presta__nom">Épilation des sourcils</span>Une ligne nette, dessinée selon votre visage.</span><span class="lb-liste-presta__duree">${confirmer('durée')}</span></a></li>
        </ul>
        <p class="mt-3 small">Durées indicatives ${confirmer('à valider par la praticienne')}. Vous hésitez entre deux soins ? <a href="/contact.html">Écrivez-nous</a>.</p>
      </div>
    </section>
${cta('Réserver')}`;

const extensions = `
${entete('Extensions de cils', 'Des cils posés un par un sur vos cils naturels, pour allonger et densifier le regard. Le rendu se choisit : courbure, longueur et effet.')}
    <section class="lb-section pt-3" id="courbure" aria-labelledby="t-courbure">
      <div class="container">
        <h2 id="t-courbure">Essayez les quatre courbures</h2>
        <p>La courbure change l'ouverture du regard. Cette illustration est indicative : la praticienne vous conseille lors du rendez-vous.</p>
        <div id="courbure-app" class="lb-courbure" v-cloak>
          <div>
            <div class="lb-courbure__choix" role="group" aria-label="Courbure des cils">
              <button v-for="c in courbures" :key="c.nom" type="button" :aria-pressed="c.nom === choix" @click="choisir(c.nom)">{{ c.nom }}</button>
            </div>
            <p class="mt-3" aria-live="polite"><strong>Courbure {{ choix }}.</strong> {{ description }}</p>
          </div>
          <svg class="lb-courbure__oeil" viewBox="0 0 200 100" role="img" :aria-label="'Œil illustré avec des cils de courbure ' + choix">
            <path class="lb-oeil-lid" :d="paupiere"/>
            <path class="lb-oeil-lid" d="M20 70 Q100 100 180 70" opacity=".5"/>
            <circle class="lb-oeil-iris" cx="100" cy="68" r="12"/>
            <path v-for="(d, i) in chemins" :key="i" class="lb-oeil-lash" :d="d"/>
          </svg>
        </div>
        <noscript><p>Courbures disponibles : C (relevé doux), CC (relevé marqué), D (relevé prononcé), L (base droite, relevé net en bout).</p></noscript>
      </div>
    </section>

    <section class="lb-section lb-section--sauge" aria-labelledby="t-effets">
      <div class="container">
        <h2 id="t-effets">Quel effet recherchez-vous ?</h2>
        <ul class="lb-profils lb-profils--asym mt-4">
          <li class="lb-profil">${sprite('eye-naturel', 'lb-ratio-oeil')}<h3>Naturel</h3><p>Un cil posé sur chaque cil naturel. Discret, régulier.</p></li>
          <li class="lb-profil">${sprite('eye-hybride', 'lb-ratio-oeil')}<h3>Hybride</h3><p>Longueurs et densités mêlées pour un relief léger.</p></li>
          <li class="lb-profil">${sprite('eye-volume', 'lb-ratio-oeil')}<h3>Volume</h3><p>Plusieurs fins cils par cil naturel. Un regard plus dense.</p></li>
          <li class="lb-profil">${sprite('eye-wispy', 'lb-ratio-oeil')}<h3>Œil de biche</h3><p>Cils plus longs vers l'extérieur, effet étiré.</p></li>
        </ul>
        <p class="mt-4 small">${confirmer('liste des effets réellement proposés par la praticienne')}</p>
      </div>
    </section>

    <section class="lb-section" aria-labelledby="t-infos-ext">
      <div class="container">
        <div class="row g-5">
          <div class="col-lg-5">
            <h2 id="t-infos-ext">À savoir avant la pose</h2>
            <p>Pour une première visite, un court questionnaire (allergie à la colle, lentilles, grossesse, traitement oculaire) permet de vérifier que le soin vous convient. En cas de doute, contactez le studio avant de réserver.</p>
            <figure class="lb-photo mt-4">
              <picture>
                <source type="image/avif" srcset="/assets/img/oeil-cils-168.avif">
                <img src="/assets/img/oeil-cils-168.webp" width="168" height="196" alt="Œil avec des extensions de cils aux courbes marquées" loading="lazy" decoding="async">
              </picture>
              <figcaption>Photo d'illustration ${remplacer('à remplacer par une réalisation du studio, avec consentement écrit')}</figcaption>
            </figure>
          </div>
          <div class="col-lg-6 offset-lg-1">
${fiche('Pose complète : environ 2 h 30. Retouche : environ 1 h 15.', confirmer('durée de tenue indiquée par la praticienne'), confirmer('rythme de retouche et gestes d’entretien'))}
            <p class="mt-4"><a href="/conseils-apres-soin.html">Consulter les conseils après-soin</a></p>
          </div>
        </div>
      </div>
    </section>
${cta('Réserver une pose')}`;

const rehaussement = `
${entete('Rehaussement de cils', 'Un soin qui donne une courbe à vos cils naturels, sans extensions. Idéal si vous aimez un rendu simple, sans entretien quotidien au recourbe-cils.')}
    <section class="lb-section pt-3">
      <div class="container">
        <div class="row g-5">
          <div class="col-lg-6">
            <h2>Pour qui ?</h2>
            <p>Pour les cils naturels qui souhaitent un regard plus ouvert. Le soin peut être associé à une teinture des cils ${confirmer('prestation à valider')}.</p>
            <h2 class="mt-5">Déroulement</h2>
            <ol>
              <li>Échange sur le rendu souhaité et questionnaire de première visite.</li>
              <li>Application du soin, étape par étape, yeux fermés.</li>
              <li>Conseils pour les premières 24 à 48 heures ${confirmer('délai exact')}.</li>
            </ol>
          </div>
          <div class="col-lg-5 offset-lg-1">
${fiche('Environ 1 h.', confirmer('durée de tenue indiquée par la praticienne'), confirmer('fréquence conseillée'))}
          </div>
        </div>
      </div>
    </section>
${cta('Réserver un rehaussement')}`;

const sourcils = `
${entete('Soins des sourcils', 'Restructuration, teinture, lissage : une ligne de sourcils pensée pour votre visage, qui reste naturelle.')}
    <section class="lb-section pt-3" aria-labelledby="t-formes">
      <div class="container">
        <h2 id="t-formes">Quelle forme vous ressemble ?</h2>
        <p>Quatre profils pour amorcer la discussion. La forme finale s'ajuste à vos traits.</p>
        <ul class="lb-profils lb-profils--asym mt-4">
          <li class="lb-profil">${sprite('brow-droit', 'lb-ratio-sourcil')}<h3>Droit</h3><p>Une ligne horizontale, graphique et moderne.</p></li>
          <li class="lb-profil">${sprite('brow-doux', 'lb-ratio-sourcil')}<h3>Doux</h3><p>Légèrement courbé, il adoucit les traits.</p></li>
          <li class="lb-profil">${sprite('brow-arque', 'lb-ratio-sourcil')}<h3>Arqué</h3><p>Un arc net qui structure le regard.</p></li>
          <li class="lb-profil">${sprite('brow-ascendant', 'lb-ratio-sourcil')}<h3>Ascendant</h3><p>Une ligne qui monte vers la tempe.</p></li>
        </ul>
      </div>
    </section>
    <section class="lb-section lb-section--sauge" aria-labelledby="t-sourcils-infos">
      <div class="container">
        <div class="row g-5 align-items-center">
          <div class="col-lg-7">
            <figure class="lb-photo">
              <picture>
                <source type="image/avif" srcset="/assets/img/hero-sourcils-400.avif 400w, /assets/img/hero-sourcils-800.avif 800w, /assets/img/hero-sourcils-1600.avif 1600w" sizes="(min-width: 992px) 58vw, 100vw">
                <source type="image/webp" srcset="/assets/img/hero-sourcils-400.webp 400w, /assets/img/hero-sourcils-800.webp 800w, /assets/img/hero-sourcils-1600.webp 1600w" sizes="(min-width: 992px) 58vw, 100vw">
                <img src="/assets/img/hero-sourcils-800.webp" width="1600" height="900" alt="Sourcils restructurés et lissés, vus de près" loading="lazy" decoding="async">
              </picture>
              <figcaption>Photo d'illustration ${remplacer('à remplacer par une réalisation du studio')}</figcaption>
            </figure>
          </div>
          <div class="col-lg-5">
            <h2 id="t-sourcils-infos">Le soin en bref</h2>
${fiche('Environ 45 min.', confirmer('durée de tenue'), confirmer('fréquence conseillée'))}
          </div>
        </div>
      </div>
    </section>
${cta('Réserver un soin sourcils')}`;

const epilation = `
${entete('Épilation des sourcils', 'Une ligne nette, dessinée selon la forme de votre visage et de vos sourcils. Le rendu reste naturel.')}
    <section class="lb-section pt-3">
      <div class="container">
        <div class="row g-5">
          <div class="col-lg-6">
            <h2>La méthode</h2>
            <p>${todo('technique utilisée (pince, fil, cire) à préciser par la praticienne')}</p>
            <p>Si vous hésitez sur la forme, consultez les <a href="/prestations/soins-des-sourcils.html#t-formes">quatre profils de sourcils</a>.</p>
          </div>
          <div class="col-lg-5 offset-lg-1">
${fiche(confirmer('durée'), 'Repousse naturelle ' + confirmer('délai indiqué par la praticienne'), confirmer('fréquence conseillée'))}
          </div>
        </div>
      </div>
    </section>
${cta('Réserver une épilation')}`;

export default [
  { chemin: '/prestations/', titre: 'Prestations cils et sourcils | My Beauty Aura', description: 'Extensions de cils, rehaussement, soins et épilation des sourcils : découvrez les soins esthétiques du studio.', corps: index },
  { chemin: '/prestations/extensions-de-cils.html', titre: 'Extensions de cils : courbures et effets | My Beauty Aura', description: 'Extensions de cils cil à cil, hybrides ou volume. Comparez les courbures C, CC, D et L et choisissez votre effet.', corps: extensions, vue: true, scripts: ['/assets/js/app/courbure.js'] },
  { chemin: '/prestations/rehaussement-de-cils.html', titre: 'Rehaussement de cils | My Beauty Aura', description: 'Rehaussement de cils : un soin esthétique qui relève vos cils naturels sans extensions. Durée, déroulement et conseils.', corps: rehaussement },
  { chemin: '/prestations/soins-des-sourcils.html', titre: 'Soins des sourcils : restructuration et teinture | My Beauty Aura', description: 'Restructuration, teinture et lissage des sourcils. Découvrez les formes de sourcils et réservez votre soin.', corps: sourcils },
  { chemin: '/prestations/epilation-sourcils.html', titre: 'Épilation des sourcils | My Beauty Aura', description: 'Épilation des sourcils sur rendez-vous : une ligne nette et naturelle, adaptée à votre visage.', corps: epilation }
];
