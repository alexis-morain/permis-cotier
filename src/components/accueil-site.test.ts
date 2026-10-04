/** @vitest-environment jsdom */
/**
 * Les trois blocs de l'accueil qui lisent la progression, en DOM nu : ce que
 * les îlots `ReprendreCours`, `Reprise` et `DateExamen` rendaient, le script
 * de la page le rend maintenant sans React. Mêmes textes, mêmes liens, mêmes
 * attributs de mesure ; les tests reprennent ceux des îlots.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { monterAccueil } from './accueil-site';
import {
  aujourdhui,
  charger,
  enregistrerExamen,
  enregistrerProfil,
  enregistrerReponse,
  etatInitial,
  profilVide,
  sauvegarder,
  CLE_STOCKAGE,
  VERSION_STOCKAGE,
} from '../lib/progression';

const lecons = [
  { code: 'balisage-lateral', nom: 'Marques latérales', chemin: '/cours/balisage/balisage-lateral' },
  { code: 'balisage-cardinal', nom: 'Marques cardinales', chemin: '/cours/balisage/balisage-cardinal' },
  { code: 'balisage-pictogrammes', nom: 'Pictogrammes', chemin: '/cours/balisage/balisage-pictogrammes' },
  { code: 'barre-veille-vitesse', nom: 'Veille et vitesse', chemin: '/cours/barre-route/barre-veille-vitesse' },
];
const banque = [{ id: 'vhf-0', theme: 'vhf' }, { id: 'vhf-1', theme: 'vhf' }];
const ids = Array.from({ length: 10 }, (_, i) => `vhf-${i}`);

/** La page telle qu'`index.astro` la rend avant le script. */
function page(donnees: unknown = { lecons, banque: ids.map((id) => ({ id, theme: 'vhf' })) }) {
  document.body.innerHTML = `
    <p class="reprendreCours" data-reprendre-cours>
      <a class="bouton bouton--principal" href="${lecons[0]!.chemin}" data-mesure="accueil-cours" data-mesure-notion="${lecons[0]!.code}">Commencer le cours</a>
    </p>
    <div class="reprendre__etat" data-reprise></div>
    <div class="reprendre__date encadre" data-date-examen></div>
    <script type="application/json" id="accueil-donnees">${JSON.stringify(donnees)}</script>`;
}

function lien(nom: RegExp | string): HTMLAnchorElement {
  const trouve = [...document.querySelectorAll('a')].find((a) =>
    typeof nom === 'string' ? a.textContent === nom : nom.test(a.textContent ?? ''),
  );
  if (!trouve) throw new Error(`pas de lien ${nom}`);
  return trouve;
}

