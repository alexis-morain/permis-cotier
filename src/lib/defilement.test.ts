/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defilerSec, hauteurDeReprise, remonterAuBloc } from './defilement';

/**
 * Le pas à pas d'une leçon descendait une page déjà en haut, et remontait
 * d'une page lue jusqu'en bas par un saut suivi d'une glissade. Ce module
 * dit où aller, et y va sec.
 */
describe('où remonter', () => {
  it('remonte au haut du bloc, moins sa marge, quand on est plus bas', () => {
    expect(hauteurDeReprise(669, 158, 16)).toBe(142);
  });

  it('ne descend jamais une page plus haute que le bloc', () => {
    expect(hauteurDeReprise(0, 158, 16)).toBe(0);
    expect(hauteurDeReprise(100, 158, 16)).toBe(100);
  });

  it('ne passe jamais au-dessus du haut de la page', () => {
    expect(hauteurDeReprise(300, 4, 16)).toBe(0);
  });
});

describe('défiler sec', () => {
  let appels: { y: number; style: string }[];

  beforeEach(() => {
    appels = [];
    document.documentElement.style.scrollBehavior = '';
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 600 });
    window.scrollTo = vi.fn((_x: unknown, y?: number) => {
      appels.push({ y: y as number, style: document.documentElement.style.scrollBehavior });
    }) as unknown as typeof window.scrollTo;
  });

  it('coupe le défilement doux le temps de l’appel, puis le rend', () => {
    defilerSec(0);
    expect(appels).toEqual([{ y: 0, style: 'auto' }]);
    expect(document.documentElement.style.scrollBehavior).toBe('');
  });

  // Chrome lit le style calculé, pas le style posé : sans recalcul entre la
  // coupure et l'appel, il glissait encore (vu à la sonde, pas en test).
  it('fait recalculer le style avant de défiler', () => {
    const ordre: string[] = [];
    const lire = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      ordre.push(`style:${document.documentElement.style.scrollBehavior}`);
      return { scrollBehavior: 'auto' } as CSSStyleDeclaration;
    });
    window.scrollTo = vi.fn(() => ordre.push('scrollTo')) as unknown as typeof window.scrollTo;
    defilerSec(0);
    expect(ordre).toEqual(['style:auto', 'scrollTo']);
    lire.mockRestore();
  });

  it('ne bouge pas une page déjà à la bonne hauteur', () => {
    defilerSec(600);
    expect(appels).toEqual([]);
  });

  it('remonte au bloc sans jamais descendre', () => {
    const bloc = document.createElement('div');
    document.body.append(bloc);
    // Le bloc commence 158 px sous le haut de la page : à 600 de défilement,
    // il est à -442 dans la fenêtre.
    bloc.getBoundingClientRect = () => ({ top: -442 }) as DOMRect;
    remonterAuBloc(bloc, 16);
    expect(appels).toEqual([{ y: 142, style: 'auto' }]);

    appels = [];
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    bloc.getBoundingClientRect = () => ({ top: 158 }) as DOMRect;
    remonterAuBloc(bloc, 16);
    expect(appels).toEqual([]);
  });
});
