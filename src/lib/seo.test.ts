import { describe, it, expect } from 'vitest';
import {
  SITE,
  TITRE_MAX,
  DESCRIPTION_MAX,
  titrePage,
  descriptionPage,
  quiz,
  filAriane,
  graphe,
  siteWeb,
  type QuestionBalisable,
  cheminServi,
  titreQuestion,
  couperAuMot,
  cours,
} from './seo';

const BASE = new URL('https://lepermiscotier.fr');

describe('titrePage', () => {
  it('ajoute le nom du site quand l’ensemble tient dans la fenêtre', () => {
    const titre = titrePage('Balisage');
    expect(titre).toBe(`Balisage — ${SITE.nom}`);
    expect(titre.length).toBeLessThanOrEqual(TITRE_MAX);
  });

  it('laisse le titre nu plutôt que de le faire couper', () => {
    // Assez long pour que le suffixe déborde, assez court pour être un titre.
    const long = 'Feux et marques des navires de moins de douze mètres la nuit';
    expect(long.length).toBeLessThan(TITRE_MAX);
    expect(long.length + ` — ${SITE.nom}`.length).toBeGreaterThan(TITRE_MAX);
    expect(titrePage(long)).toBe(long);
  });

  it('ne redit pas le nom du site quand le titre le porte déjà', () => {
    const titre = titrePage(`${SITE.nom} — révision`);
    expect(titre).toBe(`${SITE.nom} — révision`);
    expect(titre.split(SITE.nom)).toHaveLength(2);
  });

  it('rend le nom du site sur un titre vide ou blanc', () => {
    expect(titrePage('')).toBe(SITE.nom);
    expect(titrePage('   ')).toBe(SITE.nom);
  });
});

describe('descriptionPage', () => {
  it('laisse une description courte telle quelle', () => {
    const courte = 'Les quatorze thèmes du programme, avec leurs questions.';
    expect(descriptionPage(courte)).toBe(courte);
  });

  it('écrase les espaces multiples et les retours à la ligne', () => {
    expect(descriptionPage('  Deux\n  lignes   et   des blancs.  ')).toBe(
      'Deux lignes et des blancs.',
    );
  });

  it('coupe au mot et suffixe une ellipse au-delà de la limite', () => {
    const longue = 'balisage '.repeat(40);
    const coupee = descriptionPage(longue);
    expect(coupee.endsWith('…')).toBe(true);
    // Coupé au mot : le dernier mot conservé est entier.
    expect(coupee.slice(0, -1)).toMatch(/balisage$/);
  });

  it('ne dépasse jamais la limite, ellipse comprise', () => {
    const mots = ['a', 'antisalissures', 'écluse', 'mètres', 'réglementation'];
    for (let n = 1; n < 60; n += 1) {
      const texte = Array.from({ length: n }, (_, i) => mots[i % mots.length]).join(' ');
      expect(descriptionPage(texte).length).toBeLessThanOrEqual(DESCRIPTION_MAX + 1);
    }
  });
});

