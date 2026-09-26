import { describe, it, expect, vi, afterEach } from 'vitest';
import { lienRetour, rafraichirSiLaProgressionAChange } from './page';

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

/** Un `localStorage` en mémoire, avec `key()` et `length` que la photo parcourt. */
function faireStockage(depart: Record<string, string> = {}) {
  const valeurs = new Map(Object.entries(depart));
  return {
    get length() {
      return valeurs.size;
    },
    key: (i: number) => [...valeurs.keys()][i] ?? null,
    getItem: (cle: string) => valeurs.get(cle) ?? null,
    setItem: (cle: string, valeur: string) => void valeurs.set(cle, valeur),
    removeItem: (cle: string) => void valeurs.delete(cle),
  };
}

/** Une page de la coquille à `chemin` : fenêtre, document, adresse, stockage. */
function monterPage(chemin: string, stockage: unknown) {
  const fenetre = new EventTarget();
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const location = { pathname: chemin, reload: vi.fn() };
  vi.stubGlobal('window', fenetre);
  vi.stubGlobal('document', document);
  vi.stubGlobal('location', location);
  vi.stubGlobal('localStorage', stockage);
  return { fenetre, document, location };
}

describe('rafraichirSiLaProgressionAChange', () => {
  it('ne recharge pas quand rien n’a changé', () => {
    const stockage = faireStockage({ 'permis-cotier:progression': '{"lecons":{}}' });
    const { fenetre, document, location } = monterPage('/accueil', stockage);
    rafraichirSiLaProgressionAChange();

    fenetre.dispatchEvent(new Event('app:onglet'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(location.reload).not.toHaveBeenCalled();
  });

  it('recharge une racine d’onglet quand une clé a changé ailleurs', () => {
    const stockage = faireStockage({ 'permis-cotier:progression': '{"lecons":{}}' });
    const { fenetre, location } = monterPage('/accueil', stockage);
    rafraichirSiLaProgressionAChange();

    stockage.setItem('permis-cotier:progression', '{"lecons":{"marques-laterales":"2026-09-25"}}');
    fenetre.dispatchEvent(new Event('app:onglet'));
    expect(location.reload).toHaveBeenCalledTimes(1);
  });

  it('voit une clé qui apparaît, et reste sourde aux clés d’un autre préfixe', () => {
    const stockage = faireStockage();
    const { fenetre, location } = monterPage('/profil', stockage);
    rafraichirSiLaProgressionAChange();

    stockage.setItem('autre:chose', '1');
    fenetre.dispatchEvent(new Event('app:onglet'));
    expect(location.reload).not.toHaveBeenCalled();

    stockage.setItem('permis-cotier:son', 'non');
    fenetre.dispatchEvent(new Event('app:onglet'));
    expect(location.reload).toHaveBeenCalledTimes(1);
  });

  it('recharge aussi au retour du cache de pages et quand la page redevient visible', () => {
    const stockage = faireStockage({ 'permis-cotier:progression': 'a' });
    const { fenetre, document, location } = monterPage('/cours', stockage);
    rafraichirSiLaProgressionAChange();
    stockage.setItem('permis-cotier:progression', 'b');

    fenetre.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: false }));
    expect(location.reload).not.toHaveBeenCalled();
    fenetre.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    expect(location.reload).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('visibilitychange'));
    expect(location.reload).toHaveBeenCalledTimes(2);
  });

  it('ne recharge pas hors d’une racine d’onglet : une leçon, une série restent où elles sont', () => {
    const stockage = faireStockage({ 'permis-cotier:progression': 'a' });
    const { fenetre, location } = monterPage('/cours/balisage/marques-laterales', stockage);
    rafraichirSiLaProgressionAChange();

    stockage.setItem('permis-cotier:progression', 'b');
    fenetre.dispatchEvent(new Event('app:onglet'));
    expect(location.reload).not.toHaveBeenCalled();
  });

  it('ne recharge pas l’examen : son écran de résultat se perdrait', () => {
    const stockage = faireStockage({ 'permis-cotier:progression': 'a' });
    const { fenetre, location } = monterPage('/examen', stockage);
    rafraichirSiLaProgressionAChange();

    stockage.setItem('permis-cotier:progression', 'b');
    fenetre.dispatchEvent(new Event('app:onglet'));
    expect(location.reload).not.toHaveBeenCalled();
  });

  it('reprend sa photo à chaque écran que le routeur affiche', () => {
    const stockage = faireStockage({ 'permis-cotier:progression': 'a' });
    const { fenetre, document, location } = monterPage('/cours', stockage);
    rafraichirSiLaProgressionAChange();

    // Une leçon faite dans ce même onglet, puis retour à la liste : l'écran
    // est rendu depuis le stockage à jour, il n'y a rien à recharger.
    stockage.setItem('permis-cotier:progression', 'b');
    document.dispatchEvent(new Event('astro:page-load'));
    fenetre.dispatchEvent(new Event('app:onglet'));
    expect(location.reload).not.toHaveBeenCalled();
  });

  it('tient sans stockage, ou quand le lire jette', () => {
    const { fenetre, location } = monterPage('/accueil', undefined);
    expect(() => rafraichirSiLaProgressionAChange()).not.toThrow();
    expect(() => fenetre.dispatchEvent(new Event('app:onglet'))).not.toThrow();

    const jette = {
      get length(): number {
        throw new Error('SecurityError');
      },
    };
    const page = monterPage('/accueil', jette);
    expect(() => rafraichirSiLaProgressionAChange()).not.toThrow();
    expect(() => page.fenetre.dispatchEvent(new Event('app:onglet'))).not.toThrow();
    expect(location.reload).not.toHaveBeenCalled();
    expect(page.location.reload).not.toHaveBeenCalled();
  });
});