function progression(faites: Record<string, { faiteLe: string; bonnes: number; total: number }>) {
  localStorage.setItem(
    CLE_STOCKAGE,
    JSON.stringify({ ...etatInitial(), version: VERSION_STOCKAGE, lecons: faites }),
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('les données de la page', () => {
  it('ne fait rien sur une page sans les blocs', () => {
    document.body.innerHTML = '<p>ailleurs</p>';
    expect(() => monterAccueil(document)).not.toThrow();
    expect(document.body.textContent).toBe('ailleurs');
  });

  it('laisse la page telle quelle si le JSON est illisible', () => {
    page();
    document.getElementById('accueil-donnees')!.textContent = '{pas du json';
    monterAccueil(document);
    expect(lien('Commencer le cours').getAttribute('href')).toBe('/cours/balisage/balisage-lateral');
    expect(document.querySelector('[data-reprise]')!.children.length).toBe(0);
  });
});

describe('la reprise du cours', () => {
  it('invite à commencer quand rien n’est fait', () => {
    page();
    monterAccueil(document);
    expect(lien(/Commencer le cours/).getAttribute('href')).toBe('/cours/balisage/balisage-lateral');
    expect(document.querySelector('.reprendreCours__compte')).toBeNull();
  });

  it('compte les leçons faites et pointe la suivante', () => {
    progression({ 'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 } });
    page();
    monterAccueil(document);
    expect(document.querySelector('.reprendreCours')?.textContent?.replace(/\s+/g, ' ').trim()).toContain('1 leçon faite sur 4');
    const a = lien(/Reprendre : Marques cardinales/);
    expect(a.getAttribute('href')).toBe('/cours/balisage/balisage-cardinal');
    expect(a.getAttribute('data-mesure')).toBe('accueil-cours');
    expect(a.getAttribute('data-mesure-notion')).toBe('balisage-cardinal');
  });

  it('accorde le pluriel', () => {
    progression({
      'balisage-lateral': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
      'balisage-cardinal': { faiteLe: '2026-09-05', bonnes: 3, total: 3 },
    });
    page();
    monterAccueil(document);
    expect(document.querySelector('.reprendreCours__compte')?.textContent).toContain('2 leçons faites sur 4');
  });
});

describe('la reprise sur l’accueil', () => {
  it('invite le nouveau venu au questionnaire, en disant ce qu’on en fera', () => {
    page({ lecons, banque });
    monterAccueil(document);
    const a = lien('Dis en trente secondes pourquoi tu passes le permis');
    expect(a.getAttribute('href')).toBe('/profil/depart');
    expect(a.getAttribute('data-mesure')).toBe('accueil-profil-depart');
    // La promesse est précise : un rappel, le jour d'un examen blanc recalé.
    // « Le site se règle à ta main » promettait plus que ce qui change.
    expect(document.querySelector('.reprise')!.textContent).toContain('le jour où un examen blanc est recalé');
  });

  it('commence la ligne par une majuscule quand il n’y a pas de prénom', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    page({ lecons, banque });
    monterAccueil(document);
    expect(document.querySelector('.reprise p:not(.reprise__examen)')!.textContent).toMatch(/^Indice de préparation/);
  });

  it('redit le dernier examen blanc, et la raison seulement s’il est recalé', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), motivations: ['peche'], rempliLe: '2026-09-01' });
    e = enregistrerExamen(e, { date: aujourdhui(), bonnes: 11, total: 40, reussi: false });
    sauvegarder(e);
    page({ lecons, banque });
    monterAccueil(document);
    expect(document.querySelector('.reprise__examen')!.textContent).toBe('Dernier examen blanc : 11 sur 40, recalé.');
    expect(document.querySelector('.reprise__raison')!.textContent).toContain('pêcher');

    // Reçu : le score reste, le rappel se tait. Il n'aide que quand ça coince.
    e = enregistrerExamen(e, { date: aujourdhui(), bonnes: 37, total: 40, reussi: true });
    sauvegarder(e);
    page({ lecons, banque });
    monterAccueil(document);
    expect(document.querySelector('.reprise__examen')!.textContent).toBe('Dernier examen blanc : 37 sur 40, reçu.');
    expect(document.querySelector('.reprise__raison')).toBeNull();
  });

  it('ne double pas le point quand la phrase du candidat en porte un', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), phrase: 'Emmener mon père pêcher.', rempliLe: '2026-09-01' });
    e = enregistrerExamen(e, { date: aujourdhui(), bonnes: 11, total: 40, reussi: false });
    sauvegarder(e);
    page({ lecons, banque });
    monterAccueil(document);
    expect(document.querySelector('.reprise__raison')!.textContent).toBe('Tu passes ce permis pour Emmener mon père pêcher.');
  });

  it('dit l’objectif du jour atteint plutôt qu’un plafond muet', () => {
    const e = ids.reduce((etat, id) => enregistrerReponse(etat, id, true, aujourdhui()), etatInitial());
    sauvegarder({ ...e, profil: { ...profilVide(), rythme: 10 } });
    page({ lecons, banque });
    monterAccueil(document);
    expect(document.querySelector('.reprise p:not(.reprise__examen)')!.textContent).toContain('Objectif du jour fait, 10 questions');
  });

  it('résume l’indice, le jour, les erreurs et la raison', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), prenom: 'Léa', motivations: ['peche'], rempliLe: '2026-09-01' });
    e = enregistrerReponse(e, 'vhf-0', false, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', true, aujourdhui());
    // La raison ne revient sur l'accueil qu'après un examen blanc recalé.
    e = enregistrerExamen(e, { date: aujourdhui(), bonnes: 20, total: 40, reussi: false });
    sauvegarder(e);
    page({ lecons, banque });
    monterAccueil(document);
    const texte = document.querySelector('.reprise p:not(.reprise__examen)')!.textContent!;
    expect(texte).toMatch(/^Léa, indice de préparation \d+ sur 100, /);
    expect(texte).toContain('sur 100');
    expect(texte).toMatch(/Aujourd’hui 2 questions sur \d+, 1 jour de suite\./);
    const revoir = lien(/1 question à revoir/);
    expect(revoir.getAttribute('href')).toBe('/revoir');
    expect(revoir.getAttribute('data-mesure')).toBe('accueil-revoir');
    expect(document.querySelectorAll('[data-mesure="accueil-revoir"]').length).toBe(1);
    expect(lien('Ta fiche').getAttribute('href')).toBe('/profil');
    expect(lien('Ta fiche').getAttribute('data-mesure')).toBe('accueil-profil');
    expect(document.querySelector('.reprise__raison')!.textContent).toContain('pêcher');
    expect(document.querySelector('.reprise__raison q')!.textContent).toContain('pêcher');
  });

  it('n’écrit pas le prénom en HTML', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), prenom: '<img src=x>', motivations: ['peche'], rempliLe: '2026-09-01' });
    e = enregistrerReponse(e, 'vhf-0', true, aujourdhui());
    sauvegarder(e);
    page({ lecons, banque });
    monterAccueil(document);
    expect(document.querySelector('.reprise img')).toBeNull();
    expect(document.querySelector('.reprise p:not(.reprise__examen)')!.textContent).toContain('<img src=x>, indice');
  });
});

