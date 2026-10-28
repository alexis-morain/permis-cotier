/**
 * Les quatre groupes de thèmes de DESIGN.md, décidés le 28 octobre 2026 : une
 * étiquette pâle chacun, et chaque thème du programme dans un groupe et un
 * seul.
 */
import { describe, it, expect } from 'vitest';
import { GROUPES, groupeDuTheme } from './groupes';
import { CODES_THEMES } from './themes';

describe('les groupes de thèmes', () => {
  it('sont quatre, chacun avec sa couleur', () => {
    expect(GROUPES.map((g) => [g.couleur, g.nom])).toEqual([
      ['bleu', 'Ce qu’on voit sur l’eau'],
      ['rose', 'Qui passe en premier'],
      ['sable', 'Préparer la sortie'],
      ['orange', 'Sécurité et papiers'],
    ]);
  });

  it('rangent les thèmes comme Alexis les a rangés', () => {
    const rangement = Object.fromEntries(GROUPES.map((g) => [g.couleur, [...g.themes].sort()]));
    expect(rangement).toEqual({
      bleu: ['balisage', 'balisage-region-b', 'feux-marques', 'signaux'],
      rose: ['barre-route', 'ecluses'],
      sable: ['carburant', 'carte-marine', 'meteo'],
      orange: ['environnement', 'securite', 'ski-responsabilites', 'titre-conduite', 'vhf'],
    });
  });

  it('couvrent chaque thème du programme une fois et une seule', () => {
    const ranges = GROUPES.flatMap((g) => g.themes);
    expect([...ranges].sort()).toEqual([...CODES_THEMES].sort());
  });

  it('se retrouvent depuis le code d’un thème', () => {
    expect(groupeDuTheme('ecluses')?.couleur).toBe('rose');
    expect(groupeDuTheme('vhf')?.nom).toBe('Sécurité et papiers');
    expect(groupeDuTheme('inconnu')).toBeUndefined();
  });
});
