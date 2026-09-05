/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Quiz from './Quiz';
import type { QuestionAffichable } from '../lib/banque';
import { CLE_STOCKAGE, VERSION_STOCKAGE } from '../lib/progression';

/**
 * L'écran de jeu, vu du clavier et de l'œil. Le modèle de session est testé à
 * part, en fonctions pures ; ici on vérifie ce que le composant en fait :
 * le chrono qui ne part pas trop tôt, la correction qu'on annonce et qu'on
 * remonte, les touches, et l'arrêt qui ne rend pas un zéro imaginaire.
 */

function question(id: string, theme = 'ecluses', reponses = ['a']): QuestionAffichable {
  return {
    id,
    theme,
    reponses,
    enonce: `Énoncé de ${id}`,
    explication: `Explication de ${id}`,
    difficulte: 2,
    propositions: [
      { id: 'a', texte: 'Première proposition' },
      { id: 'b', texte: 'Deuxième proposition' },
      { id: 'c', texte: 'Troisième proposition' },
      { id: 'd', texte: 'Quatrième proposition' },
    ],
    sources: [{ texte: 'RIPAM, règle 26', ref: 'decret-77-733' }],
  };
}

const trois = [question('ecluses-0001'), question('ecluses-0002'), question('ecluses-0003')];

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('écran de départ de l’examen', () => {
  it('ne lance pas le chrono avant qu’on le demande', () => {
    render(<Quiz mode="examen" questions={trois} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Quarante questions');
    expect(screen.queryByText(/secondes restantes/)).toBeNull();
    expect(screen.getByRole('button', { name: /Commencer l’examen/ })).toBeTruthy();
  });

  it('arme le chrono au clic, et sort la consigne du jeu', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    expect(screen.getByText(/secondes restantes/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Valider et passer' })).toBeTruthy();
    // La consigne est dite une fois au départ, pas quarante fois de suite.
    expect(screen.queryByText(/une bonne case seule ne suffit pas/)).toBeNull();
  });

  it('ne recompte pas dans la progression les réponses déjà données', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({
        version: VERSION_STOCKAGE,
        questions: { 'ecluses-0001': { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-01' } },
        examens: [],
        dateExamen: null,
        enCours: {
          mode: 'examen',
          theme: null,
          ids: trois.map((q) => q.id),
          index: 1,
          selections: [['a'], [], []],
          echeance: Date.now() + 12_000,
          journal: [{ id: 'ecluses-0001', juste: true }],
          majLe: Date.now(),
        },
      }),
    );
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Reprendre à la question 2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));

    const etat = JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}');
    expect(etat.questions['ecluses-0001'].vues).toBe(1);
    expect(etat.questions['ecluses-0002'].vues).toBe(1);
  });

  it('propose de reprendre un examen laissé en plan', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({
        version: VERSION_STOCKAGE,
        questions: {},
        examens: [],
        dateExamen: null,
        enCours: {
          mode: 'examen',
          theme: null,
          ids: trois.map((q) => q.id),
          index: 2,
          selections: [['a'], ['b'], []],
          echeance: Date.now() + 12_000,
          journal: [{ id: 'ecluses-0001', juste: true }],
          majLe: Date.now(),
        },
      }),
    );
    render(<Quiz mode="examen" questions={trois} />);
    const reprendre = screen.getByRole('button', { name: /Reprendre à la question 3/ });
    fireEvent.click(reprendre);
    expect(screen.getByText(/Question 3/)).toBeTruthy();
  });
});

