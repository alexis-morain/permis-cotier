/**
 * Ce que le site dit de lui-même aux moteurs et aux modèles.
 *
 * Trois choses vivent ici, et nulle part ailleurs :
 *   - l'identité du site : son nom, son auteur, la phrase qui le résume ;
 *   - la fabrique des titres, pour qu'aucune page n'invente sa propre règle ;
 *   - les données structurées, écrites en JSON-LD.
 *
 * Sur les données structurées, une seule règle tient tout le fichier : on ne
 * déclare que ce que la page montre vraiment. Un balisage qui promet ce qui
 * n'est pas à l'écran se retourne contre le site le jour où Google le vérifie,
 * et il vérifie. D'où l'absence de `SearchAction` — il n'y a pas de recherche
 * sur ce site — et d'`aggregateRating`, que personne n'a noté.
 */

export const SITE = {
  /** Le nom, tel qu'il s'écrit partout : onglet, partage, JSON-LD, manifeste. */
  nom: 'Le Permis Côtier',
  /** Domaine de repli. `Astro.site` fait foi ; ceci sert quand il manque. */
  domaine: 'https://lepermiscotier.fr',
  auteur: 'Alexis Morain',
  /** Deux phrases : ce que le site est, et ce qui le distingue. */
  description:
    'Examens blancs au format de l’épreuve et entraînement par thème pour le permis plaisance option côtière. Gratuit, sans inscription, chaque question cite le texte réglementaire dont elle est tirée.',
  langue: 'fr-FR',
} as const;

/**
 * Au-delà, Google coupe le titre dans la liste de résultats. La marque est
 * ajoutée seulement si l'ensemble tient : un titre tranché au milieu du nom du
 * site est pire qu'un titre sans nom du site.
 */
export const TITRE_MAX = 65;
const SUFFIXE = ` — ${SITE.nom}`;

export function titrePage(titre: string): string {
  const propre = titre.trim();
  if (propre.length === 0) return SITE.nom;
  if (propre.includes(SITE.nom)) return propre;
  return propre.length + SUFFIXE.length <= TITRE_MAX ? propre + SUFFIXE : propre;
}

/**
 * Une méta description trop longue est coupée, trop courte est réécrite par
 * Google à partir de la page. On vise la fenêtre utile et on coupe au mot.
 */
export const DESCRIPTION_MAX = 158;

export function descriptionPage(texte: string): string {
  return couperAuMot(texte, DESCRIPTION_MAX);
}

/**
 * Couper au mot, jamais au milieu. Un `slice` brut donne des titres comme
 * « Quelles sont la couleur et la f », qui coûtent le clic qu'ils devaient
 * gagner.
 */
export function couperAuMot(texte: string, limite: number): string {
  const propre = texte.replace(/\s+/g, ' ').trim();
  if (propre.length <= limite) return propre;
  // L'ellipse tient dans la limite, elle ne s'y ajoute pas.
  const coupe = propre.slice(0, limite);
  const espace = coupe.lastIndexOf(' ');
  const garde = espace > 0 ? coupe.slice(0, espace) : coupe.slice(0, limite - 1);
  return garde.replace(/[\s,;:.]+$/, '') + '…';
}

export function absolue(chemin: string, base: URL | string = SITE.domaine): string {
  return new URL(chemin, base).href;
}

/**
 * Le chemin tel qu'il est servi, et non tel qu'il est écrit sur le disque.
 *
 * Le site est construit en `format: 'file'` : une page sort en
 * `/notion/balisage-cardinal.html`, et c'est ce que `Astro.url.pathname` rend
 * au build. Mais Cloudflare la sert sur `/notion/balisage-cardinal`, et c'est
 * cette adresse-là que le sitemap annonce. Sans cette normalisation, l'URL
 * canonique d'une page désigne une autre adresse que celle par laquelle Google
 * y arrive : deux adresses pour une page, et l'indexation en pâtit.
 */
