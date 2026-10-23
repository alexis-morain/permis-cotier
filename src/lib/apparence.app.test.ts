/**
 * L'apparence dans la coquille : l'app suit le système, jamais un choix propre
 * à l'app (`dark-mode.md` : « Avoid offering an app-specific appearance
 * setting »). Un « Clair » ou un « Sombre » déjà enregistré sur le téléphone,
 * du temps où le réglage existait, ne s'applique plus. Sur le site, c'est
 * `apparence.test.ts`, dans la cible par défaut.
 */
import { describe, it, expect, vi } from 'vitest';
import { CLE_APPARENCE, lireApparence } from './apparence';
import type { Stockage } from './stockage';

vi.mock('./cible', () => ({ POUR_APP: true }));

class MemoireLocale implements Stockage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

describe('apparence dans l’app', () => {
  it('ignore un choix enregistré avant le retrait du réglage', () => {
    const m = new MemoireLocale();
    m.setItem(CLE_APPARENCE, 'sombre');
    expect(lireApparence(m)).toBe('auto');
    m.setItem(CLE_APPARENCE, 'clair');
    expect(lireApparence(m)).toBe('auto');
  });
});
