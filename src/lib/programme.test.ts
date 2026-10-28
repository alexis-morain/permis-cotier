/**
 * Les rangées de la vue « Le programme » : un thème, son groupe, ses
 * questions publiées. La page ne fait que les poser dans un tableau.
 */
import { describe, it, expect } from 'vitest';
import { libelleQuestions, lignesProgramme } from './programme';
import { THEMES } from './themes';
import { GROUPES } from './groupes';

describe('libelleQuestions', () => {
  it('dit « à venir » quand aucune question n’est publiée', () => {
    expect(libelleQuestions(0)).toBe('à venir');
  });

  it('donne le nombre seul, le tableau porte le mot « Questions » en tête de colonne', () => {
    expect(libelleQuestions(1)).toBe('1');
    expect(libelleQuestions(96)).toBe('96');
  });
});

describe('lignesProgramme', () => {
  const comptes = THEMES.map((t, i) => ({
    code: t.code,
    nom: t.nom,
    intitule: t.intitule,
    description: t.description,
    cibleJ1: t.cibleJ1,
    publiees: i % 3 === 0 ? 0 : i,
  }));

  it('rend une rangée par thème, dans l’ordre de l’arrêté', () => {
    expect(lignesProgramme(comptes).map((l) => l.code)).toEqual(THEMES.map((t) => t.code));
  });

  it('rattache chaque thème à son groupe', () => {
    for (const ligne of lignesProgramme(comptes)) {
      const groupe = GROUPES.find((g) => g.themes.includes(ligne.code));
      expect(ligne.groupe).toEqual({ couleur: groupe!.couleur, nom: groupe!.nom });
    }
  });

  it('garde la description, qui reste du contenu indexable', () => {
    for (const ligne of lignesProgramme(comptes)) expect(ligne.description.length).toBeGreaterThan(20);
  });

  it('marque les thèmes sans question', () => {
    const lignes = lignesProgramme(comptes);
    expect(lignes[0]!.questions).toBe('à venir');
    expect(lignes[0]!.aVenir).toBe(true);
    expect(lignes[1]!.aVenir).toBe(false);
  });
});
