import { describe, it, expect } from 'vitest';
import {
  TAILLE_EXAMEN,
  ERREURS_ADMISES,
  SECONDES_PAR_QUESTION,
  aleaSeme,
  repartirParTheme,
  tirerExamen,
  corriger,
  calculerResultat,
  ordonnerEntrainement,
  serieDuJour,
  INTERVALLES,
  intervalle,
  estRetenue,
  estDue,
  TAILLE_SERIE_PAR_DEFAUT,
} from './quiz';
import { THEMES, cibleTotaleJ1 } from './themes';
import type { QuestionJouable, Progression } from './quiz';

function q(id: string, theme: string, reponses: string[] = ['a']): QuestionJouable {
  return {
    id,
    theme,
    reponses,
    propositions: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
  };
}

/** Une banque complète : la cible J1 de chaque thème, multipliée par `facteur`. */
function banque(facteur = 1): QuestionJouable[] {
  return THEMES.flatMap((t) =>
    Array.from({ length: t.cibleJ1 * facteur }, (_, i) =>
      q(`${t.code}-${String(i + 1).padStart(4, '0')}`, t.code),
    ),
  );
}

describe('constantes de l’épreuve', () => {
  it('reprend le format de l’arrêté', () => {
    expect(TAILLE_EXAMEN).toBe(40);
    expect(ERREURS_ADMISES).toBe(5);
    expect(SECONDES_PAR_QUESTION).toBe(20);
  });
});

describe('répartition des questions par thème', () => {
  it('distribue exactement la taille demandée', () => {
    const r = repartirParTheme(40, Object.fromEntries(THEMES.map((t) => [t.code, 99])));
    expect(Object.values(r).reduce((a, b) => a + b, 0)).toBe(40);
  });

  it('respecte les proportions du programme', () => {
    // La taille demandée est la somme des cibles : chaque thème doit alors
    // retrouver exactement la sienne, sans arrondi.
    const r = repartirParTheme(cibleTotaleJ1(), Object.fromEntries(THEMES.map((t) => [t.code, 99])));
    for (const t of THEMES) expect(r[t.code]).toBe(t.cibleJ1);
  });

  it('donne au thème le plus lourd au moins autant qu’au plus léger', () => {
    const r = repartirParTheme(40, Object.fromEntries(THEMES.map((t) => [t.code, 99])));
    expect(r['feux-marques']!).toBeGreaterThan(r['ecluses']!);
  });

  it('ne demande jamais plus de questions qu’un thème n’en a', () => {
    const dispo = Object.fromEntries(THEMES.map((t) => [t.code, 1]));
    const r = repartirParTheme(40, dispo);
    for (const t of THEMES) expect(r[t.code]!).toBeLessThanOrEqual(1);
  });

  it('reporte sur les autres thèmes ce qu’un thème pauvre ne peut pas fournir', () => {
    const dispo = Object.fromEntries(THEMES.map((t) => [t.code, 99]));
    dispo['feux-marques'] = 0;
    const r = repartirParTheme(40, dispo);
    expect(r['feux-marques']).toBe(0);
    expect(Object.values(r).reduce((a, b) => a + b, 0)).toBe(40);
  });

  it('plafonne à ce qui existe quand la banque est trop petite', () => {
    const dispo = Object.fromEntries(THEMES.map((t) => [t.code, 1]));
    const r = repartirParTheme(40, dispo);
    expect(Object.values(r).reduce((a, b) => a + b, 0)).toBe(14);
  });
});

