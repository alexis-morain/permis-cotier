import { describe, it, expect } from 'vitest';
import {
  normaliser,
  motsDeLaRequete,
  preparer,
  chercher,
  passages,
  termeMesurable,
  MAX_QUESTIONS,
  LONGUEUR_TERME_MAX,
  type Entree,
} from './recherche';

const INDEX: Entree[] = [
  {
    genre: 'notion',
    titre: 'Marques latérales',
    contexte: 'Balisage',
    resume:
      'En région A, la marque bâbord est rouge et cylindrique, la marque tribord verte et conique.',
    url: '/notion/balisage-lateral',
  },
  {
    genre: 'notion',
    titre: 'Marques cardinales',
    contexte: 'Balisage',
    resume: 'Quatre marques noires et jaunes, distinguées par leur voyant.',
    url: '/notion/balisage-cardinal',
  },
  {
    genre: 'lecon',
    titre: 'Marques cardinales',
    contexte: 'Lire le balisage',
    resume: 'Quatre marques noires et jaunes, distinguées par leur voyant.',
    url: '/cours/balisage-cardinal',
    mots: 'nord est sud ouest voyant cônes couleur',
  },
  {
    genre: 'theme',
    titre: 'Feux et marques',
    resume: 'Les feux de navigation et les marques de jour.',
    url: '/theme/feux-marques',
  },
  {
    genre: 'question',
    titre: 'De quelle couleur est le feu de bâbord ?',
    contexte: 'Feux et marques',
    url: '/question/feux-0001',
  },
  {
    genre: 'guide',
    titre: 'Le balisage en région B',
    resume: 'Les cardinales ne changent pas en région B, les latérales si.',
    url: '/guide/region-b',
  },
  ...Array.from({ length: 9 }, (_, i) => ({
    genre: 'question' as const,
    titre: `De quelle couleur est la marque cardinale numéro ${i + 1} ?`,
    contexte: 'Balisage',
    url: `/question/balisage-000${i + 1}`,
  })),
];

describe('normaliser', () => {
  it('aplatit la casse, les accents et la ponctuation', () => {
    expect(normaliser('Marques Cardinales')).toBe('marques cardinales');
    expect(normaliser('bâbord, à côté')).toBe('babord a cote');
    expect(normaliser('l’écluse')).toBe('l ecluse');
  });

  it('réduit les espaces et rend une chaîne bordée de rien', () => {
    expect(normaliser('  feu   vert  ')).toBe('feu vert');
    expect(normaliser('')).toBe('');
  });

  it('garde les chiffres, qui servent à chercher un canal ou un article', () => {
    expect(normaliser('canal 16')).toBe('canal 16');
  });
});

describe('motsDeLaRequete', () => {
  it('découpe la requête en mots normalisés', () => {
    expect(motsDeLaRequete('Feux de Bâbord')).toEqual(['feux', 'babord']);
  });

  it('jette les mots vides quand il reste autre chose', () => {
    expect(motsDeLaRequete('le feu de la marque')).toEqual(['feu', 'marque']);
  });

  it('garde le mot vide quand la requête n’est que cela', () => {
    expect(motsDeLaRequete('les')).toEqual(['les']);
  });

  it('ne rend rien sur une requête vide', () => {
    expect(motsDeLaRequete('   ')).toEqual([]);
  });
});

