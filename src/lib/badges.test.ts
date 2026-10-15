import { describe, it, expect } from 'vitest';
import {
  EXAMENS_SANS_FAUTE,
  PALIERS_BADGE,
  SEUIL_RETENU,
  attribuerBadges,
  badgesLisibles,
  faitDuBadge,
  prochainPalier,
} from './badges';
import {
  enregistrerExamen,
  enregistrerReponse,
  etatInitial,
  terminerLecon,
  type Etat,
  type ExamenPasse,
} from './progression';
import { notionsDuTheme } from './notions';
import { THEMES } from './themes';
import type { QuestionConnue } from './profil';

const JOUR = '2026-10-14';

/** `n` questions publiées du thème, `<thème>-<k>`. */
function questions(theme: string, n: number): QuestionConnue[] {
  return Array.from({ length: n }, (_, k) => ({ id: `${theme}-${k}`, theme }));
}

/** Retenue : réussie deux jours différents, au sens d'`estRetenue`. */
function retenir(etat: Etat, ids: readonly string[]): Etat {
  let e = etat;
  for (const id of ids) {
    e = enregistrerReponse(e, id, true, '2026-10-01');
    e = enregistrerReponse(e, id, true, '2026-10-02');
  }
  return e;
}

function retenirN(etat: Etat, theme: string, n: number): Etat {
  return retenir(etat, Array.from({ length: n }, (_, k) => `${theme}-${k}`));
}

function suivreLecons(etat: Etat, theme: string, date = '2026-10-12'): Etat {
  return notionsDuTheme(theme).reduce((e, n) => terminerLecon(e, n.code, { bonnes: 1, total: 1 }, date), etat);
}

/** Un examen complet ; `parTheme` comme `calculerResultat` le rend. */
function examen(parTheme: ExamenPasse['parTheme'], date = '2026-10-10'): ExamenPasse {
  return { date, bonnes: 38, total: 40, reussi: true, ...(parTheme ? { parTheme } : {}) };
}

/** Les examens dans l'ordre où on les a passés : le dernier est le plus récent. */
function passer(etat: Etat, examens: readonly ExamenPasse[]): Etat {
  return examens.reduce(enregistrerExamen, etat);
}

const sansFaute = (theme: string) => examen({ [theme]: { bonnes: 3, total: 3 }, vhf: { bonnes: 4, total: 6 } });
const avecFaute = (theme: string) => examen({ [theme]: { bonnes: 2, total: 3 } });

describe('les paliers', () => {
  it('sont trois, dans l’ordre où on les gagne, avec leur nom affiché', () => {
    expect(PALIERS_BADGE).toEqual([
      { code: 'parcouru', nom: 'Parcouru' },
      { code: 'retenu', nom: 'Retenu' },
      { code: 'sur', nom: 'Sûr à l’examen' },
    ]);
    expect(SEUIL_RETENU).toBe(0.8);
    expect(EXAMENS_SANS_FAUTE).toBe(3);
  });
});

describe('parcouru', () => {
  const banque = questions('ecluses', 5);

  it('se gagne quand toutes les leçons du thème sont suivies, daté du jour du geste', () => {
    const { etat, nouveaux } = attribuerBadges(suivreLecons(etatInitial(), 'ecluses'), banque, JOUR);
    expect(etat.badges).toEqual({ ecluses: { parcouru: JOUR } });
    expect(nouveaux).toEqual([{ theme: 'ecluses', palier: 'parcouru', date: JOUR, lecons: 3 }]);
  });

  it('ne se gagne pas à une leçon près', () => {
    const [premiere, ...autres] = notionsDuTheme('ecluses');
    const e = autres.reduce((x, n) => terminerLecon(x, n.code, { bonnes: 0, total: 0 }, JOUR), etatInitial());
    expect(premiere).toBeDefined();
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toEqual([]);
  });

  it('se gagne quel que soit le score de la vérification : aller au bout suffit', () => {
    const e = notionsDuTheme('ecluses').reduce((x, n) => terminerLecon(x, n.code, { bonnes: 0, total: 3 }, JOUR), etatInitial());
    expect(attribuerBadges(e, banque, JOUR).etat.badges.ecluses?.parcouru).toBe(JOUR);
  });

  it('ne se gagne pas pour un thème sans leçon : pas de badge vide', () => {
    const { nouveaux } = attribuerBadges(etatInitial(), questions('sans-lecon', 2), JOUR);
    expect(nouveaux).toEqual([]);
  });

  it('ne se gagne pas pour un thème sans question publiée', () => {
    const { nouveaux } = attribuerBadges(suivreLecons(etatInitial(), 'ecluses'), questions('vhf', 3), JOUR);
    expect(nouveaux.some((n) => n.theme === 'ecluses')).toBe(false);
  });
});