describe('tirage de l’examen blanc', () => {
  it('tire quarante questions sur une banque complète', () => {
    expect(tirerExamen(banque(), aleaSeme(1))).toHaveLength(40);
  });

  it('ne tire jamais deux fois la même question', () => {
    const tirage = tirerExamen(banque(2), aleaSeme(7));
    expect(new Set(tirage.map((x) => x.id)).size).toBe(40);
  });

  it('respecte les proportions du programme en moyenne', () => {
    // Les places entières sont fixes, les décimales sont tirées au sort. On
    // juge donc la moyenne sur beaucoup de tirages, pas un tirage isolé.
    const tirages = 300;
    const cumul = new Map<string, number>();
    for (let graine = 0; graine < tirages; graine++) {
      for (const x of tirerExamen(banque(), aleaSeme(graine))) {
        cumul.set(x.theme, (cumul.get(x.theme) ?? 0) + 1);
      }
    }
    for (const t of THEMES) {
      const attendu = (t.cibleJ1 / cibleTotaleJ1()) * TAILLE_EXAMEN;
      expect(Math.abs((cumul.get(t.code) ?? 0) / tirages - attendu)).toBeLessThan(0.25);
    }
  });

  it('donne toujours ses places entières au thème le plus lourd', () => {
    for (let graine = 0; graine < 50; graine++) {
      const n = tirerExamen(banque(), aleaSeme(graine)).filter((x) => x.theme === 'feux-marques').length;
      expect(n).toBeGreaterThanOrEqual(6);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it('fait sortir un thème rare parfois, pas toujours', () => {
    const presences = Array.from({ length: 60 }, (_, g) =>
      tirerExamen(banque(), aleaSeme(g)).some((x) => x.theme === 'ecluses'),
    );
    expect(presences.filter(Boolean).length).toBeGreaterThan(5);
    expect(presences.filter((p) => !p).length).toBeGreaterThan(5);
  });

  it('donne le même tirage pour la même graine, un autre pour une autre', () => {
    const a = tirerExamen(banque(3), aleaSeme(42)).map((x) => x.id);
    const b = tirerExamen(banque(3), aleaSeme(42)).map((x) => x.id);
    const c = tirerExamen(banque(3), aleaSeme(43)).map((x) => x.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('mélange l’ordre au lieu de grouper les thèmes', () => {
    const themes = tirerExamen(banque(2), aleaSeme(11)).map((x) => x.theme);
    const groupes = themes.filter((t, i) => t !== themes[i - 1]).length;
    expect(groupes).toBeGreaterThan(20);
  });

  it('rend tout ce qu’il a quand la banque est plus petite que l’examen', () => {
    const petite = [q('vhf-0001', 'vhf'), q('meteo-0001', 'meteo')];
    expect(tirerExamen(petite, aleaSeme(1))).toHaveLength(2);
  });
});

describe('correction, réponse exacte exigée', () => {
  const simple = q('vhf-0001', 'vhf', ['b']);
  const double = q('vhf-0002', 'vhf', ['b', 'd']);

  it('valide la bonne réponse unique', () => {
    expect(corriger(simple, ['b'])).toBe(true);
  });

  it('refuse une mauvaise réponse', () => {
    expect(corriger(simple, ['a'])).toBe(false);
  });

  it('refuse une bonne réponse noyée dans une mauvaise', () => {
    expect(corriger(simple, ['a', 'b'])).toBe(false);
  });

  it('valide les deux bonnes réponses quelle que soit leur saisie', () => {
    expect(corriger(double, ['b', 'd'])).toBe(true);
    expect(corriger(double, ['d', 'b'])).toBe(true);
  });

  it('refuse une réponse partielle', () => {
    expect(corriger(double, ['b'])).toBe(false);
  });

  it('compte une absence de réponse comme une erreur', () => {
    expect(corriger(simple, [])).toBe(false);
  });

  it('ignore les doublons dans la saisie', () => {
    expect(corriger(simple, ['b', 'b'])).toBe(true);
  });
});

describe('résultat de l’examen', () => {
  const quarante = Array.from({ length: 40 }, (_, i) => q(`vhf-${String(i).padStart(4, '0')}`, 'vhf', ['a']));

  function passe(bonnes: number) {
    const reponses = quarante.map((_, i) => (i < bonnes ? ['a'] : ['b']));
    return calculerResultat(quarante, reponses);
  }

  it('compte les bonnes réponses et les erreurs', () => {
    const r = passe(37);
    expect(r.bonnes).toBe(37);
    expect(r.erreurs).toBe(3);
    expect(r.total).toBe(40);
  });

  it('déclare réussi à 35 bonnes réponses sur 40', () => {
    expect(passe(35).reussi).toBe(true);
  });

  it('déclare échoué à 34 bonnes réponses sur 40', () => {
    expect(passe(34).reussi).toBe(false);
  });

  it('détaille le score par thème', () => {
    const mixte = [q('vhf-0001', 'vhf', ['a']), q('meteo-0001', 'meteo', ['a'])];
    const r = calculerResultat(mixte, [['a'], ['b']]);
    expect(r.parTheme['vhf']).toEqual({ bonnes: 1, total: 1 });
    expect(r.parTheme['meteo']).toEqual({ bonnes: 0, total: 1 });
  });

  it('compte une question sans réponse comme une erreur', () => {
    const r = calculerResultat([q('vhf-0001', 'vhf', ['a'])], [[]]);
    expect(r.bonnes).toBe(0);
    expect(r.erreurs).toBe(1);
  });

  it('liste les identifiants ratés pour la revue', () => {
    const deux = [q('vhf-0001', 'vhf', ['a']), q('vhf-0002', 'vhf', ['a'])];
    expect(calculerResultat(deux, [['a'], ['b']]).ratees).toEqual(['vhf-0002']);
  });
});

describe('ordonnancement de l’entraînement', () => {
  const questions = [
    q('vhf-0001', 'vhf'),
    q('vhf-0002', 'vhf'),
    q('vhf-0003', 'vhf'),
    q('vhf-0004', 'vhf'),
  ];

  const progression: Progression = {
    'vhf-0001': { vues: 3, ratees: 0, derniereReussie: true, vueLe: '2026-09-01', succes: 3, dernierSuccesLe: '2026-09-01', revoirLe: '2026-09-08' },
    'vhf-0002': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-03', succes: 0, revoirLe: '2026-09-03' },
    'vhf-0004': { vues: 2, ratees: 2, derniereReussie: false, vueLe: '2026-09-02', succes: 0, revoirLe: '2026-09-02' },
  };

  it('met les ratées en premier, puis les jamais vues, puis le reste', () => {
    const ordre = ordonnerEntrainement(questions, progression).map((x) => x.id);
    expect(ordre.slice(0, 2).sort()).toEqual(['vhf-0002', 'vhf-0004']);
    expect(ordre[2]).toBe('vhf-0003');
    expect(ordre[3]).toBe('vhf-0001');
  });

  it('sort la plus ancienne ratée en premier', () => {
    const ordre = ordonnerEntrainement(questions, progression).map((x) => x.id);
    expect(ordre[0]).toBe('vhf-0004');
  });

  it('rend tout dans l’ordre reçu quand la progression est vide', () => {
    expect(ordonnerEntrainement(questions, {}).map((x) => x.id)).toEqual([
      'vhf-0001', 'vhf-0002', 'vhf-0003', 'vhf-0004',
    ]);
  });

  it('ne perd ni ne duplique aucune question', () => {
    const ordre = ordonnerEntrainement(questions, progression);
    expect(new Set(ordre.map((x) => x.id)).size).toBe(questions.length);
  });
});

describe('règles du rappel espacé', () => {
  it('espace les révisions de un, trois, sept puis vingt et un jours', () => {
    expect(INTERVALLES).toEqual([1, 3, 7, 21]);
    expect(intervalle(1)).toBe(1);
    expect(intervalle(2)).toBe(3);
    expect(intervalle(3)).toBe(7);
    expect(intervalle(4)).toBe(21);
    // Au-delà du dernier palier, l'intervalle ne grandit plus.
    expect(intervalle(9)).toBe(21);
  });

  it('ne tient pour retenue qu’une question réussie deux jours différents', () => {
    const un = { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-01', succes: 1, dernierSuccesLe: '2026-09-01', revoirLe: '2026-09-02' };
    expect(estRetenue(un)).toBe(false);
    expect(estRetenue({ ...un, succes: 2 })).toBe(true);
    expect(estRetenue({ ...un, succes: 0, derniereReussie: false })).toBe(false);
  });

  it('dit due une question dont le jour de révision est arrivé, jamais une jamais vue', () => {
    const e = { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-01', succes: 1, dernierSuccesLe: '2026-09-01', revoirLe: '2026-09-04' };
    expect(estDue(e, '2026-09-03')).toBe(false);
    expect(estDue(e, '2026-09-04')).toBe(true);
    expect(estDue(e, '2026-09-30')).toBe(true);
    expect(estDue(undefined, '2026-09-30')).toBe(false);
    expect(estDue({ ...e, revoirLe: undefined }, '2026-09-30')).toBe(false);
  });
});

describe('série du jour', () => {
  const questions = [
    { ...q('vhf-0001', 'vhf'), notion: 'vhf-canaux' },
    { ...q('vhf-0002', 'vhf'), notion: 'vhf-canaux' },
    { ...q('vhf-0003', 'vhf'), notion: 'vhf-detresse' },
    { ...q('vhf-0004', 'vhf'), notion: 'vhf-detresse' },
  ];
  const progression: Progression = {
    'vhf-0001': { vues: 3, ratees: 0, derniereReussie: true, vueLe: '2026-09-01', succes: 3, dernierSuccesLe: '2026-09-01', revoirLe: '2026-09-08' },
    'vhf-0002': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-03', succes: 0, revoirLe: '2026-09-03' },
    'vhf-0004': { vues: 2, ratees: 2, derniereReussie: false, vueLe: '2026-09-02', succes: 0, revoirLe: '2026-09-02' },
  };

  it('rend ce qui est dû aujourd’hui, la plus en retard d’abord', () => {
    const serie = serieDuJour(questions, progression, '2026-09-03', 10).map((x) => x.id);
    expect(serie.slice(0, 2)).toEqual(['vhf-0004', 'vhf-0002']);
  });

  it('laisse dehors ce qui n’est pas encore dû', () => {
    const serie = serieDuJour(questions, progression, '2026-09-03', 10).map((x) => x.id);
    expect(serie).not.toContain('vhf-0001');
  });

  it('reprend une question réussie une fois quand son jour arrive', () => {
    const serie = serieDuJour(questions, progression, '2026-09-08', 10).map((x) => x.id);
    expect(serie).toContain('vhf-0001');
  });

  it('complète avec les jamais vues quand la place reste', () => {
    const serie = serieDuJour(questions, progression, '2026-09-03', 10).map((x) => x.id);
    expect(serie).toContain('vhf-0003');
    // Les dues passent devant : elles sont le geste du jour.
    expect(serie.indexOf('vhf-0003')).toBeGreaterThan(serie.indexOf('vhf-0002'));
  });

  it('prend les jamais vues des notions les plus faibles d’abord', () => {
    const banqueLarge = [
      ...questions,
      { ...q('vhf-0005', 'vhf'), notion: 'vhf-canaux' },
      { ...q('vhf-0006', 'vhf'), notion: 'vhf-detresse' },
    ];
    // « vhf-canaux » : une retenue sur deux vues. « vhf-detresse » : zéro sur une.
    const p: Progression = {
      'vhf-0001': { vues: 3, ratees: 0, derniereReussie: true, vueLe: '2026-09-01', succes: 3, dernierSuccesLe: '2026-09-01', revoirLe: '2026-09-30' },
      'vhf-0002': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-03', succes: 0, revoirLe: '2026-09-30' },
      'vhf-0004': { vues: 2, ratees: 2, derniereReussie: false, vueLe: '2026-09-02', succes: 0, revoirLe: '2026-09-30' },
    };
    const serie = serieDuJour(banqueLarge, p, '2026-09-03', 10).map((x) => x.id);
    expect(serie.slice(0, 2)).toEqual(['vhf-0003', 'vhf-0006']);
    // « vhf-canaux » tient mieux : sa question neuve passe en dernier.
    expect(serie[2]).toBe('vhf-0005');
  });

  it('ne dépasse jamais le rythme du candidat', () => {
    expect(serieDuJour(questions, progression, '2026-09-03', 1).map((x) => x.id)).toEqual(['vhf-0004']);
    expect(serieDuJour(questions, progression, '2026-09-03', 3)).toHaveLength(3);
  });

  it('borne à vingt questions quand aucun rythme n’est donné', () => {
    expect(TAILLE_SERIE_PAR_DEFAUT).toBe(20);
    const large = Array.from({ length: 40 }, (_, i) => q(`vhf-${String(i).padStart(4, '0')}`, 'vhf'));
    expect(serieDuJour(large, {}, '2026-09-03')).toHaveLength(20);
  });

  it('ne perd ni ne duplique aucune question', () => {
    const serie = serieDuJour(questions, progression, '2026-09-03', 10);
    expect(new Set(serie.map((x) => x.id)).size).toBe(serie.length);
  });
});