export function cheminServi(pathname: string): string {
  const sansExtension = pathname.replace(/\.html$/, '');
  const sansIndex = sansExtension.replace(/\/index$/, '/');
  if (sansIndex === '') return '/';
  return sansIndex.length > 1 ? sansIndex.replace(/\/$/, '') : sansIndex;
}

// --------------------------------------------------------------- JSON-LD

export type JsonLd = Record<string, unknown>;

/**
 * L'auteur, cité par les pages qui portent une affirmation réglementaire.
 *
 * `@id` est un identifiant, pas une adresse à visiter : il peut désigner une
 * ancre de page qui n'existe pas encore. `url`, lui, doit mener quelque part,
 * et n'est donc posé que si la page auteur est du voyage — elle arrive avec la
 * branche `audit-ux`. `scripts/audit-seo.mjs` vérifie que toute adresse interne
 * du balisage correspond à une page construite.
 */
export const PAGE_AUTEUR: string | undefined = undefined;

export function personneAuteur(base: URL | string): JsonLd {
  return {
    '@type': 'Person',
    '@id': absolue('/a-propos#auteur', base),
    name: SITE.auteur,
    ...(PAGE_AUTEUR ? { url: absolue(PAGE_AUTEUR, base) } : {}),
    sameAs: ['https://github.com/alexis-morain/permis-cotier'],
  };
}

export function siteWeb(base: URL | string): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': absolue('/#site', base),
    name: SITE.nom,
    alternateName: 'Permis côtier',
    url: absolue('/', base),
    description: SITE.description,
    inLanguage: SITE.langue,
    isAccessibleForFree: true,
    author: personneAuteur(base),
    publisher: { '@id': absolue('/a-propos#auteur', base) },
    license: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  };
}

export interface Miette {
  nom: string;
  chemin: string;
}

/**
 * Le fil d'Ariane, pour Google et pour le lecteur. Il remplace l'URL nue sous
 * le titre du résultat, et c'est le seul balisage qui dit à un moteur comment
 * le site est organisé.
 */
export function filAriane(miettes: readonly Miette[], base: URL | string): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: miettes.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.nom,
      item: absolue(m.chemin, base),
    })),
  };
}

export interface QuestionFaq {
  question: string;
  reponse: string;
}

export function faq(entrees: readonly QuestionFaq[]): JsonLd {
  return {
    '@type': 'FAQPage',
    mainEntity: entrees.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.reponse },
    })),
  };
}

export interface QuestionBalisable {
  id: string;
  enonce: string;
  explication: string;
  propositions: readonly { id: string; texte: string }[];
  reponses: readonly string[];
  theme: string;
}

/**
 * Une question de la banque, en `Quiz`. C'est le balisage des « exercices
 * pratiques » de Google : il demande le type de question, toutes les
 * propositions, et laquelle est juste. Une question à deux bonnes réponses est
 * déclarée telle quelle, avec ses deux réponses acceptées.
 */
export function quiz(q: QuestionBalisable, nomTheme: string, base: URL | string): JsonLd {
  const justes = q.propositions.filter((p) => q.reponses.includes(p.id));
  const fausses = q.propositions.filter((p) => !q.reponses.includes(p.id));
  const reponse = (p: { texte: string }, avecExplication: boolean) => ({
    '@type': 'Answer',
    text: p.texte,
    ...(avecExplication ? { comment: { '@type': 'Comment', text: q.explication } } : {}),
  });

  // Le schéma de la banque impose une à deux bonnes réponses. Si aucune n'est
  // trouvée ici, c'est la donnée qui est fautive, pas l'affichage : mieux vaut
  // un balisage absent qu'un balisage qui ment sur la réponse.
  if (justes.length === 0) {
    throw new Error(`question sans bonne réponse : ${q.id}`);
  }

  return {
    '@type': 'Quiz',
    '@id': absolue(`/question/${q.id}#quiz`, base),
    name: `Question de ${nomTheme.toLowerCase()} — permis côtier`,
    educationalLevel: 'beginner',
    assesses: nomTheme,
    inLanguage: SITE.langue,
    isAccessibleForFree: true,
    about: { '@type': 'Thing', name: nomTheme },
    hasPart: {
      '@type': 'Question',
      eduQuestionType: 'Multiple choice',
      name: q.enonce,
      text: q.enonce,
      ...(justes.length === 1 && justes[0] !== undefined
        ? { acceptedAnswer: reponse(justes[0], true) }
        : { acceptedAnswer: justes.map((p, i) => reponse(p, i === 0)) }),
      suggestedAnswer: fausses.map((p) => reponse(p, false)),
    },
  };
}

