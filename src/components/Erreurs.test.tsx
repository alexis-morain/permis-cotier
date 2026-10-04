/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Erreurs from './Erreurs';
import type { QuestionAffichable } from '../lib/banque';
import { charger, sauvegarder, enregistrerReponse, etatInitial } from '../lib/progression';

function question(id: string, notion: string, reponses = ['a']): QuestionAffichable {
  return {
    id,
    theme: 'balisage',
    notion,
    reponses,
    enonce: `Énoncé de ${id}`,
    explication: `Explication de ${id}`,
    difficulte: 2,
    propositions: [
      { id: 'a', texte: 'La bonne, celle-là' },
      { id: 'b', texte: 'La mauvaise' },
    ],
    sources: [{ texte: 'Balisage AISM', ref: 'aism-mbs' }],
  };
}

const banque = [
  question('balisage-0001', 'balisage-lateral'),
  question('balisage-0002', 'balisage-cardinal'),
  question('balisage-0003', 'balisage-lateral'),
];

const jour = '2026-09-10';

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('mes erreurs', () => {
  it('dit ce qui est dû, le plus en retard d’abord, avec la réponse et la leçon', () => {
    let e = enregistrerReponse(etatInitial(), 'balisage-0001', false, '2026-09-05');
    e = enregistrerReponse(e, 'balisage-0002', false, '2026-09-09');
    sauvegarder(e);
    render(<Erreurs questions={banque} jour={jour} />);

    const dues = [...document.querySelectorAll('.erreur')].map((n) => n.querySelector('h3')?.textContent);
    expect(dues.slice(0, 2)).toEqual(['Énoncé de balisage-0001', 'Énoncé de balisage-0002']);

    const premiere = document.querySelector('.erreur')!;
    expect(premiere.textContent).toContain('La bonne, celle-là');
    expect(premiere.textContent).toContain('Explication de balisage-0001');
    expect(premiere.querySelector('a')?.getAttribute('href')).toBe(
      '/cours/balisage/balisage-lateral?retour=%2Fprofil%2Ferreurs',
    );
  });

  it('sépare ce qui est dû de ce qui a été raté et n’est pas encore revenu', () => {
    // Ratée le 5, réussie le 9 : elle ne revient que le 10... mais elle a été
    // ratée, et la page doit pouvoir la relire sans la rejouer.
    let e = enregistrerReponse(etatInitial(), 'balisage-0003', false, '2026-09-05');
    e = enregistrerReponse(e, 'balisage-0003', true, '2026-09-09');
    sauvegarder(e);
    render(<Erreurs questions={banque} jour="2026-09-09" />);

    expect(screen.queryByText('Rien à revoir, rien de raté.')).toBeNull();
    const section = document.querySelector('.erreurs__ratees')!;
    expect(section.textContent).toContain('Énoncé de balisage-0003');
    expect(document.querySelector('.erreurs__dues')).toBeNull();
  });

  it('écrit les deux bonnes réponses en liste, sans tiret, et le rang sous le titre', () => {
    const double = { ...question('balisage-0004', 'balisage-cardinal', ['a', 'b']), propositions: [
      { id: 'a', texte: 'Six scintillements' },
      { id: 'b', texte: 'Un éclat long' },
      { id: 'c', texte: 'Rien de tout ça' },
    ] };
    sauvegarder(enregistrerReponse(etatInitial(), 'balisage-0004', false, '2026-09-05'));
    render(<Erreurs questions={[...banque, double]} jour={jour} />);
    const item = document.querySelector('.erreur')!;
    expect(item.textContent).toContain('Les deux bonnes réponses');
    expect([...item.querySelectorAll('.erreur__bonnes li')].map((n) => n.textContent)).toEqual(['Six scintillements', 'Un éclat long']);
    expect(item.textContent).not.toContain('—');
    // Le thème et le compte de ratés ne coiffent pas l'énoncé : un sur-titre
    // est ce que DESIGN.md refuse, et un lecteur d'écran qui va de titre en
    // titre le sautait.
    const titre = item.querySelector('h3')!;
    expect(titre.compareDocumentPosition(item.querySelector('.erreur__rang')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('ne dit rien de faux quand rien n’a été joué', () => {
    render(<Erreurs questions={banque} jour={jour} />);
    expect(screen.getByText('Rien à revoir, rien de raté.')).toBeTruthy();
    expect(charger()).toEqual(etatInitial());
  });
});
