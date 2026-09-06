/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Parcours from './Parcours';
import ListeCours from './ListeCours';
import ReprendreCours from './ReprendreCours';
import { CLE_STOCKAGE, VERSION_STOCKAGE } from '../lib/progression';

const balisage = {
  code: 'balisage',
  titre: 'Lire le balisage',
  lecons: [
    { code: 'balisage-lateral', nom: 'Marques latérales', chemin: '/cours/balisage/balisage-lateral', ecrite: true, duree: 3 },
    { code: 'balisage-cardinal', nom: 'Marques cardinales', chemin: '/cours/balisage/balisage-cardinal', ecrite: true, duree: 5 },
    { code: 'balisage-pictogrammes', nom: 'Pictogrammes', chemin: '/cours/balisage/balisage-pictogrammes', ecrite: false, duree: 1 },
  ],
};
const rencontres = {
  code: 'barre-route',
  titre: 'Se croiser sans se toucher',
  lecons: [{ code: 'barre-veille-vitesse', nom: 'Veille et vitesse', chemin: '/cours/barre-route/barre-veille-vitesse', ecrite: true, duree: 3 }],
};

const cours = [
  { ...balisage, chemin: '/cours/balisage', promesse: 'Reconnaître chaque bouée.', minutes: 9 },
  { ...rencontres, chemin: '/cours/barre-route', promesse: 'Savoir qui s’écarte.', minutes: 3 },
];

function progression(lecons: Record<string, { faiteLe: string; bonnes: number; total: number }>) {
  localStorage.setItem(
    CLE_STOCKAGE,
    JSON.stringify({ version: VERSION_STOCKAGE, questions: {}, examens: [], dateExamen: null, enCours: null, lecons }),
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('les leçons d’un cours', () => {
  it('proposent la première leçon quand rien n’est fait', () => {
    render(<Parcours cours={balisage} />);
    expect(screen.getByRole('link', { name: 'Commencer : Marques latérales' }).getAttribute('href')).toBe('/cours/balisage/balisage-lateral');
    expect(screen.getByText('0 sur 3')).toBeTruthy();
  });

  it('cochent les leçons faites et désignent la première non faite, même après un saut', () => {
    progression({
      'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-pictogrammes': { faiteLe: '2026-09-05', bonnes: 0, total: 0 },
    });
    render(<Parcours cours={balisage} />);
    expect(screen.getByRole('link', { name: 'Reprendre : Marques cardinales' })).toBeTruthy();
    expect(screen.getByText('2 sur 3')).toBeTruthy();
    const lateral = document.querySelector('a.etape[href="/cours/balisage/balisage-lateral"]')!;
    expect(lateral.className).toContain('etape--faite');
    expect(lateral.textContent).toContain('3 sur 3');
    expect(document.querySelector('a.etape[href="/cours/balisage/balisage-cardinal"]')?.className).toContain('etape--prochaine');
  });

  it('disent quand une leçon n’est qu’un résumé', () => {
    render(<Parcours cours={balisage} />);
    expect(screen.getByRole('link', { name: /Pictogrammes/ }).textContent).toContain('résumé seulement');
  });

  it('renvoient au cours suivant quand tout est fait', () => {
    progression({
      'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-cardinal': { faiteLe: '2026-09-05', bonnes: 2, total: 3 },
      'balisage-pictogrammes': { faiteLe: '2026-09-05', bonnes: 0, total: 0 },
    });
    render(<Parcours cours={balisage} suivant={{ chemin: '/cours/barre-route', titre: 'Se croiser sans se toucher' }} />);
    expect(screen.getByRole('link', { name: 'Cours suivant : Se croiser sans se toucher' }).getAttribute('href')).toBe('/cours/barre-route');
    expect(screen.getByRole('link', { name: 'Refaire : Marques latérales' })).toBeTruthy();
  });
});

describe('la liste des cours', () => {
  it('numérote les cours et compte leurs leçons, rien de fait', () => {
    render(<ListeCours cours={cours} />);
    expect(screen.getByRole('link', { name: /Lire le balisage/ }).getAttribute('href')).toBe('/cours/balisage');
    expect(screen.getByText('0 sur 3')).toBeTruthy();
    expect(screen.getByText('0 sur 1')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Commencer : Marques latérales' })).toBeTruthy();
  });

  it('montre l’avancement de chaque cours et désigne celui en cours', () => {
    progression({ 'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 } });
    render(<ListeCours cours={cours} />);
    expect(screen.getByText('1 sur 3')).toBeTruthy();
    expect(screen.getByText('0 sur 1')).toBeTruthy();
    expect(document.querySelector('.coursListe__item--encours a')?.getAttribute('href')).toBe('/cours/balisage');
    expect(screen.getByRole('link', { name: 'Reprendre : Marques cardinales' }).getAttribute('href')).toBe('/cours/balisage/balisage-cardinal');
  });

  it('marque un cours terminé', () => {
    progression({
      'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-cardinal': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-pictogrammes': { faiteLe: '2026-09-05', bonnes: 0, total: 0 },
    });
    render(<ListeCours cours={cours} />);
    expect(document.querySelector('.coursListe__item--fait a')?.getAttribute('href')).toBe('/cours/balisage');
    expect(screen.getByRole('link', { name: 'Reprendre : Veille et vitesse' })).toBeTruthy();
  });
});

describe('la reprise sur l’accueil', () => {
  const lecons = cours.flatMap((c) => c.lecons.map((l) => ({ code: l.code, nom: l.nom, chemin: l.chemin })));

  it('invite à commencer quand rien n’est fait', () => {
    render(<ReprendreCours lecons={lecons} />);
    expect(screen.getByRole('link', { name: /Commencer le cours/ }).getAttribute('href')).toBe('/cours/balisage/balisage-lateral');
  });

  it('compte les leçons faites et pointe la suivante', () => {
    progression({ 'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 } });
    render(<ReprendreCours lecons={lecons} />);
    expect(document.querySelector('.reprendreCours')?.textContent).toContain('1 leçon faite sur 4');
    expect(screen.getByRole('link', { name: /Reprendre : Marques cardinales/ }).getAttribute('href')).toBe('/cours/balisage/balisage-cardinal');
  });
});
