import { readFileSync } from 'node:fs';

/**
 * Les pages du guide : celles qui répondent à une question qu'on se pose avant
 * de réviser, et non pendant.
 *
 * Elles existent pour une raison précise. Les questions les plus posées sur le
 * permis côtier — jusqu'où on peut aller, ce que coûte le titre, ce que vaut
 * l'épreuve — trouvent aujourd'hui des réponses de seconde main, recopiées
 * d'un site à l'autre sans jamais citer le texte. Or ces réponses sont dans le
 * décret du 2 août 2007 et dans l'arrêté du 28 septembre 2007, tous deux
 * extraits dans `data/sources/`. Le guide les cite.
 *
 * `question` est la question à laquelle la page répond, écrite comme on la
 * pose. Elle sert de titre au hub, d'entrée de FAQ et de première phrase de la
 * page : ce qui est demandé est ce à quoi on répond, dans les mêmes mots.
 */
export interface PageGuide {
  readonly slug: string;
  /** Titre de la page, celui du H1. */
  readonly titre: string;
  /** Libellé court, pour les listes et le fil d'Ariane. */
  readonly court: string;
  /** La question posée, telle qu'on la pose. */
  readonly question: string;
  /** La réponse en une phrase. Elle ouvre la page et sert de méta description. */
  readonly reponse: string;
  /** Textes cités par la page. L'URL n'est pas écrite ici, elle est lue
   *  dans `data/sources/<ref>/<fichier>.md` : trois des sept identifiants
   *  recopiés à la main dans la première version étaient faux. */
  readonly sources: readonly SourceCitee[];
}

export interface SourceCitee {
  /** Ce qui s'affiche : « Décret n° 2007-1167 du 2 août 2007, article 2 ». */
  readonly texte: string;
  /** Dossier de `data/sources/`. */
  readonly ref: string;
  /** Nom du fichier, sans l'extension. */
  readonly fichier: string;
}

export const GUIDE: readonly PageGuide[] = [
  {
    slug: 'limites-du-permis-cotier',
    titre: 'Jusqu’où peut-on aller avec le permis côtier ?',
    court: 'Ce que le permis côtier permet',
    question: 'Jusqu’à quelle distance le permis côtier autorise-t-il à naviguer ?',
    reponse:
      'Jusqu’à 6 milles d’un abri, soit environ 11 kilomètres. Au-delà, il faut l’extension hauturière. Le décret ne fixe aucune limite de longueur ni de puissance pour le bateau conduit en mer.',
    sources: [
      { texte: 'Décret n° 2007-1167 du 2 août 2007, article 2', ref: 'decret-2007-1167', fichier: 'article-2' },
      { texte: 'Décret n° 2007-1167 du 2 août 2007, article 3', ref: 'decret-2007-1167', fichier: 'article-3' },
    ],
  },
  {
    slug: 'examen-du-permis-cotier',
    titre: 'L’examen du permis côtier : 40 questions, 5 erreurs',
    court: 'Comment se passe l’examen',
    question: 'Comment se déroule l’épreuve théorique du permis côtier ?',
    reponse:
      'Quarante questions à choix multiple, cinq erreurs admises. La réussite reste acquise dix-huit mois, le temps de faire valider la formation pratique par un établissement agréé.',
    sources: [
      { texte: 'Arrêté du 28 septembre 2007, article 1er', ref: 'arrete-2007-09-28', fichier: 'article-1' },
      { texte: 'Arrêté du 28 septembre 2007, article 6', ref: 'arrete-2007-09-28', fichier: 'article-6' },
    ],
  },
  {
    slug: 'cotier-ou-fluvial',
    titre: 'Côtier ou fluvial : lequel passer ?',
    court: 'Côtier ou fluvial',
    question: 'Faut-il passer l’option côtière ou l’option eaux intérieures ?',
    reponse:
      'Deux options du même permis, séparées par le plan d’eau et non par le niveau. La côtière vaut en mer jusqu’à 6 milles d’un abri, celle des eaux intérieures sur les canaux, rivières et plans d’eau, pour un bateau de moins de 20 mètres.',
    sources: [
      { texte: 'Décret n° 2007-1167 du 2 août 2007, article 2', ref: 'decret-2007-1167', fichier: 'article-2' },
      { texte: 'Arrêté du 28 septembre 2007, article 2', ref: 'arrete-2007-09-28', fichier: 'article-2' },
    ],
  },
  {
    slug: 'prix-du-permis-cotier',
    titre: 'Combien coûte le permis côtier',
    court: 'Ce que ça coûte',
    question: 'Quel est le prix du permis côtier ?',
    reponse:
      'Deux postes séparés : une redevance versée à l’État, payée par timbre dématérialisé et fixée par arrêté, et la formation en bateau-école, dont le prix est libre.',
    sources: [
      { texte: 'Décret n° 2007-1167 du 2 août 2007, article 8-1', ref: 'decret-2007-1167', fichier: 'article-8-1' },
      { texte: 'Arrêté du 28 septembre 2007, article 18.3', ref: 'arrete-2007-09-28', fichier: 'article-18' },
    ],
  },
  {
    slug: 'ou-passer-le-permis-cotier',
    titre: 'Où passer le permis côtier',
    court: 'Où le passer',
    question: 'Où passe-t-on l’examen du permis côtier ?',
    reponse:
      'Sur un site d’examen dont le responsable est indépendant de ceux qui vendent la formation. C’est le bateau-école qui monte le dossier, et lui seul qui valide la formation pratique.',
    sources: [
      { texte: 'Arrêté du 28 septembre 2007, article 18.2', ref: 'arrete-2007-09-28', fichier: 'article-18' },
      { texte: 'Arrêté du 28 septembre 2007, article 6', ref: 'arrete-2007-09-28', fichier: 'article-6' },
    ],
  },
] as const;

