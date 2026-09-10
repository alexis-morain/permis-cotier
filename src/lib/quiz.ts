import { THEMES } from './themes';

/**
 * Format de l'épreuve, arrêté du 28 septembre 2007 art. 1er § 1.1, modifié par
 * l'arrêté du 22 avril 2022 : QCM de 40 questions, 5 erreurs admises.
 * Les 20 secondes par question ne sont pas dans l'arrêté, elles viennent de la
 * description de l'épreuve par les opérateurs agréés.
 */
export const TAILLE_EXAMEN = 40;
export const ERREURS_ADMISES = 5;
export const SECONDES_PAR_QUESTION = 20;

/** Le strict nécessaire pour jouer. Les pages passent leurs questions à ce format. */
export interface QuestionJouable {
  readonly id: string;
  readonly theme: string;
  readonly reponses: readonly string[];
  readonly propositions: readonly { readonly id: string }[];
}

/**
 * Ce que la progression retient d'une question.
 *
 * `derniereReussie` et `vueLe` disent la dernière rencontre. Les trois champs
 * qui suivent disent le rappel espacé, et c'est eux qui décident quand la
 * question revient : une bonne réponse ne l'efface plus, elle la repousse.
 */
export interface EtatQuestion {
  vues: number;
  ratees: number;
  derniereReussie: boolean;
  /** Date ISO courte de la dernière rencontre. */
  vueLe: string;
  /** Réussites d'affilée, remises à zéro à la première faute. */
  succes: number;
  /** Jour parisien de la dernière réussite, `AAAA-MM-JJ`. */
  dernierSuccesLe?: string;
  /** Jour parisien à partir duquel la question est due. */
  revoirLe?: string;
}

/**
 * Les paliers du rappel espacé, en jours.
 *
 * Un jour, trois, sept, vingt et un : la courbe classique, resserrée pour un
 * examen qu'on prépare en quelques semaines et non pour une langue qu'on
 * garde à vie. Au-delà du dernier palier l'intervalle ne grandit plus : rien
 * ne sert de reprogrammer une question après le jour J.
 */
export const INTERVALLES: readonly number[] = [1, 3, 7, 21];

/** Le nombre de jours à attendre après la `n`-ième réussite d'affilée. */
export function intervalle(succes: number): number {
  const rang = Math.min(Math.max(Math.floor(succes), 1), INTERVALLES.length);
  return INTERVALLES[rang - 1]!;
}

/**
 * « Retenue » veut dire deux réussites d'affilée, donc — par la règle du jour
 * unique de `enregistrerReponse` — deux jours différents. Une question
 * réussie une fois est vue, pas retenue : la correction était encore à
 * l'écran, ça ne prouve aucune mémoire.
 */
export function estRetenue(e: EtatQuestion | undefined): boolean {
  return e !== undefined && e.succes >= 2;
}

/**
 * Due : son jour de révision est arrivé. Une question jamais vue n'est pas
 * due, elle est à découvrir — c'est un autre geste, et la série les range
 * dans cet ordre.
 */
export function estDue(e: EtatQuestion | undefined, jour: string): boolean {
  return e?.revoirLe !== undefined && e.revoirLe <= jour;
}

/**
 * Le plafond d'une série quand le candidat n'a pas choisi de rythme. C'est le
 * rythme « Régulier » de `profil.ts`, redit ici pour que le moteur de série ne
 * dépende pas de la fiche du candidat ; un test tient les deux ensemble.
 */
export const TAILLE_SERIE_PAR_DEFAUT = 20;

export type Progression = Record<string, EtatQuestion>;

export type Alea = () => number;

/** mulberry32 : générateur semé, pour rejouer un tirage à l'identique. */
export function aleaSeme(graine: number): Alea {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function melanger<T>(liste: readonly T[], alea: Alea): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [copie[i], copie[j]] = [copie[j]!, copie[i]!];
  }
  return copie;
}

/** Tire un indice au hasard, pondéré par `poids`. Rend -1 si tous les poids sont nuls. */
function tirerPondere(poids: readonly number[], alea: Alea): number {
  const total = poids.reduce((a, b) => a + b, 0);
  if (total <= 0) return -1;
  let seuil = alea() * total;
  for (let i = 0; i < poids.length; i++) {
    seuil -= poids[i]!;
    if (seuil < 0) return i;
  }
  return poids.findLastIndex((p) => p > 0);
}