describe('quiz', () => {
  const question = (reponses: string[]): QuestionBalisable => ({
    id: 'balisage-0007',
    enonce: 'Que signale une marque cardinale Sud ?',
    explication: 'Le danger est au nord de la marque : on passe au sud.',
    propositions: [
      { id: 'a', texte: 'On passe au sud de la marque.' },
      { id: 'b', texte: 'On passe au nord de la marque.' },
      { id: 'c', texte: 'On passe à l’est de la marque.' },
      { id: 'd', texte: 'On passe à l’ouest de la marque.' },
    ],
    reponses,
    theme: 'balisage',
  });

  /** Le nœud `Question` porté par le `Quiz`, là où vivent les réponses. */
  const partie = (reponses: string[]) =>
    quiz(question(reponses), 'Balisage', BASE).hasPart as Record<string, unknown>;

  it('rend un seul `acceptedAnswer`, objet, pour une question à une bonne réponse', () => {
    const p = partie(['a']);
    expect(Array.isArray(p.acceptedAnswer)).toBe(false);
    expect(p.acceptedAnswer).toMatchObject({
      '@type': 'Answer',
      text: 'On passe au sud de la marque.',
    });
  });

  it('rend deux `acceptedAnswer` en tableau pour une question à deux bonnes réponses', () => {
    const p = partie(['a', 'c']);
    expect(Array.isArray(p.acceptedAnswer)).toBe(true);
    const justes = p.acceptedAnswer as { text: string }[];
    expect(justes).toHaveLength(2);
    expect(justes.map((r) => r.text)).toEqual([
      'On passe au sud de la marque.',
      'On passe à l’est de la marque.',
    ]);
  });

  it('range toutes les mauvaises propositions, et elles seules, en `suggestedAnswer`', () => {
    const p = partie(['a', 'c']);
    const fausses = p.suggestedAnswer as { text: string }[];
    expect(fausses.map((r) => r.text)).toEqual([
      'On passe au nord de la marque.',
      'On passe à l’ouest de la marque.',
    ]);
  });

  it('ne perd ni ne double aucune proposition, quel que soit le nombre de bonnes réponses', () => {
    for (const reponses of [['a'], ['b', 'd'], ['a', 'b', 'c', 'd']]) {
      const p = partie(reponses);
      const justes = Array.isArray(p.acceptedAnswer) ? p.acceptedAnswer.length : 1;
      const fausses = (p.suggestedAnswer as unknown[]).length;
      expect(justes + fausses).toBe(4);
    }
  });

  it('porte l’explication une fois, sur la première bonne réponse', () => {
    const justes = partie(['a', 'c']).acceptedAnswer as { comment?: unknown }[];
    expect(justes[0]?.comment).toBeDefined();
    expect(justes[1]?.comment).toBeUndefined();
  });
});

describe('filAriane', () => {
  const miettes = [
    { nom: 'Accueil', chemin: '/' },
    { nom: 'Thèmes', chemin: '/themes' },
    { nom: 'Balisage', chemin: '/theme/balisage' },
  ];

  it('numérote les positions à partir de 1, dans l’ordre donné', () => {
    const items = filAriane(miettes, BASE).itemListElement as { position: number; name: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items.map((i) => i.name)).toEqual(['Accueil', 'Thèmes', 'Balisage']);
  });

  it('rend des URL absolues sur la base fournie', () => {
    const items = filAriane(miettes, BASE).itemListElement as { item: string }[];
    expect(items.map((i) => i.item)).toEqual([
      'https://lepermiscotier.fr/',
      'https://lepermiscotier.fr/themes',
      'https://lepermiscotier.fr/theme/balisage',
    ]);
  });

  it('suit la base d’une préversion, sans jamais renvoyer vers le domaine', () => {
    const apercu = new URL('https://permis-cotier.alexis-c1f.workers.dev');
    const items = filAriane(miettes, apercu).itemListElement as { item: string }[];
    for (const i of items) expect(i.item.startsWith(apercu.origin)).toBe(true);
  });
});

describe('graphe', () => {
  it('rend un JSON valide, avec son contexte et tous ses nœuds', () => {
    const noeuds = [siteWeb(BASE), filAriane([{ nom: 'Accueil', chemin: '/' }], BASE)];
    const analyse = JSON.parse(graphe(noeuds));
    expect(analyse['@context']).toBe('https://schema.org');
    expect(analyse['@graph']).toHaveLength(2);
    expect(analyse['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual([
      'WebSite',
      'BreadcrumbList',
    ]);
  });

  it('rend un graphe vide plutôt que rien, sur une page qui ne balise pas', () => {
    expect(JSON.parse(graphe([]))['@graph']).toEqual([]);
  });
});

