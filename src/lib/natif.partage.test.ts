/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Le partage, dans la coquille. Sur Mac, la feuille de partage est une bulle
 * qui pointe sur ce qu'on a cliqué : la page donne donc la place du bouton,
 * en pixels CSS de la fenêtre, et le greffon Mac (`PartageMacPlugin`) y
 * accroche la bulle. Le greffon officiel de l'iPhone ignore la clé.
 */
describe('le partage, dans la coquille', () => {
  afterEach(() => {
    vi.doUnmock('./cible');
    vi.doUnmock('@capacitor/share');
  });

  function greffon() {
    return {
      canShare: vi.fn(async () => ({ value: true })),
      share: vi.fn(async (_: Record<string, unknown>) => ({ activityType: 'copier' })),
    };
  }

  async function chargerAvec(Share: ReturnType<typeof greffon>) {
    vi.resetModules();
    vi.doMock('./cible', () => ({ POUR_APP: true }));
    vi.doMock('@capacitor/share', () => ({ Share }));
    return import('./natif');
  }

  it('donne la place du bouton cliqué', async () => {
    const Share = greffon();
    const { partager } = await chargerAvec(Share);
    const bouton = document.createElement('button');
    bouton.getBoundingClientRect = () => ({ x: 480, y: 440, width: 77, height: 37 }) as DOMRect;
    await expect(partager('titre', 'texte', 'https://lepermiscotier.fr', bouton)).resolves.toBe(true);
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ ancre: { x: 480, y: 440, largeur: 77, hauteur: 37 } }),
    );
  });

  it('sans bouton, ne donne aucune place', async () => {
    const Share = greffon();
    const { partager } = await chargerAvec(Share);
    await partager('titre', 'texte');
    expect(Share.share.mock.calls[0]![0]).not.toHaveProperty('ancre');
  });
});
