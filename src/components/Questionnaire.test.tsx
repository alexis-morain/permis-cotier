/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Questionnaire from './Questionnaire';
import { charger } from '../lib/progression';

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
});
afterEach(() => cleanup());

function continuer() {
  fireEvent.click(screen.getByRole('button', { name: /Continuer|Terminer/ }));
}

describe('questionnaire de départ', () => {
  it('commence par la raison, et l’écrit dès la case cochée', () => {
    render(<Questionnaire totalQuestions={483} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Pourquoi');
    fireEvent.click(screen.getByRole('button', { name: /Louer un bateau/ }));
    expect(charger().profil.motivations).toEqual(['location']);
    expect(charger().profil.rempliLe).toBeNull();
  });

  it('va jusqu’au bout, garde tout, et date le remplissage', () => {
    render(<Questionnaire totalQuestions={483} />);
    fireEvent.click(screen.getByRole('button', { name: /famille/ }));
    continuer();
    fireEvent.change(screen.getByLabelText(/en une phrase/), { target: { value: 'Emmener mon père pêcher.' } });
    continuer();
    fireEvent.click(screen.getByRole('button', { name: /pars de zéro/ }));
    continuer();
    fireEvent.click(screen.getByRole('button', { name: /Tranquille/ }));
    continuer();
    fireEvent.change(screen.getByLabelText(/Date de l’examen/), { target: { value: '2027-01-15' } });
    continuer();
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Léa' } });
    continuer();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('C’est noté, Léa.');
    expect(screen.getByText('Emmener mon père pêcher.')).toBeTruthy();
    // Qui part de zéro est envoyé au cours.
    expect(screen.getByRole('link', { name: 'Commencer le cours' }).getAttribute('href')).toBe('/cours');

    const p = charger().profil;
    expect(p).toMatchObject({ prenom: 'Léa', motivations: ['famille'], depart: 'zero', rythme: 10 });
    expect(p.rempliLe).not.toBeNull();
    expect(charger().dateExamen).toBe('2027-01-15');
  });

  it('se laisse quitter sans rien exiger', () => {
    render(<Questionnaire totalQuestions={483} />);
    expect(screen.getByRole('link', { name: 'Plus tard' }).getAttribute('href')).toBe('/profil');
    continuer();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('avec tes mots');
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Pourquoi');
  });
});
