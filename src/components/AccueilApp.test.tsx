/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import AccueilApp from './AccueilApp';
import { enregistrerExamen, enregistrerReponse, etatInitial, sauvegarder, terminerLecon, type Etat } from '../lib/progression';
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
    expect(lien('Commencer')).toBe('/cours/balisage/a');
    expect(screen.getByText('Tes erreurs reviendront ici.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Revoir' })).toBeNull();
    expect(screen.getByText('Quarante questions, vingt secondes chacune.')).toBeTruthy();
    expect(lien('Nouvel examen blanc')).toBe('/examen');
    expect(lien('Pose la date de ton examen')).toBe('/profil');
    expect(screen.queryByText(/jours de suite/)).toBeNull();
  });
});

describe('accueil de l’app, en cours de route', () => {
  it('continue la leçon suivante et compte les questions dues', () => {
    let e = terminerLecon(etatInitial(), 'a', { bonnes: 2, total: 2 }, '2026-09-24');
    e = enregistrerReponse(e, 'q1', false, '2026-09-24');
    e = enregistrerReponse(e, 'q2', false, '2026-09-25');
    afficher(e);
    expect(screen.getByRole('heading', { name: 'Cardinales' })).toBeTruthy();
    expect(screen.getByText('1 leçon sur 2')).toBeTruthy();
    expect(lien('Continuer')).toBe('/cours/balisage/b');
    expect(screen.getByText(/questions à revoir/).textContent).toBe('2 questions à revoir');
    expect(lien('Revoir')).toBe('/revoir');
    expect(screen.getByText('2 jours de suite')).toBeTruthy();
  });

  it('rien de dû : le dit, sans bouton', () => {
    afficher(enregistrerReponse(etatInitial(), 'q1', true, '2026-09-25'));
    expect(screen.getByText('Rien à revoir aujourd’hui.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Revoir' })).toBeNull();
    expect(screen.queryByText(/jours de suite/)).toBeNull();
  });

  it('le dernier examen blanc, verdict écrit', () => {
    let e = enregistrerExamen(etatInitial(), { date: '2026-09-22', bonnes: 34, total: 40, reussi: true });
    afficher(e);
    expect(screen.getByText('34 sur 40, réussi, il y a 3 jours.')).toBeTruthy();
    cleanup();
    e = enregistrerExamen(e, { date: '2026-09-25', bonnes: 33, total: 40, reussi: false });
    afficher(e);
    expect(screen.getByText('33 sur 40, recalé, aujourd’hui.')).toBeTruthy();
    expect(lien('Nouvel examen blanc')).toBe('/examen');
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
  });
});

describe('accueil de l’app, la date de l’examen', () => {
  const avec = (dateExamen: string) => afficher({ ...etatInitial(), dateExamen });

  it('dans n jours', () => {
    avec('2026-10-07');
    expect(screen.getByText(/^Dans/).textContent).toBe('Dans 12 jours');
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
    expect(screen.queryByRole('link', { name: 'Pose la date de ton examen' })).toBeNull();
  });
});
