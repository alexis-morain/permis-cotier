import { describe, it, expect, vi, afterEach } from 'vitest';
import { POUR_APP } from './cible';
import { ouvrirDehors, partager, programmerRappels, surRetourAuPremierPlan, vibrer } from './natif';

/**
 * La couche native, vue du site.
 *
 * Ces tests tournent sans `CIBLE=app`, donc dans la cible « site ». Ils y
 * vérifient une seule chose, mais celle qui compte : rien de ce que l'app
 * ajoute ne s'exécute ni ne se charge ici. `scripts/verifier-cible.mjs` tient
 * l'autre bout, au build — il refuse un bundle de site qui contiendrait du
 * code Capacitor. Le comportement de la coquille, lui, se vérifie au
 * simulateur : un greffon iOS n'a rien à dire dans jsdom.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('la couche native, hors de la coquille', () => {
  it('sait qu’elle est sur le site', () => {
    expect(POUR_APP).toBe(false);
  });

  it('ne vibre pas et ne jette pas', async () => {
    await expect(vibrer('juste')).resolves.toBeUndefined();
    await expect(vibrer('faux')).resolves.toBeUndefined();
    await expect(vibrer('choix')).resolves.toBeUndefined();
  });

  it('ne partage pas, et le dit', async () => {
    await expect(partager('titre', 'texte')).resolves.toBe(false);
  });

  it('ne programme aucun rappel, date ou pas', async () => {
    await expect(programmerRappels('2026-10-15')).resolves.toBeUndefined();
    await expect(programmerRappels(null)).resolves.toBeUndefined();
  });

  it('n’écoute pas le retour au premier plan, et rend de quoi débrancher', () => {
    const rappel = vi.fn();
    const debrancher = surRetourAuPremierPlan(rappel);
    expect(typeof debrancher).toBe('function');
    expect(() => debrancher()).not.toThrow();
    expect(rappel).not.toHaveBeenCalled();
  });

  it('n’ouvre rien dehors, et le dit', async () => {
    await expect(ouvrirDehors('https://www.legifrance.gouv.fr/')).resolves.toBe(false);
  });

  it('n’a besoin d’aucun greffon pour être chargée', async () => {
    // Le module s'importe dans un environnement Node nu : si un `import`
    // statique de greffon s'y glissait, cette ligne échouerait avant même
    // d'arriver aux assertions ci-dessus. C'est le filet le plus simple.
    const module = await import('./natif');
    expect(Object.keys(module).sort()).toEqual(
      [
        'modeConcentration',
        'ouvrirDehors',
        'partager',
        'programmerRappels',
        'surRetourAuPremierPlan',
        'vibrer',
      ].sort(),
    );
  });
});

/**
 * La même couche, dans la coquille. `POUR_APP` est figée au chargement du
 * module : on recharge `natif.ts` après avoir remplacé `cible.ts`, et le
 * greffon par un double qui note ce qu'on lui demande.
 */
describe('ouvrirDehors, dans la coquille', () => {
  afterEach(() => {
    vi.doUnmock('./cible');
    vi.doUnmock('@capacitor/browser');
  });

  async function chargerAvec(open: (options: unknown) => Promise<void>) {
    vi.resetModules();
    vi.doMock('./cible', () => ({ POUR_APP: true }));
    vi.doMock('@capacitor/browser', () => ({ Browser: { open } }));
    return import('./natif');
  }

  it('ouvre l’adresse dans Safari intégré, en feuille', async () => {
    const open = vi.fn(async () => {});
    const { ouvrirDehors: ouvrir } = await chargerAvec(open);
    await expect(ouvrir('https://github.com/alexis-morain/permis-cotier')).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith({
      url: 'https://github.com/alexis-morain/permis-cotier',
      presentationStyle: 'popover',
    });
  });

  it('rend false sans jeter quand le greffon échoue', async () => {
    const { ouvrirDehors: ouvrir } = await chargerAvec(async () => {
      throw new Error('greffon absent');
    });
    await expect(ouvrir('https://example.org/')).resolves.toBe(false);
  });
});
