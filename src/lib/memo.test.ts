import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { assemblerMemo, blocMemo, cheminMemo, textesDuMemo } from './memo';
import { leconCourte, leconEcrite, schemaLecon, type LeconAffichable } from './cours';
import { resoudreSources } from './sources';
import { COURS, leconsDuCours } from './parcours';
import { NOTIONS } from './notions';

const racine = new URL('../../', import.meta.url);

/** La leçon d'un code, lue du disque comme le fait la collection Astro. */
function source(code: string) {
  const chemin = new URL(`data/cours/${code}.yaml`, racine);
  return existsSync(chemin) ? schemaLecon.parse(parse(readFileSync(chemin, 'utf-8'))) : undefined;
}

function affichable(code: string): LeconAffichable {
  const notion = NOTIONS.find((n) => n.code === code)!;
  const s = source(code);
  if (!s) return { ...leconCourte(notion), questions: [] };
  return { ...leconEcrite(notion, s, resoudreSources(s.sources)), questions: [] };
}

describe('le bloc d’une leçon', () => {
  it('recopie les lignes « à retenir » telles quelles', () => {
    const lecon = affichable('balisage-feux');
    const bloc = blocMemo(lecon, '/cours/balisage/balisage-feux')!;
    expect(bloc.lignes).toEqual(source('balisage-feux')!.retenir);
  });

  it('garde les sources de la leçon', () => {
    const bloc = blocMemo(affichable('balisage-feux'), '/x')!;
    expect(bloc.sources.map((s) => s.texte)).toEqual(source('balisage-feux')!.sources.map((s) => s.texte));
  });

  it('prend le visuel de la première étape qui en a un, avec son alt', () => {
    const bloc = blocMemo(affichable('balisage-feux'), '/x')!;
    const premiere = source('balisage-feux')!.etapes.find((e) => e.visuel)!;
    expect(bloc.visuel).toBe(premiere.visuel);
    expect(bloc.alt).toBe(premiere.alt);
  });

  it('reste sans image quand aucune étape n’en a', () => {
    const code = NOTIONS.map((n) => n.code).find((c) => source(c) && !source(c)!.etapes.some((e) => e.visuel))!;
    const bloc = blocMemo(affichable(code), '/x')!;
    expect(bloc.visuel).toBeUndefined();
    expect(bloc.alt).toBeUndefined();
  });

  it('n’en fait pas pour une leçon courte', () => {
    const notion = NOTIONS[0]!;
    expect(blocMemo({ ...leconCourte(notion), questions: [] }, '/x')).toBeUndefined();
  });
});

describe('l’assemblage', () => {
  it('suit l’ordre des leçons et saute les leçons courtes', () => {
    const courte = { ...leconCourte(NOTIONS[0]!), questions: [] };
    const a = affichable('balisage-lateral');
    const b = affichable('balisage-feux');
    const blocs = assemblerMemo([
      { lecon: a, chemin: '/a' },
      { lecon: courte, chemin: '/c' },
      { lecon: b, chemin: '/b' },
    ]);
    expect(blocs.map((x) => x.code)).toEqual(['balisage-lateral', 'balisage-feux']);
    expect(blocs.map((x) => x.chemin)).toEqual(['/a', '/b']);
  });

  it('cite chaque texte une fois, dans l’ordre d’apparition', () => {
    const blocs = assemblerMemo(['balisage-lateral', 'balisage-cardinal', 'balisage-feux'].map((c) => ({ lecon: affichable(c), chemin: '/' + c })));
    const textes = textesDuMemo(blocs).map((s) => s.texte);
    expect(new Set(textes).size).toBe(textes.length);
    for (const b of blocs) for (const s of b.sources) expect(textes).toContain(s.texte);
  });
});

describe('les fiches-mémo du site', () => {
  it('ont une adresse sous le cours', () => {
    expect(cheminMemo('feux-marques')).toBe('/cours/feux-marques/memo');
  });

  it('n’entrent jamais en collision avec la leçon d’une notion', () => {
    expect(NOTIONS.some((n) => n.code === 'memo')).toBe(false);
  });

  for (const cours of COURS) {
    describe(cours.code, () => {
      const lecons = leconsDuCours(cours.code).map((l) => ({ lecon: affichable(l.notion.code), chemin: l.chemin }));
      const blocs = assemblerMemo(lecons);

      it('a au moins un bloc', () => {
        expect(blocs.length).toBeGreaterThan(0);
      });

      it('fait un bloc par leçon du cours, dans l’ordre', () => {
        expect(blocs.map((b) => b.code)).toEqual(leconsDuCours(cours.code).map((l) => l.notion.code));
      });

      it('donne à chaque bloc une source, des lignes reprises de sa leçon et une leçon qui existe', () => {
        for (const b of blocs) {
          const lecon = source(b.code);
          expect(lecon, `leçon absente : ${b.code}`).toBeDefined();
          expect(b.sources.length, `${b.code} sans source`).toBeGreaterThan(0);
          expect(b.lignes, b.code).toEqual(lecon!.retenir);
          expect(b.chemin).toBe(`/cours/${cours.code}/${b.code}`);
        }
      });

      it('ne montre qu’un visuel que la leçon montre déjà, avec son alt', () => {
        for (const b of blocs) {
          if (!b.visuel) continue;
          const etape = source(b.code)!.etapes.find((e) => e.visuel === b.visuel);
          expect(etape, `${b.code} : ${b.visuel} n’est dans aucune étape`).toBeDefined();
          expect(b.alt).toBe(etape!.alt);
          expect(existsSync(new URL(`public/visuels/${b.visuel}`, racine))).toBe(true);
        }
      });
    });
  }
});
