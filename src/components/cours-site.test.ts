/** @vitest-environment jsdom */
/**
 * La liste des cours et les leçons d'un cours, en DOM nu : ce que les îlots
 * `ListeCours` et `Parcours` rendaient une fois hydratés, le script des pages
 * de cours le rend maintenant sans React. Mêmes textes, mêmes liens, mêmes
 * attributs de mesure ; les tests reprennent ceux des îlots, dans la cible
 * du site. La variante de la coquille est tenue par `cours-site.app.test.ts`.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { etatDuChapitre, monterCours } from './cours-site';
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
const suivant = { chemin: '/cours/barre-route', titre: 'Se croiser sans se toucher' };

/** `/cours` telle que la page la rend avant le script. */
function pageListe(donnees: unknown = { cours }) {
  document.body.innerHTML = `
    <div class="coursListe" data-liste-cours><ol class="coursListe__liste"><li>rendu du serveur</li></ol></div>
    <script type="application/json" id="liste-cours-donnees">${JSON.stringify(donnees)}</script>`;
}

/** `/cours/<thème>` telle que la page la rend avant le script : un ou deux conteneurs. */
function pageCours(donnees: unknown = { cours: balisage }, conteneurs = 1) {
  const conteneur = '<div class="parcours" data-parcours><ol class="etapes"><li>rendu du serveur</li></ol></div>';
  document.body.innerHTML = `
    ${conteneur.repeat(conteneurs)}
    <script type="application/json" id="parcours-donnees">${JSON.stringify(donnees)}</script>`;
}

function lien(nom: RegExp | string, racine: ParentNode = document): HTMLAnchorElement {
  const trouve = [...racine.querySelectorAll('a')].find((a) =>
    typeof nom === 'string' ? a.textContent === nom : nom.test(a.textContent ?? ''),
  );
  if (!trouve) throw new Error(`pas de lien ${nom}`);
  return trouve;
}

function progression(lecons: Record<string, { faiteLe: string; bonnes: number; total: number }>) {
  localStorage.setItem(
    CLE_STOCKAGE,
    JSON.stringify({ version: VERSION_STOCKAGE, questions: {}, examens: [], dateExamen: null, enCours: null, lecons }),
  );
}

/** Aucun élément ne porte deux fois le même `data-mesure`, aucun lien n'en est privé. */
function mesuresUniques() {
  for (const a of document.querySelectorAll('a')) {
    const mesures = [...a.attributes].filter((x) => x.name === 'data-mesure');
    expect(mesures).toHaveLength(1);
  }
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  document.body.innerHTML = '';
});

