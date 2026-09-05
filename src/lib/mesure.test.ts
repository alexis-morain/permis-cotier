/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CLE_ARRET, couperMesure, evenement, mesureCoupee } from './mesure';

/**
 * La mesure a une règle avant toutes les autres : ne jamais faire tomber
 * l'écran de jeu. Le traceur peut être absent, bloqué, ou refusé par le
 * stockage ; rien de tout cela ne remonte à l'appelant.
 */
describe('mesure', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as unknown as { umami?: unknown }).umami;
    vi.restoreAllMocks();
  });

  it('ne casse rien quand le traceur est absent', () => {
    expect(() => evenement('examen-commence')).not.toThrow();
  });

  it('passe le nom et les données au traceur', () => {
    const track = vi.fn();
    (window as unknown as { umami: { track: typeof track } }).umami = { track };
    evenement('examen-termine', { bonnes: 38, total: 40 });
    expect(track).toHaveBeenCalledWith('examen-termine', { bonnes: 38, total: 40 });
  });

  it('avale l’erreur d’un traceur cassé', () => {
    (window as unknown as { umami: unknown }).umami = {
      track() {
        throw new Error('bloqué');
      },
    };
    expect(() => evenement('examen-commence')).not.toThrow();
  });

  it('coupe ce navigateur du compte, et l’y remet', () => {
    expect(mesureCoupee()).toBe(false);

    couperMesure(true);
    // La clé et la valeur sont celles que le traceur relit avant chaque envoi.
    expect(localStorage.getItem(CLE_ARRET)).toBe('1');
    expect(mesureCoupee()).toBe(true);

    couperMesure(false);
    expect(localStorage.getItem(CLE_ARRET)).toBeNull();
    expect(mesureCoupee()).toBe(false);
  });

  it('survit à un stockage verrouillé', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('stockage refusé');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('stockage refusé');
    });
    expect(mesureCoupee()).toBe(false);
    expect(() => couperMesure(true)).not.toThrow();
  });
});
