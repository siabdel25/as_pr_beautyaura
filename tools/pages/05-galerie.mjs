import { remplacer } from '../layout.mjs';

const galerie = `
    <section class="lb-section pb-4">
      <div class="container">
        <div class="row"><div class="col-lg-8">
          <h1>Galerie avant / après</h1>
          <p class="lb-intro">Déplacez le curseur pour comparer. Les réalisations du studio sont publiées uniquement avec l'accord écrit des clientes.</p>
        </div></div>
      </div>
    </section>
    <section class="lb-section pt-3" aria-labelledby="t-galerie">
      <div class="container">
        <h2 id="t-galerie" class="visually-hidden">Comparaisons</h2>
        <div id="gallery-app">
          <p v-if="exemple" class="lb-galerie-vide mb-4" v-cloak>${remplacer('Aucune réalisation de cliente n’est publiée pour le moment. Les comparaisons ci-dessous sont des illustrations qui montrent le fonctionnement du curseur.')}</p>
          <div class="lb-filtres" role="group" aria-label="Filtrer par type de soin" v-cloak>
            <button v-for="f in filtres" :key="f.id" type="button" :aria-pressed="f.id === filtre" @click="choisir(f.id)">{{ f.nom }}</button>
          </div>
          <p class="visually-hidden" aria-live="polite" v-cloak>{{ message }}</p>
          <div class="lb-galerie" v-cloak>
            <before-after v-for="i in visibles" :key="i.id" :item="i"></before-after>
          </div>
          <noscript><p>La galerie nécessite JavaScript. Pour voir des réalisations, <a href="/contact.html">contactez le studio</a>.</p></noscript>
        </div>
      </div>
    </section>`;

export default [{
  chemin: '/galerie.html',
  titre: 'Galerie avant / après cils et sourcils | My Beauty Aura',
  description: 'Comparez avant et après : extensions de cils, rehaussement et soins des sourcils, avec curseur et filtres par prestation.',
  corps: galerie,
  scripts: ['/assets/js/app/galerie.js']
}];
