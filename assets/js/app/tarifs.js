import { createApp, reactive, computed, toRefs } from 'vue';

// Le tableau reste en HTML statique (SEO) : Vue ne fait que masquer des lignes.
const FILTRES = [
  { id: 'tous', nom: 'Tous les soins' },
  { id: 'extensions', nom: 'Extensions' },
  { id: 'rehaussement', nom: 'Rehaussement' },
  { id: 'sourcils', nom: 'Sourcils' }
];

createApp({
  setup() {
    const etat = reactive({ filtre: 'tous' });
    const visible = (categorie) => etat.filtre === 'tous' || etat.filtre === categorie;
    const choisir = (id) => { etat.filtre = id; };
    const message = computed(() => {
      const f = FILTRES.find((x) => x.id === etat.filtre);
      return `Affichage : ${f.nom}`;
    });
    return { ...toRefs(etat), filtres: FILTRES, visible, choisir, message };
  }
}).mount('#tarifs-app');
