import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { parse } from 'yaml';
import { melangerPropositions } from './melange';

/**
 * La preuve, sur la banque telle qu'elle est sur le disque.
 *
 * Les fichiers de `data/questions/` placent la bonne réponse en première ligne
 * dans 361 des 455 questions à réponse unique (79 %), en deuxième dans 85
 * (19 %), en troisième dans 9 (2 %), jamais en quatrième. Comme les questions
 * ont deux, trois ou quatre propositions, le hasard donnerait 36 % à la
 * première ligne : cocher la première case rapportait le double. Ce test compte
 * où la bonne réponse tombe une fois mélangée. S'il rougit, le défaut est revenu.
 *
 *     npx vitest run src/lib/melange-banque.test.ts
 */

const dossier = new URL('../../data/questions/', import.meta.url);

interface QuestionDuDisque {
  id: string;
  statut: string;
  propositions: { id: string }[];
  reponses: string[];
}

function lireLaBanque(): QuestionDuDisque[] {
  const questions: QuestionDuDisque[] = [];
  for (const theme of readdirSync(dossier)) {
    // `_inbox` tient les brouillons, il ne fait pas partie de la banque.
    if (theme.startsWith('_')) continue;
    const sousDossier = new URL(`${theme}/`, dossier);
    if (!statSync(sousDossier).isDirectory()) continue;
    for (const fichier of readdirSync(sousDossier)) {
      if (!fichier.endsWith('.yaml')) continue;
      questions.push(parse(readFileSync(new URL(fichier, sousDossier), 'utf-8')) as QuestionDuDisque);
    }
  }
  return questions.filter((q) => q.statut === 'publie');
}

const banque = lireLaBanque();
const reponseUnique = banque.filter((q) => q.reponses.length === 1);

/** Graines fixes : le test mesure une distribution, il ne joue pas aux dés. */
const GRAINES = Array.from({ length: 40 }, (_, i) => i * 7919 + 13);

/** Combien de fois la bonne réponse tombe sur chaque ligne, toutes graines confondues. */
function positions(questions: readonly QuestionDuDisque[], lignes: number): number[] {
  const compte = Array.from({ length: lignes }, () => 0);
  for (const graine of GRAINES) {
    for (const q of questions) {
      const rang = melangerPropositions(q.propositions, graine, q.id).findIndex(
        (p) => p.id === q.reponses[0],
      );
      compte[rang]! += 1;
    }
  }
  return compte;
}

describe('position affichée de la bonne réponse, sur la banque réelle', () => {
  it('a de quoi mesurer', () => {
    expect(banque.length).toBeGreaterThan(400);
    expect(reponseUnique.length).toBeGreaterThan(400);
  });

  // Les questions n'ont pas toutes le même nombre de propositions : on compare
  // ce qui est comparable, groupe par groupe.
  for (const lignes of [2, 3, 4]) {
    it(`répartit la bonne réponse sur les ${lignes} lignes`, () => {
      const groupe = reponseUnique.filter((q) => q.propositions.length === lignes);
      expect(groupe.length).toBeGreaterThan(20);

      const compte = positions(groupe, lignes);
      const tirages = compte.reduce((a, b) => a + b, 0);
      expect(tirages).toBeGreaterThanOrEqual(1000);

      // Quatre points d'écart admis autour de la part attendue : sur ces
      // milliers de tirages l'écart type est bien plus petit, et les graines
      // sont fixes, donc le verdict ne change pas d'une exécution à l'autre.
      for (const c of compte) {
        expect(Math.abs(c / tirages - 1 / lignes)).toBeLessThan(0.04);
      }
    });
  }

  it('ne laisse plus la première ligne payer', () => {
    // 79 % avant le mélange, sur toute la banque à réponse unique. Après, la
    // part attendue est la moyenne des 1/n, soit 36 %.
    const compte = positions(reponseUnique, 4);
    const tirages = compte.reduce((a, b) => a + b, 0);
    expect(tirages).toBeGreaterThanOrEqual(2000);
    expect(compte[0]! / tirages).toBeLessThan(0.4);
    expect(compte[0]! / tirages).toBeGreaterThan(0.32);
  });

  it('ne laisse plus les deux premières lignes emporter les questions doubles', () => {
    // Le couple attendu est « a » et « b » dans 56 des 61 questions à double
    // réponse : cocher les deux premières cases en gagnait 92 %.
    const doubles = banque.filter((q) => q.reponses.length === 2);
    let gagnees = 0;
    let tirages = 0;
    for (const graine of GRAINES) {
      for (const q of doubles) {
        const deux = melangerPropositions(q.propositions, graine, q.id).slice(0, 2);
        if (deux.every((p) => q.reponses.includes(p.id))) gagnees += 1;
        tirages += 1;
      }
    }
    expect(gagnees / tirages).toBeLessThan(0.25);
  });
});
