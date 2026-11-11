import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CLE_EVALUATION,
  DELAI_JOURS,
  PLAFOND_MS,
  SEUIL_MS,
  ajouterUsage,
  lireEtat,
  marquerDemandee,
  noteDue,
  suivreLUsage,
} from './evaluation';
import type { Stockage } from './stockage';

function memoire(): Stockage & { valeurs: Map<string, string> } {
  const valeurs = new Map<string, string>();
  return {
    valeurs,
    getItem: (c) => valeurs.get(c) ?? null,
    setItem: (c, v) => void valeurs.set(c, v),
    removeItem: (c) => void valeurs.delete(c),
  };
}

const HEURE = 3_600_000;

describe('le temps d’usage', () => {
  it('part de zéro', () => {
    expect(lireEtat(memoire())).toEqual({ actifMs: 0, jusqua: 0, demande: null });
  });

  it('cumule les intervalles successifs', () => {
    const s = memoire();
    ajouterUsage(1000, 11_000, s);
    ajouterUsage(11_000, 21_000, s);
    expect(lireEtat(s).actifMs).toBe(20_000);
  });

  it('ne compte pas deux fois le même temps vu par deux webviews', () => {
    const s = memoire();
    ajouterUsage(0, 10_000, s);
    ajouterUsage(0, 10_000, s);
    ajouterUsage(5_000, 12_000, s);
    expect(lireEtat(s).actifMs).toBe(12_000);
  });

  it('plafonne un intervalle trop long : une app suspendue n’a pas été utilisée', () => {
    const s = memoire();
    ajouterUsage(0, 10 * HEURE, s);
    expect(lireEtat(s).actifMs).toBe(PLAFOND_MS);
  });

  it('ignore un intervalle nul, négatif ou illisible', () => {
    const s = memoire();
    ajouterUsage(10, 10, s);
    ajouterUsage(10, 5, s);
    ajouterUsage(NaN, 5, s);
    expect(lireEtat(s).actifMs).toBe(0);
  });

  it('repart de zéro devant un stockage abîmé', () => {
    const s = memoire();
    s.setItem(CLE_EVALUATION, '{pas du json');
    expect(lireEtat(s).actifMs).toBe(0);
    s.setItem(CLE_EVALUATION, JSON.stringify({ actifMs: 'beaucoup', demande: { jour: 3 } }));
    expect(lireEtat(s)).toEqual({ actifMs: 0, jusqua: 0, demande: null });
    s.setItem(CLE_EVALUATION, JSON.stringify({ actifMs: -5 }));
    expect(lireEtat(s).actifMs).toBe(0);
  });

  it('ne casse pas sans stockage', () => {
    const casse: Stockage = {
      getItem: () => { throw new Error('non'); },
      setItem: () => { throw new Error('non'); },
      removeItem: () => { throw new Error('non'); },
    };
    expect(() => ajouterUsage(0, 1000, casse)).not.toThrow();
    expect(lireEtat(casse).actifMs).toBe(0);
  });
});

describe('noteDue', () => {
  const avecUsage = (actifMs: number, demande: { jour: string; majeure: number } | null = null) =>
    ({ actifMs, jusqua: 0, demande });

  it('attend deux heures cumulées', () => {
    expect(SEUIL_MS).toBe(2 * HEURE);
    expect(noteDue(avecUsage(SEUIL_MS - 1), '2026-11-11', 1)).toBe(false);
    expect(noteDue(avecUsage(SEUIL_MS), '2026-11-11', 1)).toBe(true);
  });

  it('ne redemande pas avant 120 jours', () => {
    expect(DELAI_JOURS).toBe(120);
    const etat = avecUsage(5 * HEURE, { jour: '2026-11-11', majeure: 1 });
    expect(noteDue(etat, '2026-11-12', 1)).toBe(false);
    expect(noteDue(etat, '2027-03-10', 1)).toBe(false); // 119 jours
    expect(noteDue(etat, '2027-03-11', 1)).toBe(true); // 120 jours
  });

  it('redemande dès qu’une version majeure nouvelle sort', () => {
    const etat = avecUsage(5 * HEURE, { jour: '2026-11-11', majeure: 1 });
    expect(noteDue(etat, '2026-11-20', 2)).toBe(true);
    expect(noteDue(etat, '2026-11-20', 1)).toBe(false);
    // Une version plus ancienne que celle de la demande ne redemande pas.
    expect(noteDue(etat, '2026-11-20', 0)).toBe(false);
  });

  it('ne redemande pas sur une date rangée illisible, plutôt que de harceler', () => {
    const etat = avecUsage(5 * HEURE, { jour: 'hier', majeure: 1 });
    expect(noteDue(etat, '2027-12-12', 1)).toBe(false);
  });
});

describe('marquerDemandee', () => {
  it('range le jour et la version, et garde le temps d’usage', () => {
    const s = memoire();
    ajouterUsage(0, 20_000, s);
    marquerDemandee('2026-11-11', 1, s);
    const etat = lireEtat(s);
    expect(etat.demande).toEqual({ jour: '2026-11-11', majeure: 1 });
    expect(etat.actifMs).toBe(20_000);
  });
});

describe('suivreLUsage', () => {
  afterEach(() => vi.useRealTimers());

  function decor(visible = true) {
    let etat: 'visible' | 'hidden' = visible ? 'visible' : 'hidden';
    const ecouteurs = new Map<string, () => void>();
    const doc = {
      get visibilityState() { return etat; },
      addEventListener: (n: 'visibilitychange', f: () => void) => void ecouteurs.set(n, f),
      removeEventListener: (n: 'visibilitychange') => void ecouteurs.delete(n),
    };
    return {
      doc,
      masquer: () => { etat = 'hidden'; ecouteurs.get('visibilitychange')?.(); },
      montrer: () => { etat = 'visible'; ecouteurs.get('visibilitychange')?.(); },
    };
  }

  it('compte le temps où la page est visible, pas celui où elle est cachée', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const s = memoire();
    const d = decor();
    const arreter = suivreLUsage(d.doc, s, 10_000);
    vi.advanceTimersByTime(30_000);
    expect(lireEtat(s).actifMs).toBe(30_000);
    vi.advanceTimersByTime(5_000);
    d.masquer(); // 5 s de plus comptées au moment de cacher
    vi.advanceTimersByTime(600_000);
    expect(lireEtat(s).actifMs).toBe(35_000);
    d.montrer();
    vi.advanceTimersByTime(15_000);
    expect(lireEtat(s).actifMs).toBe(50_000);
    arreter();
    vi.advanceTimersByTime(60_000);
    expect(lireEtat(s).actifMs).toBe(50_000);
  });

  it('ne compte rien si la page démarre cachée', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const s = memoire();
    suivreLUsage(decor(false).doc, s, 10_000);
    vi.advanceTimersByTime(60_000);
    expect(lireEtat(s).actifMs).toBe(0);
  });
});
