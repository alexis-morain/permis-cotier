import { describe, it, expect, vi, afterEach } from 'vitest';
import { CLE_SON, jouer, reglerSon, sonActif } from './son';
import type { Stockage } from './progression';

function memoire(): Stockage & { valeurs: Map<string, string> } {
  const valeurs = new Map<string, string>();
  return {
    valeurs,
    getItem: (c) => valeurs.get(c) ?? null,
    setItem: (c, v) => void valeurs.set(c, v),
    removeItem: (c) => void valeurs.delete(c),
  };
}

const casse: Stockage = {
  getItem: () => {
    throw new Error('stockage refusé');
  },
  setItem: () => {
    throw new Error('stockage refusé');
  },
  removeItem: () => {
    throw new Error('stockage refusé');
  },
};

describe('le réglage des sons', () => {
  it('est activé par défaut', () => {
    expect(sonActif(memoire())).toBe(true);
  });

  it('se coupe, se garde, et se rallume en effaçant sa clé', () => {
    const s = memoire();
    reglerSon(false, s);
    expect(s.valeurs.get(CLE_SON)).toBe('coupe');
    expect(sonActif(s)).toBe(false);
    reglerSon(true, s);
    expect(s.valeurs.has(CLE_SON)).toBe(false);
    expect(sonActif(s)).toBe(true);
  });

  it('partage le préfixe des autres réglages', () => {
    expect(CLE_SON).toMatch(/^permis-cotier:/);
  });

  it('reste activé, sans jeter, quand le stockage est indisponible', () => {
    expect(sonActif(casse)).toBe(true);
    expect(sonActif(null)).toBe(true);
    expect(() => reglerSon(false, casse)).not.toThrow();
    expect(() => reglerSon(false, null)).not.toThrow();
  });
});

describe('jouer, sur le site', () => {
  it('ne fait rien et ne jette pas', async () => {
    await expect(jouer('juste', memoire())).resolves.toBeUndefined();
  });
});

/**
 * Dans la coquille : `POUR_APP` est figée au chargement du module, on
 * recharge `son.ts` après avoir remplacé `cible.ts`, et le greffon par un
 * double qui note ce qu'on lui demande.
 */
describe('jouer, dans la coquille', () => {
  afterEach(() => {
    vi.doUnmock('./cible');
    vi.doUnmock('@capacitor/core');
    vi.doUnmock('@capacitor/haptics');
    vi.resetModules();
  });

  /**
   * Le double se comporte comme le mandataire de Capacitor : il répond à
   * toute propriété, `then` comprise. Rendu par une fonction `async`, il
   * serait pris pour une promesse et `jouer` attendrait pour toujours.
   */
  async function chargerAvec(greffon: { jouer: (o: unknown) => Promise<void>; activer: (o: unknown) => Promise<void> }) {
    vi.resetModules();
    vi.doMock('./cible', () => ({ POUR_APP: true }));
    const mandataire = new Proxy(greffon, {
      get: (cible, nom) => (nom in cible ? cible[nom as keyof typeof cible] : () => new Promise(() => {})),
    });
    vi.doMock('@capacitor/core', () => ({ registerPlugin: () => mandataire }));
    return import('./son');
  }

  function double() {
    return { jouer: vi.fn(async () => {}), activer: vi.fn(async () => {}) };
  }

  it('demande le son au greffon, par son nom', async () => {
    const g = double();
    const son = await chargerAvec(g);
    await son.jouer('reussi', memoire());
    expect(g.jouer).toHaveBeenCalledWith({ nom: 'reussi' });
  });

  it('se tait quand le réglage est coupé', async () => {
    const g = double();
    const son = await chargerAvec(g);
    const s = memoire();
    son.reglerSon(false, s);
    await son.jouer('juste', s);
    expect(g.jouer).not.toHaveBeenCalled();
  });

  it('prévient le greffon du réglage', async () => {
    const g = double();
    const son = await chargerAvec(g);
    son.reglerSon(false, memoire());
    await vi.waitFor(() => expect(g.activer).toHaveBeenCalledWith({ actif: false }));
  });

  it('ne jette pas quand le greffon manque', async () => {
    const son = await chargerAvec({
      jouer: async () => {
        throw new Error('greffon absent');
      },
      activer: async () => {
        throw new Error('greffon absent');
      },
    });
    await expect(son.jouer('faux', memoire())).resolves.toBeUndefined();
    expect(() => son.reglerSon(true, memoire())).not.toThrow();
  });

  it('part avec chaque vibration, sous le même nom', async () => {
    const g = double();
    await chargerAvec(g);
    const notification = vi.fn(async () => {});
    vi.doMock('@capacitor/haptics', () => ({
      Haptics: { notification, impact: vi.fn(async () => {}) },
      ImpactStyle: { Light: 'LIGHT' },
      NotificationType: { Success: 'SUCCESS', Error: 'ERROR' },
    }));
    const { vibrer } = await import('./natif');
    await vibrer('echoue');
    expect(g.jouer).toHaveBeenCalledWith({ nom: 'echoue' });
    expect(notification).toHaveBeenCalledWith({ type: 'ERROR' });
    await vibrer('lecon');
    expect(g.jouer).toHaveBeenCalledWith({ nom: 'lecon' });
    expect(notification).toHaveBeenLastCalledWith({ type: 'SUCCESS' });
  });
});
