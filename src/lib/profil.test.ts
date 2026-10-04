import { describe, it, expect } from 'vitest';
import {
  etatInitial,
  enregistrerReponse,
  enregistrerExamen,
  enregistrerProfil,
  profilVide,
  terminerLecon,
} from './progression';
import type { Etat } from './progression';
import {
  MOTIVATIONS,
  PALIERS,
  phraseDuPalier,
  RYTHMES,
  indice,
  serieDeJours,
  objectifDuJour,
  maitriseParTheme,
  maitriseParNotion,
  notionsLesPlusFaibles,
  jalons,
  rappel,
  pointFinal,
  quatorzeJours,
  joursAvant,
} from './profil';

/**
 * Le moteur de la fiche : tout ce qui se déduit de la progression locale.
 * Fonctions pures, testées sans navigateur, comme le reste de `lib/`.
 */

const banque = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: `vhf-${i}`, theme: 'vhf' })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `feux-${i}`, theme: 'feux-marques' })),
];

function examen(etat = etatInitial(), bonnes: number, date = '2026-09-05') {
  return enregistrerExamen(etat, { date, bonnes, total: 40, reussi: 40 - bonnes <= 5 });
}

/**
 * Réussir une question deux jours différents : c'est ce qui la rend
 * « retenue » depuis le rappel espacé. Une seule réussite ne suffit plus.
 */
function retenir(etat: Etat, id: string): Etat {
  return enregistrerReponse(enregistrerReponse(etat, id, true, '2026-09-01'), id, true, '2026-09-02');
}

