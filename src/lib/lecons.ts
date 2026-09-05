import { getCollection } from 'astro:content';
import { existsSync } from 'node:fs';
import { questionsPubliees } from './banque';
import { urlSource } from './guide';
import { NOTIONS, type Notion } from './notions';
import { choisirVerification, leconCourte, leconEcrite, type LeconAffichable, type LeconSource } from './cours';

/**
 * Ce qui, dans une leçon, dépend du disque : la collection Astro, les
 * fichiers de visuels, les URL des sources. `cours.ts` reste pur et testable ;
 * ce module est appelé par les pages, au build.
 */

/** Les leçons écrites, par code de notion. Le nom du fichier doit être ce code. */
export async function leconsEcrites(): Promise<Map<string, LeconSource>> {
  const entrees = await getCollection('lecons');
  const parCode = new Map<string, LeconSource>();
  for (const entree of entrees) {
    if (entree.id !== entree.data.notion) {
      throw new Error(
        `data/cours/${entree.id}.yaml porte la notion « ${entree.data.notion} » : le fichier doit s'appeler comme sa notion`,
      );
    }
    parCode.set(entree.data.notion, entree.data);
  }
  return parCode;
}

export async function codesLeconsEcrites(): Promise<ReadonlySet<string>> {
  return new Set((await leconsEcrites()).keys());
}

function visuelExiste(fichier: string): boolean {
  return existsSync(new URL(`../../public/visuels/${fichier}`, import.meta.url));
}

/**
 * La leçon d'une notion, prête pour l'écran : écrite si son fichier existe,
 * courte sinon. Un visuel qui ne serait pas sur le disque casse le build,
 * comme il le fait pour une question.
 */
export async function leconDeLaNotion(notion: Notion): Promise<LeconAffichable> {
  const questions = choisirVerification(await questionsPubliees(), notion.code);
  const source = (await leconsEcrites()).get(notion.code);
  if (!source) return { ...leconCourte(notion), questions };

  for (const etape of source.etapes) {
    if (etape.visuel && !visuelExiste(etape.visuel)) {
      throw new Error(`leçon ${notion.code} : visuel introuvable, public/visuels/${etape.visuel}`);
    }
  }

  const sources = source.sources.map((s) => {
    const url = urlSource({ texte: s.texte, ref: s.ref, fichier: s.fichier });
    return url ? { texte: s.texte, url } : { texte: s.texte };
  });

  return { ...leconEcrite(notion, source, sources), questions };
}

/** Les notions dont la leçon est écrite, pour les compteurs honnêtes. */
export async function compteLeconsEcrites(): Promise<{ ecrites: number; total: number }> {
  const codes = await codesLeconsEcrites();
  return { ecrites: NOTIONS.filter((n) => codes.has(n.code)).length, total: NOTIONS.length };
}
