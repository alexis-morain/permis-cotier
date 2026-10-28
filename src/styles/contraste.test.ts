/**
 * La règle des paires testées de DESIGN.md : chaque texte sur son fond tient
 * 4,5:1, chaque bord de contrôle 3:1, en clair et en sombre. Les jetons sont
 * lus dans `global.css` tels qu'ils partent, `var()` résolus : une couleur
 * changée là sans passer ici rougit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./global.css', import.meta.url), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Les déclarations `--nom: valeur` du premier bloc dont le sélecteur est `selecteur`. */
function bloc(selecteur: string): Record<string, string> {
  const debut = css.indexOf(`${selecteur} {`);
  if (debut < 0) throw new Error(`bloc introuvable : ${selecteur}`);
  const corps = css.slice(css.indexOf('{', debut) + 1, css.indexOf('}', debut));
  return Object.fromEntries([...corps.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2]!.trim()]));
}

const CLAIR = bloc(':root');
const SOMBRE = { ...CLAIR, ...bloc(':root[data-apparence="sombre"]') };

function resoudre(jetons: Record<string, string>, nom: string, vus = new Set<string>()): string {
  const valeur = jetons[nom];
  if (valeur === undefined) throw new Error(`jeton absent : ${nom}`);
  if (vus.has(nom)) throw new Error(`boucle sur ${nom}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(valeur);
  return ref ? resoudre(jetons, ref[1]!, new Set([...vus, nom])) : valeur;
}

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`couleur non hexadécimale : ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1]!.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function rapport(a: string, b: string): number {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair! + 0.05) / (fonce! + 0.05);
}

/** Texte sur fond, 4,5:1. */
const TEXTES: [string, string][] = [
  ['--texte', '--fond'],
  ['--texte', '--fond-2'],
  ['--texte', '--teinte'],
  ['--texte-doux', '--fond'],
  ['--texte-doux', '--fond-2'],
  ['--texte-doux', '--teinte'],
  ['--sur-action', '--action'],
  ['--sur-action', '--action-survol'],
  ['--lien', '--fond'],
  ['--lien', '--fond-2'],
  ['--sur-jaune', '--jaune'],
  ['--vert-texte', '--fond'],
  ['--vert-texte', '--vert-pale'],
  ['--rouge-texte', '--fond'],
  ['--rouge-texte', '--rouge-pale'],
  ['--texte', '--vert-pale'],
  ['--texte', '--rouge-pale'],
  // La feuille de correction de l'app : la source en légende et le lien de la
  // leçon sur le fond du verdict.
  ['--texte-doux', '--vert-pale'],
  ['--texte-doux', '--rouge-pale'],
  ['--lien', '--vert-pale'],
  ['--lien', '--rouge-pale'],
  ['--sur-verdict', '--vert'],
  ['--sur-verdict', '--rouge'],
  ['--bleu-texte', '--bleu'],
  ['--rose-texte', '--rose'],
  ['--sable-texte', '--sable'],
  ['--orange-texte', '--orange'],
];

/** Bord ou marque d'un contrôle sur son fond, 3:1 (WCAG 1.4.11). */
const BORDS: [string, string][] = [
  ['--filet-fort', '--fond'],
  ['--filet-fort', '--fond-2'],
  ['--anneau', '--fond'],
  ['--action', '--fond'],
  ['--vert', '--fond'],
  ['--rouge', '--fond'],
  ['--vert', '--vert-pale'],
  ['--rouge', '--rouge-pale'],
  ['--bleu-trait', '--fond'],
  ['--rose-trait', '--fond'],
  ['--sable-trait', '--fond'],
  ['--orange-trait', '--fond'],
];

describe.each([
  ['clair', CLAIR],
  ['sombre', SOMBRE],
])('les paires de couleur en %s', (_nom, jetons) => {
  const mesure = ([a, b]: [string, string]) => rapport(resoudre(jetons, a), resoudre(jetons, b));

  it.each(TEXTES)('%s sur %s tient 4,5:1', (a, b) => {
    expect(mesure([a, b])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(BORDS)('%s sur %s tient 3:1', (a, b) => {
    expect(mesure([a, b])).toBeGreaterThanOrEqual(3);
  });
});

describe('le sombre du système et celui de la fiche', () => {
  it('posent les mêmes jetons', () => {
    // Le bloc est écrit deux fois, voir global.css : pour le système, et pour
    // le choix fait sur la fiche. Ils ne doivent pas diverger.
    const debut = css.indexOf('@media (prefers-color-scheme: dark)');
    const systeme = css.slice(css.indexOf('{', css.indexOf('{', debut) + 1) + 1, css.indexOf('}', debut));
    const jetons = Object.fromEntries([...systeme.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2]!.trim()]));
    expect(jetons).toEqual(bloc(':root[data-apparence="sombre"]'));
  });
});

describe('la police', () => {
  it('est celle du système : aucune n’est téléchargée', () => {
    expect(css).not.toMatch(/@font-face|@import/);
    expect(resoudre(CLAIR, '--sans')).toMatch(/^ui-sans-serif, -apple-system/);
  });
});
