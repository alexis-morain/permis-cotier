import { describe, it, expect } from 'vitest';
import { CHAPITRES, chapitreDeLaNotion, leconsDuParcours, prochaineLecon, avancement } from './parcours';
import { CODES_THEMES } from './themes';
import { NOTIONS } from './notions';

describe('les chapitres couvrent le programme', () => {
  it('rangent chaque thème dans un chapitre et un seul', () => {
    const vus = CHAPITRES.flatMap((c) => c.themes);
    expect([...vus].sort()).toEqual([...CODES_THEMES].sort());
  });

  it('ont des codes uniques', () => {
    const codes = CHAPITRES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('les leçons du parcours', () => {
  const lecons = leconsDuParcours();

  it('reprennent chaque notion une fois, dans l’ordre des chapitres puis des thèmes', () => {
    expect(lecons.map((l) => l.notion.code).sort()).toEqual(NOTIONS.map((n) => n.code).sort());
    expect(lecons[0]!.chapitre.code).toBe(CHAPITRES[0]!.code);
    expect(lecons[0]!.notion.theme).toBe(CHAPITRES[0]!.themes[0]);
  });

  it('numérotent de 1 à n sans trou', () => {
    expect(lecons.map((l) => l.rang)).toEqual(lecons.map((_, i) => i + 1));
  });

  it('gardent l’ordre de progression du thème', () => {
    const balisage = lecons.filter((l) => l.notion.theme === 'balisage').map((l) => l.notion.ordre);
    expect(balisage).toEqual([...balisage].sort((a, b) => a - b));
  });

  it('retrouvent le chapitre d’une notion', () => {
    expect(chapitreDeLaNotion('balisage-cardinal')?.code).toBe(CHAPITRES[0]!.code);
    expect(chapitreDeLaNotion('inconnue')).toBeUndefined();
  });
});

describe('la prochaine leçon', () => {
  const lecons = leconsDuParcours();

  it('est la première quand rien n’est fait', () => {
    expect(prochaineLecon({}).notion.code).toBe(lecons[0]!.notion.code);
  });

  it('est la première non faite dans l’ordre du parcours, pas la dernière faite plus une', () => {
    const faites = { [lecons[0]!.notion.code]: true, [lecons[2]!.notion.code]: true };
    expect(prochaineLecon(faites).notion.code).toBe(lecons[1]!.notion.code);
  });

  it('revient à la première quand tout est fait', () => {
    const faites = Object.fromEntries(lecons.map((l) => [l.notion.code, true]));
    expect(prochaineLecon(faites).notion.code).toBe(lecons[0]!.notion.code);
  });
});

describe('l’avancement d’un chapitre', () => {
  it('compte les leçons faites sur le total du chapitre', () => {
    const premier = CHAPITRES[0]!;
    const codes = leconsDuParcours().filter((l) => l.chapitre.code === premier.code).map((l) => l.notion.code);
    const faites = { [codes[0]!]: true, [codes[1]!]: true, 'hors-chapitre': true };
    expect(avancement(premier.code, faites)).toEqual({ faites: 2, total: codes.length });
  });
});
