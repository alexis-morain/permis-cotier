import { resoudreSources, type SourceAffichee, type SourceCitee } from './sources';

/**
 * Les pages du guide : celles qui répondent à une question qu'on se pose avant
 * de réviser, et non pendant.
 *
 * Elles existent pour une raison précise. Les questions les plus posées sur le
 * permis côtier — jusqu'où on peut aller, ce que coûte le titre, ce que vaut
 * l'épreuve — trouvent aujourd'hui des réponses de seconde main, recopiées
 * d'un site à l'autre sans jamais citer le texte. Or ces réponses sont dans le
 * décret du 2 août 2007 et dans l'arrêté du 28 septembre 2007, tous deux
 * extraits dans `data/sources/`, et pour le CPF dans le code du travail. Le
 * guide les cite. Ce que les textes ne disent pas (qui organise l'examen, ce
 * que le gouvernement répond au Parlement), il le cite chez l'administration
 * ou au Parlement, jamais chez une école.
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
  /** Textes cités par la page. L'URL d'un texte extrait n'est pas écrite
   *  ici, elle est lue dans `data/sources/<ref>/<fichier>.md` : trois des sept
   *  identifiants recopiés à la main dans la première version étaient faux.
   *  Seule une publication sans extrait (ministère, Parlement) porte son
   *  `url` en dur. */
  readonly sources: readonly SourceCitee[];
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
  {
    slug: 'permis-cotier-candidat-libre',
    titre: 'Passer le permis côtier en candidat libre',
    court: 'En candidat libre',
    question: 'Peut-on passer le permis côtier en candidat libre ?',
    reponse:
      'À moitié. Vous réservez seul votre place à l’épreuve théorique, mais après cinq heures de cours en salle, et seul un établissement agréé valide la pratique.',
    sources: [
      { texte: 'Décret n° 2007-1167 du 2 août 2007, article 4', ref: 'decret-2007-1167', fichier: 'article-4' },
      { texte: 'Arrêté du 28 septembre 2007, article 1er', ref: 'arrete-2007-09-28', fichier: 'article-1' },
      { texte: 'Arrêté du 28 septembre 2007, article 3', ref: 'arrete-2007-09-28', fichier: 'article-3' },
      { texte: 'Arrêté du 28 septembre 2007, article 4', ref: 'arrete-2007-09-28', fichier: 'article-4' },
      { texte: 'Décret n° 2007-1167 du 2 août 2007, article 13', ref: 'decret-2007-1167', fichier: 'article-13' },
      { texte: 'Décret n° 2007-1167 du 2 août 2007, article 26', ref: 'decret-2007-1167', fichier: 'article-26' },
      {
        texte: 'Ministère de la Mer, « L’examen théorique du permis plaisance évolue », 1er juin 2022',
        ref: 'mer-gouv',
        url: 'https://www.mer.gouv.fr/lexamen-theorique-du-permis-plaisance-evolue',
      },
      {
        texte: 'Formulaire cerfa n° 14681*03, demande d’inscription à une option de base',
        ref: 'service-public',
        url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R21199',
      },
    ],
  },
  {
    slug: 'permis-cotier-cpf',
    titre: 'Le permis côtier avec son CPF',
    court: 'Le CPF',
    question: 'Peut-on payer le permis côtier avec son CPF ?',
    reponse:
      'Non. Le CPF finance des certifications professionnelles et certains permis routiers. Le permis bateau n’en fait pas partie, le gouvernement l’a redit en 2026.',
    sources: [
      { texte: 'Code du travail, article L6323-6', ref: 'code-travail', fichier: 'article-l6323-6' },
      { texte: 'Arrêté du 28 septembre 2007, article 1er', ref: 'arrete-2007-09-28', fichier: 'article-1' },
      {
        texte: 'Assemblée nationale, question écrite n° 8471, réponse publiée au JO le 3 février 2026',
        ref: 'assemblee-nationale',
        url: 'https://questions.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE8471',
      },
      {
        texte: 'Sénat, question orale n° 0827S, réponse publiée au JO le 13 octobre 2023',
        ref: 'senat',
        url: 'https://www.senat.fr/questions/base/2023/qSEQ23100827S.html',
      },
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
 * Les sources d'une page, chacune avec sa provenance et son adresse.
 *
 * Aucune n'est écartée. La version précédente jetait celle dont l'URL
 * manquait : la page citait alors moins de sources qu'elle n'en avait, et
 * personne ne pouvait le voir.
 */
export function sourcesResolues(page: PageGuide): readonly SourceAffichee[] {
  return resoudreSources(page.sources);
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
  'permis-cotier-candidat-libre': ['titre-conditions'],
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
