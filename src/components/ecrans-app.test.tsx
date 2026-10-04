/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ProfilCandidat from './ProfilCandidat';
import Erreurs from './Erreurs';
import { aujourdhui, enregistrerReponse, etatInitial, sauvegarder } from '../lib/progression';

/**
 * La fiche et les erreurs telles que la coquille les montre. Les fichiers
 * voisins tiennent la version du site, dans la cible par défaut ; la leçon a
 * les siens, `lecon-site.app.test.ts`.
 */
vi.mock('../lib/cible', () => ({ POUR_APP: true }));

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => cleanup());

describe('la fiche dans l’app', () => {
  const banque = [{ id: 'vhf-0', theme: 'vhf', notion: 'vhf-canaux' }];

  it('s’appelle « Ta fiche » et ouvre sur l’indice, nommé', () => {
    // Une réponse jouée : la fiche vide ne montre plus l'indice, dans l'app
    // comme sur le site, elle dit quoi faire pour le remplir.
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ta fiche');
    const titres = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titres[0]).toBe('Indice de préparation');
    expect(document.querySelector('#indice-titre')?.className).toBe('indice__mot');
  });

  it('laisse la version et les licences à la section « L’app » de la page', () => {
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.queryByText('Vie privée et licences')).toBeNull();
  });
});

describe('les erreurs dans l’app', () => {
  it('ont un titre court et taisent leur chapô', () => {
    render(<Erreurs questions={[]} jour="2026-09-20" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tes erreurs');
    expect(document.querySelector('.erreurs > p')?.className).toBe('web-seulement');
  });
});
