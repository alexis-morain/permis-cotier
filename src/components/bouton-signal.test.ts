/** @vitest-environment jsdom */
/**
 * Le bouton « Écouter le signal », en DOM nu : le même dans l'écran de jeu,
 * la page de question et la vérification de leçon. Le moteur et le contexte
 * audio sont remplacés par des doublures : on regarde ce que le bouton
 * demande, pas le son qui en sort (`signal-sonore.test.ts` le tient).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { boutonSignal, monterBoutonSignal } from './bouton-signal';
import type { Outils } from './bouton-signal';

const SVG = '<svg><style>.son{animation:x-son 8.5s step-end infinite}</style></svg>';

function doublures() {
  let surFin: (() => void) | undefined;
  const lecteur = {
    enCours: false,
    jouer: vi.fn((_s: unknown, fin?: () => void) => {
      if (lecteur.enCours) return false;
      lecteur.enCours = true;
      surFin = fin;
      return true;
    }),
    arreter: vi.fn(() => {
      if (!lecteur.enCours) return;
      lecteur.enCours = false;
      surFin?.();
    }),
  };
  const contexte = { resume: vi.fn(async () => {}) };
  const outils: Outils = {
    contexte: vi.fn(() => contexte as never),
    moteur: vi.fn(async () => ({
      creerLecteur: () => lecteur,
      frisePourUneEcoute: (svg: string) => `${svg}<!-- une passe -->`,
    })),
    lireSvg: vi.fn(async () => SVG),
    mesurer: vi.fn(),
  };
  /** La fin naturelle du signal, telle que le lecteur l'annonce. */
  const finir = () => {
    lecteur.enCours = false;
    surFin?.();
  };
  return { outils, lecteur, contexte, finir };
}

function frise(fichier = 'sons/coude.svg') {
  const img = document.createElement('img');
  img.setAttribute('src', `/visuels/${fichier}`);
  document.body.append(img);
  return img;
}

const attendre = () => new Promise((r) => setTimeout(r, 0));

