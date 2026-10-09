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

  it('tient les deux pages du lot F : le CPF et le candidat libre', () => {
    expect(pageGuide('permis-cotier-cpf')).toBeDefined();
    expect(pageGuide('permis-cotier-candidat-libre')).toBeDefined();
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
  it('résout l’URL Légifrance de chaque texte extrait dans data/sources/', () => {
    // Trois des sept identifiants recopiés à la main étaient faux : ils sont
    // désormais lus dans le fichier extrait, et ce test le vérifie.
    for (const p of GUIDE) {
      const resolues = sourcesResolues(p);
      expect(resolues, `sources de ${p.slug}`).toHaveLength(p.sources.length);
      p.sources.forEach((citee, i) => {
        if (!citee.fichier) return;
        expect(resolues[i]?.provenance).toBe('officiel');
        expect(resolues[i]?.url, `${p.slug} : ${citee.texte}`).toMatch(
          /^https:\/\/www\.legifrance\.gouv\.fr\//,
        );
      });
    }
  });

  it('ne cite hors Légifrance qu’une publication de l’administration ou du Parlement', () => {
    // Le CPF et l'inscription à l'examen ne sont pas tout entiers dans les
    // textes : la page cite alors service-public, le ministère ou le Sénat,
    // jamais un site d'école ou d'éditeur.
    const officiel = /^https:\/\/(?:[a-z-]+\.)*(?:gouv\.fr|senat\.fr|assemblee-nationale\.fr)\//;
    for (const p of GUIDE) {
      for (const citee of p.sources) {
        if (citee.fichier) continue;
        expect(citee.url, `${p.slug} : ${citee.texte}`).toMatch(officiel);
      }
    }
  });

  it('fonde la page CPF sur l’article du code du travail qui liste ce que le CPF finance', () => {
    const page = pageGuide('permis-cotier-cpf');
    expect(page?.sources.map((s) => `${s.ref}/${s.fichier ?? ''}`)).toContain(
      'code-travail/article-l6323-6',
    );
  });

  it('garde une source sans URL au lieu de la faire disparaître de la page', () => {
    // La version précédente filtrait sur l'URL : une fiche du site, qui n'en a
    // pas dans son en-tête, tombait de la page sans que rien ne le signale.
    const page = {
      ...GUIDE[0]!,
      sources: [{ texte: 'Fiche météorologie', ref: 'fiche-meteo' }],
    };
    const resolues = sourcesResolues(page);
    expect(resolues).toHaveLength(1);
    expect(resolues[0]?.url).toBe('/source/fiche-meteo');
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
