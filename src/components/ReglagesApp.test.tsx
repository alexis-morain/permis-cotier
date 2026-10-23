/** @vitest-environment jsdom */
/**
 * Les Réglages de l'app : des sections groupées comme ceux d'iOS. Prénom,
 * raison, rythme, date d'examen et sons y vivent ; l'effacement tout en bas,
 * derrière une alerte avec Annuler.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ReglagesApp from './ReglagesApp';
import {
  aujourdhui,
  charger,
  enregistrerExamen,
  enregistrerProfil,
  enregistrerReponse,
  etatInitial,
  profilVide,
  sauvegarder,
} from '../lib/progression';

vi.mock('../lib/cible', () => ({ POUR_APP: true }));

const rendre = () => render(<ReglagesApp version="1.20.1" total={658} />);

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('les réglages de l’app', () => {
  it('rangent les réglages en sections nommées, dans l’ordre', () => {
    rendre();
    const titres = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titres).toEqual([
      'Ton épreuve',
      'Ton rythme',
      'Toi',
      'Sons',
      'Cette version',
      'Ce que l’app sait de toi',
      'Licences',
    ]);
  });

  it('n’offre aucun réglage d’apparence', () => {
    rendre();
    expect(screen.queryByText(/Apparence|Clair|Sombre/)).toBeNull();
  });

  it('pose la date de l’examen, annonce la coquille, et l’efface', () => {
    const annonces: unknown[] = [];
    const ecoute = (e: Event) => annonces.push((e as CustomEvent).detail);
    window.addEventListener('permis-cotier:date-examen', ecoute);
    rendre();
    fireEvent.change(screen.getByLabelText('Date de l’examen'), { target: { value: '2027-02-01' } });
    expect(charger().dateExamen).toBe('2027-02-01');
    fireEvent.click(screen.getByRole('button', { name: 'Effacer la date' }));
    expect(charger().dateExamen).toBeNull();
    expect(screen.queryByRole('button', { name: 'Effacer la date' })).toBeNull();
    expect(annonces).toEqual(['2027-02-01', null]);
    window.removeEventListener('permis-cotier:date-examen', ecoute);
  });

  it('change le rythme par un groupe de boutons dont un est enfoncé', () => {
    rendre();
    const groupe = screen.getByRole('group', { name: 'Questions par jour' });
    expect(within(groupe).getByRole('button', { name: /^20/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(groupe).getByRole('button', { name: /^40/ }));
    expect(charger().profil.rythme).toBe(40);
    expect(within(groupe).getByRole('button', { name: /^40/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('écrit le prénom au fil de la frappe', () => {
    rendre();
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Léa' } });
    expect(charger().profil.prenom).toBe('Léa');
  });

  it('mène à la raison, et dit celle qui est écrite', () => {
    rendre();
    const lien = screen.getByRole('link', { name: /Pourquoi tu passes le permis/ });
    expect(lien.getAttribute('href')).toBe('/profil/depart?retour=%2Fparametres');
    expect(lien.textContent).toContain('Pas encore dit');
    cleanup();
    sauvegarder(enregistrerProfil(etatInitial(), { ...profilVide(), phrase: 'Emmener mon père pêcher.', rempliLe: '2026-09-01' }));
    rendre();
    expect(screen.getByRole('link', { name: /Pourquoi tu passes le permis/ }).textContent).toContain('Emmener mon père pêcher.');
  });

  it('porte les sons et dit la version de la banque', () => {
    rendre();
    expect(screen.getByRole('switch', { name: 'Jouer les sons' })).toBeTruthy();
    expect(screen.getByText('version 1.20.1, 658 questions')).toBeTruthy();
  });
});

describe('effacer la progression', () => {
  const remplir = () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', false, aujourdhui());
    e = enregistrerExamen(e, { date: '2026-09-04', bonnes: 30, total: 40, reussi: false });
    e = enregistrerProfil(e, { ...profilVide(), motivations: ['peche'], rempliLe: '2026-09-01' });
    sauvegarder({ ...e, dateExamen: '2027-02-01' });
  };

  it('est la dernière cellule, en rouge, et ne propose rien quand il n’y a rien à effacer', () => {
    rendre();
    expect(screen.queryByRole('button', { name: 'Effacer ma progression' })).toBeNull();
    expect(screen.getByText('Rien à effacer pour l’instant.')).toBeTruthy();
    cleanup();
    remplir();
    rendre();
    const bouton = screen.getByRole('button', { name: 'Effacer ma progression' });
    expect(bouton.className).toContain('reglagesApp__danger');
    const tous = [...document.querySelectorAll('button, a, input')];
    expect(tous[tous.length - 1]).toBe(bouton);
  });

  it('ouvre une alerte : un titre, ce qui part, Annuler à gauche et Effacer, focus sur Annuler', () => {
    remplir();
    rendre();
    const bouton = screen.getByRole('button', { name: 'Effacer ma progression' });
    fireEvent.click(bouton);
    const alerte = screen.getByRole('alertdialog', { name: 'Effacer ta progression ?' });
    expect(alerte.getAttribute('aria-modal')).toBe('true');
    expect(alerte.textContent).toContain('2 questions, 1 examen blanc, ta raison et ta date.');
    const boutons = within(alerte).getAllByRole('button');
    expect(boutons.map((b) => b.textContent)).toEqual(['Annuler', 'Effacer']);
    expect(document.activeElement).toBe(boutons[0]);
    // Annuler ne touche à rien, ferme l’alerte et rend le focus à la cellule.
    fireEvent.click(boutons[0]!);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(charger().examens).toHaveLength(1);
    expect(document.activeElement).toBe(bouton);
  });

  it('se ferme à Échap sans rien effacer', () => {
    remplir();
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Effacer ma progression' }));
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(charger().examens).toHaveLength(1);
  });

  it('efface tout à la confirmation, le dit, et relit les champs', () => {
    remplir();
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Effacer ma progression' }));
    act(() => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Effacer' }));
    });
    expect(charger()).toEqual(etatInitial());
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Progression effacée.');
    expect((screen.getByLabelText('Date de l’examen') as HTMLInputElement).value).toBe('');
  });

  it('pose le focus sur le message une fois la cellule disparue', () => {
    remplir();
    rendre();
    fireEvent.click(screen.getByRole('button', { name: 'Effacer ma progression' }));
    act(() => {
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Effacer' }));
    });
    const message = screen.getByRole('status');
    expect(message.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(message);
  });
});
