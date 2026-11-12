// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { CLE_EVALUATION, SEUIL_MS, lireEtat } from './evaluation';

/**
 * La demande de note, dans la coquille. `POUR_APP` est figée au chargement :
 * on recharge `natif.ts` après avoir remplacé `cible.ts`, `@capacitor/app` et
 * le greffon `Note` par des doubles. Que la fenêtre d'Apple s'affiche, c'est
 * l'affaire du système et du simulateur.
 */
describe('proposerLaNote', () => {
  const demander = vi.fn(async () => {});

  beforeEach(() => {
    localStorage.clear();
    demander.mockClear();
    vi.resetModules();
    vi.doMock('./cible', () => ({ POUR_APP: true }));
    vi.doMock('@capacitor/app', () => ({ App: { getInfo: async () => ({ version: '1.0.10' }) } }));
    vi.doMock('./greffons', () => ({
      avecGreffon: async (nom: string, faire: (g: unknown) => Promise<void>) => {
        expect(nom).toBe('Note');
        return faire({ demander });
      },
    }));
  });
  afterEach(() => {
    vi.doUnmock('./cible');
    vi.doUnmock('./greffons');
    vi.doUnmock('@capacitor/app');
  });

  const usage = (ms: number) =>
    localStorage.setItem(CLE_EVALUATION, JSON.stringify({ actifMs: ms, jusqua: 0, demande: null }));

  it('ne demande rien avant deux heures d’usage', async () => {
    usage(SEUIL_MS - 1);
    const { proposerLaNote } = await import('./natif');
    await proposerLaNote();
    expect(demander).not.toHaveBeenCalled();
    expect(lireEtat().demande).toBeNull();
  });

  it('demande une fois le seuil passé, et note la demande avec la version majeure', async () => {
    usage(SEUIL_MS);
    const { proposerLaNote } = await import('./natif');
    await proposerLaNote();
    expect(demander).toHaveBeenCalledTimes(1);
    expect(lireEtat().demande?.majeure).toBe(1);
  });

  it('ne redemande pas tout de suite', async () => {
    usage(SEUIL_MS);
    const { proposerLaNote } = await import('./natif');
    await proposerLaNote();
    await proposerLaNote();
    expect(demander).toHaveBeenCalledTimes(1);
  });

  it('se tait si le greffon manque, sans jeter', async () => {
    usage(SEUIL_MS);
    demander.mockRejectedValueOnce(new Error('méthode inconnue'));
    const { proposerLaNote } = await import('./natif');
    await expect(proposerLaNote()).resolves.toBeUndefined();
  });
});
