import { describe, it, expect } from 'vitest';
import {
  COURS,
  coursParCode,
  coursDeLaNotion,
  coursSuivant,
  leconsDuParcours,
  leconsDuCours,
  leconParCode,
  prochaineLecon,
  avancement,
  cheminCours,
  cheminLecon,
  themesHorsParcours,
} from './parcours';
import { CODES_THEMES, themeParCode } from './themes';
import { NOTIONS } from './notions';

describe('les cours couvrent le programme', () => {
  it('donnent un cours à chaque thème, et un seul', () => {
    expect([...COURS.map((c) => c.code)].sort()).toEqual([...CODES_THEMES].sort());
    expect(themesHorsParcours()).toEqual([]);
  });

  it('portent le code de leur thème', () => {
    for (const c of COURS) expect(themeParCode(c.code)).toBeDefined();
  });

  it('disent ce qu’on saura faire et ce qu’on rate, sans tic d’écriture', () => {
    for (const c of COURS) {
      expect(c.savoirFaire.length, c.code).toBeGreaterThanOrEqual(2);
      expect(c.pieges.length, c.code).toBeGreaterThanOrEqual(2);
      const texte = [c.titre, c.promesse, c.pourquoi, c.methode, ...c.savoirFaire, ...c.pieges].join('\n');
      expect(texte, c.code).not.toMatch(/—/);
      expect(texte, c.code).not.toMatch(/\b(en effet|par ailleurs|en outre|il convient de|il est important de)\b/i);
    }
  });

  it('commencent par le balisage : ce qu’on voit avant ce qu’on lit', () => {
    expect(COURS[0]!.code).toBe('balisage');
  });
});

describe('les leçons du parcours', () => {
  const lecons = leconsDuParcours();

  it('reprennent chaque notion une fois, dans l’ordre des cours', () => {
    expect(lecons.map((l) => l.notion.code).sort()).toEqual(NOTIONS.map((n) => n.code).sort());
    expect(lecons[0]!.cours.code).toBe(COURS[0]!.code);
  });

  it('numérotent de 1 à n sans trou, et de 1 à n dans chaque cours', () => {
    expect(lecons.map((l) => l.rang)).toEqual(lecons.map((_, i) => i + 1));
    for (const c of COURS) {
      expect(leconsDuCours(c.code).map((l) => l.rangDansCours)).toEqual(leconsDuCours(c.code).map((_, i) => i + 1));
    }
  });

  it('gardent l’ordre de progression du thème', () => {
    const balisage = lecons.filter((l) => l.notion.theme === 'balisage').map((l) => l.notion.ordre);
    expect(balisage).toEqual([...balisage].sort((a, b) => a - b));
  });

  it('ont une adresse sous celle de leur cours', () => {
    const lecon = leconParCode('balisage-cardinal')!;
    expect(cheminCours('balisage')).toBe('/cours/balisage');
    expect(cheminLecon(lecon.notion)).toBe('/cours/balisage/balisage-cardinal');
    expect(lecon.chemin).toBe('/cours/balisage/balisage-cardinal');
  });

  it('retrouvent le cours d’une notion', () => {
    expect(coursDeLaNotion('balisage-cardinal')?.code).toBe('balisage');
    expect(coursDeLaNotion('inconnue')).toBeUndefined();
    expect(coursParCode('vhf')?.code).toBe('vhf');
    expect(coursParCode('inconnu')).toBeUndefined();
  });

  it('enchaînent les cours dans l’ordre du parcours, sans boucler', () => {
    expect(coursSuivant(COURS[0]!.code)?.code).toBe(COURS[1]!.code);
    expect(coursSuivant(COURS[COURS.length - 1]!.code)).toBeUndefined();
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

  it('se borne à un cours quand on le lui demande', () => {
    const vhf = leconsDuCours('vhf');
    const faites = { [vhf[0]!.notion.code]: true, [lecons[0]!.notion.code]: true };
    expect(prochaineLecon(faites, 'vhf').notion.code).toBe(vhf[1]!.notion.code);
  });
});

describe('l’avancement d’un cours', () => {
  it('compte les leçons faites sur le total du cours', () => {
    const premier = COURS[0]!;
    const codes = leconsDuCours(premier.code).map((l) => l.notion.code);
    const faites = { [codes[0]!]: true, [codes[1]!]: true, 'hors-cours': true };
    expect(avancement(premier.code, faites)).toEqual({ faites: 2, total: codes.length });
  });
});