describe('le montage', () => {
  it('ne fait rien sur une page sans les conteneurs', () => {
    document.body.innerHTML = '<p>ailleurs</p>';
    expect(() => monterCours(document)).not.toThrow();
    expect(document.body.textContent).toBe('ailleurs');
  });

  it('laisse le rendu du serveur si le JSON est illisible', () => {
    pageListe();
    document.getElementById('liste-cours-donnees')!.textContent = '{pas du json';
    monterCours(document);
    expect(document.querySelector('[data-liste-cours]')!.textContent).toBe('rendu du serveur');
  });

  it('rebâtit sans rien empiler quand il est rappelé', () => {
    progression({ 'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 } });
    pageListe();
    monterCours(document);
    monterCours(document);
    expect(document.querySelectorAll('.parcours__reprise')).toHaveLength(1);
    expect(document.querySelectorAll('.coursListe__item')).toHaveLength(2);

    pageCours();
    monterCours(document);
    monterCours(document);
    expect(document.querySelectorAll('.parcours__reprise')).toHaveLength(1);
    expect(document.querySelectorAll('.chapitre__compte')).toHaveLength(1);
    expect(document.querySelectorAll('a.etape')).toHaveLength(3);
  });

  it('relit la progression à chaque appel', () => {
    pageCours();
    monterCours(document);
    expect(lien('Commencer : Marques latérales')).toBeTruthy();
    progression({ 'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 } });
    monterCours(document);
    expect(lien('Reprendre : Marques cardinales')).toBeTruthy();
  });

  it('monte chaque conteneur de la page, deux fois le même rendu', () => {
    progression({ 'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 } });
    pageCours({ cours: balisage }, 2);
    monterCours(document);
    const [premier, second] = document.querySelectorAll<HTMLElement>('[data-parcours]');
    expect(premier!.innerHTML).toBe(second!.innerHTML);
    expect(premier!.querySelector('.etape--prochaine')).not.toBeNull();
    expect(document.querySelectorAll('[id]')).toHaveLength(1);
  });
});

describe('les leçons d’un cours', () => {
  it('proposent la première leçon quand rien n’est fait', () => {
    pageCours();
    monterCours(document);
    expect(document.querySelector('.parcours__reprise p')!.textContent).toBe('Aucune leçon faite pour l’instant. La première prend 3 min.');
    const commencer = lien('Commencer : Marques latérales');
    expect(commencer.getAttribute('href')).toBe('/cours/balisage/balisage-lateral');
    expect(commencer.getAttribute('data-mesure')).toBe('cours-reprise');
    expect(commencer.getAttribute('data-mesure-notion')).toBe('balisage-lateral');
    expect(document.querySelector('.chapitre__compte .pastille')!.textContent).toBe('0 sur 3');
    expect(document.querySelector('.etape--prochaine')!.getAttribute('href')).toBe('/cours/balisage/balisage-lateral');
    mesuresUniques();
  });

  it('cochent les leçons faites et désignent la première non faite, même après un saut', () => {
    progression({
      'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-pictogrammes': { faiteLe: '2026-09-05', bonnes: 0, total: 0 },
    });
    pageCours();
    monterCours(document);
    expect(lien('Reprendre : Marques cardinales')).toBeTruthy();
    expect(document.querySelector('.parcours__reprise p')!.textContent).toBe('2 leçons faites sur 3.');
    expect(document.querySelector('.chapitre__compte .pastille')!.textContent).toBe('2 sur 3');

    const lateral = document.querySelector('a.etape[href="/cours/balisage/balisage-lateral"]')!;
    expect(lateral.className).toBe('etape etape--faite');
    expect(lateral.querySelector('.etape__rang svg')).not.toBeNull();
    expect(lateral.querySelector('.etape__meta')!.textContent).toBe('3 min · 3 sur 3');
    expect(lateral.querySelector('.visuellement-cache')!.textContent).toBe(', leçon faite');
    expect(lateral.getAttribute('data-mesure')).toBe('cours-lecon');
    expect(lateral.getAttribute('data-mesure-notion')).toBe('balisage-lateral');

    const cardinal = document.querySelector('a.etape[href="/cours/balisage/balisage-cardinal"]')!;
    expect(cardinal.className).toBe('etape etape--prochaine');
    expect(cardinal.querySelector('.etape__rang')!.textContent).toBe('2');
    expect(cardinal.querySelector('.etape__meta')!.textContent).toBe('5 min · à faire maintenant');
    expect(cardinal.querySelector('.visuellement-cache')!.textContent).toBe(', prochaine leçon');

    // Une leçon faite sans questions ne dit pas « 0 sur 0 ».
    const pictos = document.querySelector('a.etape[href="/cours/balisage/balisage-pictogrammes"]')!;
    expect(pictos.querySelector('.etape__meta')!.textContent).toBe('1 min · résumé seulement');
    expect(document.querySelector('.etape__duree')).toBeNull();
    mesuresUniques();
  });

  it('disent quand une leçon n’est qu’un résumé', () => {
    pageCours();
    monterCours(document);
    expect(lien(/Pictogrammes/).textContent).toContain('résumé seulement');
  });

  it('renvoient au cours suivant quand tout est fait', () => {
    progression({
      'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-cardinal': { faiteLe: '2026-09-05', bonnes: 2, total: 3 },
      'balisage-pictogrammes': { faiteLe: '2026-09-05', bonnes: 0, total: 0 },
    });
    pageCours({ cours: balisage, suivant });
    monterCours(document);
    expect(document.querySelector('.parcours__reprise p')!.textContent).toBe('Cours fait, 3 leçons sur 3. Tu peux passer au suivant.');
    const versSuivant = lien('Cours suivant : Se croiser sans se toucher');
    expect(versSuivant.getAttribute('href')).toBe('/cours/barre-route');
    expect(versSuivant.getAttribute('data-mesure')).toBe('cours-suivant');
    expect(versSuivant.getAttribute('data-mesure-cours')).toBe('/cours/barre-route');
    expect(versSuivant.parentElement!.className).toBe('parcours__boutons');
    const refaire = lien('Refaire : Marques latérales');
    expect(refaire.className).toBe('bouton');
    expect(refaire.getAttribute('data-mesure')).toBe('cours-reprise');
    expect(document.querySelector('.etape--prochaine')).toBeNull();
    mesuresUniques();
  });

  it('disent que c’était le dernier cours quand il n’y a pas de suivant', () => {
    progression({ 'barre-veille-vitesse': { faiteLe: '2026-09-05', bonnes: 1, total: 1 } });
    pageCours({ cours: rencontres });
    monterCours(document);
    expect(document.querySelector('.parcours__reprise p')!.textContent).toBe('Cours fait, 1 leçon sur 1. C’était le dernier du parcours.');
    expect(document.querySelector('.parcours__boutons')).toBeNull();
    expect(lien('Refaire : Veille et vitesse').className).toBe('bouton bouton--principal');
  });
});

describe('la liste des cours', () => {
  it('l’état d’un chapitre se lit au compte des leçons faites', () => {
    expect(etatDuChapitre(0, 4)).toBe('vide');
    expect(etatDuChapitre(2, 4)).toBe('encours');
    expect(etatDuChapitre(4, 4)).toBe('fait');
  });

  it('numérote les cours et compte leurs leçons, rien de fait', () => {
    pageListe();
    monterCours(document);
    const ouvrir = lien(/Lire le balisage/);
    expect(ouvrir.getAttribute('href')).toBe('/cours/balisage');
    expect(ouvrir.getAttribute('data-mesure')).toBe('cours-ouvert');
    expect(ouvrir.getAttribute('data-mesure-cours')).toBe('balisage');
    expect(ouvrir.querySelector('.coursListe__rang')!.textContent).toBe('1');
    // Rien de fait, le premier cours est déjà celui où l'on en est.
    expect(ouvrir.querySelector('.coursListe__meta')!.textContent).toBe('0 sur 3 · 9 min · en cours');
    expect(lien(/Se croiser/).querySelector('.coursListe__meta')!.textContent).toBe('0 sur 1 · 3 min');
    expect(document.querySelector('.coursListe__item--encours a')!.getAttribute('href')).toBe('/cours/balisage');
    const commencer = lien('Commencer : Marques latérales');
    expect(commencer.getAttribute('data-mesure')).toBe('cours-reprise');
    expect(commencer.getAttribute('data-mesure-notion')).toBe('balisage-lateral');
    expect(document.querySelector('.chapitres')).toBeNull();
    mesuresUniques();
  });

  it('montre l’avancement de chaque cours et désigne celui en cours', () => {
    progression({ 'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 } });
    pageListe();
    monterCours(document);
    expect(document.querySelector('.parcours__reprise p')!.textContent).toBe('1 leçon faite sur 4.');
    const enCours = document.querySelector('.coursListe__item--encours a')!;
    expect(enCours.getAttribute('href')).toBe('/cours/balisage');
    expect(enCours.querySelector('.coursListe__meta')!.textContent).toBe('1 sur 3 · 9 min · en cours');
    expect(enCours.querySelector('.visuellement-cache')!.textContent).toBe(', cours en cours');
    expect(lien(/Se croiser/).querySelector('.coursListe__meta')!.textContent).toBe('0 sur 1 · 3 min');
    expect(lien('Reprendre : Marques cardinales').getAttribute('href')).toBe('/cours/balisage/balisage-cardinal');
  });

  it('marque un cours terminé', () => {
    progression({
      'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-cardinal': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-pictogrammes': { faiteLe: '2026-09-05', bonnes: 0, total: 0 },
    });
    pageListe();
    monterCours(document);
    const fait = document.querySelector('.coursListe__item--fait a')!;
    expect(fait.getAttribute('href')).toBe('/cours/balisage');
    expect(fait.querySelector('.coursListe__rang svg')).not.toBeNull();
    expect(fait.querySelector('.visuellement-cache')!.textContent).toBe(', cours fait');
    expect(document.querySelector('.coursListe__item--encours a')!.getAttribute('href')).toBe('/cours/barre-route');
    expect(lien('Reprendre : Veille et vitesse')).toBeTruthy();
  });

  it('dit quand tout le cours est fait', () => {
    progression({
      'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-cardinal': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-pictogrammes': { faiteLe: '2026-09-05', bonnes: 0, total: 0 },
      'barre-veille-vitesse': { faiteLe: '2026-09-05', bonnes: 1, total: 1 },
    });
    pageListe();
    monterCours(document);
    expect(document.querySelector('.parcours__reprise p')!.textContent).toBe(
      '4 leçons faites sur 4. Tout le cours est fait : tu peux le reprendre du début.',
    );
    expect(lien('Reprendre : Marques latérales')).toBeTruthy();
    expect(document.querySelectorAll('.coursListe__item--fait')).toHaveLength(2);
    expect(document.querySelector('.coursListe__item--encours')).toBeNull();
  });
});
