// Curseur avant/après : un <input type="range"> natif porte le clavier et les lecteurs d'écran,
// le visuel n'est qu'un détourage (clip-path) piloté par une variable CSS.
export default {
  name: 'BeforeAfter',
  props: { item: { type: Object, required: true } },
  data: () => ({ position: 50 }),
  computed: {
    texteValeur() { return `Avant ${this.position} %, après ${100 - this.position} %`; },
    descriptionVisuel() { return `${this.item.avant.alt}. ${this.item.apres.alt}.`; }
  },
  methods: {
    src(c) { return `/assets/icons/sprite.svg#${c.symbole}`; }
  },
  template: `
    <figure class="lb-comparaison">
      <div class="lb-comparaison__visuel" :style="{ '--lb-pos': position + '%' }">
        <svg v-if="item.avant.symbole" class="lb-comparaison__calque" viewBox="0 0 200 100" role="img" :aria-label="item.avant.alt"><use :href="src(item.avant)"/></svg>
        <img v-else class="lb-comparaison__calque" :src="item.avant.src" :alt="item.avant.alt" width="800" height="600" loading="lazy" decoding="async">
        <svg v-if="item.apres.symbole" class="lb-comparaison__calque lb-comparaison__calque--apres" viewBox="0 0 200 100" role="img" :aria-label="item.apres.alt"><use :href="src(item.apres)"/></svg>
        <img v-else class="lb-comparaison__calque lb-comparaison__calque--apres" :src="item.apres.src" :alt="item.apres.alt" width="800" height="600" loading="lazy" decoding="async">
        <span class="lb-comparaison__etiquette lb-comparaison__etiquette--avant" aria-hidden="true">Avant</span>
        <span class="lb-comparaison__etiquette lb-comparaison__etiquette--apres" aria-hidden="true">Après</span>
        <span class="lb-comparaison__poignee" aria-hidden="true"></span>
        <input class="lb-comparaison__curseur" type="range" min="0" max="100" step="1" v-model.number="position"
          :aria-label="'Comparer avant et après : ' + item.titre" :aria-valuetext="texteValeur">
      </div>
      <figcaption>
        {{ item.titre }}
        <span v-if="item.type === 'illustration'" class="lb-comparaison__mention">Illustration, aucune cliente.</span>
      </figcaption>
    </figure>`
};