describe('retenu', () => {
  it('se gagne à 80 % pile, pas à 79 %', () => {
    const banque = questions('vhf', 100);
    expect(attribuerBadges(retenirN(etatInitial(), 'vhf', 79), banque, JOUR).nouveaux).toEqual([]);
    expect(attribuerBadges(retenirN(etatInitial(), 'vhf', 80), banque, JOUR).nouveaux).toEqual([
      { theme: 'vhf', palier: 'retenu', date: JOUR, retenues: 80, total: 100 },
    ]);
  });

  it('arrondit le seuil au supérieur : 87 sur 108, pas 86', () => {
    const banque = questions('feux-marques', 108);
    expect(attribuerBadges(retenirN(etatInitial(), 'feux-marques', 86), banque, JOUR).nouveaux).toEqual([]);
    expect(attribuerBadges(retenirN(etatInitial(), 'feux-marques', 87), banque, JOUR).nouveaux).toHaveLength(1);
  });

  it('ne compte que les questions retenues, pas celles réussies une seule fois', () => {
    let e = etatInitial();
    for (const q of questions('vhf', 10)) e = enregistrerReponse(e, q.id, true, JOUR);
    expect(attribuerBadges(e, questions('vhf', 10), JOUR).nouveaux).toEqual([]);
  });

  it('ne compte pas une question retirée de la banque', () => {
    // 8 retenues sur les 10 d'hier ; deux d'entre elles sont retirées, et la
    // banque gagne deux questions neuves : 6 sur 10.
    const e = retenirN(etatInitial(), 'vhf', 8);
    const banque = [...questions('vhf', 10).slice(2), ...questions('vhf-neuve', 2).map((q) => ({ ...q, theme: 'vhf' }))];
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toEqual([]);
  });

  it('ne compte que les questions du thème', () => {
    const banque = [...questions('vhf', 10), ...questions('meteo', 10)];
    const e = retenirN(etatInitial(), 'meteo', 10);
    expect(attribuerBadges(e, banque, JOUR).nouveaux.map((n) => n.theme)).toEqual(['meteo']);
  });
});