describe('correction en entraînement', () => {
  it('annonce le verdict et le remonte dans le champ de vision', () => {
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));

    const verdict = screen.getByRole('status');
    expect(verdict.textContent).toContain('Explication de ecluses-0001');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      behavior: 'smooth',
    });
  });

  it('remonte en haut de page au passage du résultat', () => {
    render(<Quiz mode="entrainement" questions={[question('ecluses-0001')]} theme="ecluses" />);
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Question suivante' }));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});

describe('clavier', () => {
  it('coche par sa lettre et valide à l’entrée', () => {
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    fireEvent.keyDown(document.body, { key: 'b' });
    expect(screen.getByRole('button', { name: /Deuxième proposition/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(screen.getByRole('status')).toBeTruthy();
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(screen.getByText(/Question 2/)).toBeTruthy();
  });

  it('ignore une lettre sans proposition', () => {
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    fireEvent.keyDown(document.body, { key: 'e' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Valider' }).hasAttribute('disabled')).toBe(true);
  });

  it('valide à l’entrée même quand une proposition garde le focus', () => {
    // Chromium laisse le focus sur le bouton cliqué : sans exception, Entrée
    // décochait la réponse au lieu de valider.
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    const proposition = screen.getByRole('button', { name: /Première proposition/ });
    fireEvent.click(proposition);
    proposition.focus();
    fireEvent.keyDown(proposition, { key: 'Enter' });

    expect(screen.getByRole('status')).toBeTruthy();
    expect(proposition.getAttribute('aria-pressed')).toBe('true');
  });

  it('laisse le bouton qui a le focus faire son travail, sans doubler', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    const valider = screen.getByRole('button', { name: 'Valider et passer' });
    valider.focus();
    fireEvent.keyDown(valider, { key: 'Enter' });
    expect(screen.getByText(/Question 1/)).toBeTruthy();
  });
});

describe('arrêt d’un examen en cours', () => {
  it('prévient de ce qui va se passer avant d’arrêter', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter' }));

    expect(screen.getByText(/Il te reste 2 questions/)).toBeTruthy();
    expect(screen.getByText(/portera sur la seule que tu as jouée, pas sur 3/)).toBeTruthy();
  });

  it('rend la main sans rien casser si on renonce', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer l’examen' }));
    expect(screen.getByRole('button', { name: 'Valider et passer' })).toBeTruthy();
  });

  it('note sur les questions jouées, pas sur les quarante', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter et voir le résultat' }));

    expect(screen.getByText(/Examen interrompu, 1 question jouée sur 3/)).toBeTruthy();
    expect(screen.queryByText(/Recalé/)).toBeNull();
  });

  it('n’inscrit pas un examen interrompu dans les examens passés', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter et voir le résultat' }));

    const etat = JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}');
    expect(etat.examens).toEqual([]);
    // La question jouée compte quand même dans la progression. Le tirage est
    // aléatoire : on ne peut pas nommer laquelle, seulement qu'il y en a une.
    const vues = Object.values(etat.questions) as { vues: number }[];
    expect(vues).toHaveLength(1);
    expect(vues[0]!.vues).toBe(1);
    expect(etat.enCours).toBeNull();
  });

  it('inscrit un examen mené au bout', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
    }
    const etat = JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}');
    expect(etat.examens).toHaveLength(1);
    expect(etat.examens[0].total).toBe(3);
  });
});

describe('révision des erreurs', () => {
  it('ne garde que les ratées de la progression locale', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({
        version: VERSION_STOCKAGE,
        questions: {
          'ecluses-0001': { vues: 1, ratees: 0, derniereReussie: true, vueLe: '2026-09-01' },
          'ecluses-0002': { vues: 1, ratees: 1, derniereReussie: false, vueLe: '2026-09-02' },
        },
        examens: [],
        dateExamen: null,
        enCours: null,
      }),
    );
    render(<Quiz mode="entrainement" questions={trois} revoir />);
    expect(screen.getByText('Énoncé de ecluses-0002')).toBeTruthy();
    expect(document.querySelector('.jeu__compteur')?.textContent).toBe('Question 1 sur 1');
  });

  it('le dit franchement quand il n’y a rien à revoir', () => {
    render(<Quiz mode="entrainement" questions={trois} revoir />);
    expect(screen.getByText(/Rien à revoir pour l’instant/)).toBeTruthy();
  });
});