export function pageGuide(slug: string): PageGuide | undefined {
  return GUIDE.find((p) => p.slug === slug);
}

/** Les autres pages du guide, pour le maillage en pied de page. */
export function autresPages(slug: string): readonly PageGuide[] {
  return GUIDE.filter((p) => p.slug !== slug);
}

/**
 * L'URL Légifrance d'un article, lue dans l'en-tête du fichier extrait. Le
 * script `sources.py` l'y écrit au moment de l'extraction : c'est le seul
 * endroit où elle est juste par construction.
 */
export function urlSource(source: SourceCitee): string | undefined {
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

/** Les sources d'une page, chacune avec son URL résolue. */
export function sourcesResolues(
  page: PageGuide,
): readonly { texte: string; url: string }[] {
  return page.sources
    .map((s) => ({ texte: s.texte, url: urlSource(s) }))
    .filter((s): s is { texte: string; url: string } => s.url !== undefined);
}

/**
 * Ce qu'une page du guide éclaire dans le programme.
 *
 * Le lien ne va que dans un sens dans le texte, mais il se lit dans les deux :
 * la fiche d'une notion renvoie vers la page qui la met en contexte, et la page
 * du guide renvoie vers les fiches qui la détaillent. Rien n'est lié par
 * politesse — une notion absente de cette table n'affiche pas de bloc.
 */
const NOTIONS_ECLAIREES: Readonly<Record<string, readonly string[]>> = {
  'limites-du-permis-cotier': ['titre-obligation', 'titre-options', 'securite-limitations'],
  'cotier-ou-fluvial': ['titre-options'],
  'examen-du-permis-cotier': ['titre-conditions'],
  'prix-du-permis-cotier': ['titre-conditions'],
  'ou-passer-le-permis-cotier': ['titre-conditions'],
};

/** Les codes de notion que telle page du guide détaille. */
export function notionsDuGuide(slug: string): readonly string[] {
  return NOTIONS_ECLAIREES[slug] ?? [];
}

/** Les pages du guide qui mettent telle notion en contexte. */
export function guidesDeLaNotion(code: string): readonly PageGuide[] {
  return GUIDE.filter((p) => notionsDuGuide(p.slug).includes(code));
}

/** Tous les codes cités par la table, pour que les tests vérifient qu'ils existent. */
export function notionsCitees(): readonly string[] {
  return [...new Set(Object.values(NOTIONS_ECLAIREES).flat())];
}
