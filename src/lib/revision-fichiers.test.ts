import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { schemaRevision, notionsDeLaFiche, visuelsDeLaFiche } from './revision';
import { COURS } from './parcours';

/**
 * Les fiches de révision de `data/revision/` telles qu'elles sont sur le
 * disque. Le schéma vérifie la forme et que chaque notion est du cours ; ce
 * test vérifie le nom du fichier, les dessins, les leçons et le style. Il se
 * lance seul pendant la rédaction :
 *
 *     npx vitest run src/lib/revision-fichiers.test.ts
 */

const racine = new URL('../../', import.meta.url);
const dossier = new URL('data/revision/', racine);

const fichiers = existsSync(dossier)
  ? readdirSync(dossier)
      .filter((f) => f.endsWith('.yaml'))
      .sort()
  : [];

/** Ce que le style d'écriture refuse, comme pour les leçons (`lecons-fichiers.test.ts`). */
const INTERDITS: readonly RegExp[] = [
  /—/,
  /\bil est important de\b/i,
  /\bil convient de\b/i,
  /\bn['’]hésite(z)? pas\b/i,
  /\ben effet\b/i,
  /\bde plus,/i,
  /\bpar ailleurs\b/i,
  /\ben outre\b/i,
  /\ben résumé\b/i,
];

function texteDe(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(texteDe).join('\n');
  if (v && typeof v === 'object') return Object.values(v).map(texteDe).join('\n');
  return '';
}

describe('les fiches de révision', () => {
  it('couvrent chaque cours, une fiche chacun', () => {
    expect(fichiers).toEqual(COURS.map((c) => `${c.code}.yaml`).sort());
  });

  for (const fichier of fichiers) {
    describe(fichier, () => {
      const brut = parse(readFileSync(new URL(fichier, dossier), 'utf-8')) as Record<string, unknown>;
      const resultat = schemaRevision.safeParse(brut);

      it('respecte le schéma', () => {
        expect(resultat.success, resultat.success ? '' : JSON.stringify(resultat.error.issues, null, 1)).toBe(true);
      });
      if (!resultat.success) return;
      const fiche = resultat.data;

      it('porte le nom de son cours', () => {
        expect(fichier).toBe(`${fiche.cours}.yaml`);
      });

      it('ne résume que des leçons écrites', () => {
        for (const code of notionsDeLaFiche(fiche)) {
          expect(existsSync(new URL(`data/cours/${code}.yaml`, racine)), `data/cours/${code}.yaml`).toBe(true);
        }
      });

      it('ne montre que des dessins présents sur le disque', () => {
        const { schemas, visuels } = visuelsDeLaFiche(fiche);
        for (const s of schemas) {
          expect(existsSync(new URL(`public/fiches-revision/schemas/${s}`, racine)), s).toBe(true);
        }
        for (const v of visuels) expect(existsSync(new URL(`public/visuels/${v}`, racine)), v).toBe(true);
      });

      it('évite les tics d’écriture', () => {
        const texte = texteDe({ ...brut, meta: undefined });
        for (const motif of INTERDITS) expect(texte, String(motif)).not.toMatch(motif);
      });
    });
  }
});
