/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Le script du formulaire de signalement, hors du laboratoire.
 *
 * Il est écrit en ligne dans `signaler.astro`, et c'est de là qu'on le lit :
 * un double dans un module serait un double à tenir. Le test vit ici et non
 * dans `src/pages/`, où Astro en ferait une route. Le DOM ci-dessous reprend
 * les identifiants de la page ; si la page les change, ce test le dit.
 *
 * Trois pannes et une réussite : Turnstile qui ne charge pas, le Worker qui
 * rend 503, le réseau qui se tait après l'envoi — et l'issue ouverte.
 */
const page = readFileSync(join(process.cwd(), 'src/pages/signaler.astro'), 'utf8');
const script = /<script is:inline>\n([\s\S]*?)<\/script>/.exec(page)?.[1];
if (!script) throw new Error('script en ligne introuvable dans signaler.astro');

/** L'attente au-delà de laquelle le formulaire renonce au Worker, lue dans la page. */
const ATTENTE = Number(/ATTENTE_WORKER = (\d+)/.exec(script)?.[1]);

function monter(avecTurnstile: boolean) {
  document.body.innerHTML = `
    <form id="signalement" data-adresse="contact@lepermiscotier.fr" data-turnstile="${avecTurnstile ? 'cle' : ''}">
      <input id="question" value="balisage-0001" />
      <select id="motif"><option value="reponse" selected>r</option><option value="autre">a</option></select>
      <textarea id="details">La règle 26.</textarea>
      <button id="envoyer" type="submit">Envoyer le signalement</button>
    </form>
    <div id="confirmation-envoi" hidden tabindex="-1">
      <p id="lien-issue-ligne" hidden><a id="lien-issue" href="#">suivre</a></p>
    </div>
    <div id="confirmation" hidden tabindex="-1"><b id="confirmation-id">de la question</b></div>`;
  new Function(script!)();
}

const bouton = () => document.getElementById('envoyer') as HTMLButtonElement;
const courrier = () => !(document.getElementById('confirmation') as HTMLElement).hidden;
const envoye = () => !(document.getElementById('confirmation-envoi') as HTMLElement).hidden;

function soumettre() {
  document.getElementById('signalement')!.dispatchEvent(new Event('submit', { cancelable: true }));
}

// Les minuteurs sont faux : on fait tourner la boucle sans attendre d'horloge.
const attendre = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  delete (window as { turnstile?: unknown }).turnstile;
  // jsdom ne navigue pas : poser `location.href` sur un `mailto:` ne fait que
  // se plaindre dans la console virtuelle. On tait la plainte.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('le signalement hors du laboratoire', () => {
  it('lit son attente dans la page', () => {
    expect(ATTENTE).toBeGreaterThanOrEqual(10_000);
  });

  it('retombe sur le courrier quand Turnstile n’a pas chargé', () => {
    monter(true);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    soumettre();
    expect(fetch).not.toHaveBeenCalled();
    expect(courrier()).toBe(true);
    expect(document.getElementById('confirmation-id')?.textContent).toBe('balisage-0001');
  });

  it('retombe sur le courrier quand le Worker rend 503, et rend le bouton', async () => {
    monter(true);
    (window as { turnstile?: unknown }).turnstile = { getResponse: () => 'jeton', reset: vi.fn() };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    soumettre();
    expect(bouton().disabled).toBe(true);
    await attendre();
    await attendre();
    expect(courrier()).toBe(true);
    expect(bouton().disabled).toBe(false);
    expect(bouton().textContent).toBe('Envoyer le signalement');
  });

  it('renonce au Worker qui ne répond jamais, et retombe sur le courrier', async () => {
    monter(true);
    (window as { turnstile?: unknown }).turnstile = { getResponse: () => 'jeton', reset: vi.fn() };
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, options: RequestInit) =>
          new Promise((_, rejeter) => {
            signal = options.signal as AbortSignal;
            signal.addEventListener('abort', () => rejeter(new DOMException('coupé', 'AbortError')));
          }),
      ),
    );
    soumettre();
    expect(bouton().textContent).toBe('Envoi…');
    await vi.advanceTimersByTimeAsync(ATTENTE - 1);
    expect(courrier()).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await attendre();
    expect(signal?.aborted).toBe(true);
    expect(courrier()).toBe(true);
    expect(bouton().disabled).toBe(false);
  });

  it('annonce l’issue ouverte quand tout va bien', async () => {
    monter(true);
    (window as { turnstile?: unknown }).turnstile = { getResponse: () => 'jeton', reset: vi.fn() };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ url: 'https://github.com/x/y/issues/1' }) })),
    );
    soumettre();
    await attendre();
    await attendre();
    expect(envoye()).toBe(true);
    expect(courrier()).toBe(false);
    expect((document.getElementById('lien-issue') as HTMLAnchorElement).href).toBe('https://github.com/x/y/issues/1');
  });
});
