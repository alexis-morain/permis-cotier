/** @vitest-environment jsdom */
/**
 * La liste des thèmes de l'écran Entraînement, dans l'app : les erreurs en
 * tête et, sous chaque thème ouvert, « n retenues sur m » avec une jauge. Le
 * compte « retenu » est celui de la Fiche (`maitriseParTheme`).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { poserLaListe } from './entrainement-app';
import { enregistrerReponse, etatInitial } from '../lib/progression';

const banque = [
  ...['a-0', 'a-1', 'a-2', 'a-3'].map((id) => ({ id, theme: 'feux' })),
  ...['b-0', 'b-1'].map((id) => ({ id, theme: 'vhf' })),
];

/** La liste telle que `EntrainementApp.astro` la rend avant le script. */
function page() {
  document.body.innerHTML = `
    <ul class="choix" data-banque='${JSON.stringify(banque)}'>
      <li class="choix__erreurs" hidden><a href="/profil/erreurs"><span class="choix__nom">Tes erreurs</span><span class="pastille"></span></a></li>
      <li data-theme="feux"><a href="/entrainement/feux"><span class="choix__nom">Feux</span><span class="pastille">4 questions</span><span class="choix__jauge" hidden aria-hidden="true"><span></span></span></a></li>
      <li data-theme="vhf"><a href="/entrainement/vhf"><span class="choix__nom">VHF</span><span class="pastille">2 questions</span><span class="choix__jauge" hidden aria-hidden="true"><span></span></span></a></li>
    </ul>`;
}

const ligne = (theme: string) => document.querySelector<HTMLElement>(`li[data-theme="${theme}"]`)!;

/** Deux réussites sur deux jours : la question est retenue. */
function retenue(etat: ReturnType<typeof etatInitial>, id: string) {
  return enregistrerReponse(enregistrerReponse(etat, id, true, '2026-10-20'), id, true, '2026-10-21');
}

beforeEach(page);

describe('la liste des thèmes de l’entraînement', () => {
  it('laisse « m questions » et cache la jauge d’un thème jamais ouvert', () => {
    poserLaListe(document, etatInitial(), '2026-10-22');
    expect(ligne('feux').querySelector('.pastille')?.textContent).toBe('4 questions');
    expect(ligne('feux').querySelector<HTMLElement>('.choix__jauge')!.hidden).toBe(true);
  });

  it('dit « n retenues sur m » et remplit la jauge d’un thème ouvert', () => {
    let etat = etatInitial();
    etat = retenue(etat, 'a-0');
    etat = retenue(etat, 'a-1');
    etat = enregistrerReponse(etat, 'a-2', true, '2026-10-21');
    poserLaListe(document, etat, '2026-10-22');
    const feux = ligne('feux');
    expect(feux.querySelector('.pastille')?.textContent).toBe('2 retenues sur 4');
    const jauge = feux.querySelector<HTMLElement>('.choix__jauge')!;
    expect(jauge.hidden).toBe(false);
    expect(jauge.querySelector<HTMLElement>('span')!.style.transform).toBe('scaleX(0.5)');
    expect(ligne('vhf').querySelector('.pastille')?.textContent).toBe('2 questions');
  });

  it('accorde « retenue » au singulier, zéro compris', () => {
    let etat = enregistrerReponse(etatInitial(), 'b-0', false, '2026-10-21');
    poserLaListe(document, etat, '2026-10-22');
    expect(ligne('vhf').querySelector('.pastille')?.textContent).toBe('0 retenue sur 2');
    etat = retenue(etat, 'b-1');
    poserLaListe(document, etat, '2026-10-22');
    expect(ligne('vhf').querySelector('.pastille')?.textContent).toBe('1 retenue sur 2');
  });

  it('revient à « m questions » quand la progression est effacée', () => {
    poserLaListe(document, retenue(etatInitial(), 'b-0'), '2026-10-22');
    poserLaListe(document, etatInitial(), '2026-10-22');
    expect(ligne('vhf').querySelector('.pastille')?.textContent).toBe('2 questions');
    expect(ligne('vhf').querySelector<HTMLElement>('.choix__jauge')!.hidden).toBe(true);
  });

  it('montre « Tes erreurs » avec leur nombre, sur les questions de la banque', () => {
    const etat = enregistrerReponse(etatInitial(), 'a-0', false, '2026-10-21');
    poserLaListe(document, etat, '2026-10-22');
    const erreurs = document.querySelector<HTMLElement>('.choix__erreurs')!;
    expect(erreurs.hidden).toBe(false);
    expect(erreurs.querySelector('.pastille')?.textContent).toBe('1 question');
  });
});
