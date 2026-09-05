import { describe, it, expect } from 'vitest';
import {
  GUIDE,
  pageGuide,
  autresPages,
  sourcesResolues,
  notionsDuGuide,
  guidesDeLaNotion,
  notionsCitees,
} from './guide';
import { NOTIONS } from './notions';
import { TITRE_MAX, titrePage } from './seo';

describe('table du guide', () => {
  it('donne un slug unique à chaque page', () => {
    const slugs = GUIDE.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('retrouve une page par son slug, et rien sinon', () => {
    expect(pageGuide('prix-du-permis-cotier')?.court).toBe('Ce que ça coûte');
    expect(pageGuide('inexistante')).toBeUndefined();
  });

  it('n’inscrit pas une page dans sa propre liste « le reste du guide »', () => {
    for (const p of GUIDE) {
      expect(autresPages(p.slug).map((a) => a.slug)).not.toContain(p.slug);
      expect(autresPages(p.slug)).toHaveLength(GUIDE.length - 1);
    }
  });

  it('tient dans la largeur affichée par Google, marque comprise', () => {
    for (const p of GUIDE) {
      expect(titrePage(p.titre).length, `titre de ${p.slug}`).toBeLessThanOrEqual(TITRE_MAX);
    }
  });
});

describe('sources citées', () => {
  it('résout l’URL Légifrance de chaque source depuis data/sources/', () => {
    // Trois des sept identifiants recopiés à la main étaient faux : ils sont
    // désormais lus dans le fichier extrait, et ce test le vérifie.
    for (const p of GUIDE) {
      const resolues = sourcesResolues(p);
      expect(resolues, `sources de ${p.slug}`).toHaveLength(p.sources.length);
      for (const s of resolues) {
        expect(s.url).toMatch(/^https:\/\/www\.legifrance\.gouv\.fr\//);
      }
    }
  });
});

describe('maillage entre le guide et le programme', () => {
  it('ne cite que des notions qui existent', () => {
    const connues = new Set(NOTIONS.map((n) => n.code));
    for (const code of notionsCitees()) {
      expect(connues.has(code), `notion « ${code} » citée par le guide`).toBe(true);
    }
  });

  it('se lit dans les deux sens', () => {
    for (const p of GUIDE) {
      for (const code of notionsDuGuide(p.slug)) {
        expect(guidesDeLaNotion(code).map((g) => g.slug)).toContain(p.slug);
      }
    }
  });

  it('ne renvoie rien pour une notion hors table', () => {
    expect(guidesDeLaNotion('balisage-lateral')).toEqual([]);
    expect(notionsDuGuide('inexistante')).toEqual([]);
  });
});
