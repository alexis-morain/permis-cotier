import { aleaSeme, melanger } from './quiz';
import type { Alea } from './quiz';

/**
 * L'ordre d'affichage des propositions d'une question.
 *
 * Le défaut mesuré, sur les 516 questions de `data/questions/` : parmi les 455
 * à réponse unique, la bonne est en « a » 361 fois (79 %), en « b » 85 fois
 * (19 %), en « c » 9 fois (2 %), jamais en « d » — là où le hasard donnerait
 * 36 % à chacune des trois ou quatre lignes. Sur les 61 questions à double
 * réponse, c'est le couple « a » et « b » 56 fois (92 %). Rendues dans l'ordre
 * du fichier, cocher la première case rapportait 70 % d'items justes et cocher
 * les deux premières suffisait à 56 questions doubles sur 61. La banque ne
 * mesurait plus rien, et le candidat apprenait une position au lieu d'une règle.
 *
 * La correction, elle, ne bouge pas : `reponses` cite des identifiants de
 * fichier, et `corriger` compare des ensembles d'identifiants. Seul l'ordre à
 * l'écran change, et avec lui la lettre — la deuxième ligne s'appelle « B »
 * même quand son identifiant est « a ».
 *
 * L'ordre est tiré d'une graine de session, pas d'un `Math.random()` à chaque
 * rendu : cocher une case, corriger ou reprendre un examen interrompu ne doit
 * jamais déplacer les propositions sous les doigts du candidat. La graine
 * voyage donc avec la session, jusque dans `localStorage`.
 */

/** Les lettres de l'écran, dans l'ordre où les lignes sont rendues. */
export const LETTRES_AFFICHEES = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * La graine d'une session de jeu. Un entier 32 bits, parce que c'est ce que
 * `aleaSeme` sème et ce qu'un JSON de sauvegarde relit sans perte.
 */
export function graineDeSession(alea: Alea = Math.random): number {
  return Math.floor(alea() * 4294967296) >>> 0;
}

/**
 * FNV-1a 32 bits sur l'identifiant de la question. Deux questions de la même
 * session doivent recevoir deux ordres sans rapport : sans cette empreinte,
 * elles partageraient la graine, donc la permutation, et la position de la
 * bonne réponse redeviendrait une information.
 */
function empreinte(texte: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Les propositions dans l'ordre où l'écran doit les rendre. Fisher-Yates semé,
 * donc uniforme et rejouable — un `sort()` à comparateur aléatoire ne serait ni
 * l'un ni l'autre.
 */
export function melangerPropositions<T extends { readonly id: string }>(
  propositions: readonly T[],
  graine: number,
  idQuestion: string,
): T[] {
  return melanger(propositions, aleaSeme((graine ^ empreinte(idQuestion)) >>> 0));
}

/** La lettre d'une ligne, d'après son rang à l'écran. */
export function lettreAffichee(rang: number): string {
  return LETTRES_AFFICHEES[rang] ?? String(rang + 1);
}

/**
 * Le rang visé par une touche du clavier, ou `undefined` si elle ne désigne
 * aucune ligne. « B » coche ce que l'écran appelle B, pas la proposition
 * d'identifiant « b ».
 */
export function rangDeLaTouche(touche: string): number | undefined {
  const rang = LETTRES_AFFICHEES.indexOf(touche.toUpperCase() as (typeof LETTRES_AFFICHEES)[number]);
  return rang < 0 ? undefined : rang;
}
