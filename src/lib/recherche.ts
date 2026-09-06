/**
 * La recherche du site : un index construit au build, servi en un fichier, et
 * quelques fonctions pures pour y chercher dans le navigateur.
 *
 * Le site est statique et tient en cinq cents pages. Un moteur côté serveur
 * n'aurait rien à faire ici, et une bibliothèque d'index inversé pèserait plus
 * que l'index lui-même. On compare donc des chaînes, sur des champs déjà mis à
 * plat une seule fois au chargement.
 *
 * Ce qui compte pour quelqu'un qui révise : taper « cardinale », « feu vert »
 * ou « canal 16 » et tomber sur la leçon, pas sur la trentième question qui
 * contient le mot. D'où trois décisions :
 *
 *   - le titre pèse beaucoup plus que le corps ;
 *   - tous les mots tapés doivent porter, sinon l'entrée sort — deux mots
 *     servent à réduire, jamais à élargir ;
 *   - à pertinence égale, une leçon passe devant une notion, qui passe devant
 *     une question. On cherche de quoi réviser, pas de quoi se noyer.
 *
 * Le module ne touche ni au DOM ni au disque : `src/pages/recherche.json.ts`
 * fabrique l'index, `src/components/Recherche.astro` l'affiche.
 */

/** Ce qu'une entrée désigne. L'ordre des mots ne compte pas, celui des poids si. */
export type Genre = 'lecon' | 'notion' | 'theme' | 'guide' | 'page' | 'question';

export interface Entree {
  readonly genre: Genre;
  /** Ce qui s'affiche en tête du résultat. */
  readonly titre: string;
  /** La ligne de situation : le thème, le chapitre. */
  readonly contexte?: string;
  /** Une ou deux lignes sous le titre. */
  readonly resume?: string;
  readonly url: string;
  /** Ce qui se cherche sans s'afficher : corps de la leçon, synonymes. */
  readonly mots?: string;
}

/** Une entrée avec ses champs mis à plat, prête à être comparée. */
export interface EntreePreparee {
  readonly entree: Entree;
  readonly titre: string;
  readonly texte: string;
}

export interface Resultat {
  readonly entree: Entree;
  readonly score: number;
}

/** Un morceau de texte affiché, marqué ou non. */
export interface Passage {
  readonly texte: string;
  readonly trouve: boolean;
}

/**
 * Les mots qu'on ne cherche pas. « est » et « sont » n'y sont pas : sur ce
 * site, « est » est un point cardinal avant d'être un verbe.
 */
const MOTS_VIDES: ReadonlySet<string> = new Set([
  'au', 'aux', 'avec', 'ce', 'ces', 'cet', 'cette', 'dans', 'de', 'des', 'du',
  'elle', 'en', 'et', 'il', 'ils', 'je', 'la', 'le', 'les', 'leur', 'lui',
  'mais', 'me', 'mon', 'ne', 'nous', 'on', 'ou', 'par', 'pas', 'pour', 'que',
  'quel', 'quelle', 'quelles', 'quels', 'qui', 'quoi', 'sa', 'se', 'ses',
  'son', 'sur', 'te', 'tu', 'un', 'une', 'vous', 'y',
]);

/**
 * Ce que vaut un genre, en facteur et non en prime.
 *
 * Une prime rangerait toujours une notion effleurée devant une question qui
 * tombe pile ; un facteur laisse la pertinence décider quand l'écart est
 * grand, et le genre trancher quand il est faible. « cardinale » touche le
 * titre d'une leçon par son début et l'énoncé d'une question en plein milieu :
 * c'est la leçon qu'on cherchait.
 */
const FACTEUR_GENRE: Readonly<Record<Genre, number>> = {
  lecon: 2.2,
  notion: 2,
  theme: 1.8,
  page: 1.6,
  guide: 1.5,
  question: 1,
};

/** Combien de résultats l'écran montre par défaut. */
export const LIMITE = 24;

/**
 * Combien de questions au plus, quand autre chose répond. Quatre cent
 * quatre-vingt-trois énoncés parlent de balisage : sans plafond, ils
 * chasseraient de l'écran la leçon et la fiche qui l'expliquent. Quand elles
 * ne répondent pas, le plafond saute — la banque est alors la seule réponse.
 */
export const MAX_QUESTIONS = 6;

/**
 * Minuscules et accents ôtés, un caractère pour un caractère.
 *
 * La longueur est tenue exprès : `passages` s'en sert pour retrouver, dans le
 * texte d'origine et à la bonne place, ce que la requête a touché. Les
 * ligatures restent donc telles quelles ici — `normaliser` les défait, lui,
 * puisque rien ne dépend plus de la position.
 */
