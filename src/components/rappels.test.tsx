/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ProfilCandidat from './ProfilCandidat';
import Questionnaire from './Questionnaire';
import { monterDateExamen } from './accueil-site';
import { EVENEMENT_DATE_EXAMEN, aujourdhui, enregistrerReponse, etatInitial, sauvegarder } from '../lib/progression';

/**
 * Les rappels d'examen (J-7, J-3, J-1, le jour J) s'arment dans la coquille
 * sur l'annonce de la date. Dans l'app, la page `/` du site n'existe pas :
 * la date se pose dans la Fiche et dans le questionnaire de départ. Un
 * écran qui écrit la date sans l'annoncer promet des rappels que l'app ne
 * programme jamais ; c'était le cas des deux jusqu'au 10 octobre 2026.
 *
 * Ici on prouve l'annonce. `natif.rappels.test.ts` prouve ce que la coquille
 * en fait.
 */
const banque = Array.from({ length: 10 }, (_, i) => ({ id: `vhf-${i}`, theme: 'vhf', notion: 'vhf-canaux' }));

let annonces: (string | null)[];
const ecouter = (e: Event) => annonces.push((e as CustomEvent<string | null>).detail);

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
  annonces = [];
  window.addEventListener(EVENEMENT_DATE_EXAMEN, ecouter);
});
afterEach(() => {
  window.removeEventListener(EVENEMENT_DATE_EXAMEN, ecouter);
  cleanup();
});

describe('la date, depuis la fiche', () => {
  it('s’annonce quand elle est posée', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    fireEvent.change(screen.getByLabelText('Date de l’examen'), { target: { value: '2027-02-01' } });
    expect(annonces).toEqual(['2027-02-01']);
  });

  it('s’annonce effacée par le bouton', () => {
    sauvegarder({ ...enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()), dateExamen: '2027-02-01' });
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    fireEvent.click(screen.getByRole('button', { name: 'Effacer la date' }));
    expect(annonces).toEqual([null]);
  });

  it('s’annonce effacée quand le champ est vidé', () => {
    sauvegarder({ ...enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()), dateExamen: '2027-02-01' });
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    fireEvent.change(screen.getByLabelText('Date de l’examen'), { target: { value: '' } });
    expect(annonces).toEqual([null]);
  });
});

describe('la date, depuis le questionnaire de départ', () => {
  function jusquALaDate() {
    render(<Questionnaire totalQuestions={483} />);
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Continuer/ }));
    }
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Ton examen est quand ?');
  }

  it('s’annonce quand elle est posée', () => {
    jusquALaDate();
    fireEvent.change(screen.getByLabelText('Date de l’examen'), { target: { value: '2027-01-15' } });
    expect(annonces).toEqual(['2027-01-15']);
  });

  it('s’annonce effacée quand elle est retirée', () => {
    sauvegarder({ ...etatInitial(), dateExamen: '2027-01-15' });
    jusquALaDate();
    fireEvent.change(screen.getByLabelText('Date de l’examen'), { target: { value: '' } });
    expect(annonces).toEqual([null]);
  });
});

describe('la date, depuis l’accueil du site', () => {
  it('s’annonce comme sur les deux autres écrans', () => {
    const racine = document.createElement('div');
    document.body.append(racine);
    monterDateExamen(racine, ['vhf-0'], etatInitial(), aujourdhui());
    const champ = racine.querySelector<HTMLInputElement>('#date-examen')!;
    fireEvent.input(champ, { target: { value: '2027-03-01' } });
    fireEvent.input(champ, { target: { value: '' } });
    expect(annonces).toEqual(['2027-03-01', null]);
    racine.remove();
  });
});
