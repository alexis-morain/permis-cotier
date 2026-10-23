/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Quiz from './Quiz';
import type { QuestionAffichable } from '../lib/banque';
import { CLE_STOCKAGE } from '../lib/progression';
import { vibrer } from '../lib/natif';

vi.mock('../lib/natif', () => ({
  vibrer: vi.fn(async () => {}),
  partager: vi.fn(async () => false),
  modeConcentration: vi.fn(async () => {}),
  surRetourAuPremierPlan: vi.fn(() => () => {}),
}));

const cible = vi.hoisted(() => ({ app: false }));
vi.mock('../lib/cible', () => ({
  get POUR_APP() {
    return cible.app;
  },
}));

/**
 * L'entraînement par thème joue des séries de dix : le compteur dit « 1 / 10 »,
 * la fin donne le score et le récapitulatif, et « Encore 10 » enchaîne sur
 * d'autres questions. Les règles du choix sont testées dans `lib/quiz.test.ts`.
 */

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
      { id: 'c', texte: 'Troisième proposition' },
      { id: 'd', texte: 'Quatrième proposition' },
    ],
    sources: [{ texte: 'RIPAM, règle 26', ref: 'decret-77-733' }],
  };
}

const banque = (n: number) => Array.from({ length: n }, (_, i) => question(`ecluses-${String(i + 1).padStart(4, '0')}`));

const compteur = () => document.querySelector('.jeu__compteur')?.textContent ?? '';
const enonceAffiche = () => screen.getByRole('heading', { level: 2 }).textContent ?? '';
const idAffiche = () => /ecluses-\d{4}/.exec(enonceAffiche())![0];

/** Joue `n` questions ; celles dont le rang est dans `fausses` sont ratées. */
function jouer(n: number, fausses: readonly number[] = []): string[] {
  const vues: string[] = [];
  for (let i = 0; i < n; i++) {
    vues.push(idAffiche());
    const choix = fausses.includes(i) ? /Deuxième proposition/ : /Première proposition/;
    fireEvent.click(screen.getByRole('button', { name: choix }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: /Question suivante|Continuer/ }));
  }
  return vues;
}