describe('chercher', () => {
  const prete = preparer(INDEX);

  it('ne rend rien tant que rien n’est tapé', () => {
    expect(chercher(prete, '')).toEqual([]);
    expect(chercher(prete, '  ')).toEqual([]);
  });

  it('trouve par le titre, accents ou non', () => {
    expect(chercher(prete, 'cardinales')[0]?.entree.url).toBe('/cours/balisage-cardinal');
    expect(chercher(prete, 'laterales')[0]?.entree.url).toBe('/notion/balisage-lateral');
  });

  it('trouve sur un début de mot, dès la troisième lettre', () => {
    expect(chercher(prete, 'card')[0]?.entree.titre).toBe('Marques cardinales');
  });

  it('fait passer le titre avant le résumé', () => {
    // La leçon porte « cardinales » dans son titre, le guide seulement dans
    // son résumé : à genre proche, c'est le titre qui décide.
    const urls = chercher(prete, 'cardinales').map((r) => r.entree.url);
    expect(urls.indexOf('/cours/balisage-cardinal')).toBeLessThan(urls.indexOf('/guide/region-b'));
  });

  it('exige que tous les mots de la requête portent, sur la même entrée', () => {
    expect(chercher(prete, 'marques introuvable')).toEqual([]);
    // « voyant » et « bâbord » existent tous les deux dans l'index, mais
    // jamais ensemble : deux mots réduisent, ils n'additionnent pas.
    expect(chercher(prete, 'voyant babord')).toEqual([]);
    expect(chercher(prete, 'marques voyant').map((r) => r.entree.url)).toEqual([
      '/cours/balisage-cardinal',
      '/notion/balisage-cardinal',
    ]);
  });

  it('cherche aussi dans les mots cachés de l’entrée', () => {
    expect(chercher(prete, 'voyant')[0]?.entree.url).toBe('/cours/balisage-cardinal');
  });

  it('rapproche le singulier du pluriel', () => {
    expect(chercher(prete, 'feux').some((r) => r.entree.url === '/question/feux-0001')).toBe(true);
    expect(chercher(prete, 'marque').some((r) => r.entree.url === '/theme/feux-marques')).toBe(true);
  });

  it('range la leçon avant la question à pertinence égale', () => {
    const genres = chercher(prete, 'feux').map((r) => r.entree.genre);
    expect(genres.indexOf('theme')).toBeLessThan(genres.indexOf('question'));
  });

  it('fait passer de quoi réviser devant les questions qui portent le même mot', () => {
    // « cardinale » tombe pile dans l'énoncé des questions et seulement au
    // début du mot dans les titres : sans le poids du genre, la banque
    // enterrerait la leçon qu'on cherche.
    const genres = chercher(prete, 'cardinale').map((r) => r.entree.genre);
    expect(genres.slice(0, 2)).toEqual(['lecon', 'notion']);
  });

  it('ne pèse pas l’énoncé d’une question comme un titre', () => {
    // « couleur » est dans le corps de la leçon et dans l'énoncé des
    // questions. L'énoncé n'est pas un titre : c'est la leçon qui passe
    // devant, sinon quatre cents énoncés enterreraient ce qui les explique.
    const resultats = chercher(prete, 'couleur');
    expect(resultats[0]?.entree.genre).toBe('lecon');
    expect(resultats.some((r) => r.entree.genre === 'question')).toBe(true);
  });

  it('ne laisse pas les questions occuper toute la liste', () => {
    const questions = chercher(prete, 'cardinale').filter((r) => r.entree.genre === 'question');
    expect(questions.length).toBeLessThanOrEqual(MAX_QUESTIONS);
  });

  it('rend toute la liste quand il n’y a que des questions', () => {
    const resultats = chercher(prete, 'numero');
    expect(resultats.length).toBeGreaterThan(MAX_QUESTIONS);
    expect(resultats.every((r) => r.entree.genre === 'question')).toBe(true);
  });

  it('s’arrête à la limite demandée', () => {
    expect(chercher(prete, 'marques', 1)).toHaveLength(1);
  });
});

describe('passages', () => {
  it('découpe le titre en morceaux, les trouvés marqués', () => {
    expect(passages('Marques cardinales', ['card'])).toEqual([
      { texte: 'Marques ', trouve: false },
      { texte: 'card', trouve: true },
      { texte: 'inales', trouve: false },
    ]);
  });

  it('trouve malgré les accents, et rend le texte d’origine', () => {
    expect(passages('Marques latérales', ['later'])).toEqual([
      { texte: 'Marques ', trouve: false },
      { texte: 'latér', trouve: true },
      { texte: 'ales', trouve: false },
    ]);
  });

  it('rend le texte entier quand rien ne porte', () => {
    expect(passages('Marques', ['feu'])).toEqual([{ texte: 'Marques', trouve: false }]);
  });
});

describe('termeMesurable', () => {
  it('rend le terme mis à plat, casse et accents en moins', () => {
    expect(termeMesurable('Marée')).toBe('maree');
    expect(termeMesurable('  Feu   VERT ')).toBe('feu vert');
  });

  it('garde la faute de frappe, qui est le signal le plus utile', () => {
    expect(termeMesurable('cardinalle')).toBe('cardinalle');
  });

  it('ne compte pas ce qui est trop court pour être une recherche', () => {
    expect(termeMesurable('')).toBeNull();
    expect(termeMesurable('  ')).toBeNull();
    expect(termeMesurable('fe')).toBeNull();
  });

  it('ne compte pas un collage plus long qu’une recherche', () => {
    expect(termeMesurable('a'.repeat(LONGUEUR_TERME_MAX + 1))).toBeNull();
    expect(termeMesurable('a'.repeat(LONGUEUR_TERME_MAX))).not.toBeNull();
  });

  it('ne compte rien de ce qui ressemble à une donnée personnelle', () => {
    // Un champ libre finit toujours par recevoir autre chose qu'une
    // recherche. Ce site promet de ne rien savoir de personne : le doute
    // suffit à ne pas envoyer.
    expect(termeMesurable('alexis@morain.fr')).toBeNull();
    expect(termeMesurable('https://exemple.fr/page')).toBeNull();
    expect(termeMesurable('www.exemple.fr')).toBeNull();
    expect(termeMesurable('0612345678')).toBeNull();
    expect(termeMesurable('permis n° 1234567')).toBeNull();
  });

  it('laisse passer les chiffres du programme', () => {
    expect(termeMesurable('canal 16')).toBe('canal 16');
    expect(termeMesurable('arrêté du 28 septembre 2007')).toBe('arrete du 28 septembre 2007');
    expect(termeMesurable('règle 13')).toBe('regle 13');
  });
});
