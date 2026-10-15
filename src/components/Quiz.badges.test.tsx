/** @vitest-environment jsdom */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Quiz from './Quiz';
import type { QuestionAffichable } from '../lib/banque';
import { aujourdhui, CLE_STOCKAGE, VERSION_STOCKAGE } from '../lib/progression';
import { jourPlus } from '../lib/jour';
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
 * Les badges, branchés à l'écran de jeu : gagnés au geste (la réponse,
 * l'examen enregistré), gardés, et annoncés une fois au résultat de la série
 * qui les a fait gagner. Les règles elles-mêmes sont testées dans
 * `lib/badges.test.ts`.
 */

function question(id: string, theme = 'ecluses'): QuestionAffichable {
  return {
    id,
    theme,
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

const trois = [question('ecluses-0001'), question('ecluses-0002'), question('ecluses-0003')];

function poser(etat: Record<string, unknown>) {
  localStorage.setItem(
    CLE_STOCKAGE,
    JSON.stringify({ version: VERSION_STOCKAGE, questions: {}, examens: [], dateExamen: null, ...etat }),
  );
}

const lire = () => JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? '{}');

/** Réussie hier pour la première fois : une réussite aujourd'hui la rend retenue. */
function reussieHier() {
  const hier = jourPlus(aujourdhui(), -1);
  return { vues: 1, ratees: 0, derniereReussie: true, vueLe: hier, succes: 1, dernierSuccesLe: hier, revoirLe: aujourdhui() };
}

/** Déjà retenue. */
function retenue() {
  return { vues: 2, ratees: 0, derniereReussie: true, vueLe: '2026-09-01', succes: 2, dernierSuccesLe: '2026-09-01', revoirLe: '2026-12-01' };
}

/** Un examen complet d'avant, sans faute sur les thèmes donnés. */
function examenSansFaute(themes: string[]) {
  return {
    date: '2026-10-01',
    bonnes: 40,
    total: 40,
    reussi: true,
    parTheme: Object.fromEntries(themes.map((t) => [t, { bonnes: 3, total: 3 }])),
  };
}

function jouerExamen(n: number, juste = true) {
  fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
  for (let i = 0; i < n; i++) {
    if (juste) fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
  }
}

function jouerSerie(n: number) {
  for (let i = 0; i < n; i++) {
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: /Question suivante|Voir le résultat/ }));
  }
}

const annonce = () => document.querySelector('.badges-gagnes');

const ATTENTE = { timeout: 2000 };

// Le premier `import()` de `badges.ts` se transforme à la volée sous Vitest,
// en plus d'une seconde : une attribution partie d'un test finirait dans le
// stockage du suivant. Chargé une fois avant tout, il répond aussitôt.
beforeAll(async () => {
  await import('../lib/badges');
});

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  vi.mocked(vibrer).mockClear();
});

afterEach(async () => {
  cleanup();
  cible.app = false;
  // Les attributions encore en vol finissent ici, pas dans le test suivant.
  await new Promise((r) => setTimeout(r, 0));
});

describe('l’examen blanc garde son détail par thème', () => {
  it('enregistre parTheme avec l’examen complet', async () => {
    poser({});
    render(<Quiz mode="examen" questions={trois} />);
    jouerExamen(3);
    await waitFor(() => expect(lire().examens).toHaveLength(1));
    expect(lire().examens[0]).toMatchObject({
      bonnes: 3,
      total: 3,
      reussi: true,
      parTheme: { ecluses: { bonnes: 3, total: 3 } },
    });
  });
});