/**
 * Une notion du programme, en ressource d'apprentissage. `teaches` est le champ
 * que les moteurs lisent pour savoir ce qu'on y apprend.
 */
export function ressource(
  params: {
    nom: string;
    resume: string;
    chemin: string;
    theme: string;
    nombreQuestions: number;
  },
  base: URL | string,
): JsonLd {
  return {
    '@type': 'LearningResource',
    '@id': absolue(`${params.chemin}#ressource`, base),
    name: params.nom,
    description: params.resume,
    url: absolue(params.chemin, base),
    teaches: params.nom,
    about: { '@type': 'Thing', name: params.theme },
    educationalLevel: 'beginner',
    learningResourceType: params.nombreQuestions > 0 ? ['Fiche de révision', 'Questions d’entraînement'] : 'Fiche de révision',
    inLanguage: SITE.langue,
    isAccessibleForFree: true,
    isPartOf: { '@id': absolue('/#site', base) },
    author: personneAuteur(base),
    license: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
  };
}

/**
 * Une page rédigée qui répond à une question, avec les textes sur lesquels elle
 * s'appuie. `citation` est ce qui distingue ce site d'un blog : chaque page dit
 * d'où elle tient ce qu'elle affirme.
 */
export function articlePage(
  params: {
    titre: string;
    description: string;
    chemin: string;
    modifieLe: string;
    citations?: readonly string[];
  },
  base: URL | string,
): JsonLd {
  return {
    '@type': 'Article',
    '@id': absolue(`${params.chemin}#article`, base),
    headline: params.titre,
    description: params.description,
    url: absolue(params.chemin, base),
    dateModified: params.modifieLe,
    inLanguage: SITE.langue,
    isAccessibleForFree: true,
    isPartOf: { '@id': absolue('/#site', base) },
    author: personneAuteur(base),
    publisher: { '@id': absolue('/a-propos#auteur', base) },
    ...(params.citations?.length ? { citation: params.citations } : {}),
  };
}

/** Emballe un ou plusieurs nœuds dans un graphe unique, prêt à sérialiser. */
export function graphe(noeuds: readonly JsonLd[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': noeuds });
}

/**
 * Le titre d'une page question : l'énoncé entier.
 *
 * Le tronquer pour tenir en soixante caractères produisait des doublons —
 * « Tu barres un navire à propulsion… » désignait deux questions différentes —
 * et deux pages au même titre se font concurrence sur la même requête. Un titre
 * long n'est pas pénalisé, il est seulement coupé à l'affichage : sur ces pages
 * de longue traîne, l'unicité vaut mieux que la brièveté.
 *
 * Le discriminant sert au seul cas que l'énoncé ne sépare pas : quatre
 * questions sur les cardinales portent le même texte et ne diffèrent que par
 * leur dessin. On y ajoute alors le texte du visuel.
 */
export function titreQuestion(enonce: string, discriminant?: string): string {
  const propre = enonce.replace(/\s+/g, ' ').trim();
  if (!discriminant) return propre;
  const marque = discriminant.replace(/\s+/g, ' ').trim();
  if (marque === '' || propre.toLowerCase().includes(marque.toLowerCase())) return propre;
  return `${propre} — ${couperAuMot(marque, 60)}`;
}