let blobs = 0;
beforeEach(() => {
  blobs = 0;
  URL.createObjectURL = vi.fn(() => `blob:frise-${++blobs}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('le bouton', () => {
  it("n'existe pas pour un visuel qui n'est pas un signal sonore", () => {
    const { outils } = doublures();
    expect(boutonSignal('feux/chalut.svg', () => null, outils)).toBeNull();
  });

  it("n'existe pas quand le navigateur ne sait pas jouer de son", () => {
    const { outils } = doublures();
    expect(boutonSignal('sons/coude.svg', () => null, { ...outils, contexte: null })).toBeNull();
  });

  it('écrit la durée du signal, en secondes pour la synthèse vocale', () => {
    const { outils } = doublures();
    const b = boutonSignal('sons/avertissement-doute.svg', () => null, outils)!;
    expect(b.element.tagName).toBe('BUTTON');
    expect(b.element.type).toBe('button');
    expect(b.element.textContent).toBe('Écouter le signal, 7 s');
    expect(b.element.getAttribute('aria-label')).toBe('Écouter le signal, 7 secondes');
  });

  it('ne fait rien sans geste : aucun contexte, aucun moteur à la création', () => {
    const { outils } = doublures();
    boutonSignal('sons/coude.svg', () => null, outils);
    expect(outils.contexte).not.toHaveBeenCalled();
    expect(outils.moteur).not.toHaveBeenCalled();
  });
});

describe('écouter', () => {
  it('ouvre le contexte dans le geste, puis charge le moteur et joue', async () => {
    const { outils, lecteur, contexte } = doublures();
    const img = frise();
    const b = boutonSignal('sons/coude.svg', () => img, outils)!;
    b.element.click();
    // Dans le geste même, avant toute attente : WebKit n'autorise le son que là.
    expect(outils.contexte).toHaveBeenCalledTimes(1);
    expect(contexte.resume).toHaveBeenCalledTimes(1);
    await attendre();
    expect(lecteur.jouer).toHaveBeenCalledTimes(1);
    expect((lecteur.jouer.mock.calls[0]![0] as { nom: string }).nom).toBe('coude');
    expect(b.element.textContent).toBe('Arrêter');
    expect(b.element.getAttribute('aria-label')).toBe('Arrêter le signal');
  });

  it('la frise repart du début quand le son part', async () => {
    const { outils } = doublures();
    const img = frise();
    const b = boutonSignal('sons/coude.svg', () => img, outils)!;
    b.element.click();
    await attendre();
    expect(outils.lireSvg).toHaveBeenCalledWith('/visuels/sons/coude.svg');
    expect(img.getAttribute('src')).toBe('blob:frise-1');
  });

  it('compte une écoute, par le nom du signal seulement', async () => {
    const { outils } = doublures();
    const b = boutonSignal('sons/coude.svg', () => frise(), outils)!;
    b.element.click();
    await attendre();
    expect(outils.mesurer).toHaveBeenCalledWith('signal-ecoute', { signal: 'coude' });
  });

  it('joue quand même si la frise ne se relit pas', async () => {
    const { outils, lecteur } = doublures();
    outils.lireSvg = vi.fn(async () => {
      throw new Error('hors ligne');
    });
    const img = frise();
    const b = boutonSignal('sons/coude.svg', () => img, outils)!;
    b.element.click();
    await attendre();
    expect(lecteur.jouer).toHaveBeenCalledTimes(1);
    expect(img.getAttribute('src')).toBe('/visuels/sons/coude.svg');
  });

  it('à la fin du signal, le bouton revient et la frise reste sur sa dernière image', async () => {
    const { outils, finir } = doublures();
    const img = frise();
    const b = boutonSignal('sons/coude.svg', () => img, outils)!;
    b.element.click();
    await attendre();
    finir();
    expect(b.element.textContent).toBe('Écouter le signal, 5 s');
    expect(img.getAttribute('src')).toBe('blob:frise-1');
  });
});

describe('arrêter', () => {
  it('un deuxième appui arrête, et la frise reprend sa boucle', async () => {
    const { outils, lecteur } = doublures();
    const img = frise();
    const b = boutonSignal('sons/coude.svg', () => img, outils)!;
    b.element.click();
    await attendre();
    b.element.click();
    expect(lecteur.arreter).toHaveBeenCalledTimes(1);
    expect(lecteur.jouer).toHaveBeenCalledTimes(1);
    expect(b.element.textContent).toBe('Écouter le signal, 5 s');
    expect(img.getAttribute('src')).toBe('/visuels/sons/coude.svg');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:frise-1');
  });

  it("un appui qui arrête avant que le moteur soit là : rien ne part", async () => {
    const { outils, lecteur } = doublures();
    const b = boutonSignal('sons/coude.svg', () => frise(), outils)!;
    b.element.click();
    b.element.click();
    await attendre();
    expect(lecteur.jouer).not.toHaveBeenCalled();
    expect(outils.mesurer).not.toHaveBeenCalled();
    expect(b.element.textContent).toBe('Écouter le signal, 5 s');
  });

  it("un seul signal à la fois dans la page : le second coupe le premier", async () => {
    const { outils, lecteur } = doublures();
    const premier = boutonSignal('sons/coude.svg', () => frise(), outils)!;
    const second = boutonSignal('sons/brume-stoppe.svg', () => frise('sons/brume-stoppe.svg'), outils)!;
    premier.element.click();
    await attendre();
    second.element.click();
    await attendre();
    expect(lecteur.arreter).toHaveBeenCalledTimes(1);
    expect(lecteur.jouer).toHaveBeenCalledTimes(2);
    expect(premier.element.textContent).toBe('Écouter le signal, 5 s');
    expect(second.element.textContent).toBe('Arrêter');
  });

  it('détruire le bouton coupe le son : la question a changé', async () => {
    const { outils, lecteur } = doublures();
    const b = boutonSignal('sons/coude.svg', () => frise(), outils)!;
    b.element.click();
    await attendre();
    b.detruire();
    expect(lecteur.arreter).toHaveBeenCalledTimes(1);
  });
});

describe('monterBoutonSignal', () => {
  function lieuApres(img: HTMLImageElement) {
    const lieu = document.createElement('p');
    lieu.className = 'signal-ecoute-lieu';
    lieu.hidden = true;
    img.after(lieu);
    return lieu;
  }

  it('pose le bouton dans son lieu, le montre, et trouve la frise juste avant', async () => {
    const { outils } = doublures();
    const img = frise();
    const lieu = lieuApres(img);
    const demonter = monterBoutonSignal(lieu, 'sons/coude.svg', outils);
    expect(lieu.hidden).toBe(false);
    const bouton = lieu.querySelector('button')!;
    bouton.click();
    await attendre();
    expect(img.getAttribute('src')).toBe('blob:frise-1');
    demonter();
    expect(lieu.querySelector('button')).toBeNull();
    expect(img.getAttribute('src')).toBe('/visuels/sons/coude.svg');
  });

  it("laisse le lieu caché quand il n'y a rien à écouter", () => {
    const { outils } = doublures();
    const lieu = lieuApres(frise('feux/chalut.svg'));
    monterBoutonSignal(lieu, 'feux/chalut.svg', outils)();
    expect(lieu.hidden).toBe(true);
    expect(lieu.childElementCount).toBe(0);
  });
});