describe('le badge gagné à l’examen', () => {
  it('« Sûr à l’examen » au troisième examen sans faute sur le thème, annoncé au résultat et gardé', async () => {
    poser({ examens: [examenSansFaute(['ecluses']), examenSansFaute(['ecluses'])] });
    render(<Quiz mode="examen" questions={trois} />);
    jouerExamen(3);
    await waitFor(() => expect(annonce()?.textContent).toContain('Sûr à l’examen'), ATTENTE);
    const bloc = annonce()!;
    expect(bloc.getAttribute('role')).toBe('status');
    expect(bloc.textContent).toContain('Palier gagné');
    expect(bloc.textContent).toContain('Écluses');
    expect(bloc.textContent).toContain('Trois examens blancs de suite sans faute sur les écluses');
    expect(lire().badges).toEqual({ ecluses: { sur: aujourdhui() } });
  });

  it('rien au troisième examen s’il a une faute sur le thème', async () => {
    poser({ examens: [examenSansFaute(['ecluses']), examenSansFaute(['ecluses'])] });
    render(<Quiz mode="examen" questions={trois} />);
    jouerExamen(3, false);
    await waitFor(() => expect(lire().examens).toHaveLength(3));
    // Laisse au module des badges le temps d'arriver : rien ne doit venir.
    await new Promise((r) => setTimeout(r, 50));
    expect(annonce()?.textContent ?? '').toBe('');
    expect(lire().badges ?? {}).toEqual({});
  });

  it('un examen arrêté en route n’entre pas dans l’historique et ne fait rien gagner', async () => {
    poser({ examens: [examenSansFaute(['ecluses']), examenSansFaute(['ecluses'])] });
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter et voir le résultat' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(lire().examens).toHaveLength(2);
    expect(lire().badges?.ecluses?.sur).toBeUndefined();
  });

  it('plusieurs d’un coup : trois lignes au plus, le reste renvoie à la fiche', async () => {
    const themes = ['balisage', 'signaux', 'meteo', 'ecluses'];
    const quatre = themes.map((t) => question(`${t}-0001`, t));
    poser({ examens: [examenSansFaute(themes), examenSansFaute(themes)] });
    render(<Quiz mode="examen" questions={quatre} />);
    jouerExamen(4);
    await waitFor(() => expect(annonce()?.textContent).toContain('Paliers gagnés'), ATTENTE);
    expect(annonce()!.querySelectorAll('li')).toHaveLength(3);
    expect(annonce()!.textContent).toContain('Les autres sont sur ta fiche.');
    expect(Object.keys(lire().badges)).toHaveLength(4);
  });
});

describe('le badge gagné en entraînement', () => {
  it('« Retenu » se gagne à la réponse et s’annonce à la fin de la série', async () => {
    poser({ questions: { 'ecluses-0001': reussieHier() } });
    render(<Quiz mode="entrainement" questions={[question('ecluses-0001')]} theme="ecluses" />);
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    // Gagné et gardé dès la réponse, mais pas annoncé en pleine série.
    await waitFor(() => expect(lire().badges).toEqual({ ecluses: { retenu: aujourdhui() } }), ATTENTE);
    expect(annonce()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Question suivante|Voir le résultat/ }));
    expect(annonce()?.textContent).toContain('Retenu');
    expect(annonce()!.textContent).toContain('1 question sur 1 retenue');
  });

  it('ne s’annonce qu’une fois : la série refaite ne redit rien', async () => {
    poser({
      questions: { 'ecluses-0001': retenue(), 'ecluses-0002': retenue(), 'ecluses-0003': retenue() },
      badges: { ecluses: { retenu: '2026-10-01' } },
    });
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    jouerSerie(3);
    await new Promise((r) => setTimeout(r, 50));
    expect(annonce()?.textContent ?? '').toBe('');
    expect(lire().badges).toEqual({ ecluses: { retenu: '2026-10-01' } });
  });
});

describe('dans l’app', () => {
  beforeEach(() => {
    cible.app = true;
  });

  it('le son de leçon renforce l’annonce, après celui du verdict', async () => {
    poser({ examens: [examenSansFaute(['ecluses']), examenSansFaute(['ecluses'])] });
    render(<Quiz mode="examen" questions={trois} />);
    jouerExamen(3);
    await waitFor(() => expect(annonce()?.textContent).toContain('Sûr à l’examen'), ATTENTE);
    await waitFor(() => expect(vi.mocked(vibrer).mock.calls.map((c) => c[0])).toContain('lecon'), { timeout: 2500 });
    const sons = vi.mocked(vibrer).mock.calls.map((c) => c[0]).filter((s) => s !== 'choix');
    expect(sons).toEqual(['reussi', 'lecon']);
  });

  it('pas de son de leçon sans badge', async () => {
    poser({});
    render(<Quiz mode="examen" questions={trois} />);
    jouerExamen(3);
    await new Promise((r) => setTimeout(r, 1500));
    expect(vi.mocked(vibrer).mock.calls.map((c) => c[0])).not.toContain('lecon');
  });
});
