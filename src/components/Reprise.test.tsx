/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Reprise from './Reprise';
import { aujourdhui, enregistrerProfil, enregistrerReponse, etatInitial, profilVide, sauvegarder } from '../lib/progression';

const banque = [{ id: 'vhf-0', theme: 'vhf' }, { id: 'vhf-1', theme: 'vhf' }];

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('reprise sur l’accueil', () => {
  it('invite le nouveau venu au questionnaire', () => {
    render(<Reprise banque={banque} />);
    expect(screen.getByRole('link', { name: /pourquoi tu passes le permis/ }).getAttribute('href')).toBe('/profil/depart');
  });

  it('résume l’indice, le jour, les erreurs et la raison', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), motivations: ['peche'], rempliLe: '2026-09-01' });
    e = enregistrerReponse(e, 'vhf-0', false, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', true, aujourdhui());
    sauvegarder(e);
    render(<Reprise banque={banque} />);
    expect(screen.getByText(/indice de préparation/).textContent).toContain('sur 100');
    expect(screen.getByRole('link', { name: /1 question à revoir/ }).getAttribute('href')).toBe('/revoir');
    expect(screen.getByRole('link', { name: 'Ta fiche' }).getAttribute('href')).toBe('/profil');
    expect(screen.getByText(/Tu passes ce permis pour/).textContent).toContain('pêcher');
  });
});
