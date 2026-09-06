import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { schemaLecon } from './cours';
import { NOTIONS } from './notions';

/**
 * Les fichiers de `data/cours/` tels qu'ils sont sur le disque. Le schéma
 * vérifie la forme ; ce test vérifie ce que le schéma ne voit pas — le nom du
 * fichier, le visuel, la source citée — et ce que le style interdit. Il se
 * lance seul pendant la rédaction :
 *
 *     npx vitest run src/lib/lecons-fichiers.test.ts
 */

const racine = new URL('../../', import.meta.url);
const dossier = new URL('data/cours/', racine);

const fichiers = readdirSync(dossier)
  .filter((f) => f.endsWith('.yaml'))
  .sort();

function lire(fichier: string): unknown {
  return parse(readFileSync(new URL(fichier, dossier), 'utf-8'));
}

/** Tout le texte d'une leçon, mis bout à bout, pour les contrôles de style. */
function texteDe(lecon: Record<string, unknown>): string {
  const morceaux: string[] = [];
  const visite = (v: unknown): void => {
    if (typeof v === 'string') morceaux.push(v);
    else if (Array.isArray(v)) v.forEach(visite);
    else if (v && typeof v === 'object') Object.values(v).forEach(visite);
  };
  visite({ ...lecon, meta: undefined, sources: undefined });
  return morceaux.join('\n');
}

/** Ce que le style d'écriture refuse : les béquilles qui trahissent un texte généré. */
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
  /\bpour conclure\b/i,
  /\bplongeons\b/i,
  /\bdécouvrons\b/i,
  /\brobuste\b/i,
];

describe('les fichiers de leçons', () => {
  it('existent', () => {
    expect(fichiers.length).toBeGreaterThan(0);
  });

  for (const fichier of fichiers) {
    describe(fichier, () => {
      const brut = lire(fichier);
      const resultat = schemaLecon.safeParse(brut);

      it('respecte le schéma', () => {
        expect(resultat.success, resultat.success ? '' : JSON.stringify(resultat.error.issues, null, 1)).toBe(true);
      });

      if (!resultat.success) return;
      const lecon = resultat.data;

      it('porte le nom de sa notion', () => {
        expect(fichier).toBe(`${lecon.notion}.yaml`);
        expect(NOTIONS.some((n) => n.code === lecon.notion)).toBe(true);
      });

      it('ne cite que des sources présentes dans data/sources', () => {
        for (const s of lecon.sources) {
          const chemin = new URL(`data/sources/${s.ref}/${s.fichier}.md`, racine);
          expect(existsSync(chemin), `source absente : data/sources/${s.ref}/${s.fichier}.md`).toBe(true);
        }
      });

      it('ne montre que des visuels présents dans public/visuels', () => {
        for (const e of lecon.etapes) {
          if (!e.visuel) continue;
          expect(existsSync(new URL(`public/visuels/${e.visuel}`, racine)), `visuel absent : ${e.visuel}`).toBe(true);
        }
      });

      it('évite les tics d’écriture', () => {
        const texte = texteDe(brut as Record<string, unknown>);
        for (const motif of INTERDITS) {
          expect(motif.test(texte), `motif interdit ${motif} dans ${fichier}`).toBe(false);
        }
      });

      it('annonce une durée plausible pour sa longueur', () => {
        const mots = texteDe(brut as Record<string, unknown>).split(/\s+/).length;
        // Trois minutes pour deux cents mots lus lentement, sur un téléphone.
        expect(lecon.duree, `${fichier} : ${mots} mots pour ${lecon.duree} min`).toBeGreaterThanOrEqual(Math.min(2, Math.ceil(mots / 200)));
        expect(lecon.duree).toBeLessThanOrEqual(Math.max(3, Math.ceil(mots / 60)));
      });
    });
  }
});
