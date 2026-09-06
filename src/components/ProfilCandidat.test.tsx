/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ProfilCandidat from './ProfilCandidat';
import {
  aujourdhui,
  enregistrerExamen,
  enregistrerProfil,
  enregistrerReponse,
  etatInitial,
  profilVide,
  sauvegarder,
  charger,
} from '../lib/progression';

const banque = [
  ...Array.from({ length: 10 }, (_, i) => ({ id: `vhf-${i}`, theme: 'vhf' })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: `feux-${i}`, theme: 'feux-marques' })),
];

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('la fiche', () => {
  it('invite à répondre quand rien n’est dit, et affiche un indice à zéro', () => {
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Voilà où tu en es.');
    // L'invitation en tête, et le renvoi dans les réglages : deux liens.
    expect(screen.getAllByRole('link', { name: 'Répondre' }).map((a) => a.getAttribute('href'))).toEqual(['/profil/depart', '/profil/depart']);
    expect(screen.getByText('Tu démarres')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Faire un examen blanc' })).toBeTruthy();
  });

  it('parle au candidat, rappelle sa raison, et pousse ses erreurs en premier', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), prenom: 'Léa', phrase: 'Emmener mon père pêcher.', rempliLe: '2026-09-01' });
    e = enregistrerReponse(e, 'vhf-0', false, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', true, aujourdhui());
    e = enregistrerExamen(e, { date: '2026-09-04', bonnes: 36, total: 40, reussi: true });
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Léa, voilà où tu en es.');
    expect(screen.getAllByText('Emmener mon père pêcher.').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Revoir mes 1 erreur' }).getAttribute('href')).toBe('/revoir');
    // Le thème raté passe devant, avec le lien vers son entraînement.
    const themes = screen.getAllByRole('link', { name: /retenues sur|jamais ouvert/ });
    expect(themes[0]!.getAttribute('href')).toBe('/entrainement/vhf');
    expect(screen.getByText('36 / 40')).toBeTruthy();
    expect(document.querySelector('.jour__serie .jour__chiffre')?.textContent).toBe('1 jour de suite');
  });

  it('change le rythme et la date depuis les réglages', () => {
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    fireEvent.click(screen.getByRole('button', { name: /^40/ }));
    expect(charger().profil.rythme).toBe(40);
    fireEvent.change(screen.getByLabelText('Date de l’examen'), { target: { value: '2027-02-01' } });
    expect(charger().dateExamen).toBe('2027-02-01');
    expect(screen.getByText(/Examen dans \d+ jours/)).toBeTruthy();
  });

  it('efface tout après confirmation, fiche comprise', () => {
    sauvegarder(enregistrerProfil(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()), { ...profilVide(), prenom: 'Léa', rempliLe: '2026-09-01' }));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    fireEvent.click(screen.getByRole('button', { name: /Effacer ma progression/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Oui, tout effacer' }));
    expect(charger()).toEqual(etatInitial());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Voilà où tu en es.');
  });
});