describe('sûr à l’examen', () => {
  const banque = [...questions('ecluses', 5), ...questions('vhf', 10)];

  it('se gagne sur trois examens complets de suite sans faute sur le thème', () => {
    const e = passer(etatInitial(), [sansFaute('ecluses'), sansFaute('ecluses'), sansFaute('ecluses')]);
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toEqual([{ theme: 'ecluses', palier: 'sur', date: JOUR }]);
  });

  it('ne se gagne pas sur deux', () => {
    const e = passer(etatInitial(), [sansFaute('ecluses'), sansFaute('ecluses')]);
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toEqual([]);
  });

  it('se casse par une faute sur le thème dans l’un des trois derniers', () => {
    const e = passer(etatInitial(), [sansFaute('ecluses'), avecFaute('ecluses'), sansFaute('ecluses'), sansFaute('ecluses')]);
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toEqual([]);
  });

  it('ne regarde que les trois derniers : une faute plus ancienne ne compte plus', () => {
    const e = passer(etatInitial(), [avecFaute('ecluses'), sansFaute('ecluses'), sansFaute('ecluses'), sansFaute('ecluses')]);
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toHaveLength(1);
  });

  it('un examen sans question du thème ne casse ni ne compte', () => {
    const ailleurs = examen({ vhf: { bonnes: 6, total: 6 } });
    const e = passer(etatInitial(), [sansFaute('ecluses'), ailleurs, sansFaute('ecluses'), ailleurs]);
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toEqual([]);
    const e3 = passer(e, [sansFaute('ecluses')]);
    expect(attribuerBadges(e3, banque, JOUR).nouveaux).toEqual([{ theme: 'ecluses', palier: 'sur', date: JOUR }]);
  });

  it('ignore les examens d’avant le détail par thème', () => {
    const e = passer(etatInitial(), [sansFaute('ecluses'), sansFaute('ecluses'), examen(undefined), examen(undefined)]);
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toEqual([]);
    expect(attribuerBadges(passer(e, [sansFaute('ecluses')]), banque, JOUR).nouveaux).toHaveLength(1);
  });

  it('ignore un examen dont le détail est illisible', () => {
    const illisible = { ...examen(undefined), parTheme: { ecluses: { bonnes: 'trois', total: 3 } } } as unknown as ExamenPasse;
    const e = passer(etatInitial(), [sansFaute('ecluses'), sansFaute('ecluses'), illisible]);
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toEqual([]);
  });

  it('ignore un examen vide', () => {
    const vide: ExamenPasse = { date: JOUR, bonnes: 0, total: 0, reussi: false, parTheme: {} };
    const e = passer(etatInitial(), [sansFaute('ecluses'), sansFaute('ecluses'), vide, sansFaute('ecluses')]);
    expect(attribuerBadges(e, banque, JOUR).nouveaux).toHaveLength(1);
  });
});

describe('attribuerBadges', () => {
  const banque = [...questions('ecluses', 5), ...questions('balisage', 10)];
  const toutGagne = () =>
    passer(retenirN(suivreLecons(etatInitial(), 'ecluses'), 'ecluses', 4), [
      sansFaute('ecluses'), sansFaute('ecluses'), sansFaute('ecluses'),
    ]);

  it('rend les nouveaux dans l’ordre du programme, puis des paliers', () => {
    const e = retenirN(suivreLecons(toutGagne(), 'balisage'), 'balisage', 8);
    expect(attribuerBadges(e, banque, JOUR).nouveaux.map((n) => `${n.theme}:${n.palier}`)).toEqual([
      'balisage:parcouru', 'balisage:retenu', 'ecluses:parcouru', 'ecluses:retenu', 'ecluses:sur',
    ]);
  });

  it('est idempotente : rappelée, elle ne rend rien de neuf et ne change rien', () => {
    const une = attribuerBadges(toutGagne(), banque, JOUR);
    const deux = attribuerBadges(une.etat, banque, '2026-10-20');
    expect(deux.nouveaux).toEqual([]);
    expect(deux.etat).toEqual(une.etat);
  });

  it('garde la date du jour où le badge a été gagné', () => {
    const une = attribuerBadges(suivreLecons(etatInitial(), 'ecluses'), banque, '2026-10-12');
    const plusTard = attribuerBadges(retenirN(une.etat, 'ecluses', 4), banque, '2026-10-20');
    expect(plusTard.etat.badges.ecluses).toEqual({ parcouru: '2026-10-12', retenu: '2026-10-20' });
  });

  it('ne retire jamais un badge : ni après une faute, ni après un retrait de la banque', () => {
    const gagne = attribuerBadges(toutGagne(), banque, JOUR).etat;
    let e = gagne;
    for (const q of questions('ecluses', 5)) e = enregistrerReponse(e, q.id, false, '2026-10-20');
    e = passer(e, [avecFaute('ecluses')]);
    const apres = attribuerBadges(e, questions('balisage', 10), '2026-10-21');
    expect(apres.etat.badges.ecluses).toEqual({ parcouru: JOUR, retenu: JOUR, sur: JOUR });
    expect(apres.nouveaux).toEqual([]);
  });

  it('ne touche pas l’état reçu', () => {
    const e = toutGagne();
    attribuerBadges(e, banque, JOUR);
    expect(e.badges).toEqual({});
  });

  it('relit sans perte un état d’avant les badges', () => {
    const { badges: _, ...ancien } = suivreLecons(etatInitial(), 'ecluses');
    const { etat } = attribuerBadges(ancien as Etat, banque, JOUR);
    expect(etat.badges).toEqual({ ecluses: { parcouru: JOUR } });
  });

  it('jette les entrées illisibles de l’état et garde les autres', () => {
    const e = { ...etatInitial(), badges: { vhf: { retenu: 'hier', sur: '2026-10-01' }, meteo: 'tout' } } as unknown as Etat;
    expect(attribuerBadges(e, banque, JOUR).etat.badges).toEqual({ vhf: { sur: '2026-10-01' } });
  });
});

