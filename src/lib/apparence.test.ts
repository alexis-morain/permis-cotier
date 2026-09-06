import { describe, it, expect } from 'vitest';
import { CLE_APPARENCE, lireApparence, choisirApparence, appliquerApparence, SCRIPT_APPARENCE } from './apparence';
import type { Stockage } from './progression';

class MemoireLocale implements Stockage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

describe('apparence', () => {
  it('suit le système tant que rien n’est choisi', () => {
    expect(lireApparence(new MemoireLocale())).toBe('auto');
  });

  it('garde le choix, et l’oublie quand on revient au système', () => {
    const m = new MemoireLocale();
    choisirApparence('sombre', m);
    expect(lireApparence(m)).toBe('sombre');
    expect(m.getItem(CLE_APPARENCE)).toBe('sombre');
    choisirApparence('auto', m);
    expect(m.getItem(CLE_APPARENCE)).toBeNull();
  });

  it('ignore une valeur inconnue', () => {
    const m = new MemoireLocale();
    m.setItem(CLE_APPARENCE, 'violet');
    expect(lireApparence(m)).toBe('auto');
  });

  it('pose ou retire l’attribut sur la racine', () => {
    const racine = { attributs: new Map<string, string>() };
    const element = {
      setAttribute: (k: string, v: string) => racine.attributs.set(k, v),
      removeAttribute: (k: string) => racine.attributs.delete(k),
    };
    appliquerApparence('clair', element);
    expect(racine.attributs.get('data-apparence')).toBe('clair');
    appliquerApparence('auto', element);
    expect(racine.attributs.has('data-apparence')).toBe(false);
  });

  it('le script de tête relit la même clé et pose le même attribut', () => {
    expect(SCRIPT_APPARENCE).toContain(CLE_APPARENCE);
    expect(SCRIPT_APPARENCE).toContain('data-apparence');
  });
});
