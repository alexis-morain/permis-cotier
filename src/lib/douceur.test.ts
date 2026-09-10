/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { douceur } from './douceur';

/**
 * La règle d'accessibilité tenait en une ligne, recopiée dans trois écrans.
 * Elle vit ici, une fois, et ce test dit ce qu'elle promet.
 */
function repond(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (requete: string) => ({ matches: matches && requete.includes('reduce') }) as MediaQueryList,
  });
}

describe('le défilement doux', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('coupe le mouvement pour qui l’a demandé', () => {
    repond(true);
    expect(douceur()).toBe('auto');
  });

  it('reste doux par défaut', () => {
    repond(false);
    expect(douceur()).toBe('smooth');
  });

  it('reste doux quand le navigateur ne sait pas répondre', () => {
    // `matchMedia` manque dans certains environnements et sur de vieux
    // navigateurs : l'absence de réponse ne doit pas figer les écrans.
    expect(douceur()).toBe('smooth');
  });
});
