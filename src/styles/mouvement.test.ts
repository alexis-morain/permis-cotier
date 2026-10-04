/**
 * La règle du mouvement de DESIGN.md, lue sur les feuilles du site : transform
 * et opacité seulement, 120 à 200 ms, tout coupé sous `prefers-reduced-motion`.
 * Deux exceptions nommées, et pas une de plus : l'horloge du chrono, qui glisse
 * une seconde en linéaire entre deux battements, et la silhouette qui bat le
 * temps que la banque arrive. Les feuilles `app-*` suivent `docs/app-da.md`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const racine = new URL('../../', import.meta.url);
const lire = (chemin: string) => readFileSync(new URL(chemin, racine), 'utf-8');

const FEUILLES = [
  'src/styles/global.css',
  'src/components/quiz.css',
  'src/components/profil.css',
  'src/components/lecon.css',
  'src/components/recherche.css',
];

/** Ce qui a le droit de durer plus de 200 ms ou de boucler, et pourquoi. */
const TOLERES: Record<string, string> = {
  'quiz.css .jeu__barre span': 'l’horloge du chrono : une seconde linéaire entre deux battements',
  'quiz.css .silhouette': 'l’attente de la banque : la silhouette bat jusqu’à la vraie question',
};

type Regle = { selecteur: string; corps: string; reduit: boolean };

/** Les règles d'une feuille, chacune avec son sélecteur et si elle est sous `reduce`. */
function regles(css: string): Regle[] {
  const sans = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const sortie: Regle[] = [];
  const pile: string[] = [];
  let depuis = 0;
  for (let i = 0; i < sans.length; i++) {
    const c = sans[i];
    if (c === '{') {
      pile.push(sans.slice(depuis, i).trim());
      depuis = i + 1;
    } else if (c === '}') {
      const selecteur = pile.pop() ?? '';
      const corps = sans.slice(depuis, i);
      if (!selecteur.startsWith('@')) {
        const reduit = pile.some((p) => p.includes('prefers-reduced-motion'));
        sortie.push({ selecteur: selecteur.replace(/\s+/g, ' '), corps, reduit });
      }
      depuis = i + 1;
    } else if (c === ';' && pile.length > 0) {
      // une déclaration finie : le texte qui suit appartient au même bloc
    }
  }
  return sortie;
}

const nom = (chemin: string) => chemin.split('/').pop() ?? chemin;

const declarations = (corps: string) =>
  corps.split(';').map((d) => d.trim()).filter((d) => /^(transition|animation)/.test(d));

const enMs = (m: RegExpMatchArray) => (m[2] === 's' ? Number(m[1]) * 1000 : Number(m[1]));
const temps = (segment: string) => [...segment.matchAll(/(\d*\.?\d+)(ms|s)\b/g)].map(enMs);

/** Les segments d'une déclaration, séparés par les virgules hors parenthèses :
    celles d'un `cubic-bezier` ne séparent rien. */
const segments = (declaration: string) => declaration.replace(/\([^)]*\)/g, '()').split(',');

/** Les durées d'une déclaration de mouvement : le premier temps de chaque
    segment. Le second est un délai, qui a sa propre borne. */
const durees = (declaration: string) =>
  segments(declaration).map((segment) => temps(segment)[0]).filter((ms): ms is number => ms !== undefined);
const delais = (declaration: string) =>
  segments(declaration).map((segment) => temps(segment)[1]).filter((ms): ms is number => ms !== undefined);

describe('le mouvement du site', () => {
  const feuilles = FEUILLES.map((chemin) => ({ chemin, css: lire(chemin), regles: regles(lire(chemin)) }));

  it('dure entre 120 et 200 ms, hors les deux exceptions nommées', () => {
    const fautes: string[] = [];
    for (const { chemin, regles: liste } of feuilles) {
      for (const r of liste) {
        if (r.reduit) continue;
        if (TOLERES[`${nom(chemin)} ${r.selecteur}`]) continue;
        for (const d of declarations(r.corps)) {
          for (const ms of durees(d)) {
            if (ms < 120 || ms > 200) fautes.push(`${nom(chemin)} ${r.selecteur} : ${d} (${ms} ms)`);
          }
          // Un échelon entre frères dit « ceci arrive ensemble » ; au-delà de
          // 100 ms il devient une chorégraphie.
          for (const ms of delais(d)) {
            if (ms > 100) fautes.push(`${nom(chemin)} ${r.selecteur} : ${d} (délai ${ms} ms)`);
          }
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it('ne boucle que le temps d’une attente, jamais pour attirer l’œil', () => {
    const boucles: string[] = [];
    for (const { chemin, regles: liste } of feuilles) {
      for (const r of liste) {
        if (r.reduit || TOLERES[`${nom(chemin)} ${r.selecteur}`]) continue;
        if (declarations(r.corps).some((d) => /\binfinite\b/.test(d))) boucles.push(`${nom(chemin)} ${r.selecteur}`);
      }
    }
    expect(boucles).toEqual([]);
  });

  it('n’anime que transform et opacity dans ses keyframes', () => {
    const fautes: string[] = [];
    for (const { chemin, css } of feuilles) {
      const sans = css.replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of sans.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\}\s*\}/g)) {
        const proprietes = [...m[2].matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1]);
        for (const p of proprietes) {
          if (p !== 'transform' && p !== 'opacity') fautes.push(`${nom(chemin)} @keyframes ${m[1]} anime ${p}`);
        }
      }
    }
    expect(fautes).toEqual([]);
  });

  it('coupe chaque exception sous prefers-reduced-motion, où 0,01 ms ferait battre une boucle à vide', () => {
    for (const cle of Object.keys(TOLERES)) {
      const [fichier, ...reste] = cle.split(' ');
      const selecteur = reste.join(' ');
      const feuille = feuilles.find((f) => nom(f.chemin) === fichier);
      const coupe = feuille?.regles.some(
        (r) => r.reduit && r.selecteur.split(',').map((s) => s.trim()).includes(selecteur)
          && /(animation|transition)\s*:\s*none/.test(r.corps),
      );
      expect(coupe, `${cle} : ${TOLERES[cle]}`).toBe(true);
    }
  });

  it('garde la coupe globale de global.css', () => {
    const global = lire('src/styles/global.css');
    expect(global).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*html \{ scroll-behavior: auto; \}\s*\*, \*::before, \*::after \{\s*animation-duration: 0\.01ms !important;\s*transition-duration: 0\.01ms !important;/);
  });
});
