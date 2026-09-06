import { describe, it, expect } from 'vitest';
import {
  etatInitial,
  enregistrerReponse,
  enregistrerExamen,
  enregistrerProfil,
  profilVide,
  terminerLecon,
} from './progression';
import {
  MOTIVATIONS,
  RYTHMES,
  indice,
  serieDeJours,
  objectifDuJour,
  maitriseParTheme,
  jalons,
  rappel,
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

describe('indice de préparation', () => {
  it('est nul quand rien n’a été joué', () => {
    const i = indice(etatInitial(), banque);
    expect(i.score).toBe(0);
    expect(i.palier).toBe('demarre');
    expect(i.parts).toEqual({ vu: 0, retenu: 0, examens: 0 });
  });

  it('pèse ce qu’on a vu, ce qu’on retient et les examens', () => {
    let e = etatInitial();
    // Dix questions vues sur vingt, huit réussies à la dernière rencontre.
    for (let k = 0; k < 10; k++) e = enregistrerReponse(e, `vhf-${k}`, k < 8, '2026-09-01');
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

  it('borne « vu » aux questions encore publiées', () => {
    let e = enregistrerReponse(etatInitial(), 'retiree-1', true, '2026-09-01');
    e = enregistrerReponse(e, 'vhf-0', true, '2026-09-01');
    expect(indice(e, banque).parts.vu).toBe(1);
  });

  it('n’annonce « prêt » qu’avec deux examens reçus sur les trois derniers', () => {
    let e = etatInitial();
    for (const q of banque) e = enregistrerReponse(e, q.id, true, '2026-09-01');
    e = examen(e, 33, '2026-09-01');
    e = examen(e, 34, '2026-09-02');
    e = examen(e, 40, '2026-09-03');
    const presque = indice(e, banque);
    expect(presque.score).toBeGreaterThanOrEqual(85);
    expect(presque.palier).toBe('presque');

    e = examen(e, 37, '2026-09-04');
    expect(indice(e, banque).palier).toBe('pret');
  });

  it('nomme les paliers intermédiaires', () => {
    let e = etatInitial();
    for (const q of banque) e = enregistrerReponse(e, q.id, true, '2026-09-01');
    expect(indice(e, banque).score).toBe(55);
    expect(indice(e, banque).palier).toBe('en-route');
    e = examen(e, 30);
    expect(indice(e, banque).palier).toBe('presque');
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
    for (let k = 0; k < 5; k++) e = enregistrerReponse(e, `feux-${k}`, true, '2026-09-01');
    const m = maitriseParTheme(e, banque);
    expect(m.map((t) => t.code)).toEqual(['vhf', 'feux-marques']);
    expect(m[0]).toEqual({ code: 'vhf', total: 10, vues: 10, retenues: 4 });
    expect(m[1]).toEqual({ code: 'feux-marques', total: 10, vues: 5, retenues: 5 });
  });

  it('ne liste pas un thème sans question publiée', () => {
    expect(maitriseParTheme(etatInitial(), banque).map((t) => t.code).sort()).toEqual(['feux-marques', 'vhf']);
  });

  it('range un thème jamais ouvert derrière ceux qu’on travaille mal', () => {
    let e = etatInitial();
    for (let k = 0; k < 10; k++) e = enregistrerReponse(e, `vhf-${k}`, k < 2, '2026-09-01');
    // vhf : 20 % retenu, feux : jamais ouvert. Le trou connu passe devant l'inconnu.
    expect(maitriseParTheme(e, banque)[0]!.code).toBe('vhf');
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
