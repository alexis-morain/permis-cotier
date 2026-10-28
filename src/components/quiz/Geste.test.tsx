/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import type { QuestionAffichable } from '../../lib/banque';
import { vibrer } from '../../lib/natif';

/**
 * Le geste de l'examen dans l'app : répondre, passer à la suite, lire le
 * résultat. Ce que jsdom ne voit pas (la mise en page, le mouvement) se lit
 * sur les feuilles ; le reste se joue sur l'écran.
 */

vi.mock('../../lib/natif', () => ({
  vibrer: vi.fn(async () => {}),
  partager: vi.fn(async () => false),
  modeConcentration: vi.fn(async () => {}),
  surRetourAuPremierPlan: vi.fn(() => () => {}),
}));

const cible = vi.hoisted(() => ({ app: true }));
vi.mock('../../lib/cible', () => ({
  get POUR_APP() {
    return cible.app;
  },
}));

const { default: Quiz } = await import('../Quiz');
const { default: Proposition } = await import('./Proposition');

/** Une feuille sans ses commentaires, blancs resserrés. Vitest tourne à la racine du dépôt. */
const feuille = (chemin: string) =>
  readFileSync(chemin, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
/** Le corps des règles dont le sélecteur est exactement `selecteur`. */
const corps = (css: string, selecteur: string) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1]!.split(',').map((s) => s.trim()).includes(selecteur))
    .map((m) => m[2]!.trim());

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

beforeEach(() => {
  localStorage.clear();
  cible.app = true;
  vi.mocked(vibrer).mockClear();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('répondre', () => {
  it('enfonce la proposition à l’appui : scale(0.97), 100 ms, courbe qui se pose', () => {
    const regles = corps(feuille('src/styles/app-jeu.css'), 'html[data-app] .proposition:active:not(:disabled)');
    const derniere = regles.at(-1) ?? '';
    expect(derniere).toMatch(/transform:\s*scale\(0\.97\)/);
    expect(derniere).toMatch(/transition-duration:\s*100ms/);
    expect(derniere).toMatch(/transition-timing-function:\s*var\(--courbe\)/);
  });

  it('coupe une proposition de 90 signes sans espace plutôt que de la faire déborder', () => {
    const longue = 'X'.repeat(90);
    render(
      <ul>
        <Proposition texte={longue} rang={0} cochee={false} etat={null} corrigee={false} desactivee={false} basculer={() => {}} />
      </ul>,
    );
    expect(document.querySelector('.proposition__texte')?.textContent).toBe(longue);
    const regle = corps(feuille('src/components/quiz.css'), '.proposition__texte').join(';');
    expect(regle).toMatch(/min-width:\s*0/);
    expect(regle).toMatch(/overflow-wrap:\s*anywhere/);
  });
});

describe('passer à la suite', () => {
  it('ne rejoue aucune entrée à chaque question dans l’app', () => {
    const css = feuille('src/styles/app-jeu.css');
    expect(css).not.toMatch(/\.propositions > li[^{]*\{[^}]*animation:\s*app-entree/);
    for (const el of ['.jeu__enonce', '.jeu__visuel', '.propositions']) {
      expect(corps(css, `html[data-app] .jeu > ${el}`).join(';')).toMatch(/animation:\s*none/);
    }
  });

  it('laisse taper « Continuer » pendant que le panneau monte', () => {
    render(<Quiz mode="entrainement" questions={[question('ecluses-0001'), question('ecluses-0002')]} theme="ecluses" />);
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(screen.getByRole('status').textContent).toContain('Juste');
    // Aucune attente de fin d'animation : le tap passe tout de suite.
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByText(/Énoncé de ecluses-0002/)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('monte le panneau en 220 ms, transform et opacité, sur la courbe de l’app', () => {
    const css = feuille('src/styles/app-jeu.css');
    expect(corps(css, 'html[data-app] .jeu__pied .verdict').join(';')).toMatch(/animation:\s*panneau-monte 220ms var\(--courbe\)/);
    expect(css).toMatch(/@keyframes panneau-monte \{ from \{ opacity: 0; transform: translateY\(100%\); \}/);
  });
});

describe('lire le résultat', () => {
  it('fait sentir le verdict sur la frame où il s’écrit, pas avant', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((f) => frames.push(f));
    render(<Quiz mode="examen" questions={[question('ecluses-0001')]} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: /^(Passer|Valider et passer)$/ }));

    // Le verdict est écrit, l'haptique attend la frame qui le peint.
    expect(document.querySelector('.resultat__verdict')?.textContent).toBe('Reçu. 0 erreur sur les 5 admises.');
    expect(vibrer).not.toHaveBeenCalledWith('reussi');
    frames.splice(0).forEach((f) => f(0));
    expect(vibrer).toHaveBeenCalledWith('reussi');
  });

  it('fait entrer le score avec l’entrée commune, coupée sans mouvement', () => {
    const css = feuille('src/styles/app-jeu.css');
    expect(corps(css, 'html[data-app] .resultat__score').join(';')).toMatch(/animation:\s*app-entree var\(--duree\) var\(--courbe\)/);
    const reduit = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduit).toMatch(/html\[data-app\] \.resultat__score[^{]*\{ animation: none/);
  });
});

describe('le pire cas', () => {
  it('dit « 0 erreur » et « 40 / 40 » au singulier qu’il faut', () => {
    const quarante = Array.from({ length: 40 }, (_, i) => question(`ecluses-${String(i + 1).padStart(4, '0')}`));
    render(<Quiz mode="examen" questions={quarante} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    for (let i = 0; i < 40; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
      fireEvent.click(screen.getByRole('button', { name: /^(Passer|Valider et passer)$/ }));
    }
    expect(document.querySelector('.resultat__score')?.textContent).toBe('40 / 40');
    expect(document.querySelector('.resultat__verdict')?.textContent).toBe('Reçu. 0 erreur sur les 5 admises.');
  });

  it('dit « 1 erreur » au singulier, et l’erreur unique au site', () => {
    cible.app = false;
    const deux = [question('ecluses-0001'), question('ecluses-0002')];
    render(<Quiz mode="examen" questions={deux} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    fireEvent.click(screen.getByRole('button', { name: /Première proposition/ }));
    fireEvent.click(screen.getByRole('button', { name: /^(Passer|Valider et passer)$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^(Passer|Valider et passer)$/ }));
    expect(document.querySelector('.resultat__verdict')?.textContent).toBe('Reçu. 1 erreur sur les 5 admises.');
    expect(screen.getByRole('button', { name: 'Revoir mon erreur' })).toBeTruthy();
  });

  it('garde la description d’un visuel qui n’est pas venu', () => {
    const q = { ...question('ecluses-0001'), visuel: { fichier: 'absent.svg', alt: 'Une écluse vue de haut.', credit: '' } };
    render(<Quiz mode="examen" questions={[q]} />);
    fireEvent.click(screen.getByRole('button', { name: /Commencer l’examen/ }));
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('Visuel introuvable. Ce qu’il montre :')).toBeTruthy();
    expect(screen.getByText('Une écluse vue de haut.')).toBeTruthy();
  });
});
