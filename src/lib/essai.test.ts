import { describe, expect, it } from 'vitest';
import { corriger } from './essai';

describe('corriger', () => {
  it('ne donne juste que la réponse exacte, comme l’épreuve', () => {
    expect(corriger(['a', 'b'], ['a', 'b']).juste).toBe(true);
    expect(corriger(['b', 'a'], ['a', 'b']).juste).toBe(true);
  });

  it('refuse une bonne case seule quand il en faut deux', () => {
    const c = corriger(['a'], ['a', 'b']);
    expect(c.juste).toBe(false);
    expect(c.oubliees).toBe(1);
    expect(c.etats).toEqual({ a: 'bonne', b: 'oubliee' });
  });

  it('refuse une case de trop', () => {
    const c = corriger(['a', 'b', 'c'], ['a', 'b']);
    expect(c.juste).toBe(false);
    expect(c.etats.c).toBe('fausse');
  });

  it('ne qualifie pas une proposition ni cochée ni attendue', () => {
    expect(corriger(['a'], ['a']).etats).toEqual({ a: 'bonne' });
  });
});
