/**
 * `scripts/verifier-budgets.mjs` : les trois bornes de `docs/budgets.md`.
 * Les comptes sont des fonctions pures ; le document du dépôt doit se lire.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { controler, estUnTest, lignes, lireBudgets, mentionsPourApp, poidsDuCode } from '../scripts/verifier-budgets.mjs';

const budgets = { lignesParFichier: 600, pourAppDansLesComposants: 40, examen: { reference: 1000, marge: 100 } };
const f = (chemin: string, n: number, pourApp = 0) => ({ chemin, lignes: n, pourApp });

describe('verifier-budgets', () => {
  it('lit les bornes dans le bloc JSON du document du dépôt', () => {
    const b = lireBudgets(readFileSync('docs/budgets.md', 'utf-8'));
    expect(b.lignesParFichier).toBe(600);
    expect(b.pourAppDansLesComposants).toBe(40);
    expect(b.examen.marge).toBe(1024);
  });

  it('compte POUR_APP hors des lignes d’import, commentaires compris', () => {
    const source = "import { POUR_APP } from '../lib/cible';\n// Dans l'app (POUR_APP) :\nconst a = POUR_APP ? 1 : POUR_APP_X;\n";
    expect(mentionsPourApp(source)).toBe(2);
  });

  it('compte les lignes d’un fichier qui finit par un saut de ligne', () => {
    expect(lignes('a\nb\n')).toBe(2);
    expect(lignes('a\nb')).toBe(2);
  });

  it('reconnaît les tests', () => {
    expect(estUnTest('src/components/Quiz.test.tsx')).toBe(true);
    expect(estUnTest('src/components/lecon-site.app.test.ts')).toBe(true);
    expect(estUnTest('src/components/Quiz.tsx')).toBe(false);
  });

  it('dans les budgets, rien à dire', () => {
    expect(controler(budgets, [f('a.tsx', 600, 20), f('b.tsx', 10, 20)], 1100)).toEqual([]);
  });

  it('un fichier trop long, trop de POUR_APP ou un /examen trop lourd sont refusés', () => {
    const d = controler(budgets, [f('a.tsx', 601, 30), f('b.tsx', 10, 11)], 1101);
    expect(d).toHaveLength(3);
    expect(d[0]).toContain('a.tsx fait 601 lignes');
    expect(d[1]).toContain('41 mentions');
    expect(d[2]).toContain('1101 octets');
  });

  it('le poids du code ne compte ni la police ni la banque', () => {
    expect(poidsDuCode({ parGenre: { html: 1, css: 2, js: 3, police: 100, autre: 1000 } })).toBe(6);
  });
});
