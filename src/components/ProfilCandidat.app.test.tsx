/** @vitest-environment jsdom */
/**
 * La Fiche dans la coquille : elle relit la progression quand un autre onglet
 * l'a écrite (`app:progression`). Sur le site, rien n'écoute — c'est
 * `ProfilCandidat.test.tsx`, dans la cible par défaut.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import ProfilCandidat from './ProfilCandidat';
import { enregistrerReponse, etatInitial, sauvegarder } from '../lib/progression';

vi.mock('../lib/cible', () => ({ POUR_APP: true }));

const banque = [{ id: 'vhf-0', theme: 'vhf', notion: 'vhf-canaux' }];

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
});
afterEach(() => cleanup());

describe('la fiche dans l’app', () => {
  it('relit les réponses écrites dans un autre onglet, sans recharger', () => {
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByText(/Elle se remplit en jouant/)).toBeTruthy();

    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', false, '2026-09-20'));
    act(() => {
      window.dispatchEvent(new Event('app:progression'));
    });

    expect(screen.queryByText(/Elle se remplit en jouant/)).toBeNull();
  });
});
