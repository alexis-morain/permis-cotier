/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(document.querySelector('.jeu__compteur')?.textContent).toContain('Question 3');
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

describe('le focus suit la question', () => {
  // L'épreuve est chronométrée : qui joue au clavier ou au lecteur d'écran ne
  // peut pas repartir du haut du document à chaque question. Le bouton qu'on
  // vient d'activer disparaît, et sans ce geste le focus retombe sur `body`.

  it('se pose sur l’énoncé dès que l’examen démarre', () => {
    render(<Quiz mode="examen" questions={trois} />);
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }));
  });

  it('suit le passage à la question suivante', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    const premier = screen.getByRole('heading', { level: 2 });
    fireEvent.keyDown(document.body, { key: 'a' });
    fireEvent.keyDown(document.body, { key: 'Enter' });
    const second = screen.getByRole('heading', { level: 2 });
    expect(second).not.toBe(premier);
    expect(document.activeElement).toBe(second);
  });

  it('dit où l’on en est, pour qui ne voit pas le compteur', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain('Question 1 sur 3.');
  });

  it('laisse l’entrée valider : l’énoncé n’est ni bouton ni lien', () => {
    // La garde `activable` du gestionnaire de touches s'efface devant un
    // BUTTON ou un A qui a le focus. Un titre n'en est pas un, donc Entrée
    // continue de valider au lieu de rejouer le bouton focalisé.
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    fireEvent.keyDown(document.body, { key: 'a' });
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(screen.getByRole('status')).toBeTruthy();
  });
});

describe('clavier', () => {
  it('coche par sa lettre et valide à l’entrée', () => {
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    fireEvent.keyDown(document.body, { key: 'b' });
    // « B » désigne la deuxième ligne de l'écran, pas la proposition d'identifiant
    // « b » : les propositions sont mélangées à l'affichage.
    const deuxieme = document.querySelectorAll('.propositions .proposition')[1]!;
    expect(deuxieme.getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(screen.getByRole('status')).toBeTruthy();
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(document.querySelector('.jeu__compteur')?.textContent).toContain('Question 2');
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
    expect(document.querySelector('.jeu__compteur')?.textContent).toContain('Question 1');
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

describe('ce que la série raconte à la mesure', () => {
  function traceur() {
    const track = vi.fn();
    (window as unknown as { umami: { track: typeof track } }).umami = { track };
    return track;
  }

  afterEach(() => {
    delete (window as unknown as { umami?: unknown }).umami;
  });

  it('annonce le départ de l’examen, pas son affichage', () => {
    const track = traceur();
    render(<Quiz mode="examen" questions={trois} />);
    expect(track).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    expect(track).toHaveBeenCalledWith('examen-commence', { theme: undefined });
  });

  it('dit à quelle question l’examen a été quitté', () => {
    const track = traceur();
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));

    window.dispatchEvent(new Event('pagehide'));
    expect(track).toHaveBeenCalledWith('examen-abandonne', { rang: 2, total: 3, theme: undefined });

    // Un seul abandon par série, même si la page s’en va deux fois.
    window.dispatchEvent(new Event('pagehide'));
    expect(track.mock.calls.filter((c) => c[0] === 'examen-abandonne')).toHaveLength(1);
  });

  it('ne compte pas comme abandon une série allée au bout', () => {
    const track = traceur();
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    for (let i = 0; i < trois.length; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
      fireEvent.click(screen.getByRole('button', { name: /Valider/ }));
    }

    window.dispatchEvent(new Event('pagehide'));
    expect(track.mock.calls.map((c) => c[0])).not.toContain('examen-abandonne');
    expect(track).toHaveBeenCalledWith('examen-termine', {
      bonnes: 3,
      erreurs: 0,
      total: 3,
      reussi: true,
      interrompu: false,
    });
  });
});

describe('le rappel de la raison sur le résultat', () => {
  it('revient quand l’examen est recalé, avec l’écart au précédent', () => {
    const quatre = [question('a-1'), question('a-2'), question('a-3'), question('a-4'), question('a-5'), question('a-6')];
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({
        version: VERSION_STOCKAGE,
        questions: {},
        examens: [{ date: '2026-09-01', bonnes: 2, total: 6, reussi: false }],
        profil: { prenom: '', motivations: ['bateau'], phrase: '', depart: null, rythme: null, rempliLe: '2026-09-01' },
      }),
    );
    render(<Quiz mode="examen" questions={quatre} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    // Six questions sans réponse : six erreurs, recalé.
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
    expect(screen.getByText(/Recalé/)).toBeTruthy();
    expect(screen.getByText(/Tu passes ce permis pour/)).toBeTruthy();
    expect(screen.getByText('Ton bateau à toi, et la mer devant.')).toBeTruthy();
    expect(screen.getByText(/Ton examen d’avant : 2 sur 6/).textContent).toContain('2 de moins');
  });

  it('se tait quand l’examen est reçu', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({
        version: VERSION_STOCKAGE,
        questions: {},
        examens: [],
        profil: { prenom: '', motivations: ['bateau'], phrase: '', depart: null, rythme: null, rempliLe: '2026-09-01' },
      }),
    );
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
    }
    expect(screen.getByText(/Reçu/)).toBeTruthy();
    expect(screen.queryByText(/Tu passes ce permis pour/)).toBeNull();
  });
});