describe('indice de préparation', () => {
  it('est nul quand rien n’a été joué', () => {
    const i = indice(etatInitial(), banque);
    expect(i.score).toBe(0);
    expect(i.palier).toBe('demarre');
    expect(i.parts).toEqual({ vu: 0, retenu: 0, examens: 0 });
  });

  it('pèse ce qu’on a vu, ce qu’on retient et les examens', () => {
    let e = etatInitial();
    // Dix questions vues sur vingt, huit retenues : réussies deux jours de suite.
    for (let k = 0; k < 10; k++) e = enregistrerReponse(e, `vhf-${k}`, k < 8, '2026-09-01');
    for (let k = 0; k < 8; k++) e = enregistrerReponse(e, `vhf-${k}`, true, '2026-09-02');
    const i = indice(e, banque);
    expect(i.parts.vu).toBe(10); // 20 × 10/20
    expect(i.parts.retenu).toBe(28); // 35 × 8/10
    expect(i.parts.examens).toBe(0);
    expect(i.score).toBe(38);
  });

  it('prend la moyenne des trois derniers examens complets', () => {
    let e = etatInitial();
    e = examen(e, 20, '2026-09-01');
    e = examen(e, 30, '2026-09-02');
    e = examen(e, 36, '2026-09-03');
    e = examen(e, 38, '2026-09-04');
    // Les trois derniers : 30, 36, 38, soit 104/120.
    expect(indice(e, banque).parts.examens).toBe(39);
  });

  it('ne tient pour retenue qu’une question réussie deux jours différents', () => {
    let un = etatInitial();
    for (const q of banque) un = enregistrerReponse(un, q.id, true, '2026-09-01');
    // Vingt questions vues, aucune retenue : vingt points, pas cinquante-cinq.
    expect(indice(un, banque).parts.vu).toBe(20);
    expect(indice(un, banque).parts.retenu).toBe(0);

    let deux = etatInitial();
    for (const q of banque) deux = retenir(deux, q.id);
    expect(indice(deux, banque).parts.retenu).toBe(35);
  });

  it('ne compte pas dix réussites du même jour comme une mémoire', () => {
    let e = etatInitial();
    for (let k = 0; k < 10; k++) e = enregistrerReponse(e, 'vhf-0', true, '2026-09-01');
    expect(indice(e, banque).parts.retenu).toBe(0);
  });

  it('borne « vu » aux questions encore publiées', () => {
    let e = enregistrerReponse(etatInitial(), 'retiree-1', true, '2026-09-01');
    e = enregistrerReponse(e, 'vhf-0', true, '2026-09-01');
    expect(indice(e, banque).parts.vu).toBe(1);
  });

  it('n’annonce « prêt » qu’avec deux examens reçus sur les trois derniers', () => {
    let e = etatInitial();
    for (const q of banque) e = retenir(e, q.id);
    e = examen(e, 33, '2026-09-01');
    e = examen(e, 34, '2026-09-02');
    e = examen(e, 40, '2026-09-03');
    expect(indice(e, banque).palier).toBe('presque');

    e = examen(e, 37, '2026-09-04');
    expect(indice(e, banque).palier).toBe('pret');
  });

  it('sans examen, nomme le palier d’après l’indice', () => {
    let e = etatInitial();
    for (const q of banque) e = retenir(e, q.id);
    expect(indice(e, banque).score).toBe(55);
    expect(indice(e, banque).palier).toBe('en-route');
    expect(indice(etatInitial(), banque).palier).toBe('demarre');
  });

  // Décision d'Alexis, 4 octobre : dès qu'un examen existe, le palier se lit
  // sur les examens. « 36 sur 100, tu démarres » au lendemain d'un 31 sur 40
  // démentait le seul chiffre qui compte le jour de l'épreuve.
  it('avec un examen, nomme le palier d’après les examens, pas d’après l’indice', () => {
    // Rien vu à l'entraînement : l'indice est bas, l'examen dit le vrai.
    expect(indice(examen(etatInitial(), 31), banque)).toMatchObject({ palier: 'en-route', dernier: { bonnes: 31, total: 40, reussi: false } });
    expect(indice(examen(etatInitial(), 29), banque).palier).toBe('demarre');
    expect(indice(examen(etatInitial(), 30), banque).palier).toBe('en-route');
    expect(indice(examen(etatInitial(), 36), banque).palier).toBe('presque');
    expect(indice(examen(examen(etatInitial(), 36, '2026-09-01'), 37, '2026-09-02'), banque).palier).toBe('pret');
    // Reçu puis recalé : le dernier compte, le reçu d'avant ne fait pas « presque ».
    expect(indice(examen(examen(etatInitial(), 37, '2026-09-01'), 25, '2026-09-02'), banque).palier).toBe('demarre');
  });

  it('dit le dernier examen dans la phrase du palier', () => {
    expect(phraseDuPalier(indice(examen(etatInitial(), 31), banque))).toBe(
      'Ton dernier examen blanc est recalé de peu, 9 erreurs pour cinq admises. Les notions à reprendre en premier sont plus bas.',
    );
    expect(phraseDuPalier(indice(examen(etatInitial(), 20), banque))).toBe(
      'Ton dernier examen blanc est recalé, 20 erreurs pour cinq admises. Commence par les notions à reprendre en premier, plus bas.',
    );
    expect(phraseDuPalier(indice(examen(etatInitial(), 36), banque))).toBe(
      'Ton dernier examen blanc est reçu. Un deuxième sur les trois derniers, et tu es prêt.',
    );
    expect(phraseDuPalier(indice(etatInitial(), banque))).toBe(PALIERS.demarre.phrase);
  });
});

describe('série de jours', () => {
  it('est nulle sans activité', () => {
    expect(serieDeJours(etatInitial(), '2026-09-05')).toEqual({ jours: 0, aujourdhui: false });
  });

  it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
    let e = etatInitial();
    for (const d of ['2026-09-01', '2026-09-03', '2026-09-04', '2026-09-05']) {
      e = enregistrerReponse(e, 'vhf-0', true, d);
    }
    expect(serieDeJours(e, '2026-09-05')).toEqual({ jours: 3, aujourdhui: true });
  });

  it('tient encore le lendemain matin, avant la première question', () => {
    let e = etatInitial();
    for (const d of ['2026-09-03', '2026-09-04']) e = enregistrerReponse(e, 'vhf-0', true, d);
    expect(serieDeJours(e, '2026-09-05')).toEqual({ jours: 2, aujourdhui: false });
  });

  it('est rompue après un jour sans rien', () => {
    let e = etatInitial();
    for (const d of ['2026-09-02', '2026-09-03']) e = enregistrerReponse(e, 'vhf-0', true, d);
    expect(serieDeJours(e, '2026-09-05').jours).toBe(0);
  });
});

