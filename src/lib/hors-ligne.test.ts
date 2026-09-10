import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import {
  PAGES_A_LA_DEMANDE,
  MOTIF_RECHERCHE,
  GLOB_NOYAU,
  GLOB_HORS_NOYAU,
  MOTIF_A_LA_DEMANDE,
  IGNORER_PARAMETRES,
  reglesALaDemande,
  politique,
} from './hors-ligne';

const racine = new URL('../../', import.meta.url);
const pages = new URL('src/pages/', racine);

describe('politique', () => {
  it('garde le noyau de l’application hors ligne', () => {
    for (const chemin of ['/', '/examen', '/revoir', '/entrainement', '/profil', '/parametres']) {
      expect(politique(chemin), chemin).toBe('noyau');
    }
  });

  it('sert les quatorze écrans d’entraînement par thème à la demande', () => {
    // 214 Kio bruts pour quatorze pages dont un candidat en ouvre une ou deux.
    // Le sommaire `/entrainement` reste au noyau, lui : c'est la porte d'entrée.
    for (const theme of ['balisage', 'feux-marques', 'ecluses']) {
      expect(politique(`/entrainement/${theme}`), theme).toBe('a-la-demande');
    }
    expect(politique('/entrainement')).toBe('noyau');
  });

  it('sert l’index de la recherche à la demande, pas au précache', () => {
    // 276 Kio bruts, 12 % du précache, pour une loupe qui s'ouvre rarement à
    // la première visite. Elle vaut d'être attendue une fois.
    expect(politique('/recherche.json')).toBe('a-la-demande');
  });

  it('garde les visuels au noyau : les questions de la banque les affichent', () => {
    // Les 71 SVG de `/visuels/` sont les visuels des questions — la banque les
    // référence tous. Les sortir du précache rendrait /examen injouable hors
    // ligne au premier lancement, une question sur sept montrant une image
    // cassée. Ils pèsent 139 Kio bruts : c'est le prix de la promesse.
    expect(politique('/visuels/balisage/cardinale-nord.svg')).toBe('noyau');
  });

  it('sert les pages de contenu à la demande, pas au précache', () => {
    for (const chemin of [
      '/question/balisage-0001',
      '/notion/balisage-lateral',
      '/cours/balisage',
      '/cours/balisage/balisage-lateral',
      '/theme/balisage',
      '/guide/permis-cotier-prix',
    ]) {
      expect(politique(chemin), chemin).toBe('a-la-demande');
    }
  });

  it('ne confond pas l’index d’un dossier de contenu avec le dossier', () => {
    // `/cours` est une page racine, `cours.html` ; `/cours/balisage` est du
    // contenu. Le premier est le sommaire de l'application, il reste au noyau.
    expect(politique('/cours')).toBe('noyau');
    expect(politique('/guide')).toBe('noyau');
    expect(politique('/themes')).toBe('noyau');
  });

  it('laisse le pointeur de fraîcheur au réseau', () => {
    // `derniere.json` doit dire la vérité du jour : le cacher, c'est annoncer
    // une version périmée à une application qui l'interroge pour se mettre à jour.
    expect(politique('/banque/derniere.json')).toBe('reseau');
  });

  it('garde la banque versionnée au noyau : sans elle, /examen ne tire rien', () => {
    expect(politique('/banque/v/1.11.0.json')).toBe('noyau');
  });

  it('laisse au réseau ce qui ne sert pas l’écran', () => {
    for (const chemin of ['/robots.txt', '/sitemap-index.xml', '/partage/le-permis-cotier.png']) {
      expect(politique(chemin), chemin).toBe('reseau');
    }
  });
});

describe('MOTIF_A_LA_DEMANDE', () => {
  it('reconnaît une page de contenu servie par le site', () => {
    expect(MOTIF_A_LA_DEMANDE.test('https://lepermiscotier.fr/question/balisage-0001')).toBe(true);
  });

  it('ignore le noyau', () => {
    expect(MOTIF_A_LA_DEMANDE.test('https://lepermiscotier.fr/examen')).toBe(false);
  });

  it('ne peut pas attraper un tiers', () => {
    // Workbox n'applique une expression à une adresse d'un autre domaine que si
    // elle matche au premier caractère (`RegExpRoute`, `url.origin !== location.origin`).
    // Le motif commence par une barre : il ne peut pas matcher en position 0.
    const etranger = 'https://umami.morain.fr/question/x';
    expect(MOTIF_A_LA_DEMANDE.exec(etranger)?.index).not.toBe(0);
  });
});

describe('les globs et la politique disent la même chose', () => {
  it('exclut du précache chaque dossier servi à la demande', () => {
    for (const dossier of PAGES_A_LA_DEMANDE) {
      expect(GLOB_HORS_NOYAU, dossier).toContain(`${dossier}/**`);
    }
  });

  it('exclut l’index de la recherche', () => {
    expect(GLOB_HORS_NOYAU).toContain('recherche.json');
  });

  it('laisse les visuels au précache', () => {
    // Sans eux, une question sur sept est illisible hors ligne.
    expect(GLOB_HORS_NOYAU.join(' ')).not.toMatch(/visuels/);
  });

  it('exclut le pointeur de fraîcheur', () => {
    expect(GLOB_HORS_NOYAU).toContain('banque/derniere.json');
  });

  it('précache les types que l’application sert', () => {
    // La banque est du JSON : l'oublier viderait /examen hors ligne.
    expect(GLOB_NOYAU.join(' ')).toMatch(/json/);
    expect(GLOB_NOYAU.join(' ')).toMatch(/woff2/);
  });
});

