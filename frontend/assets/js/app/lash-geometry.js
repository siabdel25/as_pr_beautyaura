// Géométrie des cils : partagée par le sélecteur de courbure (navigateur)
// et par tools/build-sprite.mjs (illustrations statiques).

export const COURBURES = {
  C: { nom: 'C', a: 0.45, b: 0.8, k2: 0.1, k: 0.25 },
  CC: { nom: 'CC', a: 0.4, b: 0.75, k2: 0.2, k: 0.42 },
  D: { nom: 'D', a: 0.35, b: 0.65, k2: 0.3, k: 0.62 },
  L: { nom: 'L', a: 0.7, b: 0.9, k2: 0, k: 0.45 }
};

// Paupière supérieure dans un repère 200 x 100 (courbe de Bézier quadratique)
const P0 = [20, 70];
const P1 = [100, 20];
const P2 = [180, 70];
export const PAUPIERE = `M${P0} Q${P1} ${P2}`;

const arrondi = (n) => Math.round(n * 10) / 10;

function pointEtNormale(t) {
  const u = 1 - t;
  const x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0];
  const y = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1];
  const tx = 2 * u * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
  const ty = 2 * u * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
  const n = Math.hypot(tx, ty);
  return { x, y, nx: ty / n, ny: -tx / n };
}

/**
 * Retourne un tableau de chemins SVG (attribut d) : un par cil.
 * @param {string} courbure C | CC | D | L
 * @param {{n?: number, longueur?: number, eventail?: number, motif?: number[]}} options
 *   motif : coefficients de longueur répétés (ex. [1, 0.7] pour alterner long et court)
 */
export function cilsPaths(courbure, { n = 11, longueur = 28, eventail = 1, motif = [1] } = {}) {
  const c = COURBURES[courbure] ?? COURBURES.C;
  const chemins = [];
  for (let i = 0; i < n; i += 1) {
    const t = 0.05 + (0.92 * i) / (n - 1);
    const { x, y, nx, ny } = pointEtNormale(t);
    const rot = (t - 0.5) * eventail;
    const dx = nx * Math.cos(rot) - ny * Math.sin(rot);
    const dy = nx * Math.sin(rot) + ny * Math.cos(rot);
    const px = -dy; // perpendiculaire : le cil se recourbe vers l'extérieur
    const py = dx;
    const len = longueur * (0.7 + 0.55 * t) * motif[i % motif.length];
    const pt = (f, k) => [arrondi(x + f * len * dx + k * len * px), arrondi(y + f * len * dy + k * len * py)];
    chemins.push(`M${arrondi(x)} ${arrondi(y)} C${pt(c.a, 0)} ${pt(c.b, c.k2)} ${pt(1, c.k)}`);
  }
  return chemins;
}
