import { describe, it, expect, beforeEach } from 'vitest';
import {
  VERSION_STOCKAGE,
  etatInitial,
  enregistrerEnCours,
  effacerEnCours,
  enregistrerReponse,
  enregistrerExamen,
  statistiques,
  charger,
  sauvegarder,
  effacer,
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
      'vhf-0001': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-01' },
      'vhf-0002': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-02' },
      'vhf-0009': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-03' },
    },
  };

  it('compte tout quand on ne lui donne pas la banque', () => {
    expect(statistiques(etat).aRevoir).toBe(3);
  });

  it('ignore une question retirée de la banque, comme le fait la série', () => {
    const s = statistiques(etat, ['vhf-0001', 'vhf-0002']);
    expect(s.aRevoir).toBe(2);
    expect(s.vues).toBe(2);
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
    journal: [{ id: 'vhf-0001', juste: true }],
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

  it('ne perd pas la progression d’un état écrit avant ce champ', () => {
    memoire.setItem(
      'permis-cotier:progression',
      JSON.stringify({ version: VERSION_STOCKAGE, questions: { 'vhf-0001': { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-01' } }, examens: [] }),
    );
    const lu = charger(memoire);
    expect(lu.questions['vhf-0001']?.vues).toBe(1);
    expect(lu.enCours).toBeNull();
  });
});

describe('enregistrement d’une réponse', () => {
  it('compte une première réussite', () => {
    const e = enregistrerReponse(etatInitial(), 'vhf-0001', true, '2026-09-10');
    expect(e.questions['vhf-0001']).toEqual({ vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-10' });
  });

  it('compte un échec et le retient', () => {
    const e = enregistrerReponse(etatInitial(), 'vhf-0001', false, '2026-09-10');
    expect(e.questions['vhf-0001']!.ratees).toBe(1);
    expect(e.questions['vhf-0001']!.derniereReussie).toBe(false);
  });

  it('cumule les passages sans effacer le compte de ratées', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0001', false, '2026-09-10');
    e = enregistrerReponse(e, 'vhf-0001', true, '2026-09-11');
    expect(e.questions['vhf-0001']).toEqual({ vues: 2, ratees: 1, derniereReussie: true, vueLe: '2026-09-11' });
  });

  it('ne modifie pas l’état reçu', () => {
    const avant = etatInitial();
    enregistrerReponse(avant, 'vhf-0001', true, '2026-09-10');
    expect(avant.questions).toEqual({});
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