describe('badgesLisibles', () => {
  it('garde les dates lisibles des paliers connus, jette le reste', () => {
    expect(
      badgesLisibles({
        vhf: { parcouru: '2026-10-12', retenu: 12, sur: 'hier', inconnu: '2026-10-12' },
        meteo: 'tout',
        ecluses: { retenu: '2026-10-13' },
        signaux: {},
        carburant: null,
      }),
    ).toEqual({ vhf: { parcouru: '2026-10-12' }, ecluses: { retenu: '2026-10-13' } });
  });

  it('rend vide ce qui n’est pas un objet', () => {
    for (const brut of [undefined, null, 'vhf', 3, ['vhf']]) expect(badgesLisibles(brut)).toEqual({});
  });
});

describe('faitDuBadge', () => {
  it('dit les leçons suivies, avec le nom du thème et la date en français', () => {
    expect(faitDuBadge('feux-marques', 'parcouru', { date: '2026-10-12', lecons: 9 })).toBe(
      'Les 9 leçons des feux et marques suivies, le 12 octobre.',
    );
    expect(faitDuBadge('balisage', 'parcouru', { date: '2026-10-01', lecons: 10 })).toBe(
      'Les 10 leçons du balisage suivies, le 1er octobre.',
    );
    expect(faitDuBadge('environnement', 'parcouru', { date: '2026-11-03', lecons: 7 })).toBe(
      'Les 7 leçons de l’environnement suivies, le 3 novembre.',
    );
  });

  it('accorde une leçon seule', () => {
    expect(faitDuBadge('meteo', 'parcouru', { date: '2026-10-12', lecons: 1 })).toBe(
      'La leçon de la météorologie suivie, le 12 octobre.',
    );
  });

  it('sans le compte du jour, dit ce qui reste vrai', () => {
    expect(faitDuBadge('ecluses', 'parcouru', { date: '2026-10-12' })).toBe(
      'Toutes les leçons des écluses suivies, le 12 octobre.',
    );
    expect(faitDuBadge('ecluses', 'retenu', { date: '2026-10-20' })).toBe(
      'Au moins quatre questions sur cinq retenues, le 20 octobre.',
    );
  });

  it('dit les questions retenues', () => {
    expect(faitDuBadge('feux-marques', 'retenu', { date: '2026-10-20', retenues: 87, total: 108 })).toBe(
      '87 questions sur 108 retenues, le 20 octobre.',
    );
    expect(faitDuBadge('ecluses', 'retenu', { date: '2026-10-20', retenues: 1, total: 1 })).toBe(
      '1 question sur 1 retenue, le 20 octobre.',
    );
  });

  it('dit les trois examens sans faute, sur le thème nommé', () => {
    expect(faitDuBadge('vhf', 'sur', { date: '2026-10-20' })).toBe(
      'Trois examens blancs de suite sans faute sur la VHF et le SMDSM, le 20 octobre.',
    );
  });

  it('nomme chacun des quatorze thèmes sans retomber sur le libellé brut', () => {
    for (const t of THEMES) {
      expect(faitDuBadge(t.code, 'sur', { date: JOUR })).not.toContain('thème');
    }
  });

  it('nomme un thème inconnu sans casser', () => {
    expect(faitDuBadge('inconnu', 'sur', { date: JOUR })).toBe(
      'Trois examens blancs de suite sans faute sur le thème «\u00a0inconnu\u00a0», le 14 octobre.',
    );
  });
});

