/** @vitest-environment jsdom */
/**
 * La liste des cours et les leçons d'un chapitre telles que la coquille les
 * montre. La version du site est tenue par `cours-site.test.ts`, dans la
 * cible par défaut.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { monterCours } from './cours-site';
import { CLE_STOCKAGE, VERSION_STOCKAGE } from '../lib/progression';

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

function pageListe() {
  document.body.innerHTML = `
    <div class="coursListe" data-liste-cours><ol class="chapitres"><li>rendu du serveur</li></ol></div>
    <script type="application/json" id="liste-cours-donnees">${JSON.stringify({ cours })}</script>`;
}

function pageCours() {
  const { code, titre, lecons } = cours[0]!;
  document.body.innerHTML = `
    <div class="parcours" data-parcours><ol class="etapes"><li>rendu du serveur</li></ol></div>
    <script type="application/json" id="parcours-donnees">${JSON.stringify({ cours: { code, titre, lecons } })}</script>`;
}

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

function disque(nom: string): HTMLElement | null {
  return document.querySelector(`.chapitres__disque[role="img"][aria-label="${nom}"]`);
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  document.body.innerHTML = '';
});

describe('les chapitres dans l’app', () => {
  it('sont un parcours de cellules, un disque numéroté et une jauge chacun', () => {
    pageListe();
    monterCours(document);
    expect(document.querySelectorAll('a.chapitres__cellule')).toHaveLength(3);
    expect(document.querySelector('.coursListe__liste')).toBeNull();
    expect(disque('Chapitre 1, pas commencé')).not.toBeNull();
    const balisage = cellule('/cours/balisage');
    expect(balisage.className).toBe('chapitres__cellule chapitres__cellule--vide');
    expect(balisage.querySelector('.chapitres__compte')!.textContent).toBe('0 / 3 leçons');
    expect(balisage.querySelector('.chapitres__disque [aria-hidden="true"]')!.textContent).toBe('1');
    expect(balisage.getAttribute('data-mesure')).toBe('cours-ouvert');
    expect(balisage.getAttribute('data-mesure-cours')).toBe('balisage');
    expect(balisage.querySelector<HTMLElement>('.chapitres__jauge span')!.style.transform).toBe('scaleX(0)');
  });

  it('disent en toutes lettres le chapitre en cours et le chapitre terminé', () => {
    progression(['balisage-lateral', 'balisage-cardinal', 'barre-veille-vitesse']);
    pageListe();
    monterCours(document);

    const balisage = cellule('/cours/balisage');
    expect(balisage.className).toContain('chapitres__cellule--encours');
    expect(balisage.textContent).toContain('2 / 3 leçons');
    expect(disque('Chapitre 1, en cours')).not.toBeNull();
    const jauge = balisage.querySelector<HTMLElement>('.chapitres__jauge span')!;
    expect(jauge.style.transform).toBe(`scaleX(${2 / 3})`);

    const barre = cellule('/cours/barre-route');
    expect(barre.className).toContain('chapitres__cellule--fait');
    expect(disque('Chapitre 2, terminé')).not.toBeNull();
    expect(barre.querySelector('svg')).not.toBeNull();

    expect(disque('Chapitre 3, pas commencé')).not.toBeNull();
  });

  it('gardent le bloc Reprendre en haut, rebâti sans s’empiler', () => {
    progression(['balisage-lateral']);
    pageListe();
    monterCours(document);
    monterCours(document);
    const reprendre = [...document.querySelectorAll('a')].find((a) => a.textContent === 'Reprendre : Marques cardinales');
    expect(reprendre?.getAttribute('data-mesure')).toBe('cours-reprise');
    expect(document.querySelectorAll('.parcours__reprise')).toHaveLength(1);
    expect(document.querySelectorAll('a.chapitres__cellule')).toHaveLength(3);
  });
});

describe('les leçons d’un chapitre dans l’app', () => {
  it('portent leur durée à droite, et la coche ou « à faire maintenant » en toutes lettres', () => {
    progression(['balisage-lateral']);
    pageCours();
    monterCours(document);
    const faite = document.querySelector('a.etape[href="/cours/balisage/balisage-lateral"]')!;
    expect(faite.querySelector('.etape__duree')?.textContent).toBe('3 min');
    expect(faite.querySelector('.etape__meta')?.textContent).toBe('1 sur 1');
    expect(faite.textContent).toContain('leçon faite');
    expect(faite.querySelector('svg')).not.toBeNull();
    const prochaine = document.querySelector('a.etape[href="/cours/balisage/balisage-cardinal"]')!;
    expect(prochaine.className).toContain('etape--prochaine');
    expect(prochaine.querySelector('.etape__meta')?.textContent).toBe('à faire maintenant');
    expect(prochaine.querySelector('.etape__duree')?.textContent).toBe('5 min');
    const resume = document.querySelector('a.etape[href="/cours/balisage/balisage-pictogrammes"]')!;
    expect(resume.querySelector('.etape__meta')?.textContent).toBe('résumé seulement');
  });

  it('n’écrivent pas de méta quand il n’y a rien à dire', () => {
    localStorage.setItem(
      CLE_STOCKAGE,
      JSON.stringify({
        version: VERSION_STOCKAGE, questions: {}, examens: [], dateExamen: null, enCours: null,
        lecons: { 'balisage-lateral': { faiteLe: '2026-09-20', bonnes: 0, total: 0 } },
      }),
    );
    pageCours();
    monterCours(document);
    const faite = document.querySelector('a.etape[href="/cours/balisage/balisage-lateral"]')!;
    expect(faite.querySelector('.etape__meta')).toBeNull();
  });
});
