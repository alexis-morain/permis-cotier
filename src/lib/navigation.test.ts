import { describe, it, expect } from 'vitest';
import { decalageNavigation, SCRIPT_DEFILEMENT_NAVIGATION } from './navigation';

/**
 * Les mesures d'une barre à 390 px : 390 de large, 578 de contenu, un fondu
 * de 40 px à droite. Les positions sont comptées depuis le début du contenu.
 */
const BARRE = { visible: 390, contenu: 578, fondu: 40 };

describe('decalageNavigation', () => {
  it('ne bouge pas quand l’entrée se lit déjà en entier, hors du fondu', () => {
    expect(decalageNavigation({ ...BARRE, debut: 16, largeur: 60 })).toBe(0);
    expect(decalageNavigation({ ...BARRE, debut: 190, largeur: 113 })).toBe(0);
  });

  it('amène au milieu une entrée cachée sous le fondu', () => {
    // 300 + 70 = 370 > 390 − 40 : le mot passe sous le fondu.
    expect(decalageNavigation({ ...BARRE, debut: 300, largeur: 70 })).toBe(300 + 35 - 195);
  });

  it('ne dépasse jamais la fin du défilement', () => {
    // La dernière entrée, centrée, demanderait plus que 578 − 390.
    expect(decalageNavigation({ ...BARRE, debut: 467, largeur: 71 })).toBe(578 - 390);
  });

  it('ne bouge pas quand la barre tient sans défiler', () => {
    expect(decalageNavigation({ visible: 800, contenu: 600, fondu: 0, debut: 500, largeur: 80 })).toBe(0);
  });
});

/** Une barre et son entrée courante, mesurées comme le navigateur les rend. */
function monter(debut: number, largeur: number, { visible = 390, contenu = 578, fondu = 40 } = {}) {
  const nav = {
    scrollLeft: 0,
    clientWidth: visible,
    scrollWidth: contenu,
    getBoundingClientRect: () => ({ left: 0 }),
  };
  const lien = {
    parentElement: nav,
    getBoundingClientRect: () => ({ left: debut - nav.scrollLeft, width: largeur }),
  };
  const document = {
    querySelector: (selecteur: string) => (selecteur.includes('aria-current') ? lien : null),
  };
  const getComputedStyle = () => ({ paddingRight: `${fondu}px` });
  new Function('document', 'getComputedStyle', SCRIPT_DEFILEMENT_NAVIGATION)(document, getComputedStyle);
  return nav;
}

describe('le script de la barre', () => {
  it('fait défiler la barre jusqu’à l’entrée courante', () => {
    expect(monter(467, 71).scrollLeft).toBe(578 - 390);
  });

  it('laisse la barre au début quand l’entrée se lit déjà', () => {
    expect(monter(190, 113).scrollLeft).toBe(0);
  });

  it('lit le fondu dans la marge droite de la barre', () => {
    // Sans fondu, 300 + 70 tient dans 390 ; avec 40 px de fondu, non.
    expect(monter(300, 70, { fondu: 0 }).scrollLeft).toBe(0);
    expect(monter(300, 70).scrollLeft).toBe(140);
  });

  it('ne fait rien sans entrée courante', () => {
    const document = { querySelector: () => null };
    expect(() =>
      new Function('document', 'getComputedStyle', SCRIPT_DEFILEMENT_NAVIGATION)(document, () => ({})),
    ).not.toThrow();
  });
});
