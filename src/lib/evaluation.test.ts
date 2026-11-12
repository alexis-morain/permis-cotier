import { describe, it, expect } from 'vitest';
import { CLE_EVALUATION, DELAI_JOURS, lireEtat, marquerDemandee, noteDue } from './evaluation';
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

describe('l’état rangé', () => {
  it('part de rien', () => {
    expect(lireEtat(memoire())).toEqual({ demande: null });
  });

  it('lit l’état laissé par la 1.0.12, temps d’usage compris, sans s’en servir', () => {
    const s = memoire();
    s.setItem(CLE_EVALUATION, JSON.stringify({ actifMs: 5, jusqua: 9, demande: { jour: '2026-11-11', majeure: 1 } }));
    expect(lireEtat(s)).toEqual({ demande: { jour: '2026-11-11', majeure: 1 } });
  });

  it('repart de rien devant un stockage abîmé', () => {
    const s = memoire();
    s.setItem(CLE_EVALUATION, '{pas du json');
    expect(lireEtat(s)).toEqual({ demande: null });
    s.setItem(CLE_EVALUATION, JSON.stringify({ demande: { jour: 3 } }));
    expect(lireEtat(s)).toEqual({ demande: null });
  });

  it('ne casse pas sans stockage', () => {
    const casse: Stockage = {
      getItem: () => { throw new Error('non'); },
      setItem: () => { throw new Error('non'); },
      removeItem: () => { throw new Error('non'); },
    };
    expect(() => marquerDemandee('2026-11-11', 1, casse)).not.toThrow();
    expect(lireEtat(casse)).toEqual({ demande: null });
  });
});

describe('noteDue', () => {
  const demandee = (jour: string, majeure = 1) => ({ demande: { jour, majeure } });

  it('demande dès la première occasion, sans temps d’usage à attendre', () => {
    expect(noteDue({ demande: null }, '2026-11-12', 1)).toBe(true);
  });

  it('ne redemande pas avant 120 jours', () => {
    expect(DELAI_JOURS).toBe(120);
    const etat = demandee('2026-11-11');
    expect(noteDue(etat, '2026-11-12', 1)).toBe(false);
    expect(noteDue(etat, '2027-03-10', 1)).toBe(false); // 119 jours
    expect(noteDue(etat, '2027-03-11', 1)).toBe(true); // 120 jours
  });

  it('redemande dès qu’une version majeure nouvelle sort', () => {
    const etat = demandee('2026-11-11');
    expect(noteDue(etat, '2026-11-20', 2)).toBe(true);
    expect(noteDue(etat, '2026-11-20', 1)).toBe(false);
    // Une version plus ancienne que celle de la demande ne redemande pas.
    expect(noteDue(etat, '2026-11-20', 0)).toBe(false);
  });

  it('ne redemande pas sur une date rangée illisible, plutôt que de harceler', () => {
    expect(noteDue(demandee('hier'), '2027-12-12', 1)).toBe(false);
  });
});

describe('marquerDemandee', () => {
  it('range le jour et la version', () => {
    const s = memoire();
    marquerDemandee('2026-11-11', 1, s);
    expect(lireEtat(s).demande).toEqual({ jour: '2026-11-11', majeure: 1 });
  });
});
