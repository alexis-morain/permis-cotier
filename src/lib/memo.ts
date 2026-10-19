/**
 * La fiche-mémo d'un cours : ce qu'on relit la veille de l'examen.
 *
 * Elle n'a pas de texte à elle. Chaque leçon écrite porte déjà ses lignes
 * « à retenir » (`retenir`, deux à cinq lignes), ses sources et ses visuels :
 * la fiche les assemble, une leçon par bloc, dans l'ordre du cours. Rien n'est
 * condensé ni reformulé, donc rien ne peut dire plus que la leçon. Corriger une
 * leçon corrige sa fiche.
 *
 * Le visuel d'un bloc est celui de la première étape de la leçon qui en a un,
 * avec l'`alt` de cette étape. Une leçon sans visuel donne un bloc sans image.
 * Une leçon courte (le simple résumé de la notion, sans `retenir`) n'a pas de
 * bloc : la fiche ne reprend que ce qui a été écrit depuis les sources.
 */
import type { LeconAffichable } from './cours';
import type { SourceAffichee } from './sources';

export interface BlocMemo {
  /** Le code de la notion, qui sert d'ancre. */
  code: string;
  nom: string;
  /** L'adresse de la leçon d'où vient le bloc. */
  chemin: string;
  visuel?: string;
  alt?: string;
  /** Les lignes « à retenir » de la leçon, recopiées. */
  lignes: string[];
  sources: SourceAffichee[];
}

export function cheminMemo(codeCours: string): string {
  return `/cours/${codeCours}/memo`;
}

/** Le bloc d'une leçon, ou rien quand elle n'est qu'un résumé. */
export function blocMemo(lecon: LeconAffichable, chemin: string): BlocMemo | undefined {
  if (lecon.courte || lecon.retenir.length === 0) return undefined;
  const avecVisuel = lecon.etapes.find((e) => e.visuel && e.alt);
  return {
    code: lecon.code,
    nom: lecon.nom,
    chemin,
    ...(avecVisuel ? { visuel: avecVisuel.visuel, alt: avecVisuel.alt } : {}),
    lignes: [...lecon.retenir],
    sources: lecon.sources,
  };
}

/** Les blocs d'un cours, dans l'ordre de ses leçons, sans les leçons courtes. */
export function assemblerMemo(lecons: readonly { lecon: LeconAffichable; chemin: string }[]): BlocMemo[] {
  return lecons.flatMap(({ lecon, chemin }) => blocMemo(lecon, chemin) ?? []);
}

/** Les textes cités par un ensemble de blocs, chacun une fois, dans l'ordre d'apparition. */
export function textesDuMemo(blocs: readonly BlocMemo[]): SourceAffichee[] {
  const vus = new Map<string, SourceAffichee>();
  for (const b of blocs) for (const s of b.sources) if (!vus.has(s.texte)) vus.set(s.texte, s);
  return [...vus.values()];
}
