import { describe, it, expect, vi, afterEach } from 'vitest';
import { POUR_APP } from './cible';
import { partager, programmerRappels, surRetourAuPremierPlan, vibrer } from './natif';

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

  it('n’a besoin d’aucun greffon pour être chargée', async () => {
    // Le module s'importe dans un environnement Node nu : si un `import`
    // statique de greffon s'y glissait, cette ligne échouerait avant même
    // d'arriver aux assertions ci-dessus. C'est le filet le plus simple.
    const module = await import('./natif');
    expect(Object.keys(module).sort()).toEqual(
      ['partager', 'programmerRappels', 'surRetourAuPremierPlan', 'vibrer'].sort(),
    );
  });
});
