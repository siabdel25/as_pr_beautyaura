import { createApp, reactive, computed, toRefs } from 'vue';
import { COURBURES, PAUPIERE, cilsPaths } from './lash-geometry.js';

const DESCRIPTIONS = {
  C: 'Un relevé doux, pour un regard ouvert et naturel.',
  CC: 'Un relevé plus marqué, qui ouvre davantage le regard.',
  D: 'Un relevé prononcé, pour un effet très ouvert.',
  L: 'Une base droite puis un relevé net en bout : un effet plus graphique.'
};

createApp({
  setup() {
    const etat = reactive({ choix: 'CC' });
    const chemins = computed(() => cilsPaths(etat.choix, { n: 15, longueur: 32, eventail: 1.05 }));
    const description = computed(() => DESCRIPTIONS[etat.choix]);
    const choisir = (nom) => { etat.choix = nom; };
    return { ...toRefs(etat), courbures: Object.values(COURBURES), chemins, description, choisir, paupiere: PAUPIERE };
  }
}).mount('#courbure-app');