function applatir(texte: string): string {
  let plat = '';
  for (const caractere of texte) {
    const sans = caractere.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    plat += sans.length === caractere.length ? sans : caractere.toLowerCase();
  }
  return plat;
}

/**
 * La forme sur laquelle on compare : minuscules, sans accent, sans ponctuation,
 * un espace entre chaque mot. « L'écluse » et « l ecluse » se rejoignent, et
 * « manœuvre » se tape aussi « manoeuvre ».
 */
export function normaliser(texte: string): string {
  return applatir(texte)
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Les mots d'une requête. Les mots vides tombent, sauf s'il ne reste rien :
 * quelqu'un qui tape « les » cherche vraiment « les ».
 */
export function motsDeLaRequete(requete: string): string[] {
  const mots = normaliser(requete).split(' ').filter((m) => m.length > 0);
  const utiles = mots.filter((m) => !MOTS_VIDES.has(m));
  return utiles.length > 0 ? utiles : mots;
}

/**
 * Le singulier d'un mot au pluriel, pour que « feux » trouve « feu ». Rien de
 * plus savant : le français de ce programme met un s ou un x, et une
 * lemmatisation complète coûterait plus qu'elle ne rapporte.
 */
function radical(mot: string): string {
  return mot.length >= 4 && (mot.endsWith('s') || mot.endsWith('x')) ? mot.slice(0, -1) : '';
}

/** Ce que vaut un mot dans un champ : mot entier, début de mot, ou dedans. */
function scoreDansChamp(mot: string, champ: string, entier: number, debut: number, dedans: number): number {
  const borde = ` ${champ} `;
  if (borde.includes(` ${mot} `)) return entier;
  if (mot.length >= 2 && borde.includes(` ${mot}`)) return debut;
  if (mot.length >= 3 && champ.includes(mot)) return dedans;
  return 0;
}

/** Ce que vaut un mot dans une entrée. Zéro veut dire : cette entrée sort. */
function scoreDuMot(mot: string, titre: string, texte: string): number {
  const direct = Math.max(scoreDansChamp(mot, titre, 10, 7, 4), scoreDansChamp(mot, texte, 3, 2, 1));
  if (direct > 0) return direct;

  const singulier = radical(mot);
  if (!singulier) return 0;
  // Le pluriel rapproché vaut moins que le mot tel qu'il a été tapé.
  return (
    0.7 * Math.max(scoreDansChamp(singulier, titre, 10, 7, 4), scoreDansChamp(singulier, texte, 3, 2, 1))
  );
}

/**
 * Les genres dont le titre n'en est pas un.
 *
 * Ce qu'on affiche en tête d'une question, c'est son énoncé : une phrase
 * entière, qui contient forcément les mots de son thème. Le compter comme un
 * titre reviendrait à dire que « feu vert » désigne mieux quatre cents énoncés
 * que la leçon sur les feux de navigation. L'énoncé entre donc dans le texte,
 * et la question n'a pas de titre à peser.
 */
const SANS_TITRE: ReadonlySet<Genre> = new Set<Genre>(['question']);

/** L'index mis à plat, une fois pour toutes après le chargement. */
export function preparer(index: readonly Entree[]): EntreePreparee[] {
  return index.map((entree) => ({
    entree,
    titre: SANS_TITRE.has(entree.genre) ? '' : normaliser(entree.titre),
    texte: normaliser([entree.titre, entree.contexte, entree.resume, entree.mots].filter(Boolean).join(' ')),
  }));
}

/** Les entrées qui répondent à la requête, la plus proche d'abord. */
export function chercher(
  prepare: readonly EntreePreparee[],
  requete: string,
  limite: number = LIMITE,
): Resultat[] {
  const mots = motsDeLaRequete(requete);
  if (mots.length === 0) return [];
  const entiere = normaliser(requete);

  const trouves: Resultat[] = [];
  for (const p of prepare) {
    let score = 0;
    let complet = true;
    for (const mot of mots) {
      const valeur = scoreDuMot(mot, p.titre, p.texte);
      if (valeur === 0) {
        complet = false;
        break;
      }
      score += valeur;
    }
    if (!complet) continue;

    score *= FACTEUR_GENRE[p.entree.genre];
    // Le titre tapé en entier gagne, et de loin : c'est le cas où l'on sait
    // déjà ce qu'on cherche. La prime est hors genre, exprès — taper « examen »
    // doit mener à l'examen blanc, pas à la leçon qui en parle.
    if (p.titre.length > 0) {
      if (p.titre === entiere) score += 30;
      else if (p.titre.startsWith(entiere)) score += 6;
    }

    trouves.push({ entree: p.entree, score });
  }

  trouves.sort(
    (a, b) =>
      b.score - a.score ||
      a.entree.titre.length - b.entree.titre.length ||
      a.entree.titre.localeCompare(b.entree.titre, 'fr'),
  );

  return plafonner(trouves, limite);
}

/** La liste coupée à la limite, les questions à leur plafond s'il y a mieux. */
function plafonner(trouves: readonly Resultat[], limite: number): Resultat[] {
  const plafond = trouves.some((r) => r.entree.genre !== 'question') ? MAX_QUESTIONS : limite;

  const gardes: Resultat[] = [];
  let questions = 0;
  for (const resultat of trouves) {
    if (resultat.entree.genre === 'question') {
      if (questions >= plafond) continue;
      questions += 1;
    }
    gardes.push(resultat);
    if (gardes.length >= limite) break;
  }
  return gardes;
}

/**
 * Au-delà, ce n'est plus une recherche mais un collage. La question la plus
 * longue de la banque fait deux cent quarante signes : quelqu'un qui en colle
 * une entière cherche pour de bon, et on perd ce cas-là. C'est le prix à payer
 * pour que le champ le plus exposé du site n'expédie jamais un paragraphe
 * entier vers un serveur.
 */
export const LONGUEUR_TERME_MAX = 60;

/**
 * Ce qui n'a rien à faire dans un compteur : une adresse électronique, une
 * adresse web, une longue suite de chiffres. On regarde la requête brute, pas
 * la forme mise à plat — celle-ci a déjà mangé l'arobase et les points, et ne
 * laisserait plus rien à reconnaître.
 *
 * Six chiffres d'affilée : « canal 16 », « règle 13 » et « arrêté du
 * 28 septembre 2007 » passent, un numéro de téléphone ou de carte non.
 */
const SUSPECT = /@|https?:|www\.|\d{6,}/i;

/**
 * Le terme tel qu'on le compte, ou rien du tout.
 *
 * Savoir ce que les gens cherchent dit quoi écrire ensuite, et surtout ce
 * qu'ils ne trouvent pas. Mais un champ libre finit toujours par recevoir
 * autre chose qu'une recherche, et ce site promet de ne rien savoir de
 * personne : au moindre doute, on n'envoie pas. La casse et les accents
 * tombent pour regrouper « Marée » et « maree » ; la faute de frappe reste,
 * c'est elle qui apprend le plus.
 */
export function termeMesurable(requete: string): string | null {
  if (SUSPECT.test(requete)) return null;
  const terme = normaliser(requete);
  if (terme.length < 3 || terme.length > LONGUEUR_TERME_MAX) return null;
  return terme;
}

/**
 * Le texte découpé en morceaux, ceux que la requête a touchés marqués. L'écran
 * en fait des `<mark>` sans jamais recoller de HTML : chaque morceau reste du
 * texte.
 */
export function passages(texte: string, mots: readonly string[]): Passage[] {
  const plat = applatir(texte);
  const zones: [number, number][] = [];

  for (const mot of mots) {
    for (const forme of [mot, radical(mot)]) {
      if (!forme) continue;
      let debut = plat.indexOf(forme);
      if (debut === -1) continue;
      while (debut !== -1) {
        zones.push([debut, debut + forme.length]);
        debut = plat.indexOf(forme, debut + forme.length);
      }
      break;
    }
  }

  if (zones.length === 0) return [{ texte, trouve: false }];

  zones.sort((a, b) => a[0] - b[0]);
  const fondues: [number, number][] = [];
  for (const [debut, fin] of zones) {
    const derniere = fondues[fondues.length - 1];
    if (derniere && debut <= derniere[1]) derniere[1] = Math.max(derniere[1], fin);
    else fondues.push([debut, fin]);
  }

  const morceaux: Passage[] = [];
  let curseur = 0;
  for (const [debut, fin] of fondues) {
    if (debut > curseur) morceaux.push({ texte: texte.slice(curseur, debut), trouve: false });
    morceaux.push({ texte: texte.slice(debut, fin), trouve: true });
    curseur = fin;
  }
  if (curseur < texte.length) morceaux.push({ texte: texte.slice(curseur), trouve: false });
  return morceaux;
}
