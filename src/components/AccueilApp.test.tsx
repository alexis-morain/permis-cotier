/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import AccueilApp from './AccueilApp';
import {
  enregistrerExamen,
  enregistrerProfil,
  enregistrerReponse,
  etatInitial,
  profilVide,
  sauvegarder,
  terminerLecon,
  type Etat,
} from '../lib/progression';
import type { LeconAccueil } from '../lib/accueil';

const lecons: LeconAccueil[] = [
  { code: 'a', nom: 'Marques latérales', chemin: '/cours/balisage/a', chapitre: 'Lire le balisage' },
  { code: 'b', nom: 'Cardinales', chemin: '/cours/balisage/b', chapitre: 'Lire le balisage' },
];
const ids = ['q1', 'q2'];

function afficher(etat?: Etat) {
  if (etat) sauvegarder(etat);
  render(<AccueilApp lecons={lecons} ids={ids} />);
}

const lien = (nom: string | RegExp) => screen.getByRole('link', { name: nom }).getAttribute('href');

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  // 0 h 30 à Paris le 25, encore le 24 en UTC : tout l'écran compte depuis
  // le jour parisien, sinon chaque échéance glisserait d'un jour.
  vi.setSystemTime(new Date('2026-09-24T22:30:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('accueil de l’app, premier lancement', () => {
  it('un titre pour VoiceOver, et les quatre blocs à vide', () => {
    afficher();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Accueil');
    expect(screen.getByRole('heading', { name: 'Marques latérales' })).toBeTruthy();
    expect(screen.getByText('Lire le balisage, leçon 1 sur 2')).toBeTruthy();
    expect(screen.getByText('0 leçon sur 2')).toBeTruthy();
    expect(lien('Commencer le cours')).toBe('/cours/balisage/a');
    expect(screen.getByText('Tes erreurs reviendront ici.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Faire ma série du jour/ })).toBeNull();
    expect(screen.getByText('Quarante questions, vingt secondes chacune.')).toBeTruthy();
    expect(lien(/Examen blanc/)).toBe('/examen');
    expect(lien(/Pose la date de ton épreuve/)).toBe('/parametres');
    expect(screen.queryByText(/jours de suite/)).toBeNull();
  });
});

describe('les libellés de l’accueil', () => {
  it('disent un verbe et ce qu’ils ouvrent, comme la fiche pour les mêmes destinations', () => {
    afficher(enregistrerReponse(etatInitial(), 'q1', false, '2026-09-25'));
    // Le bouton du panneau, puis la première ligne de chaque rangée.
    const libelles = [...document.querySelectorAll('.accueilApp a.bouton, .accueilApp a.accueilApp__rangee')].map(
      (a) => (a.classList.contains('bouton') ? a : a.querySelector('.accueilApp__txt'))?.firstChild?.textContent,
    );
    expect(libelles).toEqual(['Faire ma série du jour', 'Commencer le cours', 'Examen blanc', 'Ton épreuve']);
    expect(document.querySelector('a[href="/parametres"] .accueilApp__sous')?.textContent).toBe('Pose la date de ton épreuve');
  });
});

describe('accueil de l’app, en cours de route', () => {
  it('continue la leçon suivante et compte les questions dues', () => {
    let e = terminerLecon(etatInitial(), 'a', { bonnes: 2, total: 2 }, '2026-09-24');
    e = enregistrerReponse(e, 'q1', false, '2026-09-24');
    e = enregistrerReponse(e, 'q2', false, '2026-09-25');
    afficher(e);
    // Des questions dues : la série est en tête, le cours est la première rangée.
    expect(screen.getByText('Cardinales')).toBeTruthy();
    expect(screen.getByText('1 sur 2')).toBeTruthy();
    expect(lien(/^Continuer le cours/)).toBe('/cours/balisage/b');
    expect(screen.getByText(/questions à revoir/).textContent).toBe('2 questions à revoir');
    expect(lien('Faire ma série du jour')).toBe('/revoir');
    expect(screen.getByText('2 jours de suite')).toBeTruthy();
  });

  it('dit le nombre que /revoir joue, borné au rythme, et y mène en une touche', () => {
    const douze = Array.from({ length: 12 }, (_, k) => `q${k}`);
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), rythme: 10 });
    for (const id of douze) e = enregistrerReponse(e, id, false, '2026-09-25');
    sauvegarder(e);
    render(<AccueilApp lecons={lecons} ids={douze} />);
    expect(screen.getByText(/questions à revoir/).textContent).toBe('10 questions à revoir');
    expect(lien('Faire ma série du jour')).toBe('/revoir');
  });

  it('rien de dû : le dit, sans bouton', () => {
    afficher(enregistrerReponse(etatInitial(), 'q1', true, '2026-09-25'));
    expect(screen.getByText('Rien à revoir aujourd’hui.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Faire ma série du jour/ })).toBeNull();
    expect(screen.queryByText(/jours de suite/)).toBeNull();
  });

  it('le dernier examen blanc, verdict écrit', () => {
    let e = enregistrerExamen(etatInitial(), { date: '2026-09-22', bonnes: 34, total: 40, reussi: true });
    afficher(e);
    // Le score en étiquette verte, le verdict aussi écrit en légende.
    expect(document.querySelector('.etiquette--juste')?.textContent).toBe('34 sur 40');
    expect(screen.getByText('Réussi, il y a 3 jours')).toBeTruthy();
    cleanup();
    e = enregistrerExamen(e, { date: '2026-09-25', bonnes: 33, total: 40, reussi: false });
    afficher(e);
    expect(document.querySelector('.etiquette--faux')?.textContent).toBe('33 sur 40');
    expect(screen.getByText('Recalé, aujourd’hui')).toBeTruthy();
    expect(lien(/Examen blanc/)).toBe('/examen');
  });
});

describe('accueil de l’app, cours terminé', () => {
  it('le dit et renvoie au plan du cours', () => {
    let e = etatInitial();
    for (const l of lecons) e = terminerLecon(e, l.code, { bonnes: 1, total: 1 }, '2026-09-20');
    afficher(e);
    expect(screen.getByRole('heading', { name: 'Cours terminé' })).toBeTruthy();
    expect(screen.getByText('2 leçons sur 2')).toBeTruthy();
    expect(lien('Revoir le plan du cours')).toBe('/cours');
    expect(screen.queryByRole('link', { name: /Continuer|Commencer/ })).toBeNull();
    // Le panneau du haut n'a pas de bouton ; la liste ne le redit pas.
    expect(screen.getAllByRole('link', { name: /Revoir le plan du cours/ })).toHaveLength(1);
  });
});

describe('accueil de l’app, la date de l’examen', () => {
  const avec = (dateExamen: string) => afficher({ ...etatInitial(), dateExamen });

  it('dans n jours', () => {
    avec('2026-10-07');
    expect(screen.getByText(/^Dans/).textContent).toBe('Dans 12 jours');
    // La date se règle dans Réglages, plus sur la Fiche ; la rangée l'écrit à droite.
    expect(lien(/Ton épreuve/)).toBe('/parametres');
    expect(document.querySelector('a[href="/parametres"] .accueilApp__val')?.textContent).toBe('7 octobre');
  });

  it('demain, au jour parisien', () => {
    avec('2026-09-26');
    expect(screen.getByText('Demain')).toBeTruthy();
  });

  it('le jour même', () => {
    avec('2026-09-25');
    expect(screen.getByText('C’est aujourd’hui')).toBeTruthy();
  });

  it('passée', () => {
    avec('2026-09-21');
    expect(screen.getByText('C’était il y a 4 jours')).toBeTruthy();
    expect(screen.queryByText('Pose la date de ton épreuve')).toBeNull();
  });
});

describe('quand un autre onglet écrit la progression', () => {
  it('relit le stockage sur app:progression, sans rendre l’écran à nouveau de zéro', () => {
    afficher();
    const titre = screen.getByRole('heading', { name: 'Marques latérales' });
    expect(lien('Commencer le cours')).toBe('/cours/balisage/a');

    // Une leçon faite dans l'onglet Cours, puis l'onglet Accueil revient.
    sauvegarder(terminerLecon(etatInitial(), 'a', { bonnes: 2, total: 2 }, '2026-09-24'));
    act(() => {
      window.dispatchEvent(new Event('app:progression'));
    });

    expect(screen.getByRole('heading', { name: 'Cardinales' })).toBeTruthy();
    expect(lien('Continuer le cours')).toBe('/cours/balisage/b');
    expect(screen.getByText('1 leçon sur 2')).toBeTruthy();
    // Le nœud du titre a été mis à jour, pas l'arbre jeté : rien n'a rechargé.
    expect(document.body.contains(titre)).toBe(true);
  });

  it('cesse d’écouter une fois démonté', () => {
    const retrait = vi.spyOn(window, 'removeEventListener');
    afficher();
    cleanup();
    expect(retrait).toHaveBeenCalledWith('app:progression', expect.any(Function));
  });
});

describe('accueil de l’app, la prochaine chose à faire', () => {
  const boutons = () => [...document.querySelectorAll('.accueilApp a.bouton--principal')].map((a) => a.firstChild?.textContent);
  // Le titre du panneau, puis le libellé de chaque rangée d'« Ensuite ».
  const ordre = () => [
    document.querySelector('.accueilApp__tete h2')?.textContent,
    ...[...document.querySelectorAll('.accueilApp__txt')].map((t) => t.firstChild?.textContent),
  ];

  it('rien de dû, pas de date : le cours en tête, seul bouton jaune', () => {
    afficher();
    expect(boutons()).toEqual(['Commencer le cours']);
    expect(ordre()).toEqual(['Marques latérales', 'À revoir aujourd’hui', 'Examen blanc', 'Ton épreuve']);
  });

  it('des questions dues : la série en tête, le cours redescend en rangée', () => {
    afficher(enregistrerReponse(etatInitial(), 'q1', false, '2026-09-25'));
    expect(boutons()).toEqual(['Faire ma série du jour']);
    expect(ordre()).toEqual(['À revoir aujourd’hui', 'Commencer le cours', 'Examen blanc', 'Ton épreuve']);
    expect(screen.getAllByRole('link', { name: /Faire ma série du jour/ })).toHaveLength(1);
    expect(lien(/^Commencer le cours/)).toBe('/cours/balisage/a');
  });

  it('épreuve à sept jours : l’examen blanc en tête, une seule fois', () => {
    let e = enregistrerReponse(etatInitial(), 'q1', false, '2026-09-25');
    e = { ...e, dateExamen: '2026-10-02' };
    afficher(e);
    expect(boutons()).toEqual(['Faire un examen blanc']);
    expect(screen.getAllByRole('link', { name: /Examen blanc|Faire un examen blanc/ })).toHaveLength(1);
    expect(ordre()).toEqual(['Examen blanc', 'Commencer le cours', 'À revoir aujourd’hui', 'Ton épreuve']);
    expect(lien(/Faire ma série du jour/)).toBe('/revoir');
  });

  it('épreuve à huit jours : le cours ou la série, pas l’examen', () => {
    afficher({ ...etatInitial(), dateExamen: '2026-10-03' });
    expect(boutons()).toEqual(['Commencer le cours']);
  });

  it('cours terminé et rien de dû : le plan du cours reste en tête, sans bouton jaune', () => {
    let e = etatInitial();
    for (const l of lecons) e = terminerLecon(e, l.code, { bonnes: 1, total: 1 }, '2026-09-20');
    afficher(e);
    expect(boutons()).toEqual([]);
    expect(lien('Revoir le plan du cours')).toBe('/cours');
  });

  it('le thème de la leçon est une étiquette à la couleur de son groupe', () => {
    afficher();
    // Les leçons du test sont sous `/cours/balisage/` : le groupe bleu.
    expect(document.querySelector('.accueilApp__chapitre')?.className).toContain('etiquette--bleu');
  });
});

describe('accueil de l’app, le haut de l’écran', () => {
  it('un grand titre visible, la date du jour parisien dessous', () => {
    afficher();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).not.toContain('visuellement-cache');
    expect(screen.getByText('vendredi 25 septembre')).toBeTruthy();
    expect(h1.nextElementSibling?.textContent).toBe('vendredi 25 septembre');
  });

  it('les jours de suite se disent sur la ligne de la date', () => {
    afficher(enregistrerReponse(enregistrerReponse(etatInitial(), 'q1', true, '2026-09-24'), 'q2', true, '2026-09-25'));
    expect(screen.getByRole('heading', { level: 1 }).nextElementSibling?.textContent).toBe('vendredi 25 septembre, 2 jours de suite');
  });

  it('« Pose la date » est une rangée comme les autres', () => {
    afficher();
    expect(screen.getByRole('link', { name: /Pose la date de ton épreuve/ }).className).toBe('accueilApp__rangee');
  });
});