describe('cheminServi', () => {
  it('retire l’extension .html que le build « file » ajoute', () => {
    expect(cheminServi('/notion/balisage-cardinal.html')).toBe('/notion/balisage-cardinal');
  });

  it('ramène la page d’accueil à la racine', () => {
    expect(cheminServi('/index.html')).toBe('/');
    expect(cheminServi('/')).toBe('/');
  });

  it('laisse un chemin déjà servi tel quel', () => {
    expect(cheminServi('/guide/prix-du-permis-cotier')).toBe('/guide/prix-du-permis-cotier');
  });

  it('ne laisse pas de barre finale, le site est en trailingSlash never', () => {
    expect(cheminServi('/themes/')).toBe('/themes');
  });

  it('rend le même chemin que celui annoncé au sitemap', () => {
    // Le sitemap écrit /theme/balisage ; la canonique doit dire la même chose,
    // sans quoi une page a deux adresses.
    expect(cheminServi('/theme/balisage.html')).toBe('/theme/balisage');
  });
});

describe('titreQuestion', () => {
  const enonce =
    'Tu relèves cette marque en approchant du chenal. De quel côté la contournes-tu ?';

  it('garde l’énoncé entier : c’est lui qui rend la page unique', () => {
    expect(titreQuestion(enonce)).toBe(enonce);
  });

  it('sépare deux questions au même énoncé par le texte de leur visuel', () => {
    const nord = titreQuestion(enonce, 'marque cardinale Nord');
    const sud = titreQuestion(enonce, 'marque cardinale Sud');
    expect(nord).not.toBe(sud);
    expect(nord.startsWith(enonce)).toBe(true);
  });

  it('n’ajoute pas le discriminant quand l’énoncé le contient déjà', () => {
    expect(titreQuestion('Que montre la marque cardinale Nord ?', 'marque cardinale Nord')).toBe(
      'Que montre la marque cardinale Nord ?',
    );
  });

  it('écrase les espaces multiples des énoncés repliés en YAML', () => {
    expect(titreQuestion('Deux  lignes\n  repliées')).toBe('Deux lignes repliées');
  });
});

describe('couperAuMot', () => {
  it('garde l’ellipse dans la limite au lieu de l’y ajouter', () => {
    const texte = 'a'.repeat(50) + ' ' + 'b'.repeat(50);
    expect(couperAuMot(texte, 60).length).toBeLessThanOrEqual(60);
  });

  it('ne coupe jamais au milieu d’un mot', () => {
    const source = 'Quelles sont la couleur et la forme de cette marque';
    const coupe = couperAuMot(source, 24).replace(/…$/, '');
    // Ce qui reste est un préfixe de la source, arrêté sur une frontière de mot.
    expect(source.startsWith(coupe)).toBe(true);
    expect(source[coupe.length]).toBe(' ');
  });
});

describe('cours', () => {
  const noeud = cours(
    {
      code: 'balisage',
      titre: 'Lire le balisage',
      promesse: 'Reconnaître chaque bouée.',
      theme: 'Balisage',
      minutes: 37,
      lecons: [
        { nom: 'Marques latérales', chemin: '/cours/balisage/balisage-lateral', ecrite: true },
        { nom: 'Pictogrammes', chemin: '/cours/balisage/balisage-pictogrammes', ecrite: false },
      ],
    },
    BASE,
  );

  it('est un Course gratuit, en ligne, à son rythme, avec sa charge de travail', () => {
    expect(noeud).toMatchObject({
      '@type': 'Course',
      '@id': 'https://lepermiscotier.fr/cours/balisage#cours',
      name: 'Lire le balisage',
      description: 'Reconnaître chaque bouée.',
      url: 'https://lepermiscotier.fr/cours/balisage',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR', category: 'Free' },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: 'PT37M' },
    });
  });

  it('ne liste que les leçons écrites : une leçon courte n’est pas indexée', () => {
    const parties = noeud.hasPart as { name: string; url: string }[];
    expect(parties.map((p) => p.name)).toEqual(['Marques latérales']);
    expect(parties[0]!.url).toBe('https://lepermiscotier.fr/cours/balisage/balisage-lateral');
  });

  it('cite l’auteur comme fournisseur et rattache le cours au site', () => {
    expect(noeud.provider).toMatchObject({ '@id': 'https://lepermiscotier.fr/a-propos#auteur' });
    expect(noeud.isPartOf).toEqual({ '@id': 'https://lepermiscotier.fr/#site' });
  });
});
