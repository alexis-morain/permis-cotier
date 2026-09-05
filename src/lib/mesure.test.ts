/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { brancherClics, CLE_ARRET, couperMesure, evenement, evenementDeLElement, mesureCoupee } from './mesure';

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

describe('les clics qui se nomment', () => {
  function traceur() {
    const track = vi.fn();
    (window as unknown as { umami: { track: typeof track } }).umami = { track };
    return track;
  }

  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as unknown as { umami?: unknown }).umami;
  });

  it('lit le nom seul quand il n’y a rien d’autre', () => {
    document.body.innerHTML = '<a data-mesure="accueil-examen">Commencer</a>';
    const lien = document.querySelector('a')!;
    expect(evenementDeLElement(lien)).toEqual({ nom: 'accueil-examen', donnees: undefined });
  });

  it('lit les données préfixées, et rien d’autre', () => {
    document.body.innerHTML =
      '<a data-mesure="theme-entrainement" data-mesure-theme="meteo" href="/x" class="bouton">Réviser</a>';
    expect(evenementDeLElement(document.querySelector('a')!)).toEqual({
      nom: 'theme-entrainement',
      donnees: { theme: 'meteo' },
    });
  });

  it('ne voit rien sur un élément qui ne se nomme pas', () => {
    document.body.innerHTML = '<a href="/x">Réviser</a>';
    expect(evenementDeLElement(document.querySelector('a')!)).toBeNull();
  });

  it('compte le clic, même parti d’un enfant du lien', () => {
    const track = traceur();
    document.body.innerHTML =
      '<a data-mesure="guide-examen"><span id="dedans">Passer un examen</span></a>';
    brancherClics();

    document.getElementById('dedans')!.click();
    expect(track).toHaveBeenCalledWith('guide-examen', undefined);
  });

  it('laisse le lien partir sans attendre le serveur', () => {
    traceur();
    document.body.innerHTML = '<a data-mesure="guide-examen">Passer un examen</a>';
    brancherClics();

    // La navigation d\'un lien tracé ne doit pas être retenue : c\'est tout
    // l\'intérêt de ne pas laisser le traceur intercepter l\'attribut lui-même.
    const clic = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.querySelector('a')!.dispatchEvent(clic);
    expect(clic.defaultPrevented).toBe(false);
  });

  it('ignore un clic ailleurs', () => {
    const track = traceur();
    document.body.innerHTML = '<a data-mesure="guide-examen">Passer</a><button id="autre">Autre</button>';
    brancherClics();

    document.getElementById('autre')!.click();
    expect(track).not.toHaveBeenCalled();
  });
});