describe('les dossiers écartés existent vraiment', () => {
  // Une exclusion qui ne désigne plus rien est pire qu'absente : elle se lit
  // comme une garde, et laisse repartir au précache les 16 Mo qu'elle écartait.
  const dossiersDePages = readdirSync(pages, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  it.each([...PAGES_A_LA_DEMANDE])('%s est bien un dossier de pages', (dossier) => {
    expect(dossiersDePages).toContain(dossier);
  });
});

describe('aucun écran ne sort du noyau par inadvertance', () => {
  // Les pages racine sont l'application : accueil, examen, entraînement,
  // fiche, réglages. Si l'une d'elles devenait « à la demande », elle
  // cesserait de s'ouvrir hors ligne sans qu'aucun test ne rougisse.
  const ecrans = readdirSync(pages, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.astro'))
    .map((e) => `/${e.name.replace(/\.astro$/, '').replace(/^index$/, '')}`);

  it('en trouve autant que de pages racine', () => {
    expect(ecrans.length).toBeGreaterThan(10);
  });

  it.each(ecrans)('%s reste au noyau', (chemin) => {
    expect(politique(chemin)).toBe('noyau');
  });
});

describe('reglesALaDemande', () => {
  const regles = reglesALaDemande('1.11.0');
  const pages = regles.find((r) => r.urlPattern === MOTIF_A_LA_DEMANDE);
  const recherche = regles.find((r) => r.urlPattern === MOTIF_RECHERCHE);

  it('a une règle pour les pages et une pour l’index de la recherche', () => {
    expect(pages).toBeDefined();
    expect(recherche).toBeDefined();
  });

  it('nomme ses caches avec la version, comme le précache', () => {
    for (const regle of regles) {
      expect(regle.options?.cacheName, regle.options?.cacheName).toContain('1.11.0');
    }
  });

  it('tente le réseau avant le cache, pour ne pas figer une page corrigée', () => {
    expect(pages?.handler).toBe('NetworkFirst');
  });

  it('sert l’index de la recherche depuis le cache et le rafraîchit derrière', () => {
    // La loupe doit s'ouvrir tout de suite à la deuxième visite ; un index
    // vieux d'une visite ne rate qu'une question publiée entre-temps.
    expect(recherche?.handler).toBe('StaleWhileRevalidate');
  });

  it('ne garde en cache qu’une réponse réellement servie', () => {
    for (const regle of regles) {
      expect(regle.options?.cacheableResponse?.statuses, regle.options?.cacheName).toEqual([200]);
    }
  });

  it('n’attrape aucun domaine tiers, quelle que soit la règle', () => {
    // Même garde que pour les pages : un motif qui commence par une barre ne
    // peut pas matcher en position 0, donc Workbox ne l'applique pas à un tiers.
    for (const regle of regles) {
      expect(regle.urlPattern.exec('https://umami.morain.fr/recherche.json')?.index).not.toBe(0);
      expect(regle.urlPattern.exec('https://umami.morain.fr/entrainement/balisage')?.index).not.toBe(0);
    }
  });
});

describe('MOTIF_RECHERCHE', () => {
  it('reconnaît l’index servi par le site', () => {
    expect(MOTIF_RECHERCHE.test('https://lepermiscotier.fr/recherche.json')).toBe(true);
  });

  it('ne prend pas la page de la loupe pour son index', () => {
    expect(MOTIF_RECHERCHE.test('https://lepermiscotier.fr/recherche')).toBe(false);
  });
});

describe('une adresse qui porte une requête reste elle-même', () => {
  // Régression vécue : `navigateFallback` rendait l'accueil pour toute
  // navigation que le précache ne retrouvait pas, et le précache ne retrouvait
  // pas une page dès qu'un paramètre s'ajoutait à son adresse. Le bouton de
  // signalement porté par chaque question, `/signaler?question=…`, ouvrait donc
  // l'accueil sous l'adresse du formulaire. Deux gardes valent mieux qu'une :
  // plus de repli, et les paramètres ignorés pour retrouver la page.

  it('ignore tous les paramètres, pas seulement ceux de campagne', () => {
    expect(IGNORER_PARAMETRES.some((m) => m.test('question'))).toBe(true);
    expect(IGNORER_PARAMETRES.some((m) => m.test('q'))).toBe(true);
    expect(IGNORER_PARAMETRES.some((m) => m.test('utm_source'))).toBe(true);
  });

  it('rend le même sort à une page avec et sans requête', () => {
    for (const [nu, avec] of [
      ['/signaler', '/signaler?question=balisage-0001'],
      ['/examen', '/examen?v=3'],
      ['/recherche', '/recherche?q=cardinale'],
      ['/', '/?utm_source=lettre'],
    ] as const) {
      expect(politique(avec), avec).toBe(politique(nu));
    }
  });

  it('vaut aussi pour le contenu servi à la demande', () => {
    expect(politique('/question/balisage-0001?ref=partage')).toBe('a-la-demande');
  });

  it('ne se laisse pas troubler par un fragment', () => {
    expect(politique('/parametres#mesure')).toBe('noyau');
  });
});