describe('objectif du jour', () => {
  it('rend le rythme choisi et ce qui est fait', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), rythme: 20 });
    for (let k = 0; k < 7; k++) e = enregistrerReponse(e, `vhf-${k}`, true, '2026-09-05');
    expect(objectifDuJour(e, '2026-09-05')).toEqual({ cible: 20, faites: 7, atteint: false });
  });

  it('prend le rythme du milieu quand rien n’est choisi', () => {
    expect(objectifDuJour(etatInitial(), '2026-09-05').cible).toBe(RYTHMES[1]!.questions);
  });

  it('se dit atteint une fois la cible passée', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), rythme: 10 });
    for (let k = 0; k < 10; k++) e = enregistrerReponse(e, `vhf-${k}`, true, '2026-09-05');
    expect(objectifDuJour(e, '2026-09-05').atteint).toBe(true);
  });
});

describe('quatorze jours', () => {
  it('rend une case par jour, la plus ancienne d’abord', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0', true, '2026-09-05');
    e = enregistrerReponse(e, 'vhf-1', true, '2026-08-30');
    const cases = quatorzeJours(e, '2026-09-05');
    expect(cases).toHaveLength(14);
    expect(cases[0]).toEqual({ date: '2026-08-23', reponses: 0 });
    expect(cases[7]).toEqual({ date: '2026-08-30', reponses: 1 });
    expect(cases[13]).toEqual({ date: '2026-09-05', reponses: 1 });
  });
});

describe('maîtrise par thème', () => {
  it('donne, par thème du programme, le vu et le retenu, les faibles d’abord', () => {
    let e = etatInitial();
    for (let k = 0; k < 10; k++) e = enregistrerReponse(e, `vhf-${k}`, k < 4, '2026-09-01');
    for (let k = 0; k < 4; k++) e = enregistrerReponse(e, `vhf-${k}`, true, '2026-09-02');
    for (let k = 0; k < 5; k++) e = retenir(e, `feux-${k}`);
    const m = maitriseParTheme(e, banque);
    expect(m.map((t) => t.code)).toEqual(['vhf', 'feux-marques']);
    // Six vhf ratées le 1er et jamais reprises : `ratees` compte les questions
    // dont la dernière réponse est fausse, pas les fautes passées.
    expect(m[0]).toEqual({ code: 'vhf', total: 10, vues: 10, retenues: 4, ratees: 6 });
    expect(m[1]).toEqual({ code: 'feux-marques', total: 10, vues: 5, retenues: 5, ratees: 0 });
  });

  it('le premier jour, sort le thème raté devant le thème réussi', () => {
    // Le même jour, rien n'est encore retenu : sans les ratées, les deux thèmes
    // valent zéro et l'ordre du programme mettrait feux, réussi, devant vhf.
    let e = etatInitial();
    for (let k = 0; k < 2; k++) e = enregistrerReponse(e, `vhf-${k}`, false, '2026-09-01');
    for (let k = 0; k < 2; k++) e = enregistrerReponse(e, `feux-${k}`, true, '2026-09-01');
    const m = maitriseParTheme(e, banque);
    expect(m.map((t) => t.code)).toEqual(['vhf', 'feux-marques']);
    expect(m[0]).toMatchObject({ vues: 2, retenues: 0, ratees: 2 });
    expect(m[1]).toMatchObject({ vues: 2, retenues: 0, ratees: 0 });
  });

  it('ne compte plus en ratée une question reprise et réussie', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0', false, '2026-09-01');
    e = enregistrerReponse(e, 'vhf-0', true, '2026-09-02');
    expect(maitriseParTheme(e, banque).find((t) => t.code === 'vhf')!.ratees).toBe(0);
  });

  it('ne liste pas un thème sans question publiée', () => {
    expect(maitriseParTheme(etatInitial(), banque).map((t) => t.code).sort()).toEqual(['feux-marques', 'vhf']);
  });

  it('range un thème jamais ouvert derrière ceux qu’on travaille mal', () => {
    let e = etatInitial();
    for (let k = 0; k < 10; k++) e = enregistrerReponse(e, `vhf-${k}`, k < 2, '2026-09-01');
    for (let k = 0; k < 2; k++) e = enregistrerReponse(e, `vhf-${k}`, true, '2026-09-02');
    // vhf : 20 % retenu, feux : jamais ouvert. Le trou connu passe devant l'inconnu.
    expect(maitriseParTheme(e, banque)[0]!.code).toBe('vhf');
  });
});

