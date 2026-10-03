/** @vitest-environment jsdom */
/**
 * La leçon telle que la coquille la montre. La version du site est tenue par
 * `lecon-site.test.ts`, dans la cible par défaut.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/dom';
import { monterLecon, ID_LECON } from './lecon-site';

vi.mock('../lib/cible', () => ({ POUR_APP: true }));
vi.mock('../lib/natif', () => ({ vibrer: vi.fn() }));

const cours = { code: 'balisage', titre: 'Lire le balisage', chemin: '/cours/balisage' };
const suite = { type: 'lecon', chemin: '/cours/balisage/balisage-chenal-prefere', nom: 'Chenal préféré' };

/** Une leçon courte sans question, telle que `Lecon.astro` la rend dans l'app. */
function monter() {
  document.body.innerHTML = `
    <div class="lecon lecon--pas-a-pas">
      <div class="lecon__entete">
        <p class="lecon__chapitre"><span>Leçon 3 / 12</span><span class="discret" aria-hidden="true"> · </span><a href="/cours/balisage">Lire le balisage</a></p>
        <div class="lecon__barre" aria-hidden="true"><span style="transform:scaleX(0)"></span></div>
        <p class="visuellement-cache" aria-live="polite">Écran 1 sur 2</p>
      </div>
      <section class="ecran ecran--etape ecran--courant" tabindex="-1">
        <h2 class="ecran__titre">Signaux portuaires</h2><p>Le résumé de la notion.</p>
        <div class="lecon__suite"><button class="bouton bouton--principal" type="button">Terminer la leçon</button></div>
      </section>
      <p class="lecon__mode"><button type="button" class="bouton bouton--discret">Tout lire d’une traite</button></p>
    </div>
    <script type="application/json" id="${ID_LECON}">${JSON.stringify({ code: 'signaux-portuaires', cours, suite, questions: [] })}</script>`;
  monterLecon();
}

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

describe('la leçon dans l’app', () => {
  it('sort la leçon suivante de la liste de fin, pour la coller en bas', () => {
    monter();
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    const bas = document.querySelector('.ecran--fin .lecon__suite')!;
    expect(bas.querySelector('a.bouton--principal')?.textContent).toBe('Leçon suivante : Chenal préféré');
    expect(document.querySelector('.fin__actions')?.textContent).not.toContain('Leçon suivante');
    expect(screen.getAllByRole('link', { name: 'Leçon suivante : Chenal préféré' })).toHaveLength(1);
  });

  it('garde la série d’où l’on vient comme geste principal, la suite dans la liste', () => {
    window.history.replaceState(null, '', '/cours/balisage/signaux-portuaires?retour=%2Frevoir');
    monter();
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    const principal = document.querySelector('.ecran--fin .lecon__suite a')!;
    expect(principal.getAttribute('href')).toBe('/revoir');
    expect(principal.className).toBe('bouton bouton--principal');
    expect(document.querySelector('.fin__actions')?.textContent).toContain('Leçon suivante : Chenal préféré');
    expect(document.querySelectorAll('.ecran--fin [data-mesure="lecon-retour-serie"]')).toHaveLength(1);
  });
});