beforeEach(() => {
  localStorage.clear();
  cible.app = false;
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('la série de dix', () => {
  it('ne joue que dix questions d’un thème qui en compte vingt-cinq', () => {
    render(<Quiz mode="entrainement" questions={banque(25)} theme="ecluses" />);
    expect(compteur()).toContain('sur 10');
  });

  it('dit « 1 / 10 » dans l’app', () => {
    cible.app = true;
    const { container } = render(<Quiz mode="entrainement" questions={banque(25)} theme="ecluses" />);
    expect(container.querySelector('.jeu__compteur')?.textContent).toBe('1 / 10');
  });

  it('prend toutes les questions d’un thème qui en a moins de dix', () => {
    render(<Quiz mode="entrainement" questions={banque(7)} theme="ecluses" />);
    expect(compteur()).toContain('sur 7');
  });

  it('ne touche pas à la série du jour', () => {
    render(<Quiz mode="entrainement" revoir questions={banque(25)} theme="ecluses" />);
    expect(compteur()).toContain('sur 20');
  });
});

describe('la fin de la série', () => {
  it('donne le score, le son de fin et la liste des dix questions', () => {
    render(<Quiz mode="entrainement" questions={banque(25)} theme="ecluses" />);
    jouer(10, [2, 5]);
    expect(vibrer).toHaveBeenCalledWith('fin-serie');
    expect(screen.getByText(/^8/).textContent).toContain('sur 10');
    const lignes = screen.getAllByRole('listitem').filter((li) => li.querySelector('.recap__ligne'));
    expect(lignes).toHaveLength(10);
    // Juste ou faux est écrit, jamais porté par la couleur seule.
    expect(lignes.filter((li) => within(li).queryByText('Faux'))).toHaveLength(2);
    expect(lignes.filter((li) => within(li).queryByText('Juste'))).toHaveLength(8);
  });

  it('ouvre une ligne pour revoir la question, la bonne réponse et l’explication', () => {
    render(<Quiz mode="entrainement" questions={banque(25)} theme="ecluses" />);
    const vues = jouer(10, [3]);
    const ligne = document.querySelectorAll<HTMLButtonElement>('.recap__ligne')[3]!;
    expect(ligne.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(ligne);
    expect(ligne.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(`Explication de ${vues[3]}`)).toBeTruthy();
    expect(screen.getByText('ta réponse')).toBeTruthy();
    expect(screen.getByText('bonne réponse, oubliée')).toBeTruthy();
    fireEvent.click(ligne);
    expect(screen.queryByText(`Explication de ${vues[3]}`)).toBeNull();
  });

  it('propose « Encore 10 » en action principale et « Changer de thème » en lien', () => {
    render(<Quiz mode="entrainement" questions={banque(25)} theme="ecluses" />);
    jouer(10);
    expect(screen.getByRole('button', { name: 'Encore 10' }).className).toContain('bouton--principal');
    expect(screen.getByRole('link', { name: 'Changer de thème' }).getAttribute('href')).toBe('/entrainement');
  });

  it('dit combien de questions il reste quand le thème est court', () => {
    render(<Quiz mode="entrainement" questions={banque(7)} theme="ecluses" />);
    jouer(7);
    expect(screen.getByRole('button', { name: 'Encore 7' })).toBeTruthy();
  });
});

describe('« Encore 10 »', () => {
  it('rejoue une série neuve, d’autres questions d’abord, compteur remis à 1', () => {
    render(<Quiz mode="entrainement" questions={banque(25)} theme="ecluses" />);
    const premieres = jouer(10);
    fireEvent.click(screen.getByRole('button', { name: 'Encore 10' }));

    expect(compteur()).toContain('sur 10');
    const secondes = jouer(10, [0]);
    expect(secondes.filter((id) => premieres.includes(id))).toEqual([]);
    expect(screen.getByText(/^9/).textContent).toContain('sur 10');
  });

  it('écrit les deux séries dans la progression, sans compter deux fois', () => {
    render(<Quiz mode="entrainement" questions={banque(25)} theme="ecluses" />);
    jouer(10);
    fireEvent.click(screen.getByRole('button', { name: 'Encore 10' }));
    jouer(10);
    const etat = JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}');
    const vues = Object.values<{ vues: number }>(etat.questions);
    expect(vues).toHaveLength(20);
    expect(vues.every((v) => v.vues === 1)).toBe(true);
  });

  it('refait entendre la fin de série à la fin de la suivante', () => {
    render(<Quiz mode="entrainement" questions={banque(25)} theme="ecluses" />);
    jouer(10);
    fireEvent.click(screen.getByRole('button', { name: 'Encore 10' }));
    jouer(10);
    expect(vi.mocked(vibrer).mock.calls.filter(([m]) => m === 'fin-serie')).toHaveLength(2);
  });

  it('remet d’abord les questions ratées', () => {
    render(<Quiz mode="entrainement" questions={banque(11)} theme="ecluses" />);
    const premieres = jouer(10, [4]);
    fireEvent.click(screen.getByRole('button', { name: 'Encore 10' }));
    // Onze questions : la onzième, jamais vue, et la ratée sont dans la série.
    const secondes = [] as string[];
    for (let i = 0; i < 10; i++) {
      secondes.push(idAffiche());
      fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
      fireEvent.click(screen.getByRole('button', { name: /Question suivante|Continuer/ }));
    }
    expect(secondes).toContain(premieres[4]);
    expect(new Set(secondes).size).toBe(10);
  });
});

describe('le récapitulatif ailleurs', () => {
  it('l’examen blanc l’a dans l’app : une ligne par question jouée', () => {
    cible.app = true;
    render(<Quiz mode="examen" questions={banque(4)} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
      fireEvent.click(screen.getByRole('button', { name: /^(Passer|Valider et passer)$/ }));
    }
    expect(document.querySelectorAll('.recap__ligne')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Encore 10' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Refaire un examen' })).toBeTruthy();
  });
});
