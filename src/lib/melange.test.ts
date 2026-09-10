import { describe, it, expect } from 'vitest';
import {
  LETTRES_AFFICHEES,
  graineDeSession,
  lettreAffichee,
  melangerPropositions,
  rangDeLaTouche,
} from './melange';
import { corriger } from './quiz';
import type { QuestionJouable } from './quiz';

const quatre = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

describe('graine de session', () => {
  it('rend un entier 32 bits', () => {
    const g = graineDeSession(() => 0.5);
    expect(Number.isInteger(g)).toBe(true);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThan(2 ** 32);
  });

  it('change d’une session à l’autre', () => {
    const graines = new Set(Array.from({ length: 50 }, () => graineDeSession()));
    // Cinquante tirages sur quatre milliards : une collision serait un bogue.
    expect(graines.size).toBe(50);
  });
});

describe('mélange des propositions', () => {
  it('garde toutes les propositions, une seule fois chacune', () => {
    const melange = melangerPropositions(quatre, 12345, 'balisage-0001');
    expect(melange.map((p) => p.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ne touche pas au tableau d’origine', () => {
    const propositions = [...quatre];
    melangerPropositions(propositions, 999, 'balisage-0001');
    expect(propositions.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('rend le même ordre à graine et question égales', () => {
    const a = melangerPropositions(quatre, 4242, 'balisage-0001').map((p) => p.id);
    const b = melangerPropositions(quatre, 4242, 'balisage-0001').map((p) => p.id);
    expect(b).toEqual(a);
  });

  it('donne des ordres différents à deux sessions', () => {
    // Sur cent graines, une question de quatre propositions doit visiter
    // plusieurs des vingt-quatre ordres possibles.
    const ordres = new Set(
      Array.from({ length: 100 }, (_, g) => melangerPropositions(quatre, g, 'balisage-0001').map((p) => p.id).join()),
    );
    expect(ordres.size).toBeGreaterThan(10);
  });

  it('donne des ordres indépendants à deux questions de la même session', () => {
    const ordres = new Set(
      Array.from({ length: 40 }, (_, i) =>
        melangerPropositions(quatre, 7, `balisage-${String(i).padStart(4, "0")}`).map((p) => p.id).join(),
      ),
    );
    expect(ordres.size).toBeGreaterThan(10);
  });

  it('supporte les questions à trois propositions', () => {
    const trois = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const melange = melangerPropositions(trois, 3, 'balisage-0002');
    expect(melange.map((p) => p.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('place la bonne réponse à peu près partout sur deux mille sessions', () => {
    // Le cœur du défaut : la bonne réponse est en « a » dans le fichier. Si le
    // mélange dépendait mal de la graine, elle resterait collée à une position.
    const positions = [0, 0, 0, 0];
    for (let graine = 0; graine < 2000; graine++) {
      positions[melangerPropositions(quatre, graine, 'balisage-0001').findIndex((p) => p.id === 'a')]! += 1;
    }
    for (const compte of positions) {
      expect(compte).toBeGreaterThan(430);
      expect(compte).toBeLessThan(570);
    }
  });
});

describe('lettres affichées', () => {
  it('nomme les lignes dans l’ordre de l’écran, pas dans celui du fichier', () => {
    expect(LETTRES_AFFICHEES.slice(0, 4)).toEqual(['A', 'B', 'C', 'D']);
    expect(lettreAffichee(0)).toBe('A');
    expect(lettreAffichee(1)).toBe('B');
    expect(lettreAffichee(3)).toBe('D');
  });

  it('rend un repère lisible au-delà des lettres connues', () => {
    expect(lettreAffichee(9)).toBe('10');
  });

  it('traduit une touche du clavier en rang affiché', () => {
    expect(rangDeLaTouche('a')).toBe(0);
    expect(rangDeLaTouche('b')).toBe(1);
    expect(rangDeLaTouche('D')).toBe(3);
    expect(rangDeLaTouche('z')).toBeUndefined();
    expect(rangDeLaTouche('Enter')).toBeUndefined();
  });
});

describe('correction d’une question mélangée', () => {
  // La correction reste sur les identifiants du fichier : ce que l'écran
  // appelle « B » n'a rien à voir avec ce que `reponses` cite.
  const question: QuestionJouable = {
    id: 'balisage-0001',
    theme: 'balisage',
    reponses: ['a', 'c'],
    propositions: quatre,
  };

  it('accepte les bonnes propositions où qu’elles soient affichées', () => {
    for (let graine = 0; graine < 200; graine++) {
      const affichees = melangerPropositions(question.propositions, graine, question.id);
      const cochees = affichees.filter((p) => question.reponses.includes(p.id)).map((p) => p.id);
      expect(corriger(question, cochees)).toBe(true);
    }
  });

  it('refuse les deux premières lignes de l’écran, sauf quand elles sont les bonnes', () => {
    let justes = 0;
    for (let graine = 0; graine < 200; graine++) {
      const affichees = melangerPropositions(question.propositions, graine, question.id);
      if (corriger(question, affichees.slice(0, 2).map((p) => p.id))) justes += 1;
    }
    // Cocher les deux premières cases marchait pour 92 % des questions à double
    // réponse. Mélangées, une paire sur six sort en tête, à peu près.
    expect(justes).toBeLessThan(60);
  });
});
