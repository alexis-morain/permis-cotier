/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { QuestionAffichable } from '../../lib/banque';

/**
 * Le chrono bat la seconde sans refaire l'écran.
 *
 * Il envoyait un `tic` au réducteur chaque seconde : la session changeait, et
 * `Partie` se rendait en entier, énoncé, visuel et propositions compris, vingt
 * fois par question. `Partie` appelle `questionCourante` une fois par rendu,
 * et c'est le seul à l'appeler par le module : compter ses appels, c'est
 * compter les rendus de l'écran.
 */

vi.mock('../../lib/natif', () => ({
  vibrer: vi.fn(async () => {}),
  partager: vi.fn(async () => false),
  modeConcentration: vi.fn(async () => {}),
  surRetourAuPremierPlan: vi.fn(() => () => {}),
}));

const rendus = vi.hoisted(() => ({ n: 0 }));
vi.mock('../../lib/session', async (original) => {
  const vrai = await original<typeof import('../../lib/session')>();
  return {
    ...vrai,
    questionCourante: (...args: Parameters<typeof vrai.questionCourante>) => {
      rendus.n += 1;
      return vrai.questionCourante(...args);
    },
  };
});

const { default: Quiz } = await import('../Quiz');

function question(id: string): QuestionAffichable {
  return {
    id,
    theme: 'ecluses',
    reponses: ['a'],
    enonce: `Énoncé de ${id}`,
    explication: `Explication de ${id}`,
    difficulte: 2,
    propositions: [
      { id: 'a', texte: 'Première proposition' },
      { id: 'b', texte: 'Deuxième proposition' },
    ],
    sources: [{ texte: 'RIPAM, règle 26', ref: 'decret-77-733' }],
  };
}

const trois = [question('ecluses-0001'), question('ecluses-0002'), question('ecluses-0003')];

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(new Date('2026-09-06T10:00:00Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const secondesAffichees = () =>
  Number(document.querySelector('.jeu__chrono')?.textContent?.match(/(\d+)/)?.[1]);

describe('le chrono et l’écran de jeu', () => {
  it('laisse l’écran en place pendant les vingt secondes d’une question', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    rendus.n = 0;

    // Une seconde par `act` : en un seul, React grouperait les dix-neuf
    // battements en un rendu, et le compte ne dirait rien.
    for (let s = 0; s < 19; s++) {
      act(() => {
        vi.advanceTimersByTime(1_000);
      });
    }
    // Le chiffre a bien bougé, l'écran non.
    expect(secondesAffichees()).toBe(1);
    expect(rendus.n).toBe(0);

    // Au buzzer, la question passe : un seul rendu, celui de la suivante.
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText(/Énoncé de ecluses-0002/)).toBeTruthy();
    expect(secondesAffichees()).toBe(20);
    expect(rendus.n).toBeLessThanOrEqual(2);
  });

  it('n’annonce pas les secondes au lecteur d’écran', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    const chrono = document.querySelector('.jeu__chrono');
    expect(chrono?.getAttribute('aria-live')).toBe('off');
    expect(chrono?.closest('[aria-live]:not([aria-live="off"]), [role="status"], [role="timer"]')).toBeNull();
  });
});