describe('maîtrise par notion', () => {
  /** Une banque à deux notions : « feux-marques » ne dit pas où est le trou, la notion si. */
  const parNotion = [
    ...Array.from({ length: 4 }, (_, i) => ({ id: `feux-r${i}`, theme: 'feux-marques', notion: 'feux-remorquage' })),
    ...Array.from({ length: 4 }, (_, i) => ({ id: `feux-m${i}`, theme: 'feux-marques', notion: 'feux-moteur-route' })),
    ...Array.from({ length: 2 }, (_, i) => ({ id: `vhf-c${i}`, theme: 'vhf', notion: 'vhf-canaux' })),
  ];

  it('donne le compte, le nom et le chemin de la leçon, les faibles d’abord', () => {
    let e = etatInitial();
    for (let k = 0; k < 4; k++) e = enregistrerReponse(e, `feux-r${k}`, k < 1, '2026-09-01');
    e = enregistrerReponse(e, 'feux-r0', true, '2026-09-02');
    for (let k = 0; k < 4; k++) e = retenir(e, `feux-m${k}`);
    const m = maitriseParNotion(e, parNotion);
    expect(m[0]).toEqual({
      code: 'feux-remorquage',
      nom: 'Remorquage et poussage',
      theme: 'feux-marques',
      total: 4,
      vues: 4,
      retenues: 1,
      // Trois ratées le 1er, jamais reprises.
      ratees: 3,
      chemin: '/cours/feux-marques/feux-remorquage',
    });
    expect(m.map((n) => n.code)).toEqual(['feux-remorquage', 'feux-moteur-route', 'vhf-canaux']);
  });

  it('range une notion jamais ouverte derrière celles qu’on travaille mal', () => {
    let e = etatInitial();
    for (let k = 0; k < 4; k++) e = enregistrerReponse(e, `feux-m${k}`, false, '2026-09-01');
    expect(maitriseParNotion(e, parNotion)[0]!.code).toBe('feux-moteur-route');
  });

  it('le premier jour, sort la notion ratée devant la notion réussie', () => {
    // Moteur et route vient avant remorquage dans le programme : à zéro retenue
    // partout, c'est la ratée qui doit passer devant, pas l'ordre du cours.
    let e = etatInitial();
    for (let k = 0; k < 2; k++) e = enregistrerReponse(e, `feux-r${k}`, false, '2026-09-01');
    for (let k = 0; k < 2; k++) e = enregistrerReponse(e, `feux-m${k}`, true, '2026-09-01');
    const m = maitriseParNotion(e, parNotion);
    expect(m.map((n) => n.code)).toEqual(['feux-remorquage', 'feux-moteur-route', 'vhf-canaux']);
    expect(m[0]!.ratees).toBe(2);
    expect(m[1]!.ratees).toBe(0);
  });

  it('ne liste pas une notion sans question publiée', () => {
    expect(maitriseParNotion(etatInitial(), parNotion)).toHaveLength(3);
  });

  it('ignore une question sans notion plutôt que d’inventer une ligne', () => {
    const melange = [...parNotion, { id: 'orphe-1', theme: 'vhf' }];
    expect(maitriseParNotion(etatInitial(), melange).map((n) => n.code)).not.toContain('');
  });

  it('rend les trois notions les plus faibles, prêtes à afficher', () => {
    let e = etatInitial();
    for (let k = 0; k < 4; k++) e = enregistrerReponse(e, `feux-r${k}`, false, '2026-09-01');
    const trois = notionsLesPlusFaibles(e, parNotion);
    expect(trois).toHaveLength(3);
    expect(trois[0]!.code).toBe('feux-remorquage');
    expect(trois[0]!.chemin).toBe('/cours/feux-marques/feux-remorquage');
    expect(notionsLesPlusFaibles(e, parNotion, 1)).toHaveLength(1);
  });
});

