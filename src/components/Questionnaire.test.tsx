/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Questionnaire from './Questionnaire';
import { aujourdhui, charger } from '../lib/progression';
import { jourPlus } from '../lib/jour';

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
    // Une phrase, sans sur-titre ; la phrase du candidat garde son point, sans second.
    expect(document.querySelector('.rappel')!.textContent).toBe('Tu passes ce permis pour Emmener mon père pêcher.');
    expect(document.querySelector('.rappel q')!.textContent).toBe('Emmener mon père pêcher.');
    expect(document.querySelector('.rappel__amorce')).toBeNull();
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

  it('finit la phrase du rappel avec la case cochée', () => {
    render(<Questionnaire totalQuestions={483} />);
    fireEvent.click(screen.getByRole('button', { name: /Louer un bateau/ }));
    for (let k = 0; k < 6; k++) continuer();
    expect(document.querySelector('.rappel')!.textContent).toBe(
      'Tu passes ce permis pour louer un bateau cet été, sans demander à personne.',
    );
  });

  it('dit combien il en faudrait par jour quand le rythme ne suffit pas', () => {
    render(<Questionnaire totalQuestions={483} />);
    continuer();
    continuer();
    continuer();
    fireEvent.click(screen.getByRole('button', { name: /Tranquille/ }));
    continuer();
    fireEvent.change(screen.getByLabelText(/Date de l’examen/), { target: { value: jourPlus(aujourdhui(), 10) } });
    continuer();
    continuer();
    // Dix jours à dix questions : cent sur 483. Il en faudrait 49 par jour.
    expect(screen.getByText(/À 10 questions par jour/).textContent).toBe(
      'À 10 questions par jour, tu en verras 100 d’ici là. La banque en compte 483. Pour tout voir une fois, il en faudrait 49 par jour.',
    );
  });

  it('ne le dit pas quand le rythme suffit', () => {
    render(<Questionnaire totalQuestions={50} />);
    for (let k = 0; k < 3; k++) continuer();
    fireEvent.click(screen.getByRole('button', { name: /Tranquille/ }));
    continuer();
    fireEvent.change(screen.getByLabelText(/Date de l’examen/), { target: { value: jourPlus(aujourdhui(), 10) } });
    continuer();
    continuer();
    expect(screen.getByText(/À 10 questions par jour/).textContent).not.toContain('il en faudrait');
  });

  it('dit à quoi servent la raison, la phrase et la date', () => {
    render(<Questionnaire totalQuestions={483} />);
    expect(document.querySelector('.questionnaire__ecran > .discret')!.textContent).toBe(
      'Coche ce qui te ressemble. C’est la seule réponse qu’on te relira\u00a0: le jour où un examen blanc est recalé.',
    );
    continuer();
    expect(screen.getByText(/qui complète « Je passe ce permis pour… »\. Elle remplace la case cochée\./)).toBeTruthy();
    expect(screen.getByLabelText(/en une phrase/).getAttribute('placeholder')).toBe('emmener mon père pêcher au large, cet été');
    for (let k = 0; k < 3; k++) continuer();
    expect(screen.getByText('Elle sert à compter les jours et à répartir ce qui reste à voir. Laisse vide si tu ne sais pas encore.')).toBeTruthy();
  });
});
