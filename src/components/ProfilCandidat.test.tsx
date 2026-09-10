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

// La banque telle que la page la donne : l'identifiant, le thème, et la
// notion — sans elle, la maîtrise par notion n'a rien à compter.
const banque = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `vhf-${i}`,
    theme: 'vhf',
    notion: i < 5 ? 'vhf-canaux' : 'vhf-emport',
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `feux-${i}`,
    theme: 'feux-marques',
    notion: i < 5 ? 'feux-remorquage' : 'feux-portee',
  })),
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

  it('parle au candidat, rappelle sa raison, et pousse sa série du jour en premier', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), prenom: 'Léa', phrase: 'Emmener mon père pêcher.', rempliLe: '2026-09-01' });
    e = enregistrerReponse(e, 'vhf-0', false, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', true, aujourdhui());
    e = enregistrerExamen(e, { date: '2026-09-04', bonnes: 36, total: 40, reussi: true });
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Léa, voilà où tu en es.');
    expect(screen.getAllByText('Emmener mon père pêcher.').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Revoir mes 1 question du jour' }).getAttribute('href')).toBe('/revoir');
    // Le thème raté passe devant, avec le lien vers son entraînement.
    const themes = screen.getAllByRole('link', { name: /retenues sur|jamais ouvert/ });
    expect(themes[0]!.getAttribute('href')).toBe('/entrainement/vhf');
    expect(screen.getByText('36 / 40')).toBeTruthy();
    expect(document.querySelector('.jour__serie .jour__chiffre')?.textContent).toBe('1 jour de suite');
  });

  it('mène à la relecture des erreurs, sans les rejouer', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', false, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByRole('link', { name: /Relire ce que j’ai raté/ }).getAttribute('href')).toBe(
      '/profil/erreurs',
    );
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

describe('la jauge de l’indice', () => {
  it('donne ses parts en propriété personnalisée, pas en largeur', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', true, aujourdhui());
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);

    const parts = [...document.querySelectorAll('.indice__part')] as HTMLElement[];
    expect(parts.length).toBe(3);
    for (const part of parts) {
      // `width` est interdite d'animation par DESIGN.md : la part passe par
      // une propriété personnalisée, que la feuille de style met en `scaleX`.
      expect(part.style.width).toBe('');
      expect(part.style.getPropertyValue('--part')).not.toBe('');
    }
  });
});

describe('les notions faibles', () => {
  it('remonte les plus faibles en tête, avec leur leçon et leur série', () => {
    // Deux notions travaillées : « canaux » ratée, « portée » retenue.
    let e = enregistrerReponse(etatInitial(), 'vhf-0', false, aujourdhui());
    e = enregistrerReponse(e, 'feux-5', true, '2026-09-01');
    e = enregistrerReponse(e, 'feux-5', true, '2026-09-08');
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);

    const faibles = [...document.querySelectorAll('.faible')];
    expect(faibles.length).toBe(3);
    expect(faibles[0]!.textContent).toContain('Canaux');
    expect(faibles[0]!.querySelector('.faible__lecon')?.getAttribute('href')).toBe(
      '/cours/vhf/vhf-canaux',
    );
    expect(faibles[0]!.querySelector('.faible__serie')?.getAttribute('href')).toBe(
      '/entrainement/notion/vhf-canaux',
    );
    // La maîtrise par thème reste : on ajoute l'étage du dessous.
    expect(screen.getByRole('heading', { name: 'Thème par thème' })).toBeTruthy();
  });

  it('ne montre rien tant que la banque n’a pas de notion', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', false, aujourdhui()));
    render(<ProfilCandidat banque={banque.map(({ id, theme }) => ({ id, theme }))} totalLecons={105} />);
    expect(document.querySelector('.faible')).toBeNull();
  });
});

describe('le changement de comptage', () => {
  it('le dit une fois à qui révisait déjà, sans en faire un événement', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, '2026-09-05'));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByText(/on compte autrement/)).toBeTruthy();
  });

  it('ne dit rien à qui commence aujourd’hui', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.queryByText(/on compte autrement/)).toBeNull();
  });
});
