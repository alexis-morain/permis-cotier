/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Lecon, { ecransDe } from './Lecon';
import type { LeconAffichable } from '../lib/cours';
import type { QuestionAffichable } from '../lib/banque';
import { charger } from '../lib/progression';

function question(id: string, reponses = ['a']): QuestionAffichable {
  return {
    id,
    theme: 'balisage',
    notion: 'balisage-lateral',
    reponses,
    enonce: `Énoncé de ${id}`,
    explication: `Explication de ${id}`,
    difficulte: 1,
    propositions: [
      { id: 'a', texte: 'Première' },
      { id: 'b', texte: 'Deuxième' },
      { id: 'c', texte: 'Troisième' },
    ],
    sources: [{ texte: 'Balisage AISM', ref: 'aism-mbs' }],
  };
}

const ecrite: LeconAffichable = {
  code: 'balisage-lateral',
  nom: 'Marques latérales',
  courte: false,
  duree: 3,
  accroche: 'Tu rentres au port en venant du large.',
  etapes: [
    { titre: 'Le sens conventionnel', paragraphes: ['Du large vers le port.', 'En sortant, tout s’inverse.'] },
    { titre: 'Bâbord', paragraphes: ['Rouge et cylindrique.'], visuel: 'balisage/laterale-babord.svg', alt: 'Une bouée rouge.' },
  ],
  piege: 'En sortant, la rouge est à droite.',
  retenir: ['Rouge à bâbord.', 'Vert à tribord.'],
  sources: [
    { texte: 'Balisage AISM, région A', ref: 'aism-mbs', provenance: 'fiche', url: '/source/aism-mbs' },
  ],
  questions: [question('balisage-0001'), question('balisage-0002', ['b'])],
};

const courte: LeconAffichable = {
  code: 'signaux-portuaires',
  nom: 'Signaux portuaires',
  courte: true,
  duree: 1,
  etapes: [{ titre: 'Signaux portuaires', paragraphes: ['Le résumé de la notion.'] }],
  retenir: [],
  sources: [],
  questions: [],
};

const cadre = {
  cours: { code: 'balisage', titre: 'Lire le balisage', chemin: '/cours/balisage' },
  rang: 1,
  total: 12,
  suite: { type: 'lecon' as const, chemin: '/cours/balisage/balisage-chenal-prefere', nom: 'Chenal préféré' },
};

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('les écrans d’une leçon', () => {
  it('enchaînent accroche, étapes, piège, mémo, vérification, fin', () => {
    expect(ecransDe(ecrite).map((e) => e.type)).toEqual([
      'accroche', 'etape', 'etape', 'piege', 'retenir', 'verification', 'fin',
    ]);
  });

  it('se réduisent au résumé et à la fin pour une leçon courte sans question', () => {
    expect(ecransDe(courte).map((e) => e.type)).toEqual(['etape', 'fin']);
  });
});

