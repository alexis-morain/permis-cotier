import { describe, it, expect, beforeEach } from 'vitest';
import {
  VERSION_STOCKAGE,
  etatInitial,
  enregistrerEnCours,
  effacerEnCours,
  enregistrerEnCoursSerie,
  effacerEnCoursSerie,
  enregistrerReponse,
  enregistrerExamen,
  statistiques,
  charger,
  sauvegarder,
  effacer,
  terminerLecon,
  leconsFaites,
  CLE_STOCKAGE,
  profilVide,
  enregistrerProfil,
  migrerQuestions,
} from './progression';
import type { Stockage } from './progression';

class MemoireLocale implements Stockage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

let memoire: MemoireLocale;
beforeEach(() => { memoire = new MemoireLocale(); });

describe('état initial', () => {
  it('porte la version du format et rien d’autre', () => {
    const e = etatInitial();
    expect(e.version).toBe(VERSION_STOCKAGE);
    expect(e.questions).toEqual({});
    expect(e.examens).toEqual([]);
    expect(e.dateExamen).toBeNull();
    expect(e.enCours).toBeNull();
  });
});

describe('statistiques bornées à la banque publiée', () => {
  const etat = {
    ...etatInitial(),
    questions: {
      'vhf-0001': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-01', succes: 0, revoirLe: '2026-09-01' },
      'vhf-0002': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-02', succes: 0, revoirLe: '2026-09-02' },
      'vhf-0009': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-03', succes: 0, revoirLe: '2026-09-03' },
    },
  };

  it('compte tout quand on ne lui donne pas la banque', () => {
    expect(statistiques(etat, undefined, '2026-09-03').aRevoir).toBe(3);
  });

  it('ignore une question retirée de la banque, comme le fait la série', () => {
    const s = statistiques(etat, ['vhf-0001', 'vhf-0002'], '2026-09-03');
    expect(s.aRevoir).toBe(2);
    expect(s.vues).toBe(2);
  });

  it('ne compte à revoir que ce qui est dû ce jour-là', () => {
    const plusTard = {
      ...etatInitial(),
      questions: {
        'vhf-0001': { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-01', succes: 1, dernierSuccesLe: '2026-09-01', revoirLe: '2026-09-02' },
        'vhf-0002': { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-01', succes: 4, dernierSuccesLe: '2026-09-01', revoirLe: '2026-09-22' },
      },
    };
    expect(statistiques(plusTard, undefined, '2026-09-03').aRevoir).toBe(1);
    expect(statistiques(plusTard, undefined, '2026-09-30').aRevoir).toBe(2);
    expect(statistiques(plusTard, undefined, '2026-09-01').aRevoir).toBe(0);
  });
});

describe('session en cours', () => {
  const sauvegarde = {
    mode: 'examen' as const,
    theme: null,
    ids: ['vhf-0001', 'vhf-0002'],
    index: 1,
    selections: [['a'], []],
    echeance: 1_800_000_014_000,
    journal: [{ id: 'vhf-0001', juste: true, ms: 4200 }],
    majLe: 1_800_000_000_000,
  };

  it('garde la série interrompue, et la relit telle quelle', () => {
    const e = enregistrerEnCours(etatInitial(), sauvegarde);
    sauvegarder(e, memoire);
    expect(charger(memoire).enCours).toEqual(sauvegarde);
  });

  it('l’oublie une fois la série finie', () => {
    const e = effacerEnCours(enregistrerEnCours(etatInitial(), sauvegarde));
    expect(e.enCours).toBeNull();
  });

  it('range la série d’entraînement à part de l’examen', () => {
    // Un entraînement quitté pour aller lire une leçon ne doit pas effacer
    // l'examen laissé en plan : deux fentes, deux reprises indépendantes.
    const serie = { ...sauvegarde, mode: 'entrainement' as const, theme: '/entrainement/balisage', echeance: null };
    const e = enregistrerEnCoursSerie(enregistrerEnCours(etatInitial(), sauvegarde), serie);
    sauvegarder(e, memoire);
    const lu = charger(memoire);
    expect(lu.enCours).toEqual(sauvegarde);
    expect(lu.enCoursSerie).toEqual(serie);
    expect(effacerEnCoursSerie(lu).enCoursSerie).toBeNull();
    expect(effacerEnCoursSerie(lu).enCours).toEqual(sauvegarde);
  });

  it('ne perd pas la progression d’un état écrit avant ce champ', () => {
    memoire.setItem(
      'permis-cotier:progression',
      JSON.stringify({ version: VERSION_STOCKAGE, questions: { 'vhf-0001': { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-01' } }, examens: [] }),
    );
    const lu = charger(memoire);
    expect(lu.questions['vhf-0001']?.vues).toBe(1);
    expect(lu.enCours).toBeNull();
    expect(lu.enCoursSerie).toBeNull();
  });
});

describe('enregistrement d’une réponse', () => {
  it('compte une première réussite et la reprogramme à demain', () => {
    const e = enregistrerReponse(etatInitial(), 'vhf-0001', true, '2026-09-10');
    expect(e.questions['vhf-0001']).toEqual({
      vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-10',
      succes: 1, dernierSuccesLe: '2026-09-10', revoirLe: '2026-09-11',
    });
  });

  it('compte un échec et rend la question due tout de suite', () => {
    const e = enregistrerReponse(etatInitial(), 'vhf-0001', false, '2026-09-10');
    expect(e.questions['vhf-0001']!.ratees).toBe(1);
    expect(e.questions['vhf-0001']!.derniereReussie).toBe(false);
    expect(e.questions['vhf-0001']!.succes).toBe(0);
    expect(e.questions['vhf-0001']!.revoirLe).toBe('2026-09-10');
  });

  it('n’avance pas d’un cran sur une réussite du même jour', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0001', true, '2026-09-10');
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-10');
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-10');
    const q = e.questions['vhf-0001']!;
    // Trois passages comptés, un seul succès : moudre une question ne l'efface pas.
    expect(q.vues).toBe(3);
    expect(q.succes).toBe(1);
    expect(q.revoirLe).toBe('2026-09-11');
  });

  it('espace de un, trois, sept puis vingt et un jours', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0001', true, '2026-09-10');
    expect(e.questions['vhf-0001']!.revoirLe).toBe('2026-09-11');
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-11');
    expect(e.questions['vhf-0001']!.revoirLe).toBe('2026-09-14');
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-14');
    expect(e.questions['vhf-0001']!.revoirLe).toBe('2026-09-21');
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-21');
    expect(e.questions['vhf-0001']!.revoirLe).toBe('2026-10-12');
    expect(e.questions['vhf-0001']!.succes).toBe(4);
  });

  it('remet le compteur à zéro à la première faute', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0001', true, '2026-09-10');
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-11');
    expect(e.questions['vhf-0001']!.succes).toBe(2);
    e = enregistrerReponse(e, 'vhf-0001', false, '2026-09-14');
    expect(e.questions['vhf-0001']!.succes).toBe(0);
    expect(e.questions['vhf-0001']!.revoirLe).toBe('2026-09-14');
    // La dernière réussite reste au calendrier : elle date, elle ne s'invente pas.
    expect(e.questions['vhf-0001']!.dernierSuccesLe).toBe('2026-09-11');
  });

  it('cumule les passages sans effacer le compte de ratées', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0001', false, '2026-09-10');
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-11');
    expect(e.questions['vhf-0001']).toEqual({
      vues: 2, ratees: 1, derniereReussie: true, vueLe: '2026-09-11',
      succes: 1, dernierSuccesLe: '2026-09-11', revoirLe: '2026-09-12',
    });
  });

  it('ne modifie pas l’état reçu', () => {
    const avant = etatInitial();
    enregistrerReponse(avant, 'vhf-0001', true, '2026-09-10');
    expect(avant.questions).toEqual({});
  });
});

describe('migration silencieuse des progressions déjà écrites', () => {
  /** Un état réaliste de l'ancienne forme : trois réussies, deux ratées. */
  const ancien = {
    version: VERSION_STOCKAGE,
    questions: {
      'vhf-0001': { vues: 3, ratees: 0, derniereReussie: true, vueLe: '2026-09-01' },
      'vhf-0002': { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-05' },
      'feux-0001': { vues: 2, ratees: 1, derniereReussie: true, vueLe: '2026-09-07' },
      'feux-0002': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-08' },
      'balisage-0001': { vues: 4, ratees: 3, derniereReussie: false, vueLe: '2026-09-09' },
    },
    examens: [
      { date: '2026-09-08', bonnes: 33, total: 40, reussi: false },
      { date: '2026-09-05', bonnes: 36, total: 40, reussi: true },
    ],
    dateExamen: '2026-10-01',
    activite: { '2026-09-08': 12, '2026-09-09': 7 },
  };

  it('traduit une réussie en un succès dû le lendemain', () => {
    memoire.setItem(CLE_STOCKAGE, JSON.stringify(ancien));
    const q = charger(memoire).questions['vhf-0001']!;
    expect(q).toEqual({
      vues: 3, ratees: 0, derniereReussie: true, vueLe: '2026-09-01',
      succes: 1, dernierSuccesLe: '2026-09-01', revoirLe: '2026-09-02',
    });
  });

  it('traduit une ratée en une question due le jour même', () => {
    memoire.setItem(CLE_STOCKAGE, JSON.stringify(ancien));
    const q = charger(memoire).questions['balisage-0001']!;
    expect(q.succes).toBe(0);
    expect(q.dernierSuccesLe).toBeUndefined();
    expect(q.revoirLe).toBe('2026-09-09');
  });

  it('ne perd rien de ce qui était déjà là', () => {
    memoire.setItem(CLE_STOCKAGE, JSON.stringify(ancien));
    const lu = charger(memoire);
    expect(Object.keys(lu.questions)).toHaveLength(5);
    expect(lu.questions['feux-0001']!.vues).toBe(2);
    expect(lu.questions['feux-0001']!.ratees).toBe(1);
    // L'historique d'examens blancs ne bouge pas d'une virgule.
    expect(lu.examens).toEqual(ancien.examens);
    expect(lu.dateExamen).toBe('2026-10-01');
    expect(lu.activite).toEqual(ancien.activite);
  });

  it('ne remigre pas un état déjà migré', () => {
    memoire.setItem(CLE_STOCKAGE, JSON.stringify(ancien));
    const premier = charger(memoire);
    // Le candidat a révisé depuis : trois succès, une échéance lointaine.
    const avance = {
      ...premier,
      questions: {
        ...premier.questions,
        'vhf-0001': {
          vues: 6, ratees: 0, derniereReussie: true, vueLe: '2026-09-20',
          succes: 3, dernierSuccesLe: '2026-09-20', revoirLe: '2026-09-27',
        },
      },
    };
    sauvegarder(avance, memoire);
    const relu = charger(memoire);
    expect(relu.questions['vhf-0001']!.succes).toBe(3);
    expect(relu.questions['vhf-0001']!.revoirLe).toBe('2026-09-27');
    expect(relu.questions).toEqual(avance.questions);
  });

  it('est stable : relire deux fois donne le même état', () => {
    memoire.setItem(CLE_STOCKAGE, JSON.stringify(ancien));
    const un = charger(memoire);
    sauvegarder(un, memoire);
    expect(charger(memoire)).toEqual(un);
  });

  it('jette une entrée illisible plutôt que d’écrire un état bancal', () => {
    const propre = migrerQuestions({
      'vhf-0001': { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-01' },
      'vhf-0002': 'nawak',
      'vhf-0003': { vues: 'trois' },
    });
    expect(Object.keys(propre)).toEqual(['vhf-0001']);
  });
});

describe('historique des examens blancs', () => {
  it('ajoute le plus récent en tête', () => {
    let e = enregistrerExamen(etatInitial(), { date: '2026-09-10', bonnes: 30, total: 40, reussi: false });
    e = enregistrerExamen(e, { date: '2026-09-12', bonnes: 36, total: 40, reussi: true });
    expect(e.examens[0]!.date).toBe('2026-09-12');
    expect(e.examens).toHaveLength(2);
  });

  it('garde au plus cinquante examens', () => {
    let e = etatInitial();
    for (let i = 0; i < 60; i++) e = enregistrerExamen(e, { date: '2026-09-10', bonnes: i, total: 40, reussi: false });
    expect(e.examens).toHaveLength(50);
    expect(e.examens[0]!.bonnes).toBe(59);
  });
});

describe('statistiques', () => {
  it('compte les questions vues, les ratées en attente et le dernier score', () => {
    let e = etatInitial();
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-10');
    e = enregistrerReponse(e, 'vhf-0002', false, '2026-09-10');
    e = enregistrerExamen(e, { date: '2026-09-10', bonnes: 36, total: 40, reussi: true });
    const s = statistiques(e);
    expect(s.vues).toBe(2);
    expect(s.aRevoir).toBe(1);
    expect(s.dernierScore).toEqual({ bonnes: 36, total: 40, reussi: true });
    expect(s.examensTermines).toBe(1);
  });

  it('ne rend aucun score quand rien n’a été joué', () => {
    expect(statistiques(etatInitial()).dernierScore).toBeNull();
  });
});

describe('lecture et écriture', () => {
  it('relit ce qu’il a écrit', () => {
    const e = enregistrerReponse(etatInitial(), 'vhf-0001', true, '2026-09-10');
    sauvegarder(e, memoire);
    expect(charger(memoire)).toEqual(e);
  });

  it('rend un état neuf quand le stockage est vide', () => {
    expect(charger(memoire)).toEqual(etatInitial());
  });

  it('rend un état neuf quand le contenu est illisible', () => {
    memoire.setItem('permis-cotier:progression', '{ pas du json');
    expect(charger(memoire)).toEqual(etatInitial());
  });

  it('repart de zéro si le format a changé de version', () => {
    memoire.setItem('permis-cotier:progression', JSON.stringify({ version: 0, questions: { a: 1 } }));
    expect(charger(memoire)).toEqual(etatInitial());
  });

  it('efface tout', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0001', true, '2026-09-10'), memoire);
    effacer(memoire);
    expect(charger(memoire)).toEqual(etatInitial());
  });

  it('survit à un stockage qui refuse d’écrire', () => {
    const bloque: Stockage = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceeded'); },
      removeItem: () => {},
    };
    expect(() => sauvegarder(etatInitial(), bloque)).not.toThrow();
  });
});

describe('date d’examen', () => {
  it('se garde et se relit', () => {
    const e = { ...etatInitial(), dateExamen: '2026-10-15' };
    sauvegarder(e, memoire);
    expect(charger(memoire).dateExamen).toBe('2026-10-15');
  });
});

describe('leçons suivies', () => {
  it('n’en a aucune au départ', () => {
    expect(leconsFaites(etatInitial())).toEqual({});
  });

  it('marque une leçon faite avec son score et sa date', () => {
    const e = terminerLecon(etatInitial(), 'balisage-lateral', { bonnes: 2, total: 3 }, '2026-09-05');
    expect(e.lecons['balisage-lateral']).toEqual({ faiteLe: '2026-09-05', bonnes: 2, total: 3 });
    expect(leconsFaites(e)).toEqual({ 'balisage-lateral': true });
  });

  it('garde la dernière fois qu’on la refait', () => {
    const une = terminerLecon(etatInitial(), 'balisage-lateral', { bonnes: 1, total: 3 }, '2026-09-05');
    const deux = terminerLecon(une, 'balisage-lateral', { bonnes: 3, total: 3 }, '2026-09-06');
    expect(deux.lecons['balisage-lateral']).toEqual({ faiteLe: '2026-09-06', bonnes: 3, total: 3 });
  });

  it('accepte une leçon sans question, faite à zéro sur zéro', () => {
    const e = terminerLecon(etatInitial(), 'signaux-portuaires', { bonnes: 0, total: 0 }, '2026-09-05');
    expect(e.lecons['signaux-portuaires']!.total).toBe(0);
  });

  it('survit à l’aller-retour par le stockage', () => {
    const e = terminerLecon(etatInitial(), 'balisage-lateral', { bonnes: 2, total: 3 }, '2026-09-05');
    sauvegarder(e, memoire);
    expect(charger(memoire).lecons).toEqual(e.lecons);
  });

  it('relit un état écrit avant que les leçons existent', () => {
    memoire.setItem(
      CLE_STOCKAGE,
      JSON.stringify({ version: VERSION_STOCKAGE, questions: {}, examens: [], dateExamen: null, enCours: null }),
    );
    expect(charger(memoire).lecons).toEqual({});
  });
});

describe('profil du candidat', () => {
  it('est vide au départ, et se relit après écriture', () => {
    const e = etatInitial();
    expect(e.profil).toEqual(profilVide());
    expect(e.activite).toEqual({});
    const rempli = enregistrerProfil(e, {
      prenom: 'Léa',
      motivations: ['famille', 'location'],
      phrase: 'Sortir en mer avec les enfants cet été.',
      depart: 'zero',
      rythme: 20,
      rempliLe: '2026-09-05',
    });
    sauvegarder(rempli, memoire);
    expect(charger(memoire).profil.prenom).toBe('Léa');
    expect(charger(memoire).profil.motivations).toEqual(['famille', 'location']);
  });

  it('ne perd pas un état écrit avant le profil', () => {
    memoire.setItem(
      'permis-cotier:progression',
      JSON.stringify({ version: VERSION_STOCKAGE, questions: {}, examens: [] }),
    );
    const lu = charger(memoire);
    expect(lu.profil).toEqual(profilVide());
    expect(lu.activite).toEqual({});
  });

  it('ignore un profil mal formé plutôt que de planter', () => {
    memoire.setItem(
      'permis-cotier:progression',
      JSON.stringify({ version: VERSION_STOCKAGE, questions: {}, examens: [], profil: { prenom: 3, motivations: 'x' } }),
    );
    expect(charger(memoire).profil).toEqual(profilVide());
  });
});

describe('activité par jour', () => {
  it('compte chaque réponse sur son jour', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0001', true, '2026-09-10');
    e = enregistrerReponse(e, 'vhf-0002', false, '2026-09-10');
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-11');
    expect(e.activite).toEqual({ '2026-09-10': 2, '2026-09-11': 1 });
  });

  it('ne garde que les quatre cents jours les plus récents', () => {
    let e = etatInitial();
    for (let i = 0; i < 410; i++) {
      const d = new Date(Date.UTC(2025, 0, 1) + i * 86_400_000).toISOString().slice(0, 10);
      e = enregistrerReponse(e, 'vhf-0001', true, d);
    }
    expect(Object.keys(e.activite)).toHaveLength(400);
    expect(e.activite['2025-01-01']).toBeUndefined();
  });
});