describe('prochainPalier', () => {
  const banque = [...questions('feux-marques', 108), ...questions('ecluses', 5), ...questions('sans-lecon', 4)];
  const lecons = notionsDuTheme('feux-marques').length;

  it('commence par les leçons', () => {
    const e = terminerLecon(etatInitial(), notionsDuTheme('feux-marques')[0]!.code, { bonnes: 1, total: 1 }, JOUR);
    expect(prochainPalier(e, banque, 'feux-marques')).toEqual({
      palier: 'parcouru',
      fait: `1 leçon suivie sur ${lecons} ; à ${lecons}, le palier Parcouru.`,
    });
    expect(prochainPalier(etatInitial(), banque, 'feux-marques')?.fait).toBe(
      `0 leçon suivie sur ${lecons} ; à ${lecons}, le palier Parcouru.`,
    );
  });

  it('puis les questions retenues, seuil arrondi au supérieur', () => {
    const e = attribuerBadges(retenirN(suivreLecons(etatInitial(), 'feux-marques'), 'feux-marques', 61), banque, JOUR).etat;
    expect(prochainPalier(e, banque, 'feux-marques')).toEqual({
      palier: 'retenu',
      fait: '61 retenues sur 108 ; à 87, le palier Retenu.',
    });
  });

  it('puis les examens sans faute de suite', () => {
    const base = attribuerBadges(retenirN(suivreLecons(etatInitial(), 'ecluses'), 'ecluses', 4), banque, JOUR).etat;
    expect(prochainPalier(base, banque, 'ecluses')).toEqual({
      palier: 'sur',
      fait: 'Aucun examen blanc sans faute sur ce thème pour l’instant ; à 3 de suite, le palier Sûr à l’examen.',
    });
    expect(prochainPalier(passer(base, [sansFaute('ecluses')]), banque, 'ecluses')?.fait).toBe(
      '1 examen blanc de suite sans faute sur ce thème ; à 3, le palier Sûr à l’examen.',
    );
    expect(prochainPalier(passer(base, [avecFaute('ecluses'), sansFaute('ecluses'), sansFaute('ecluses')]), banque, 'ecluses')?.fait).toBe(
      '2 examens blancs de suite sans faute sur ce thème ; à 3, le palier Sûr à l’examen.',
    );
  });

  it('lit les badges gagnés, pas l’état du jour : un palier gagné ne se redemande pas', () => {
    const e = attribuerBadges(suivreLecons(etatInitial(), 'ecluses'), banque, JOUR).etat;
    expect(prochainPalier({ ...e, lecons: {} }, banque, 'ecluses')?.palier).toBe('retenu');
  });

  it('saute un palier impossible : un thème sans leçon passe aux questions', () => {
    expect(prochainPalier(etatInitial(), banque, 'sans-lecon')?.palier).toBe('retenu');
  });

  it('rend null quand tout est gagné', () => {
    const e = { ...etatInitial(), badges: { ecluses: { parcouru: JOUR, retenu: JOUR, sur: JOUR } } };
    expect(prochainPalier(e, banque, 'ecluses')).toBeNull();
  });

  it('rend null pour un thème sans question publiée', () => {
    expect(prochainPalier(suivreLecons(etatInitial(), 'meteo'), banque, 'meteo')).toBeNull();
  });
});
