import { describe, it, expect } from 'vitest';
import { ecrire, lire, type Stockage } from './stockage';

function memoire(): Stockage & { contenu: Map<string, string> } {
  const contenu = new Map<string, string>();
  return {
    contenu,
    getItem: (c) => contenu.get(c) ?? null,
    setItem: (c, v) => void contenu.set(c, v),
    removeItem: (c) => void contenu.delete(c),
  };
}

const verrouille: Stockage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('stockage tolérant', () => {
  it('lit ce qui a été écrit, et retire une clé écrite à null', () => {
    const s = memoire();
    expect(ecrire('permis-cotier:x', 'oui', s)).toBe(true);
    expect(lire('permis-cotier:x', s)).toBe('oui');
    expect(ecrire('permis-cotier:x', null, s)).toBe(true);
    expect(lire('permis-cotier:x', s)).toBeNull();
    expect(s.contenu.size).toBe(0);
  });

  it('un stockage verrouillé ou plein ne lève rien', () => {
    expect(lire('permis-cotier:x', verrouille)).toBeNull();
    expect(ecrire('permis-cotier:x', 'oui', verrouille)).toBe(false);
    expect(ecrire('permis-cotier:x', null, verrouille)).toBe(false);
  });

  it('sans stockage, on lit null et on n’écrit rien', () => {
    expect(lire('permis-cotier:x', null)).toBeNull();
    expect(ecrire('permis-cotier:x', 'oui', null)).toBe(false);
  });
});