/**
 * La banque arrive maintenant par un JSON commun aux seize écrans de jeu, au
 * lieu d'être sérialisée dans chaque page. Le corps du jeu ne doit monter
 * qu'une fois qu'elle est là : son tirage, sa reprise et sa lecture de la
 * progression se font tous au montage, et un tableau qui arriverait après les
 * prendrait à froid.
 */
describe('la banque téléchargée', () => {
  function servir(questions: QuestionAffichable[], version = '1.10.2') {
    return vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ version, questions }),
    })) as unknown as typeof fetch;
  }

  it('tient la place avec une silhouette, puis monte le jeu', async () => {
    vi.stubGlobal('fetch', servir(trois));
    render(<Quiz mode="examen" source="/banque/1.10.2.json" />);

    // Rien de sonore ni de tournant : une question en creux, annoncée.
    expect(document.querySelector('.silhouette')).toBeTruthy();
    expect(screen.getByText('Chargement des questions.')).toBeTruthy();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Commencer l’examen/ })).toBeTruthy(),
    );
    expect(document.querySelector('.silhouette')).toBeNull();
  });

  it('taille la part du thème dans la banque entière', async () => {
    const melange = [
      question('ecluses-0001', 'ecluses'),
      question('meteo-0001', 'meteo'),
      question('meteo-0002', 'meteo'),
    ];
    vi.stubGlobal('fetch', servir(melange));
    render(<Quiz mode="entrainement" source="/banque/1.10.2.json" theme="meteo" />);

    await waitFor(() => expect(screen.getByText(/Énoncé de meteo-0001/)).toBeTruthy());
    // La question d'un autre thème n'entre pas dans la série.
    expect(screen.queryByText(/Énoncé de ecluses-0001/)).toBeNull();
  });

  it('appelle bien l’URL qu’on lui donne, une seule fois', async () => {
    const appel = servir(trois);
    vi.stubGlobal('fetch', appel);
    render(<Quiz mode="examen" source="/banque/1.10.2.json" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Commencer l’examen/ })).toBeTruthy(),
    );
    expect(appel).toHaveBeenCalledTimes(1);
    // Le second argument porte le signal d'abandon de l'échéance.
    expect(appel).toHaveBeenCalledWith('/banque/1.10.2.json', expect.anything());
  });

  it('ne va rien chercher quand les questions sont déjà là', () => {
    const appel = servir(trois);
    vi.stubGlobal('fetch', appel);
    render(<Quiz mode="examen" questions={trois} source="/banque/1.10.2.json" />);
    expect(screen.getByRole('button', { name: /Commencer l’examen/ })).toBeTruthy();
    expect(appel).not.toHaveBeenCalled();
  });

  it('dit la coupure sans parler d’erreur, et réessaie', async () => {
    let tour = 0;
    const appel = vi.fn(async () => {
      tour += 1;
      if (tour === 1) throw new TypeError('réseau');
      return { ok: true, status: 200, json: async () => ({ version: '1.10.2', questions: trois }) };
    }) as unknown as typeof fetch;
    vi.stubGlobal('fetch', appel);
    render(<Quiz mode="examen" source="/banque/1.10.2.json" />);

    await waitFor(() =>
      expect(screen.getByText(/Les questions ne sont pas arrivées/)).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Commencer l’examen/ })).toBeTruthy(),
    );
  });

  it('renonce au bout de quinze secondes plutôt que de tourner sans fin', async () => {
    // Un réseau qui accepte la connexion et ne répond jamais — portail captif,
    // tunnel, mobile mort — ne rejette pas la promesse : sans échéance, la
    // silhouette bat indéfiniment et le candidat n'a même pas de bouton.
    vi.useFakeTimers();
    try {
      vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})) as unknown as typeof fetch);
      render(<Quiz mode="examen" source="/banque/v/1.10.2.json" />);
      expect(document.querySelector('.silhouette')).toBeTruthy();

      await act(async () => {
        vi.advanceTimersByTime(15_000);
      });
      expect(screen.getByText(/Les questions ne sont pas arrivées/)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('traite un 404 comme une coupure, pas comme une banque vide', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch,
    );
    render(<Quiz mode="examen" source="/banque/1.10.2.json" />);
    await waitFor(() =>
      expect(screen.getByText(/Les questions ne sont pas arrivées/)).toBeTruthy(),
    );
    // Surtout pas « Aucune question publiée », qui serait un mensonge.
    expect(screen.queryByText(/Aucune question publiée/)).toBeNull();
  });
});

