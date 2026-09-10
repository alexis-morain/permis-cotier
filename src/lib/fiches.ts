/**
 * Les fiches du site : ce que l'auteur a écrit lui-même, faute de texte
 * officiel exploitable.
 *
 * Cent dix-huit questions sur cinq cent seize ne tiennent pas sur un article
 * de loi. L'échelle de Beaufort est une convention de l'OMM, le balisage n'est
 * publié qu'en planches d'images, le Règlement des radiocommunications de
 * l'UIT n'est pas ouvert : il n'y a rien à citer et rien à lier. Ces sujets
 * sont donc écrits à la main, dans les dossiers `fiche-…` et `aism-mbs` de
 * `data/sources`, et le site le dit au lieu de laisser croire à un extrait de
 * Légifrance.
 *
 * Ce module ne lit pas le disque : il sait seulement reconnaître une fiche
 * dans un fichier et en séparer l'en-tête du corps. `fiches-fichiers.ts`
 * s'occupe des fichiers, `sources.ts` de ce que les pages en affichent.
 */

import { z } from 'astro/zod';

/**
 * Ce à quoi une fiche se reconnaît : elle dit elle-même ce qu'elle est.
 *
 * L'en-tête seul ne suffirait pas. La fiche sur le ski nautique porte une
 * `Source` comme un extrait Légifrance — l'arrêté du préfet maritime qu'elle
 * résume — et les arrêtés de `bande-300-metres`, qui sont bien des textes
 * officiels, portent une `Autorité` comme une fiche. Le seul signe qui ne
 * trompe pas est la section où le fichier écrit qu'il n'est pas un texte
 * réglementaire, et cette section est écrite pour être lue par une personne
 * autant que par le build.
 */
export const MARQUE_FICHE = '## Nature de cette fiche';

export interface Publication {
  /** Le document qui fait foi, tel que l'en-tête le nomme. */
  readonly texte?: string;
  /** Son adresse, quand il en a une. */
  readonly url?: string;
}

export interface Fiche {
  /** Dossier de `data/sources/`, et dernier segment de l'adresse de la page. */
  readonly ref: string;
  readonly titre: string;
  /** Date de la version consultée, telle qu'elle est écrite dans l'en-tête. */
  readonly versionLe: string;
  /** Sur quoi la fiche s'appuie vraiment : OMM, UIT, SHOM, préfet maritime. */
  readonly autorite?: string;
  /** Le point du programme de l'épreuve que la fiche couvre. */
  readonly programme?: string;
  readonly publication?: Publication;
  /** Le markdown de la fiche, titre et en-tête ôtés. */
  readonly corps: string;
}

/**
 * L'en-tête d'une fiche, tel qu'il entre dans la collection Astro. Il ne
 * valide rien que `lireFiche` n'ait déjà lu : il sert à typer la collection,
 * qui est ce que les pages manipulent.
 */
export const schemaFiche = z.object({
  ref: z.string(),
  titre: z.string(),
  versionLe: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  autorite: z.string().optional(),
  programme: z.string().optional(),
  publication: z
    .object({ texte: z.string().optional(), url: z.string().url().optional() })
    .optional(),
});

export function estUneFiche(contenu: string): boolean {
  return contenu.includes(MARQUE_FICHE);
}

export function cheminFiche(ref: string): string {
  return `/source/${ref}`;
}

/** L'apostrophe du site est courbe ; les fichiers de sources la tapent droite. */
function typographier(texte: string): string {
  return texte.replace(/'/g, '’');
}

/** La première adresse d'un champ, et le champ sans elle. */
function detacherUrl(valeur: string): Publication {
  const url = /https?:\/\/\S+/.exec(valeur)?.[0];
  if (!url) return { texte: valeur };
  const texte = valeur.replace(url, '').replace(/\s+/g, ' ').trim();
  return { texte: texte.length > 0 ? texte : undefined, url };
}

/**
 * Les champs de l'en-tête, recollés.
 *
 * Un champ tient sur plusieurs lignes quand sa valeur est longue — l'autorité
 * de la fiche VHF cite deux conventions — et les lignes de suite sont
 * indentées. On s'arrête à la première ligne vide : aucun en-tête n'en
 * contient, et le corps commence là.
 */
function lireEntete(lignes: readonly string[]): Map<string, string> {
  const champs = new Map<string, string>();
  let courant: string | undefined;
  for (const ligne of lignes) {
    const debut = /^- ([^:]+) : (.*)$/.exec(ligne);
    if (debut?.[1] !== undefined && debut[2] !== undefined) {
      courant = debut[1].trim();
      champs.set(courant, debut[2].trim());
    } else if (courant && /^\s+\S/.test(ligne)) {
      champs.set(courant, `${champs.get(courant)} ${ligne.trim()}`);
    } else {
      courant = undefined;
    }
  }
  return champs;
}

/**
 * La fiche que porte ce fichier, ou rien si le fichier n'en est pas une.
 *
 * Rien non plus si la référence manque : c'est elle qui donne son adresse à la
 * page, une fiche sans référence n'aurait nulle part où être publiée.
 */
export function lireFiche(contenu: string): Fiche | undefined {
  if (!estUneFiche(contenu)) return undefined;

  const lignes = contenu.split('\n');
  const titre = /^#\s+(.+)$/.exec(lignes[0] ?? '')?.[1]?.trim();
  if (!titre) return undefined;

  let debut = 1;
  while (lignes[debut]?.trim() === '') debut += 1;
  let fin = debut;
  while (fin < lignes.length && lignes[fin]?.trim() !== '') fin += 1;

  const champs = lireEntete(lignes.slice(debut, fin));
  const ref = champs.get('Référence');
  const versionLe = champs.get('Version consultée le');
  if (!ref || !versionLe) return undefined;

  const brut = champs.get('Référence publiée') ?? champs.get('Planche officielle') ?? champs.get('Source');
  const publication = brut ? detacherUrl(typographier(brut)) : undefined;
  const autorite = champs.get('Autorité');
  const programme = champs.get('Programme');

  return {
    ref,
    titre: typographier(titre),
    versionLe,
    ...(autorite ? { autorite: typographier(autorite) } : {}),
    ...(programme ? { programme: typographier(programme) } : {}),
    // Une publication réduite à une adresse sans intitulé ne dit rien de plus
    // que l'autorité : on la garde quand même, c'est elle qui se vérifie.
    ...(publication && (publication.texte || publication.url) ? { publication } : {}),
    corps: lignes.slice(fin).join('\n').trim(),
  };
}
