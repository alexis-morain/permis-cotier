/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ListeCours, { etatDuChapitre } from './ListeCours';
import Parcours from './Parcours';
import { CLE_STOCKAGE, VERSION_STOCKAGE } from '../lib/progression';

// Ces tests regardent la liste telle que la coquille la montre. La version du
// site est tenue par `Parcours.test.tsx`, dans la cible par défaut.
vi.mock('../lib/cible', () => ({ POUR_APP: true }));

const cours = [
  {
    code: 'balisage',
    titre: 'Lire le balisage',
    promesse: 'Reconnaître chaque bouée.',
    chemin: '/cours/balisage',
    minutes: 9,
    lecons: [
      { code: 'balisage-lateral', nom: 'Marques latérales', chemin: '/cours/balisage/balisage-lateral', ecrite: true, duree: 3 },
      { code: 'balisage-cardinal', nom: 'Marques cardinales', chemin: '/cours/balisage/balisage-cardinal', ecrite: true, duree: 5 },
      { code: 'balisage-pictogrammes', nom: 'Pictogrammes', chemin: '/cours/balisage/balisage-pictogrammes', ecrite: false, duree: 1 },
    ],
  },
  {
    code: 'barre-route',
    titre: 'Se croiser sans se toucher',
    promesse: 'Savoir qui s’écarte.',
    chemin: '/cours/barre-route',
    minutes: 3,
    lecons: [{ code: 'barre-veille-vitesse', nom: 'Veille et vitesse', chemin: '/cours/barre-route/barre-veille-vitesse', ecrite: true, duree: 3 }],
  },
  {
    code: 'feux-marques',
    titre: 'Lire les feux',
    promesse: 'Dire qui est là, de nuit.',
    chemin: '/cours/feux-marques',
    minutes: 4,
    lecons: [{ code: 'feux-portee', nom: 'Portée des feux', chemin: '/cours/feux-marques/feux-portee', ecrite: true, duree: 4 }],
  },
];

function progression(codes: string[]) {
  const lecons = Object.fromEntries(codes.map((c) => [c, { faiteLe: '2026-09-20', bonnes: 1, total: 1 }]));
  localStorage.setItem(
    CLE_STOCKAGE,
    JSON.stringify({ version: VERSION_STOCKAGE, questions: {}, examens: [], dateExamen: null, enCours: null, lecons }),
  );
}

function cellule(chemin: string): HTMLElement {
  return document.querySelector(`a.chapitres__cellule[href="${chemin}"]`)!;
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('l’état d’un chapitre', () => {
  it('se lit au compte des leçons faites', () => {
    expect(etatDuChapitre(0, 4)).toBe('vide');
    expect(etatDuChapitre(2, 4)).toBe('encours');
    expect(etatDuChapitre(4, 4)).toBe('fait');
  });
});

describe('les chapitres dans l’app', () => {
  it('sont un parcours de cellules, un disque numéroté et une jauge chacun', () => {
    render(<ListeCours cours={cours} />);
    expect(document.querySelectorAll('a.chapitres__cellule')).toHaveLength(3);
    expect(document.querySelector('.coursListe__liste')).toBeNull();
    expect(screen.getByRole('img', { name: 'Chapitre 1, pas commencé' })).toBeTruthy();
    expect(cellule('/cours/balisage').textContent).toContain('0 / 3 leçons');
  });

  it('disent en toutes lettres le chapitre en cours et le chapitre terminé', () => {
    progression(['balisage-lateral', 'balisage-cardinal', 'barre-veille-vitesse']);
    render(<ListeCours cours={cours} />);

    const balisage = cellule('/cours/balisage');
    expect(balisage.className).toContain('chapitres__cellule--encours');
    expect(balisage.textContent).toContain('2 / 3 leçons');
    expect(screen.getByRole('img', { name: 'Chapitre 1, en cours' })).toBeTruthy();
    const jauge = balisage.querySelector<HTMLElement>('.chapitres__jauge span')!;
    expect(jauge.style.transform).toBe(`scaleX(${2 / 3})`);

    const barre = cellule('/cours/barre-route');
    expect(barre.className).toContain('chapitres__cellule--fait');
    expect(screen.getByRole('img', { name: 'Chapitre 2, terminé' })).toBeTruthy();
    expect(barre.querySelector('svg')).not.toBeNull();

    expect(screen.getByRole('img', { name: 'Chapitre 3, pas commencé' })).toBeTruthy();
  });

  it('gardent le bloc Reprendre en haut', () => {
    progression(['balisage-lateral']);
    render(<ListeCours cours={cours} />);
    expect(screen.getByRole('link', { name: 'Reprendre : Marques cardinales' })).toBeTruthy();
  });
});

describe('les leçons d’un chapitre dans l’app', () => {
  it('portent leur durée à droite, et la coche ou « à faire maintenant » en toutes lettres', () => {
    progression(['balisage-lateral']);
    render(<Parcours cours={cours[0]!} />);
    const faite = document.querySelector('a.etape[href="/cours/balisage/balisage-lateral"]')!;
    expect(faite.querySelector('.etape__duree')?.textContent).toBe('3 min');
    expect(faite.textContent).toContain('leçon faite');
    expect(faite.querySelector('svg')).not.toBeNull();
    const prochaine = document.querySelector('a.etape[href="/cours/balisage/balisage-cardinal"]')!;
    expect(prochaine.className).toContain('etape--prochaine');
    expect(prochaine.querySelector('.etape__meta')?.textContent).toBe('à faire maintenant');
    expect(prochaine.querySelector('.etape__duree')?.textContent).toBe('5 min');
  });
});
