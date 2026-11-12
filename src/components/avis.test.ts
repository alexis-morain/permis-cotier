/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Le script du formulaire d'avis, lu dans `avis.astro` comme celui du
 * signalement dans `signaler.astro` (voir `signaler.test.ts`). Ce qu'on tient
 * ici : un avis part au Worker avec son genre et sans rien de plus, sans
 * Worker il retombe sur le courrier, et il n'ouvre jamais de lien vers une
 * issue publique.
 */
const page = readFileSync(join(process.cwd(), 'src/pages/avis.astro'), 'utf8');
const script = /<script is:inline>\n([\s\S]*?)<\/script>/.exec(page)?.[1];
if (!script) throw new Error('script en ligne introuvable dans avis.astro');

function monter(avecTurnstile: boolean, envoi: string | null = avecTurnstile ? '/api/signaler' : null) {
  document.body.innerHTML = `
    <form id="avis" data-adresse="contact@lepermiscotier.fr" data-turnstile="${avecTurnstile ? 'cle' : ''}"${envoi === null ? '' : ` data-envoi="${envoi}"`}>
      <select id="note"><option value="">-</option><option value="4" selected>4</option></select>
      <textarea id="message">Très clair.</textarea>
      <button id="envoyer" type="submit">Envoyer mon avis</button>
    </form>
    <div id="confirmation-envoi" hidden tabindex="-1"></div>
    <div id="confirmation" hidden tabindex="-1"><p id="confirmation-raison" hidden></p></div>`;
  new Function(script!)();
}

const courrier = () => !(document.getElementById('confirmation') as HTMLElement).hidden;
const envoye = () => !(document.getElementById('confirmation-envoi') as HTMLElement).hidden;
const soumettre = () => document.getElementById('avis')!.dispatchEvent(new Event('submit', { cancelable: true }));
const attendre = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  delete (window as { turnstile?: unknown }).turnstile;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('le formulaire d’avis', () => {
  it('poste le genre, le message et la note, rien d’autre que le jeton', async () => {
    monter(true);
    (window as { turnstile?: unknown }).turnstile = { getResponse: () => 'jeton', reset: vi.fn() };
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
    vi.stubGlobal('fetch', fetch);
    soumettre();
    await attendre();
    await attendre();
    expect(fetch).toHaveBeenCalledWith('/api/signaler', expect.anything());
    const options = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(options.body))).toEqual({
      genre: 'avis',
      message: 'Très clair.',
      note: 4,
      turnstile: 'jeton',
    });
    expect(envoye()).toBe(true);
    expect(courrier()).toBe(false);
  });

  it('envoie une note nulle quand on n’en choisit pas', async () => {
    monter(true);
    (document.getElementById('note') as HTMLSelectElement).value = '';
    (window as { turnstile?: unknown }).turnstile = { getResponse: () => 'jeton', reset: vi.fn() };
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetch);
    soumettre();
    await attendre();
    const options = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(options.body)).note).toBeNull();
  });

  it('ne part pas sans message', async () => {
    monter(true);
    (document.getElementById('message') as HTMLTextAreaElement).value = '   ';
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    soumettre();
    await attendre();
    expect(fetch).not.toHaveBeenCalled();
    expect(courrier()).toBe(false);
    expect(envoye()).toBe(false);
  });

  it('retombe sur le courrier quand le widget n’a pas chargé', () => {
    monter(true);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    soumettre();
    expect(fetch).not.toHaveBeenCalled();
    expect(courrier()).toBe(true);
  });

  it('sans adresse de Worker, comme dans l’app, retombe sur le courrier', () => {
    monter(false, null);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    soumettre();
    expect(fetch).not.toHaveBeenCalled();
    expect(courrier()).toBe(true);
    expect(envoye()).toBe(false);
  });

  it('retombe sur le courrier quand le Worker rend 503, et rend le bouton', async () => {
    monter(true);
    (window as { turnstile?: unknown }).turnstile = { getResponse: () => 'jeton', reset: vi.fn() };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    soumettre();
    await attendre();
    await attendre();
    expect(courrier()).toBe(true);
    expect((document.getElementById('envoyer') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('la page d’avis', () => {
  it('pose un widget Turnstile d’une autre action que le signalement', () => {
    expect(page).toContain('data-action="avis"');
    expect(page).not.toContain('data-action="signalement"');
  });
});
