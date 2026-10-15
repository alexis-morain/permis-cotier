import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Un lien vers la racine d'un autre onglet bascule d'onglet.
 *
 * « Faire un examen blanc » depuis l'Accueil jouait l'examen sous l'onglet
 * Accueil, pendant que l'onglet Examen gardait son propre écran : la barre ne
 * disait plus où l'on était (audit du 14 octobre, P2-1). Le greffon `Ecran`
 * est ici un double qui note ce qu'on lui demande ; la bascule elle-même se
 * voit au simulateur.
 */
describe('la bascule d’onglet', () => {
  afterEach(() => {
    vi.doUnmock('./cible');
    vi.doUnmock('./greffons');
  });

  async function chargerAvec(onglet: (o: { chemin: string }) => Promise<{ bascule: boolean }>) {
    vi.resetModules();
    vi.doMock('./cible', () => ({ POUR_APP: true }));
    vi.doMock('./greffons', () => ({
      avecGreffon: async (_nom: string, faire: (g: unknown) => Promise<void>) => faire({ onglet }),
    }));
    return import('./natif');
  }

  it('connaît les mêmes onglets que la coquille, dans le même ordre', async () => {
    const { readFileSync } = await import('node:fs');
    const swift = readFileSync('ios/App/App/BarreOnglets.swift', 'utf8');
    const chemins = [...swift.matchAll(/chemin: "([^"]+)"/g)].map((m) => m[1]);
    const { RACINES_DES_ONGLETS } = await import('./natif');
    expect(chemins).toEqual([...RACINES_DES_ONGLETS]);
  });

  it('reconnaît la racine d’un onglet, et rien d’autre', async () => {
    const { ongletVise } = await import('./natif');
    const vise = (chemin: string) => ongletVise(new URL(chemin, 'capacitor://localhost'));
    expect(vise('/examen')).toBe('/examen');
    expect(vise('/examen/')).toBe('/examen');
    expect(vise('/accueil')).toBe('/accueil');
    expect(vise('/cours')).toBe('/cours');
    expect(vise('/entrainement')).toBe('/entrainement');
    expect(vise('/profil')).toBe('/profil');
    expect(vise('/profil/erreurs')).toBeNull();
    expect(vise('/cours/balisage')).toBeNull();
    expect(vise('/entrainement/vhf')).toBeNull();
    expect(vise('/examen?reprendre=1')).toBeNull();
    expect(vise('/')).toBeNull();
  });

  it('demande la bascule à la coquille, et dit qu’elle a eu lieu', async () => {
    const onglet = vi.fn(async () => ({ bascule: true }));
    const { basculerVersLOnglet } = await chargerAvec(onglet);
    await expect(basculerVersLOnglet('/examen')).resolves.toBe(true);
    expect(onglet).toHaveBeenCalledWith({ chemin: '/examen' });
  });

  it('rend la main quand la cible est l’onglet courant', async () => {
    const { basculerVersLOnglet } = await chargerAvec(async () => ({ bascule: false }));
    await expect(basculerVersLOnglet('/accueil')).resolves.toBe(false);
  });

  it('rend la main quand le greffon manque', async () => {
    const { basculerVersLOnglet } = await chargerAvec(async () => {
      throw new Error('méthode inconnue');
    });
    await expect(basculerVersLOnglet('/examen')).resolves.toBe(false);
  });

  it('ne bascule rien sur le site', async () => {
    vi.resetModules();
    const { basculerVersLOnglet } = await import('./natif');
    await expect(basculerVersLOnglet('/examen')).resolves.toBe(false);
  });
});
