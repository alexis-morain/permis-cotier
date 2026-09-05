/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Parcours from './Parcours';
import ReprendreCours from './ReprendreCours';
import { CLE_STOCKAGE, VERSION_STOCKAGE } from '../lib/progression';

const chapitres = [
  {
    code: 'balisage',
    titre: 'Lire le balisage',
    promesse: 'Reconnaître chaque bouée.',
    lecons: [
      { code: 'balisage-lateral', nom: 'Marques latérales', ecrite: true, duree: 3 },
      { code: 'balisage-cardinal', nom: 'Marques cardinales', ecrite: true, duree: 5 },
      { code: 'balisage-pictogrammes', nom: 'Pictogrammes', ecrite: false, duree: 1 },
    ],
  },
  {
    code: 'rencontres',
    titre: 'Se croiser sans se toucher',
    promesse: 'Savoir qui s’écarte.',
    lecons: [{ code: 'barre-veille-vitesse', nom: 'Veille et vitesse', ecrite: true, duree: 3 }],
  },
];

function progression(lecons: Record<string, { faiteLe: string; bonnes: number; total: number }>) {
  localStorage.setItem(
    CLE_STOCKAGE,
    JSON.stringify({ version: VERSION_STOCKAGE, questions: {}, examens: [], dateExamen: null, enCours: null, lecons }),
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('le parcours', () => {
  it('propose la première leçon quand rien n’est fait', () => {
    render(<Parcours chapitres={chapitres} />);
    expect(screen.getByRole('link', { name: 'Commencer : Marques latérales' }).getAttribute('href')).toBe('/cours/balisage-lateral');
    expect(screen.getByText('0 sur 3')).toBeTruthy();
  });

  it('coche les leçons faites et désigne la première non faite, même après un saut', () => {
    progression({
      'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-pictogrammes': { faiteLe: '2026-09-05', bonnes: 0, total: 0 },
    });
    render(<Parcours chapitres={chapitres} />);
    expect(screen.getByRole('link', { name: 'Reprendre : Marques cardinales' })).toBeTruthy();
    expect(screen.getByText('2 sur 3')).toBeTruthy();
    const lateral = document.querySelector('a.etape[href="/cours/balisage-lateral"]')!;
    expect(lateral.className).toContain('etape--faite');
    expect(lateral.textContent).toContain('3 sur 3');
    expect(document.querySelector('a.etape[href="/cours/balisage-cardinal"]')?.className).toContain('etape--prochaine');
  });

  it('dit quand une leçon n’est qu’un résumé', () => {
    render(<Parcours chapitres={chapitres} />);
    expect(screen.getByRole('link', { name: /Pictogrammes/ }).textContent).toContain('résumé seulement');
  });
});

describe('la reprise sur l’accueil', () => {
  const lecons = chapitres.flatMap((c) => c.lecons.map((l) => ({ code: l.code, nom: l.nom })));

  it('invite à commencer quand rien n’est fait', () => {
    render(<ReprendreCours lecons={lecons} />);
    expect(screen.getByRole('link', { name: /Commencer le cours/ }).getAttribute('href')).toBe('/cours/balisage-lateral');
  });

  it('compte les leçons faites et pointe la suivante', () => {
    progression({ 'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 } });
    render(<ReprendreCours lecons={lecons} />);
    expect(document.querySelector('.reprendreCours')?.textContent).toContain('1 leçon faite sur 4');
    expect(screen.getByRole('link', { name: /Reprendre : Marques cardinales/ }).getAttribute('href')).toBe('/cours/balisage-cardinal');
  });
});