/**
 * Combien de questions tirer dans chaque thème.
 *
 * Chaque thème reçoit d'abord sa part entière, proportionnelle à sa cible dans
 * le programme. Les places restantes sont tirées au sort, pondérées par la
 * partie décimale. Un thème qui pèse deux tiers de question sur quarante sort
 * donc environ deux fois sur trois, comme dans un vrai tirage, au lieu d'être
 * toujours présent ou toujours absent.
 *
 * Un thème ne fournit jamais plus que ce qu'il a en banque : le reliquat part
 * aux autres. Si la banque entière est trop petite, la répartition rend moins
 * que `taille`.
 */
export function repartirParTheme(
  taille: number,
  disponibles: Readonly<Record<string, number>>,
  alea: Alea = Math.random,
): Record<string, number> {
  const eligibles = THEMES.filter((t) => (disponibles[t.code] ?? 0) > 0);
  const poidsTotal = eligibles.reduce((a, t) => a + t.cibleJ1, 0);

  const part: Record<string, number> = Object.fromEntries(THEMES.map((t) => [t.code, 0]));
  if (poidsTotal === 0 || taille <= 0) return part;

  const restes: number[] = [];
  for (const t of eligibles) {
    const quota = (taille * t.cibleJ1) / poidsTotal;
    part[t.code] = Math.min(Math.floor(quota), disponibles[t.code]!);
    restes.push(quota - Math.floor(quota));
  }

  let restant = taille - eligibles.reduce((a, t) => a + part[t.code]!, 0);
  const capacite = eligibles.map((t) => disponibles[t.code]! - part[t.code]!);

  while (restant > 0) {
    let poids = eligibles.map((_, i) => (capacite[i]! > 0 ? restes[i]! : 0));
    // Plus de décimales à distribuer mais des places à pourvoir : on repasse
    // au poids brut du thème, ce qui arrive quand un thème est à court.
    if (poids.every((p) => p <= 0)) {
      poids = eligibles.map((t, i) => (capacite[i]! > 0 ? t.cibleJ1 : 0));
    }
    const i = tirerPondere(poids, alea);
    if (i < 0) break;
    part[eligibles[i]!.code]! += 1;
    capacite[i]! -= 1;
    restes[i] = 0;
    restant -= 1;
  }

  return part;
}

/** Tire un examen blanc : la répartition du programme, puis un mélange général. */
export function tirerExamen(
  banque: readonly QuestionJouable[],
  alea: Alea = Math.random,
  taille: number = TAILLE_EXAMEN,
): QuestionJouable[] {
  const parTheme = new Map<string, QuestionJouable[]>();
  for (const q of banque) {
    const liste = parTheme.get(q.theme);
    if (liste) liste.push(q);
    else parTheme.set(q.theme, [q]);
  }

  const disponibles = Object.fromEntries([...parTheme].map(([code, l]) => [code, l.length]));
  const part = repartirParTheme(taille, disponibles, alea);

  const tirage: QuestionJouable[] = [];
  for (const [code, liste] of parTheme) {
    const n = part[code] ?? 0;
    if (n > 0) tirage.push(...melanger(liste, alea).slice(0, n));
  }

  return melanger(tirage, alea);
}

/**
 * Réponse exacte exigée : l'ensemble coché doit être exactement l'ensemble
 * attendu. Une bonne réponse accompagnée d'une mauvaise est fausse, une réponse
 * partielle aussi.
 */
export function corriger(question: QuestionJouable, selection: readonly string[]): boolean {
  const coche = new Set(selection);
  const attendu = new Set(question.reponses);
  if (coche.size !== attendu.size) return false;
  for (const r of attendu) if (!coche.has(r)) return false;
  return true;
}

export interface Resultat {
  bonnes: number;
  erreurs: number;
  total: number;
  reussi: boolean;
  ratees: string[];
  parTheme: Record<string, { bonnes: number; total: number }>;
}

