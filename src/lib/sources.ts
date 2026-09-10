import { readFileSync } from 'node:fs';
import { cheminFiche } from './fiches';
import { estRefDeFiche } from './fiches-fichiers';

/**
 * D'où une page tient ce qu'elle affirme, et ce qu'elle a le droit d'en dire.
 *
 * Le site n'a qu'un argument : chaque réponse part d'un texte et le cite. Il
 * faut donc que le lecteur puisse aller voir. Deux cas, et ils ne se
 * confondent pas :
 *
 *   - un texte officiel, qu'on ne republie pas — le lien sortant suffit, une
 *     copie ferait doublon avec Légifrance ;
 *   - une fiche du site, écrite à la main faute de texte exploitable. Elle n'a
 *     pas d'adresse ailleurs, c'est le site qui la publie, à `/source/<ref>`.
 *
 * Rien n'est jeté. Une source dont l'adresse manque reste affichée en toutes
 * lettres : la page en cite alors moins de liens, pas moins de sources.
 */

export type Provenance = 'officiel' | 'fiche';

/** Ce que les pages disent d'une provenance. */
export const NOM_PROVENANCE: Readonly<Record<Provenance, string>> = {
  officiel: 'Texte officiel',
  fiche: 'Fiche du site',
};

export interface SourceCitee {
  /** Ce qui s'affiche : « Décret n° 2007-1167 du 2 août 2007, article 2 ». */
  readonly texte: string;
  /** Dossier de `data/sources/`. */
  readonly ref: string;
  /** Nom du fichier, sans l'extension. Absent des questions, qui citent le texte entier. */
  readonly fichier?: string;
  /** Adresse écrite dans la donnée, quand elle y est. */
  readonly url?: string;
}

export interface SourceAffichee {
  readonly texte: string;
  readonly ref: string;
  readonly provenance: Provenance;
  readonly url?: string;
}

/**
 * L'URL d'un texte officiel, lue dans l'en-tête du fichier extrait. Le script
 * `sources.py` l'y écrit au moment de l'extraction : c'est le seul endroit où
 * elle est juste par construction — trois des sept identifiants recopiés à la
 * main dans la première version étaient faux.
 */
export function urlSource(source: Pick<SourceCitee, 'ref' | 'fichier'>): string | undefined {
  if (!source.fichier) return undefined;
  try {
    const chemin = new URL(
      `../../data/sources/${source.ref}/${source.fichier}.md`,
      import.meta.url,
    );
    const entete = readFileSync(chemin, 'utf-8').slice(0, 800);
    return /^- Source : (\S+)$/m.exec(entete)?.[1];
  } catch {
    return undefined;
  }
}

/**
 * Une source citée, prête pour l'écran.
 *
 * Une fiche part toujours vers sa page du site, même quand son en-tête porte
 * une adresse : celle-ci désigne l'autorité qu'elle résume — la planche du
 * balisage, l'arrêté du préfet maritime — et non la fiche elle-même.
 */
export function resoudreSource(source: SourceCitee): SourceAffichee {
  if (estRefDeFiche(source.ref)) {
    return {
      texte: source.texte,
      ref: source.ref,
      provenance: 'fiche',
      url: cheminFiche(source.ref),
    };
  }
  const url = source.url ?? urlSource(source);
  return { texte: source.texte, ref: source.ref, provenance: 'officiel', ...(url ? { url } : {}) };
}

export function resoudreSources(sources: readonly SourceCitee[]): SourceAffichee[] {
  return sources.map(resoudreSource);
}

/**
 * Vrai si au moins une source vient de Légifrance. Le pied du bloc de sources
 * n'a le droit de parler de Légifrance et de la Licence Ouverte que dans ce
 * cas : les arrêtés des préfets maritimes n'y sont pas publiés, et une fiche
 * du site encore moins.
 */
export function citeLegifrance(sources: readonly SourceAffichee[]): boolean {
  return sources.some((s) => s.url?.startsWith('https://www.legifrance.gouv.fr/') === true);
}

export function citeUneFiche(sources: readonly SourceAffichee[]): boolean {
  return sources.some((s) => s.provenance === 'fiche');
}
