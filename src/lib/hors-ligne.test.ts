import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import {
  CONTENU_A_LA_DEMANDE,
  GLOB_NOYAU,
  GLOB_HORS_NOYAU,
  MOTIF_A_LA_DEMANDE,
  HORS_REPLI_NAVIGATION,
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

  it('garde les écrans d’entraînement par thème, qui sont du jeu et non du contenu', () => {
    expect(politique('/entrainement/balisage')).toBe('noyau');
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
    for (const dossier of CONTENU_A_LA_DEMANDE) {
      expect(GLOB_HORS_NOYAU, dossier).toContain(`${dossier}/**`);
    }
  });

  it('exclut le pointeur de fraîcheur', () => {
    expect(GLOB_HORS_NOYAU).toContain('banque/derniere.json');
  });

  it('précache les types que l’application sert', () => {
    // La banque et l'index de recherche sont du JSON : les oublier viderait
    // /examen et la loupe hors ligne.
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

  it.each([...CONTENU_A_LA_DEMANDE])('%s est bien un dossier de pages', (dossier) => {
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

  it('nomme son cache avec la version, comme le précache', () => {
    expect(regles[0]?.options?.cacheName).toContain('1.11.0');
  });

  it('tente le réseau avant le cache, pour ne pas figer une page corrigée', () => {
    expect(regles[0]?.handler).toBe('NetworkFirst');
  });

  it('ne garde en cache qu’une réponse réellement servie', () => {
    expect(regles[0]?.options?.cacheableResponse?.statuses).toEqual([200]);
  });
});

describe('HORS_REPLI_NAVIGATION', () => {
  it('empêche le repli d’accueil de répondre à la place d’une page de contenu', () => {
    // Sans cette liste, une navigation hors ligne vers /question/x rendrait
    // l'accueil avec l'adresse de la question : une page qui ment.
    expect(HORS_REPLI_NAVIGATION.some((m) => m.test('/question/balisage-0001'))).toBe(true);
    expect(HORS_REPLI_NAVIGATION.some((m) => m.test('/examen'))).toBe(false);
  });
});
