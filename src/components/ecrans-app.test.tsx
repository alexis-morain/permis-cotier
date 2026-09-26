/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Lecon from './Lecon';
import ProfilCandidat from './ProfilCandidat';
import Erreurs from './Erreurs';
import type { LeconAffichable } from '../lib/cours';

/**
 * La leçon, la fiche et les erreurs telles que la coquille les montre. Les
 * fichiers voisins tiennent la version du site, dans la cible par défaut.
 */
vi.mock('../lib/cible', () => ({ POUR_APP: true }));

const courte: LeconAffichable = {
  code: 'signaux-portuaires',
  nom: 'Signaux portuaires',
  courte: true,
  duree: 1,
  etapes: [{ titre: 'Signaux portuaires', paragraphes: ['Le résumé de la notion.'] }],
  retenir: [],
  sources: [],
  questions: [],
};

const cadre = {
  cours: { code: 'balisage', titre: 'Lire le balisage', chemin: '/cours/balisage' },
  rang: 3,
  total: 12,
  suite: { type: 'lecon' as const, chemin: '/cours/balisage/balisage-chenal-prefere', nom: 'Chenal préféré' },
};

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => cleanup());

describe('la leçon dans l’app', () => {
  it('dit « Leçon n / m » puis le chapitre, qui ramène à sa liste', () => {
    render(<Lecon lecon={courte} {...cadre} />);
    const ligne = document.querySelector('.lecon__chapitre')!;
    expect(ligne.textContent).toBe('Leçon 3 / 12 · Lire le balisage');
    expect(screen.getByRole('link', { name: 'Lire le balisage' }).getAttribute('href')).toBe('/cours/balisage');
  });

  it('sort la leçon suivante de la liste de fin, pour la coller en bas', () => {
    render(<Lecon lecon={courte} {...cadre} />);
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    const suite = document.querySelector('.ecran--fin .lecon__suite')!;
    expect(suite.querySelector('a.bouton--principal')?.textContent).toBe('Leçon suivante : Chenal préféré');
    expect(document.querySelector('.fin__actions')?.textContent).not.toContain('Leçon suivante');
    expect(screen.getAllByRole('link', { name: 'Leçon suivante : Chenal préféré' })).toHaveLength(1);
  });

  it('garde la série d’où l’on vient comme geste principal, la suite dans la liste', () => {
    window.history.replaceState(null, '', '/cours/balisage/signaux-portuaires?retour=%2Frevoir');
    render(<Lecon lecon={courte} {...cadre} />);
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    const principal = document.querySelector('.ecran--fin .lecon__suite a')!;
    expect(principal.getAttribute('href')).toBe('/revoir');
    expect(document.querySelector('.fin__actions')?.textContent).toContain('Leçon suivante : Chenal préféré');
    window.history.replaceState(null, '', '/');
  });
});

describe('la fiche dans l’app', () => {
  const banque = [{ id: 'vhf-0', theme: 'vhf', notion: 'vhf-canaux' }];

  it('s’appelle « Ta fiche » et ouvre sur l’indice, nommé', () => {
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