/**
 * Le mélange des propositions.
 *
 * La banque range presque toujours la bonne réponse en premier : l'ordre du
 * fichier ne peut plus être celui de l'écran. Ce qui est vérifié ici est ce que
 * le mélange doit garantir au candidat — un ordre qui ne bouge pas sous ses
 * doigts, des lettres qui suivent l'écran, et une correction qui reste juste.
 */
const lignes = () => [...document.querySelectorAll<HTMLElement>('.propositions .proposition')];
const textes = () => lignes().map((n) => n.children[1]?.textContent ?? '');
const lettres = () => lignes().map((n) => n.querySelector('.proposition__lettre')?.textContent ?? '');

describe('mélange des propositions', () => {
  it('nomme les lignes dans l’ordre de l’écran, pas dans celui du fichier', () => {
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    expect(lettres()).toEqual(['A', 'B', 'C', 'D']);
    expect(lignes().map((n) => n.getAttribute('aria-keyshortcuts'))).toEqual(['A', 'B', 'C', 'D']);
  });

  it('ne déplace pas les propositions quand on coche et qu’on corrige', () => {
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    const depart = textes();
    fireEvent.click(lignes()[0]!);
    expect(textes()).toEqual(depart);
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(textes()).toEqual(depart);
  });

  it('change d’ordre d’une session à l’autre', () => {
    const ordres = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
      ordres.add(textes().join('|'));
      cleanup();
    }
    expect(ordres.size).toBeGreaterThan(1);
  });

  it('fait suivre le clavier la lettre affichée', () => {
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    fireEvent.keyDown(document.body, { key: 'b' });
    expect(lignes().map((n) => n.getAttribute('aria-pressed'))).toEqual([
      'false', 'true', 'false', 'false',
    ]);
  });

  it('corrige juste la bonne réponse, où qu’elle soit affichée', () => {
    render(<Quiz mode="entrainement" questions={trois} theme="ecluses" />);
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(screen.getByText('Bonne réponse')).toBeTruthy();
  });

  it('garde le même ordre à la reprise d’un examen interrompu', () => {
    const enCours = {
      mode: 'examen',
      theme: null,
      ids: trois.map((q) => q.id),
      index: 0,
      selections: [[], [], []],
      echeance: Date.now() + 12_000,
      journal: [],
      graine: 4242,
      majLe: Date.now(),
    };
    const sauvegarde = JSON.stringify({
      version: VERSION_STOCKAGE,
      questions: {},
      examens: [],
      dateExamen: null,
      enCours,
    });

    const reprendre = () => {
      localStorage.setItem(CLE_STOCKAGE, sauvegarde);
      render(<Quiz mode="examen" questions={trois} />);
      fireEvent.click(screen.getByRole('button', { name: /Reprendre à la question 1/ }));
      const ordre = textes();
      cleanup();
      return ordre;
    };

    // Deux retours sur le même examen sauvegardé : les propositions ne bougent
    // pas. Sans la graine dans la sauvegarde, elles seraient redistribuées.
    expect(reprendre()).toEqual(reprendre());
  });

  it('revoit les questions dans l’ordre où elles ont été jouées', () => {
    render(<Quiz mode="examen" questions={trois} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    const joue = textes();
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Revoir les questions' }));
    const premiere = document.querySelector('.revue__item');
    const revus = [...premiere!.querySelectorAll('.proposition')].map(
      (n) => n.children[1]?.textContent ?? '',
    );
    expect(revus).toEqual(joue);
  });
});
