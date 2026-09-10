/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DateExamen from './DateExamen';
import { aujourdhui, enregistrerReponse, etatInitial, sauvegarder } from '../lib/progression';

/**
 * Le compte à rebours est lu la nuit, la veille de l'épreuve. On fige donc
 * l'horloge à 00 h 30 heure de Paris, des deux côtés du changement d'heure :
 * c'est le seul moment où un jour UTC et un jour parisien divergent, et c'est
 * là que l'écran annonçait un jour de trop.
 */

const ids = Array.from({ length: 10 }, (_, i) => `vhf-${i}`);

function afficher(dateExamen: string) {
  sauvegarder({ ...etatInitial(), dateExamen });
  render(<DateExamen ids={ids} />);
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('le compte à rebours, la nuit du 15 janvier à Paris', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-14T23:30:00Z'));
  });

  it('compte les jours qui restent et le rythme à tenir', () => {
    afficher('2026-01-17');
    expect(screen.getByText(/Dans 2 jours\./).textContent).toContain('5 questions par jour');
  });

  it('renvoie aux examens blancs quand tout a déjà été vu une fois', () => {
    const vu = ids.reduce((etat, id) => enregistrerReponse(etat, id, true, aujourdhui()), etatInitial());
    sauvegarder({ ...vu, dateExamen: '2026-01-17' });
    render(<DateExamen ids={ids} />);
    expect(screen.getByText(/Dans 2 jours\. Tu as tout vu une fois/)).toBeTruthy();
  });

  it('dit « demain » la veille', () => {
    afficher('2026-01-16');
    expect(screen.getByText(/^Demain\./)).toBeTruthy();
  });

  it('dit « aujourd’hui » le jour même', () => {
    afficher('2026-01-15');
    expect(screen.getByText(/^Aujourd’hui\./)).toBeTruthy();
  });

  it('dit que c’est passé la veille au soir devenue lendemain', () => {
    afficher('2026-01-14');
    expect(screen.getByText(/^C’est passé\./)).toBeTruthy();
  });
});

describe('le compte à rebours, la nuit du 15 juillet à Paris', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T22:30:00Z'));
  });

  it('compte depuis le jour parisien, pas le jour UTC', () => {
    afficher('2026-07-17');
    expect(screen.getByText(/Dans 2 jours\./)).toBeTruthy();
  });

  it('dit « aujourd’hui » le jour même', () => {
    afficher('2026-07-15');
    expect(screen.getByText(/^Aujourd’hui\./)).toBeTruthy();
  });
});

describe('sans date posée', () => {
  it('ne dit rien du tout', () => {
    sauvegarder(etatInitial());
    render(<DateExamen ids={ids} />);
    expect(screen.queryByText(/Dans /)).toBeNull();
  });
});