/** Une question sans réponse compte comme une erreur, comme à l'examen. */
export function calculerResultat(
  questions: readonly QuestionJouable[],
  selections: readonly (readonly string[])[],
): Resultat {
  const parTheme: Record<string, { bonnes: number; total: number }> = {};
  const ratees: string[] = [];
  let bonnes = 0;

  questions.forEach((q, i) => {
    const juste = corriger(q, selections[i] ?? []);
    if (juste) bonnes += 1;
    else ratees.push(q.id);
    const t = (parTheme[q.theme] ??= { bonnes: 0, total: 0 });
    t.total += 1;
    if (juste) t.bonnes += 1;
  });

  const total = questions.length;
  return { bonnes, erreurs: total - bonnes, total, reussi: total - bonnes <= ERREURS_ADMISES, ratees, parTheme };
}

/**
 * Ordre d'entraînement : les questions ratées, la plus ancienne d'abord, puis
 * celles jamais vues, puis le reste, la plus ancienne d'abord. Pas de FSRS en
 * V1, ce classement suffit tant que les sessions restent proches dans le temps.
 */
export function ordonnerEntrainement<T extends { id: string }>(
  questions: readonly T[],
  progression: Progression,
): T[] {
  const rang = (q: T): number => {
    const e = progression[q.id];
    if (!e) return 1;
    return e.derniereReussie ? 2 : 0;
  };

  return [...questions]
    .map((q, index) => ({ q, index, rang: rang(q), vueLe: progression[q.id]?.vueLe ?? '' }))
    .sort((a, b) => a.rang - b.rang || a.vueLe.localeCompare(b.vueLe) || a.index - b.index)
    .map((x) => x.q);
}

/** Ce que la série du jour a besoin de savoir d'une question. */
export interface QuestionRangeable {
  readonly id: string;
  /** Code de notion, quand la question en porte un. */
  readonly notion?: string;
}

/**
 * Force d'une notion, entre 0 et 1 : la part de ses questions vues qui sont
 * retenues. Une notion jamais ouverte rend 2, ce qui la range derrière tout
 * ce qu'on travaille et qu'on rate — le trou connu se bouche ce soir, pas
 * l'inconnu. Même convention que `maitriseParTheme`.
 */
function forceParNotion(
  questions: readonly QuestionRangeable[],
  progression: Progression,
): Map<string, number> {
  const comptes = new Map<string, { vues: number; retenues: number }>();
  for (const q of questions) {
    const code = q.notion ?? '';
    const c = comptes.get(code) ?? { vues: 0, retenues: 0 };
    const e = progression[q.id];
    if (e) {
      c.vues += 1;
      if (estRetenue(e)) c.retenues += 1;
    }
    comptes.set(code, c);
  }
  return new Map([...comptes].map(([code, c]) => [code, c.vues === 0 ? 2 : c.retenues / c.vues]));
}

/**
 * La série du jour : ce qui est dû, puis de quoi découvrir.
 *
 * Les questions dues d'abord, la plus en retard en tête, et à égalité de jour
 * la plus fragile — celle dont la suite de réussites est la plus courte. Puis,
 * s'il reste de la place, des questions jamais vues, prises dans les notions
 * les plus faibles : la révision de ce qui glisse passe avant la découverte,
 * mais une journée où tout est frais ne doit pas rendre une série vide.
 *
 * `taille` est le rythme choisi par le candidat. Une série sans plafond n'est
 * pas une séance : c'est une liste, et une liste de deux cents questions ne se
 * commence pas.
 */
export function serieDuJour<T extends QuestionRangeable>(
  questions: readonly T[],
  progression: Progression,
  jour: string,
  taille: number = TAILLE_SERIE_PAR_DEFAUT,
): T[] {
  if (taille <= 0) return [];

  const dues = questions
    .map((q, index) => ({ q, index, e: progression[q.id] }))
    .filter((x) => estDue(x.e, jour))
    .sort(
      (a, b) =>
        (a.e!.revoirLe ?? '').localeCompare(b.e!.revoirLe ?? '') ||
        a.e!.succes - b.e!.succes ||
        a.e!.vueLe.localeCompare(b.e!.vueLe) ||
        a.index - b.index,
    )
    .map((x) => x.q);

  if (dues.length >= taille) return dues.slice(0, taille);

  const force = forceParNotion(questions, progression);
  const neuves = questions
    .map((q, index) => ({ q, index }))
    .filter((x) => progression[x.q.id] === undefined)
    .sort(
      (a, b) =>
        (force.get(a.q.notion ?? '') ?? 2) - (force.get(b.q.notion ?? '') ?? 2) || a.index - b.index,
    )
    .map((x) => x.q);

  return [...dues, ...neuves].slice(0, taille);
}
