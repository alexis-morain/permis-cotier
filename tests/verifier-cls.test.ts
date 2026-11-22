/**
 * `scripts/verifier-cls.mjs` : le calcul du CLS et le verdict sont des
 * fonctions pures ; le banc Chromium tourne dans la CI, sur le build.
 */
import { describe, it, expect } from 'vitest';
import { cumulCls, defauts, SEUIL, ECRANS } from '../scripts/verifier-cls.mjs';

describe('verifier-cls', () => {
  it('additionne les décalages', () => {
    expect(cumulCls([{ value: 0.32, hadRecentInput: false }, { value: 0.08, hadRecentInput: false }])).toBeCloseTo(0.4);
  });

  it('ne compte pas un décalage qui suit une action de la personne', () => {
    expect(cumulCls([{ value: 0.3, hadRecentInput: true }, { value: 0.01, hadRecentInput: false }])).toBeCloseTo(0.01);
    expect(cumulCls([])).toBe(0);
  });

  it('refuse au-dessus du seuil, pas à égalité', () => {
    expect(defauts({ '/a': SEUIL, '/b': 0 })).toEqual([]);
    expect(defauts({ '/a': 0.402, '/b': 0 })).toEqual([`/a : CLS 0.4020 au-dessus de ${SEUIL}`]);
  });

  it('couvre les quatre écrans de jeu', () => {
    expect(ECRANS).toEqual(['/entrainement/feux-marques', '/entrainement/melange', '/examen', '/revoir']);
  });
});