describe('la date d’examen, la nuit du 15 janvier à Paris', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-14T23:30:00Z'));
  });

  function afficher(dateExamen: string) {
    sauvegarder({ ...etatInitial(), dateExamen });
    page();
    monterAccueil(document);
  }
  const compte = () => document.querySelector('.dateExamen__compte')?.textContent ?? null;

  it('pose le champ, son étiquette et la note de confidentialité', () => {
    afficher('');
    const champ = document.getElementById('date-examen') as HTMLInputElement;
    expect(champ.type).toBe('date');
    expect(champ.value).toBe('');
    expect(document.querySelector('label[for="date-examen"]')!.textContent).toBe('Ton examen est quand ?');
    expect(document.querySelector('.dateExamen__note')!.textContent).toBe('Gardée dans ce navigateur, rien n’est envoyé.');
    expect(compte()).toBeNull();
  });

  it('compte les jours qui restent et le rythme à tenir', () => {
    afficher('2026-01-17');
    expect((document.getElementById('date-examen') as HTMLInputElement).value).toBe('2026-01-17');
    expect(compte()).toBe('Dans 2 jours. Environ 5 questions par jour pour voir les 10 qui restent.');
  });

  it('renvoie aux examens blancs quand tout a déjà été vu une fois', () => {
    const vu = ids.reduce((etat, id) => enregistrerReponse(etat, id, true, aujourdhui()), etatInitial());
    sauvegarder({ ...vu, dateExamen: '2026-01-17' });
    page();
    monterAccueil(document);
    expect(compte()).toBe('Dans 2 jours. Tu as tout vu une fois : place aux examens blancs.');
  });

  it('dit « demain » la veille', () => {
    afficher('2026-01-16');
    expect(compte()).toBe('Demain. Fais deux examens blancs ce soir.');
  });

  it('dit « aujourd’hui » le jour même', () => {
    afficher('2026-01-15');
    expect(compte()).toBe('Aujourd’hui. Bon vent.');
  });

  it('dit que c’est passé la veille au soir devenue lendemain', () => {
    afficher('2026-01-14');
    expect(compte()).toBe('C’est passé. Efface la date au-dessus, ou pose la prochaine.');
  });

  it('enregistre la date posée, la compte, et l’efface quand on la retire', () => {
    const umami = { track: vi.fn() };
    (window as unknown as { umami: unknown }).umami = umami;
    afficher('');
    const champ = document.getElementById('date-examen') as HTMLInputElement;
    champ.value = '2026-01-17';
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    expect(charger().dateExamen).toBe('2026-01-17');
    expect(compte()).toContain('Dans 2 jours.');
    expect(umami.track).toHaveBeenCalledWith('date-examen-renseignee', undefined);

    champ.value = '';
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    expect(charger().dateExamen).toBeNull();
    expect(compte()).toBeNull();
    expect(umami.track).toHaveBeenCalledTimes(1);
    delete (window as unknown as { umami?: unknown }).umami;
  });
});

describe('la date d’examen, la nuit du 15 juillet à Paris', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T22:30:00Z'));
  });

  it('compte depuis le jour parisien, pas le jour UTC', () => {
    sauvegarder({ ...etatInitial(), dateExamen: '2026-07-17' });
    page();
    monterAccueil(document);
    expect(document.querySelector('.dateExamen__compte')!.textContent).toContain('Dans 2 jours.');
  });
});
