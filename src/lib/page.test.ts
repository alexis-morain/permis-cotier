import { describe, it, expect, vi, afterEach } from 'vitest';
import { lienRetour } from './page';

/**
 * Le contrat entre les scripts de page et la navigation de la coquille.
 *
 * `POUR_APP` est figée au chargement du module : pour voir les deux cibles
 * dans un même fichier, on recharge `page.ts` après avoir remplacé `cible.ts`.
 * `document` n'existe pas sous Node, un `EventTarget` nu suffit à tenir son
 * rôle ici.
 */

async function chargerPage(pourApp: boolean) {
  vi.resetModules();
  vi.doMock('./cible', () => ({ POUR_APP: pourApp }));
  return import('./page');
}

afterEach(() => {
  vi.doUnmock('./cible');
  vi.unstubAllGlobals();
});

describe('quandLaPageEstPrete', () => {
  it('sur le site, fait tout de suite et n’écoute rien', async () => {
    const document = new EventTarget();
    const ecouter = vi.spyOn(document, 'addEventListener');
    vi.stubGlobal('document', document);
    const { quandLaPageEstPrete } = await chargerPage(false);

    const faire = vi.fn();
    quandLaPageEstPrete(faire);

    expect(faire).toHaveBeenCalledTimes(1);
    expect(ecouter).not.toHaveBeenCalled();
  });

  it('dans l’app, attend astro:page-load et refait à chaque navigation', async () => {
    const document = new EventTarget();
    vi.stubGlobal('document', document);
    const { quandLaPageEstPrete } = await chargerPage(true);

    const faire = vi.fn();
    quandLaPageEstPrete(faire);
    expect(faire).not.toHaveBeenCalled();

    document.dispatchEvent(new Event('astro:page-load'));
    document.dispatchEvent(new Event('astro:page-load'));
    expect(faire).toHaveBeenCalledTimes(2);
  });
});

describe('lienRetour', () => {
  it('mène à l’avant-dernière miette', () => {
    expect(
      lienRetour('/notion/cardinales', [
        { nom: 'Programme', chemin: '/themes' },
        { nom: 'Balisage', chemin: '/theme/balisage' },
        { nom: 'Cardinales', chemin: '/notion/cardinales' },
      ]),
    ).toEqual({ nom: 'Balisage', chemin: '/theme/balisage' });
  });

  it('mène à l’accueil quand il n’y a qu’une miette', () => {
    expect(lienRetour('/themes', [{ nom: 'Programme', chemin: '/themes' }])).toEqual({
      nom: 'Accueil',
      chemin: '/',
    });
  });

  it('ne rend rien sans miette', () => {
    expect(lienRetour('/a-propos', [])).toBeNull();
  });

  it('ne rend rien sur la racine d’un onglet, barre oblique finale ou pas', () => {
    const cours = [{ nom: 'Cours', chemin: '/cours' }];
    expect(lienRetour('/cours', cours)).toBeNull();
    expect(lienRetour('/cours/', cours)).toBeNull();
    expect(lienRetour('/', [])).toBeNull();
  });
});
