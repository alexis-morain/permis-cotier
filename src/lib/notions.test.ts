import { describe, it, expect } from 'vitest';
import {
  NOTIONS,
  CODES_NOTIONS,
  notionParCode,
  estCodeNotion,
  notionsDuTheme,
  cibleNotionsDuTheme,
  notionsOrphelines,
} from './notions';
import { THEMES } from './themes';

describe('référentiel des notions', () => {
  it('a des codes uniques', () => {
    expect(new Set(CODES_NOTIONS).size).toBe(CODES_NOTIONS.length);
  });

  it('ne rattache aucune notion à un thème inconnu', () => {
    expect(notionsOrphelines()).toEqual([]);
  });

  it('couvre les quatorze thèmes, aucun n’étant laissé sans notion', () => {
    for (const t of THEMES) {
      expect(notionsDuTheme(t.code).length).toBeGreaterThan(0);
    }
  });

  it('numérote les notions d’un thème de 1 à n, sans trou ni doublon', () => {
    for (const t of THEMES) {
      const ordres = notionsDuTheme(t.code).map((n) => n.ordre);
      expect(ordres).toEqual(ordres.map((_, i) => i + 1));
    }
  });

  it('retrouve une notion par son code', () => {
    expect(notionParCode('barre-voiliers')?.theme).toBe('barre-route');
    expect(notionParCode('inexistante')).toBeUndefined();
  });

  it('reconnaît un code de notion valide', () => {
    expect(estCodeNotion('vhf-detresse')).toBe(true);
    expect(estCodeNotion('vhf')).toBe(false);
  });

  it('donne à chaque notion un nom, un résumé, un ancrage et une cible utiles', () => {
    for (const n of NOTIONS) {
      expect(n.nom.length).toBeGreaterThan(0);
      expect(n.resume.length).toBeGreaterThan(40);
      expect(n.ancrage.length).toBeGreaterThan(0);
      expect(n.cible).toBeGreaterThan(0);
    }
  });

  it('somme les cibles des notions d’un thème', () => {
    expect(cibleNotionsDuTheme('carburant')).toBe(4);
    expect(cibleNotionsDuTheme('inexistant')).toBe(0);
  });
});
