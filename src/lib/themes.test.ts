import { describe, it, expect } from 'vitest';
import { THEMES, themeParCode, cibleTotaleJ1, estCodeTheme } from './themes';

describe('table des thèmes', () => {
  it('contient les quatorze thèmes de l’arrêté', () => {
    expect(THEMES).toHaveLength(14);
  });

  it('a des codes uniques', () => {
    const codes = THEMES.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('totalise 120 questions à la cible J1', () => {
    expect(cibleTotaleJ1()).toBe(120);
  });

  it('retrouve un thème par son code', () => {
    expect(themeParCode('vhf')?.cibleJ1).toBe(15);
    expect(themeParCode('inexistant')).toBeUndefined();
  });

  it('reconnaît un code de thème valide', () => {
    expect(estCodeTheme('feux-marques')).toBe(true);
    expect(estCodeTheme('feux')).toBe(false);
  });

  it('donne à chaque thème un libellé et une description non vides', () => {
    for (const t of THEMES) {
      expect(t.nom.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(20);
    }
  });
});
