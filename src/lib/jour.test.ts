import { describe, it, expect, afterEach, vi } from 'vitest';
import { aujourdhui, dateLisible, enDate, jourDeLaSemaine, jourPlus } from './jour';

/**
 * Les candidats sont en France. Entre minuit et l'heure d'UTC qui suit, le
 * jour parisien et le jour UTC ne sont pas le même : c'est là que la série de
 * jours se perdait. On fige l'horloge des deux côtés du changement d'heure,
 * parce que l'écart Paris–UTC vaut une heure l'hiver et deux l'été.
 */

afterEach(() => vi.useRealTimers());

describe('le jour courant', () => {
  it('rend le jour parisien à 00 h 30 en hiver, quand UTC est encore la veille', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-14T23:30:00Z'));
    expect(aujourdhui()).toBe('2026-01-15');
  });

  it('rend le jour parisien à 00 h 30 en été, quand UTC est encore la veille', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T22:30:00Z'));
    expect(aujourdhui()).toBe('2026-07-15');
  });

  it('rend le même jour que UTC en pleine journée', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T10:00:00Z'));
    expect(aujourdhui()).toBe('2026-07-15');
  });

  it('rend déjà le lendemain à 23 h 30 heure de Paris en hiver', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T22:30:00Z'));
    expect(aujourdhui()).toBe('2026-01-15');
  });
});

describe('une date rangée, relue comme une case de calendrier', () => {
  it('donne le bon jour de la semaine, quel que soit le fuseau du lecteur', () => {
    // Le 15 janvier 2026 est un jeudi.
    expect(jourDeLaSemaine('2026-01-15')).toBe(4);
    expect(jourDeLaSemaine('2026-07-15')).toBe(3);
  });

  it('s’écrit en toutes lettres sans reculer d’un jour', () => {
    expect(dateLisible('2026-01-15')).toBe('15 janvier');
    expect(dateLisible('2026-07-01')).toBe('1 juillet');
  });

  it('avance et recule d’un nombre de jours, changement d’heure compris', () => {
    // Le passage à l'heure d'été 2026 tombe le 29 mars : une journée de 23 h,
    // qui ne doit pas manger une case.
    expect(jourPlus('2026-03-28', 2)).toBe('2026-03-30');
    expect(jourPlus('2026-03-30', -2)).toBe('2026-03-28');
    expect(jourPlus('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('rend la date telle quelle quand elle est illisible', () => {
    expect(enDate('bientôt')).toBeNull();
    expect(jourDeLaSemaine('bientôt')).toBeNull();
    expect(dateLisible('bientôt')).toBe('bientôt');
    expect(jourPlus('bientôt', 1)).toBe('bientôt');
  });
});