describe('l’écran de leçon', () => {
  it('rend tout le texte dans le HTML, l’écran courant marqué', () => {
    render(<Lecon lecon={ecrite} {...cadre} />);
    expect(screen.getByText('Tu rentres au port en venant du large.')).toBeTruthy();
    expect(screen.getByText('Du large vers le port.')).toBeTruthy();
    expect(screen.getByText('Rouge à bâbord.')).toBeTruthy();
    expect(document.querySelectorAll('.ecran--courant')).toHaveLength(1);
    expect(document.querySelector('.ecran--courant')?.classList.contains('ecran--accroche')).toBe(true);
  });

  it('avance d’un écran à la fois avec « Continuer »', () => {
    render(<Lecon lecon={ecrite} {...cadre} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(document.querySelector('.ecran--courant')?.classList.contains('ecran--etape')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Revenir' }));
    expect(document.querySelector('.ecran--courant')?.classList.contains('ecran--accroche')).toBe(true);
  });

  it('annonce la vérification sur le bouton du dernier écran de contenu', () => {
    render(<Lecon lecon={ecrite} {...cadre} />);
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('button', { name: 'Vérifier ce que j’ai retenu' })).toBeTruthy();
  });

  it('corrige chaque question, compte le score et marque la leçon faite', () => {
    render(<Lecon lecon={ecrite} {...cadre} />);
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier ce que j’ai retenu' }));

    expect(screen.getByText('Énoncé de balisage-0001')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Première/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(screen.getByText('Bonne réponse')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Question suivante' }));

    expect(screen.getByText('Énoncé de balisage-0002')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Première/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(screen.getByText('Raté')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));

    expect(screen.getByText('Leçon faite')).toBeTruthy();
    expect(screen.getByText(/à la vérification/).textContent).toContain('1 sur 2');
    expect(screen.getByRole('link', { name: /Leçon suivante/ }).getAttribute('href')).toBe('/cours/balisage/balisage-chenal-prefere');

    const etat = charger();
    expect(etat.lecons['balisage-lateral']).toMatchObject({ bonnes: 1, total: 2 });
    expect(etat.questions['balisage-0001']?.derniereReussie).toBe(true);
    expect(etat.questions['balisage-0002']?.derniereReussie).toBe(false);
  });

  it('termine une leçon courte sans question, marquée faite à zéro sur zéro', () => {
    render(<Lecon lecon={courte} {...cadre} suite={undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    expect(screen.getByText('Leçon faite')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Retour au cours' })).toBeTruthy();
    expect(charger().lecons['signaux-portuaires']).toMatchObject({ bonnes: 0, total: 0 });
  });

  it('tend le cours suivant après la dernière leçon d’un cours', () => {
    render(<Lecon lecon={courte} {...cadre} suite={{ type: 'cours', chemin: '/cours/barre-route', titre: 'Se croiser sans se toucher' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    expect(screen.getByText(/dernière leçon de « Lire le balisage »/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cours suivant : Se croiser sans se toucher' }).getAttribute('href')).toBe('/cours/barre-route');
  });

  it('bascule en lecture continue et revient au pas à pas', () => {
    render(<Lecon lecon={ecrite} {...cadre} />);
    const racine = document.querySelector('.lecon')!;
    expect(racine.classList.contains('lecon--pas-a-pas')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Tout lire d’une traite' }));
    expect(racine.classList.contains('lecon--pas-a-pas')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre pas à pas' }));
    expect(racine.classList.contains('lecon--pas-a-pas')).toBe(true);
  });
});

describe('la lecture continue', () => {
  it('ne montre ni « Leçon faite » ni le bouton de suite avant la fin', () => {
    render(<Lecon lecon={ecrite} {...cadre} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tout lire d’une traite' }));
    expect(screen.queryByText('Leçon faite')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continuer' })).toBeNull();
    expect(screen.getByText('Énoncé de balisage-0001')).toBeTruthy();
  });

  it('donne un bouton pour finir une leçon sans question', () => {
    render(<Lecon lecon={courte} {...cadre} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tout lire d’une traite' }));
    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    expect(screen.getByText('Leçon faite')).toBeTruthy();
    expect(charger().lecons['signaux-portuaires']).toBeTruthy();
  });
});

describe('mélange des propositions de la vérification', () => {
  const verification = () => {
    render(<Lecon lecon={ecrite} {...cadre} />);
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier ce que j’ai retenu' }));
  };
  const lignes = () => [...document.querySelectorAll<HTMLElement>('.propositions .proposition')];
  const textes = () => lignes().map((n) => n.children[1]?.textContent ?? '');

  it('nomme les lignes dans l’ordre de l’écran', () => {
    verification();
    expect(lignes().map((n) => n.querySelector('.proposition__lettre')?.textContent)).toEqual([
      'A', 'B', 'C',
    ]);
  });

  it('ne déplace pas les propositions quand on coche et qu’on corrige', () => {
    verification();
    const depart = textes();
    fireEvent.click(lignes()[0]!);
    expect(textes()).toEqual(depart);
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(textes()).toEqual(depart);
  });

  // Douze montages successifs de la leçon entière : sous `--coverage`, chacun
  // coûte près d'une seconde et le délai par défaut de cinq secondes tombe.
  // La boucle reste longue à dessein — avec trois propositions, deux tirages
  // se ressemblent une fois sur six, et il faut plusieurs tours pour que
  // l'échec soit une vraie information et non un coup de dé.
  it('change d’ordre d’une leçon à l’autre', () => {
    const ordres = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      verification();
      ordres.add(textes().join('|'));
      cleanup();
    }
    expect(ordres.size).toBeGreaterThan(1);
  }, 30_000);
});

describe('le retour vers la série', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('ramène là d’où l’on vient, en tête et à la fin', () => {
    window.history.replaceState({}, '', '/cours/balisage/balisage-lateral?retour=%2Frevoir');
    render(<Lecon lecon={courte} {...cadre} />);

    const enTete = screen.getByRole('link', { name: 'Revenir à ta série du jour' });
    expect(enTete.getAttribute('href')).toBe('/revoir');

    fireEvent.click(screen.getByRole('button', { name: 'Terminer la leçon' }));
    expect(screen.getAllByRole('link', { name: 'Revenir à ta série du jour' }).length).toBe(2);
  });

  it('ne propose rien quand l’adresse ne dit pas d’où l’on vient', () => {
    render(<Lecon lecon={courte} {...cadre} />);
    expect(screen.queryByRole('link', { name: /Revenir/ })).toBeNull();
  });

  it('ne suit pas une adresse qui n’est pas du site', () => {
    window.history.replaceState({}, '', '/cours/balisage/balisage-lateral?retour=https%3A%2F%2Fexemple.fr');
    render(<Lecon lecon={courte} {...cadre} />);
    expect(screen.queryByRole('link', { name: /Revenir/ })).toBeNull();
  });

  it('renvoie sur les questions de la notion, pas sur tout le thème', () => {
    render(<Lecon lecon={ecrite} {...cadre} />);
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier ce que j’ai retenu' }));
    for (let i = 0; i < 2; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Première/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
      fireEvent.click(screen.getByRole('button', { name: /Question suivante|Terminer la leçon/ }));
    }
    const lien = screen.getByRole('link', { name: /S’entraîner sur cette notion/ });
    expect(lien.getAttribute('href')).toBe('/entrainement/notion/balisage-lateral');
  });
});
