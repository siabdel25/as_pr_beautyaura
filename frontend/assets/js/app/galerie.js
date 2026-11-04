import { createApp, reactive, computed, toRefs } from 'vue';
import BeforeAfter from './components/BeforeAfter.js';

const reponse = await fetch('/data/galerie.json');
const donnees = await reponse.json();

const app = createApp({
  components: { BeforeAfter },
  setup() {
    const etat = reactive({ filtre: 'tous' });
    // Une réalisation de cliente n'apparaît qu'avec un accord écrit enregistré dans les données
    const publiables = donnees.items.filter((i) => i.type === 'illustration' || i.consentement === true);
    const visibles = computed(() => publiables.filter((i) => etat.filtre === 'tous' || i.categorie === etat.filtre));
    const message = computed(() => {
      const f = donnees.filtres.find((x) => x.id === etat.filtre);
      return `${visibles.value.length} comparaison(s) affichée(s) : ${f.nom}`;
    });
    const choisir = (id) => { etat.filtre = id; };
    return { ...toRefs(etat), filtres: donnees.filtres, exemple: donnees.statut === 'exemple', visibles, message, choisir };
  }
});
app.mount('#gallery-app');
