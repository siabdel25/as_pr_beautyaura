// Génère assets/icons/sprite.svg : cils (courbures, effets), formes de sourcils, logo.
// Usage : node tools/build-sprite.mjs
import { writeFileSync } from 'node:fs';
import { cilsPaths, PAUPIERE } from '../assets/js/app/lash-geometry.js';

const trait = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

const oeil = (id, titre, courbure, opts) => {
  const cils = cilsPaths(courbure, opts).map((d) => `<path d="${d}"/>`).join('');
  return `<symbol id="${id}" viewBox="0 0 200 100"><title>${titre}</title><g ${trait} stroke-width="2.8"><path d="${PAUPIERE}" stroke-width="2.4" opacity=".55"/><path d="M20 70 Q100 100 180 70" stroke-width="1.6" opacity=".35"/>${cils}</g></symbol>`;
};


const courbe = (id, titre, d) =>
  `<symbol id="${id}" viewBox="0 0 120 80"><title>${titre}</title><g ${trait} stroke-width="3"><path d="M6 72 H114" stroke-width="1.5" opacity=".35"/><path d="${d}"/></g></symbol>`;

const sourcil = (id, titre, d) =>
  `<symbol id="${id}" viewBox="0 0 200 80"><title>${titre}</title><g ${trait} stroke-width="9"><path d="${d}"/></g><g ${trait} stroke-width="2" opacity=".5" transform="translate(0 -9)"><path d="${d}"/></g></symbol>`;

const symboles = [
  // Logo : trait de cil courbé et trois cils
  `<symbol id="logo" viewBox="0 0 32 32"><g ${trait} stroke-width="1.8"><path d="M3 24 C10 25 20 20 28 5"/><path d="M8 25 C13 24 19 20 23 12" opacity=".7"/><path d="M14 24 C17 22 21 19 22 15" opacity=".5"/></g></symbol>`,
  // Courbures (un cil seul)
  courbe('curve-c', 'Courbure C : relevé naturel', 'M8 70 C40 68 80 56 108 24'),
  courbe('curve-cc', 'Courbure CC : relevé marqué', 'M8 70 C40 68 90 52 106 14'),
  courbe('curve-d', 'Courbure D : relevé très prononcé', 'M8 70 C50 68 104 50 100 8'),
  courbe('curve-l', 'Courbure L : base droite, relevé net en bout', 'M8 70 H78 C100 70 110 40 108 8'),
  // Yeux avec cils : effets
  oeil('eye-naturel', 'Effet naturel : un cil par cil', 'C', { n: 9, longueur: 24, eventail: 0.8 }),
  oeil('eye-volume', 'Effet volume : fournis et denses', 'CC', { n: 17, longueur: 30, eventail: 1 }),
  oeil('eye-hybride', 'Effet hybride : longueurs mêlées', 'CC', { n: 13, longueur: 30, eventail: 1, motif: [1, 0.75] }),
  oeil('eye-wispy', 'Effet œil de biche : cils plus longs vers l’extérieur', 'D', { n: 11, longueur: 28, eventail: 1.4, motif: [1, 0.6, 0.85] }),
  // Formes de sourcils
  sourcil('brow-droit', 'Sourcil droit', 'M20 52 C70 48 120 46 180 52'),
  sourcil('brow-doux', 'Sourcil doux, légèrement courbé', 'M20 58 C60 42 112 38 180 58'),
  sourcil('brow-arque', 'Sourcil arqué', 'M20 62 C55 46 95 26 125 28 C150 30 170 46 182 64'),
  sourcil('brow-ascendant', 'Sourcil ascendant', 'M20 66 C70 58 120 42 182 28')
];

const svg = `<svg xmlns="http://www.w3.org/2000/svg">${symboles.join('\n')}</svg>\n`;
writeFileSync(new URL('../assets/icons/sprite.svg', import.meta.url), svg);
console.log('sprite.svg généré :', svg.length, 'octets');