describe('jalons', () => {
  it('sont tous à atteindre au départ', () => {
    const j = jalons(etatInitial(), banque, 105);
    expect(j.length).toBeGreaterThan(5);
    expect(j.every((x) => !x.atteint)).toBe(true);
  });

  it('marque le premier examen, le premier reçu et la centième question', () => {
    let e = etatInitial();
    e = examen(e, 20, '2026-09-01');
    let j = Object.fromEntries(jalons(e, banque, 105).map((x) => [x.code, x.atteint]));
    expect(j['premier-examen']).toBe(true);
    expect(j['premier-recu']).toBe(false);

    e = examen(e, 36, '2026-09-02');
    j = Object.fromEntries(jalons(e, banque, 105).map((x) => [x.code, x.atteint]));
    expect(j['premier-recu']).toBe(true);
  });

  it('compte les thèmes touchés et la série de sept jours', () => {
    let e = etatInitial();
    for (let d = 1; d <= 7; d++) e = enregistrerReponse(e, 'vhf-0', true, `2026-09-0${d}`);
    e = enregistrerReponse(e, 'feux-0', true, '2026-09-07');
    const j = Object.fromEntries(jalons(e, banque, 105).map((x) => [x.code, x.atteint]));
    expect(j['sept-jours']).toBe(true);
    expect(j['tous-les-themes']).toBe(true);
  });

  it('marque le cours entier', () => {
    let e = etatInitial();
    for (let k = 0; k < 3; k++) e = terminerLecon(e, `notion-${k}`, { bonnes: 1, total: 1 }, '2026-09-01');
    expect(jalons(e, banque, 3).find((x) => x.code === 'cours-entier')!.atteint).toBe(true);
  });
});

describe('rappel de la motivation', () => {
  it('rend rien sans profil', () => {
    expect(rappel(profilVide())).toBeNull();
  });

  it('préfère la phrase du candidat à la case cochée', () => {
    const p = { ...profilVide(), motivations: ['famille'], phrase: 'Emmener mon père pêcher.' };
    expect(rappel(p)).toBe('Emmener mon père pêcher.');
  });

  it('écrit chaque rappel pour compléter « Tu passes ce permis pour »', () => {
    for (const m of MOTIVATIONS) {
      expect(m.rappel[0], m.code).toBe(m.rappel[0]!.toLowerCase());
      expect(m.rappel.endsWith('.'), m.code).toBe(false);
      expect(m.rappel, m.code).not.toContain('—');
    }
  });

  it('retombe sur le libellé de la première case cochée', () => {
    const p = { ...profilVide(), motivations: ['location'] };
    expect(rappel(p)).toBe(MOTIVATIONS.find((m) => m.code === 'location')!.rappel);
  });
});

describe('jours avant l’examen', () => {
  it('compte de date à date', () => {
    expect(joursAvant('2026-09-20', '2026-09-05')).toBe(15);
    expect(joursAvant('2026-09-05', '2026-09-05')).toBe(0);
    expect(joursAvant('2026-09-01', '2026-09-05')).toBe(-4);
  });

  it('rend null pour une date illisible', () => {
    expect(joursAvant('bientôt', '2026-09-05')).toBeNull();
  });
});

describe('pointFinal', () => {
  // « Tu passes ce permis pour « … ». » : le point ferme la phrase, sauf si la
  // raison du candidat en porte déjà un. Les rappels de MOTIVATIONS n'en ont pas.
  it('ajoute un point quand la raison n’en finit pas une', () => {
    expect(pointFinal('emmener les tiens en mer')).toBe('.');
  });
  it('se tait quand la raison finit déjà par un point, un ! ou des points de suspension', () => {
    expect(pointFinal('Emmener mon père pêcher.')).toBe('');
    expect(pointFinal('Enfin !')).toBe('');
    expect(pointFinal('On verra…')).toBe('');
  });
});
