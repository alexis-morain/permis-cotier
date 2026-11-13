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

function monter(avecTurnstile: boolean, envoi: string | null = avecTurnstile ? '/api/signaler' : null, recherche = '') {
  window.history.replaceState(null, '', `/avis${recherche}`);
  document.body.innerHTML = `
    <form id="avis" data-site="https://lepermiscotier.fr" data-adresse="contact@lepermiscotier.fr" data-turnstile="${avecTurnstile ? 'cle' : ''}"${envoi === null ? '' : ` data-envoi="${envoi}"`}>
      <select id="note"><option value="">-</option><option value="4" selected>4</option></select>
      <textarea id="message">Très clair.</textarea>
      <button id="envoyer" type="submit">Envoyer mon avis</button>
    </form>
    <p id="page-origine" hidden>À propos de <a id="page-origine-lien" href="/"></a></p>
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

describe('la page d’origine', () => {
  const envoyer = async () => {
    (window as { turnstile?: unknown }).turnstile = { getResponse: () => 'jeton', reset: vi.fn() };
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetch);
    soumettre();
    await attendre();
    return JSON.parse(String(fetch.mock.calls[0]?.[1]?.body ?? 'null'));
  };

  it('lit ?page=, l’affiche et l’envoie avec l’avis', async () => {
    monter(true, undefined, '?page=/guide/feux');
    expect((document.getElementById('page-origine') as HTMLElement).hidden).toBe(false);
    expect(document.getElementById('page-origine-lien')?.textContent).toBe('/guide/feux');
    expect(document.getElementById('page-origine-lien')?.getAttribute('href')).toBe('/guide/feux');
    expect((await envoyer()).page).toBe('/guide/feux');
  });

  it('ignore tout ce qui n’est pas un chemin du site', async () => {
    for (const valeur of ['https://exemple.fr/x', '//exemple.fr', 'javascript:alert(1)', '/a?b=1', '/a/../b']) {
      monter(true, undefined, `?page=${encodeURIComponent(valeur)}`);
      expect((document.getElementById('page-origine') as HTMLElement).hidden, valeur).toBe(true);
      expect(await envoyer(), valeur).not.toHaveProperty('page');
    }
  });

  it('sans paramètre, rien ne change', async () => {
    monter(true);
    expect((document.getElementById('page-origine') as HTMLElement).hidden).toBe(true);
    expect(await envoyer()).not.toHaveProperty('page');
  });

  it('figure dans le brouillon de courrier du repli', () => {
    monter(false, null, '?page=/guide/feux');
    const ouvrir = vi.fn();
    const lieu = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...lieu, search: lieu.search, set href(v: string) { ouvrir(v); } } });
    soumettre();
    Object.defineProperty(window, 'location', { configurable: true, value: lieu });
    expect(decodeURIComponent(String(ouvrir.mock.calls[0]?.[0]))).toContain('Page : https://lepermiscotier.fr/guide/feux');
  });
});

describe('la page d’avis', () => {
  it('pose un widget Turnstile d’une autre action que le signalement', () => {
    expect(page).toContain('data-action="avis"');
    expect(page).not.toContain('data-action="signalement"');
  });
});
