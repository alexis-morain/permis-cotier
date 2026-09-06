/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { QuestionAffichable } from '../lib/banque';

/**
 * Le chrono quand l'app part en arrière-plan.
 *
 * Le plan du chantier iOS notait la chose ainsi : « une app suspendue fait
 * pire qu'un onglet caché, elle gèle. Il faut relancer un tic sur
 * `appStateChange`. `session.ts` est déjà écrit pour que le temps réel décide,
 * donc ça devrait tomber juste — à prouver par un test, pas à supposer. »
 *
 * C'est ce fichier. Il isole `natif.ts` pour attraper la fonction que `Quiz`
 * lui confie, avance l'horloge sans laisser passer un seul battement
 * d'intervalle — ce que fait exactement une app suspendue — puis appelle cette
 * fonction comme le ferait le retour au premier plan. Le compte doit avoir
 * couru pendant l'absence, pas reprendre où il s'était arrêté.
 *
 * Le reste, `session.test.ts` le couvre en fonctions pures ; ce qui se passe
 * vraiment sur l'appareil se vérifie au simulateur.
 */

/** Ce que `Quiz` a confié à `surRetourAuPremierPlan`. */
const retours: Array<() => void> = [];

vi.mock('../lib/natif', () => ({
  vibrer: vi.fn(async () => {}),
  partager: vi.fn(async () => false),
  programmerRappels: vi.fn(async () => {}),
  surRetourAuPremierPlan: (faire: () => void) => {
    retours.push(faire);
    return () => {
      const rang = retours.indexOf(faire);
      if (rang >= 0) retours.splice(rang, 1);
    };
  },
}));

const { default: Quiz } = await import('./Quiz');

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

const DEPART = new Date('2026-09-06T10:00:00Z').getTime();

beforeEach(() => {
  localStorage.clear();
  retours.length = 0;
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(DEPART);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Lance un examen et rend le nombre de secondes affiché. */
function commencer() {
  render(<Quiz mode="examen" questions={trois} />);
  fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
}

function secondesAffichees(): number {
  const chrono = document.querySelector('.jeu__chrono');
  return Number(chrono?.textContent?.match(/(\d+)/)?.[1]);
}

describe('le retour au premier plan', () => {
  it('confie une fonction de recalage tant que l’examen court', () => {
    commencer();
    expect(retours).toHaveLength(1);
  });

  it('n’écoute rien avant que l’examen soit lancé', () => {
    render(<Quiz mode="examen" questions={trois} />);
    expect(retours).toHaveLength(0);
  });

  it('rattrape les secondes passées pendant que l’app dormait', () => {
    commencer();
    expect(secondesAffichees()).toBe(20);

    // L'app part en arrière-plan : l'horloge murale avance, l'intervalle est
    // gelé. Aucun `advanceTimersByTime`, c'est tout l'objet du test.
    vi.setSystemTime(DEPART + 7_000);
    expect(secondesAffichees()).toBe(20);

    // Elle revient. `act` parce que ce rappel vient de l'extérieur de React,
    // comme le vrai `appStateChange` de Capacitor.
    act(() => retours.forEach((recaler) => recaler()));
    expect(secondesAffichees()).toBe(13);
  });

  it('ne brûle qu’une question après une longue absence', () => {
    commencer();
    expect(screen.getByText(/Énoncé de ecluses-0001/)).toBeTruthy();

    // Dix minutes hors de l'app : trente questions se seraient écoulées si le
    // chrono comptait des battements. Il en passe une, et remet vingt secondes.
    vi.setSystemTime(DEPART + 600_000);
    act(() => retours.forEach((recaler) => recaler()));

    expect(screen.getByText(/Énoncé de ecluses-0002/)).toBeTruthy();
    expect(secondesAffichees()).toBe(20);
  });

  it('débranche l’écoute quand l’examen se termine', () => {
    commencer();
    expect(retours).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Valider et passer' }));
    }
    expect(screen.getByText(/Examen blanc terminé/)).toBeTruthy();
    expect(retours).toHaveLength(0);
  });
});
