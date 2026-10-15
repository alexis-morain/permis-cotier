import type { EtatQuestion, Progression, Resultat } from './quiz';
import { estDue, intervalle } from './quiz';
import { aujourdhui as jourCourant, jourPlus } from './jour';
// Le jour se lit dans `jour.ts`. Réexporté ici parce que la moitié du site
// l'appelle en même temps que `charger` : une seule origine, deux portes.
export { aujourdhui } from './jour';
import type { SessionSauvegardee } from './session';
import { ecrire, lire, stockageParDefaut, type Stockage } from './stockage';

/**
 * Progression locale, dans le navigateur. Aucun compte, aucune donnée
 * personnelle, rien qui parte sur un serveur. Le code de synchronisation
 * anonyme arrive à J2 et réutilisera ce même objet.
 *
 * `VERSION_STOCKAGE` : à incrémenter quand la forme de l'état devient
 * illisible pour de bon. Un état d'une autre version est jeté. Tant qu'un
 * ancien état se traduit sans rien perdre, on le traduit plutôt que de le
 * jeter — voir `migrerQuestions` : la progression d'un candidat qui révise
 * depuis trois semaines a bien plus de valeur que la ligne de code économisée.
 */
export const VERSION_STOCKAGE = 1;
export const CLE_STOCKAGE = 'permis-cotier:progression';
const MAX_EXAMENS = 50;

export interface ExamenPasse {
  date: string;
  bonnes: number;
  total: number;
  reussi: boolean;
  /**
   * Justes et posées par thème, ce que `sur` (badges) relit. Champ facultatif,
   * ajouté sans changer la version : un examen d'avant lui n'en a pas, et ne
   * compte pas pour ce palier.
   */
  parTheme?: Record<string, ScoreTheme>;
}

export interface ScoreTheme {
  bonnes: number;
  total: number;
}

/** Les trois paliers d'un thème, dans l'ordre où on les gagne. */
export type PalierBadge = 'parcouru' | 'retenu' | 'sur';

/** Les badges d'un thème : le jour où chaque palier a été gagné, `AAAA-MM-JJ`. */
export type BadgesTheme = Partial<Record<PalierBadge, string>>;

export interface Etat {
  version: number;
  questions: Progression;
  examens: ExamenPasse[];
  /** Réponse à « ton examen est quand ? », facultative. */
  dateExamen: string | null;
  /**
   * L'examen commencé et pas fini, pour le retrouver après un rafraîchissement
   * ou un écran verrouillé. Champ ajouté sans changer `VERSION_STOCKAGE` :
   * il est facultatif, un état écrit avant lui se relit sans rien perdre.
   */
  enCours: SessionSauvegardee | null;
  /**
   * La série d'entraînement en cours, dans sa propre fente.
   *
   * Elle ne partage pas celle de l'examen : partir lire une leçon au milieu
   * d'un entraînement ne doit pas jeter l'examen laissé en plan la veille.
   * Son `theme` porte l'adresse de la série — `/entrainement/<thème>`,
   * `/entrainement/notion/<code>` ou `/revoir` —, ce qui suffit à ne pas
   * reprendre une série sur l'écran d'une autre. Même statut que `enCours` :
   * champ facultatif, ajouté sans changer la version.
   */
  enCoursSerie: SessionSauvegardee | null;
  /**
   * Les leçons du cours qu'on a suivies jusqu'au bout, avec le score de leur
   * vérification. Même statut que `enCours` : champ facultatif, ajouté sans
   * changer la version, un état écrit avant lui se relit sans rien perdre.
   */
  lecons: Record<string, LeconSuivie>;
  /**
   * Ce que le candidat a dit de lui au questionnaire de départ : pourquoi il
   * passe le permis, d'où il part, à quel rythme il compte réviser. Même
   * statut que `lecons` : facultatif, sans changement de version.
   */
  profil: Profil;
  /**
   * Réponses données par jour, `{ '2026-09-05': 23 }`. C'est ce qui fait la
   * série de jours et l'objectif quotidien de la fiche. Borné aux quatre cents
   * jours les plus récents.
   */
  activite: Record<string, number>;
  /**
   * Les badges gagnés, par code de thème. Ils se gardent : seul l'effacement
   * complet les retire (voir `badges.ts`). Même statut que `lecons` :
   * facultatif, sans changement de version.
   */
  badges: Record<string, BadgesTheme>;
}

export interface Profil {
  /** Facultatif : sert à s'adresser au candidat, jamais envoyé. */
  prenom: string;
  /** Codes de `MOTIVATIONS`, dans l'ordre coché. */
  motivations: string[];
  /** La raison dite avec ses mots, celle qu'on rappelle en premier. */
  phrase: string;
  /** Code de `DEPARTS` : d'où il part. */
  depart: string | null;
  /** Questions par jour visées, une valeur de `RYTHMES`. */
  rythme: number | null;
  /** Date du questionnaire, `null` tant qu'il n'a pas été rempli. */
  rempliLe: string | null;
}

const MAX_JOURS_ACTIVITE = 400;

export function profilVide(): Profil {
  return { prenom: '', motivations: [], phrase: '', depart: null, rythme: null, rempliLe: null };
}

/** Un profil relu depuis le stockage : chaque champ est vérifié, sinon il reprend sa valeur vide. */
function lireProfil(brut: unknown): Profil {
  const vide = profilVide();
  if (!brut || typeof brut !== 'object') return vide;
  const p = brut as Record<string, unknown>;
  const texte = (v: unknown, defaut: string) => (typeof v === 'string' ? v : defaut);
  const ouNull = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    prenom: texte(p.prenom, ''),
    motivations: Array.isArray(p.motivations) ? p.motivations.filter((m): m is string => typeof m === 'string') : [],
    phrase: texte(p.phrase, ''),
    depart: ouNull(p.depart),
    rythme: typeof p.rythme === 'number' && Number.isFinite(p.rythme) ? p.rythme : null,
    rempliLe: ouNull(p.rempliLe),
  };
}

function lireActivite(brut: unknown): Record<string, number> {
  if (!brut || typeof brut !== 'object') return {};
  const propre: Record<string, number> = {};
  for (const [jour, n] of Object.entries(brut as Record<string, unknown>)) {
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) propre[jour] = n;
  }
  return propre;
}

export function enregistrerProfil(etat: Etat, profil: Profil): Etat {
  return { ...etat, profil: { ...profil, motivations: [...profil.motivations] } };
}

/** Une réponse de plus sur ce jour ; au-delà de quatre cents jours, les plus anciens tombent. */
function compterActivite(activite: Record<string, number>, date: string): Record<string, number> {
  const suite = { ...activite, [date]: (activite[date] ?? 0) + 1 };
  const jours = Object.keys(suite);
  if (jours.length <= MAX_JOURS_ACTIVITE) return suite;
  const gardes = jours.sort().slice(-MAX_JOURS_ACTIVITE);
  return Object.fromEntries(gardes.map((j) => [j, suite[j]!]));
}

export interface LeconSuivie {
  faiteLe: string;
  /** Questions justes à la vérification de fin de leçon. */
  bonnes: number;
  /** Questions posées ; zéro quand la notion n'a pas encore de question. */
  total: number;
}

export type { Stockage } from './stockage';

export function etatInitial(): Etat {
  return {
    version: VERSION_STOCKAGE,
    questions: {},
    examens: [],
    dateExamen: null,
    enCours: null,
    enCoursSerie: null,
    lecons: {},
    profil: profilVide(),
    activite: {},
    badges: {},
  };
}

/** Une leçon suivie jusqu'au bout. La refaire remplace la fois d'avant. */
export function terminerLecon(
  etat: Etat,
  code: string,
  score: { bonnes: number; total: number },
  date: string,
): Etat {
  return {
    ...etat,
    lecons: { ...etat.lecons, [code]: { faiteLe: date, bonnes: score.bonnes, total: score.total } },
  };
}

export function enregistrerEnCours(etat: Etat, session: SessionSauvegardee): Etat {
  return { ...etat, enCours: session };
}

export function effacerEnCours(etat: Etat): Etat {
  return { ...etat, enCours: null };
}

export function enregistrerEnCoursSerie(etat: Etat, session: SessionSauvegardee): Etat {
  return { ...etat, enCoursSerie: session };
}

export function effacerEnCoursSerie(etat: Etat): Etat {
  return { ...etat, enCoursSerie: null };
}

/**
 * Une réponse de plus sur une question, et la reprogrammation qui va avec.
 *
 * Trois règles, et une seule qui compte vraiment :
 *
 * - une réussite un jour où la question a déjà été réussie ne fait rien
 *   avancer. C'est ce qui interdit de moudre une question dix fois d'affilée
 *   pour la faire disparaître : rater, relancer `/revoir` dix secondes plus
 *   tard avec la correction encore à l'écran et cocher la bonne case n'est pas
 *   une mémoire, c'est une recopie ;
 * - une réussite un jour neuf avance d'un cran et repousse d'autant ;
 * - un échec remet le compteur à zéro et rend la question due tout de suite.
 *
 * `dernierSuccesLe` n'est jamais effacé par un échec : c'est une date, elle
 * s'est produite. Seul `succes` retombe.
 */
export function enregistrerReponse(etat: Etat, id: string, reussie: boolean, date: string): Etat {
  const avant: EtatQuestion = etat.questions[id] ?? {
    vues: 0, ratees: 0, derniereReussie: false, vueLe: date, succes: 0,
  };

  const dejaReussieAujourdhui = reussie && avant.dernierSuccesLe === date;
  const succes = reussie ? (dejaReussieAujourdhui ? avant.succes : avant.succes + 1) : 0;
  const dernierSuccesLe = reussie ? date : avant.dernierSuccesLe;
  const revoirLe = !reussie
    ? date
    : dejaReussieAujourdhui
      ? avant.revoirLe
      : jourPlus(date, intervalle(succes));

  return {
    ...etat,
    questions: {
      ...etat.questions,
      [id]: {
        vues: avant.vues + 1,
        ratees: avant.ratees + (reussie ? 0 : 1),
        derniereReussie: reussie,
        vueLe: date,
        succes,
        ...(dernierSuccesLe !== undefined ? { dernierSuccesLe } : {}),
        ...(revoirLe !== undefined ? { revoirLe } : {}),
      },
    },
    activite: compterActivite(etat.activite, date),
  };
}

/**
 * Rien révisé encore : ni question répondue, ni leçon suivie, ni examen passé.
 * Le questionnaire de départ ne compte pas, il dit pourquoi on vient, pas ce
 * qu'on sait. C'est le visiteur qui ouvre l'examen blanc en arrivant, et qui
 * le quitte dans les deux premières minutes.
 */
export function rienRevise(etat: Etat): boolean {
  return (
    Object.keys(etat.questions).length === 0 &&
    Object.keys(etat.lecons).length === 0 &&
    etat.examens.length === 0
  );
}

/**
 * L'examen terminé tel que l'historique le garde, avec son détail par thème :
 * `calculerResultat` le donne déjà, on le recopie.
 */
export function examenPasse(resultat: Resultat, date: string): ExamenPasse {
  const parTheme = Object.fromEntries(
    Object.entries(resultat.parTheme).map(([theme, s]) => [theme, { bonnes: s.bonnes, total: s.total }]),
  );
  return { date, bonnes: resultat.bonnes, total: resultat.total, reussi: resultat.reussi, parTheme };
}

export function enregistrerExamen(etat: Etat, examen: ExamenPasse): Etat {
  return { ...etat, examens: [examen, ...etat.examens].slice(0, MAX_EXAMENS) };
}

export interface Statistiques {
  vues: number;
  /** Questions dues ce jour-là : c'est ce que `/revoir` joue en premier. */
  aRevoir: number;
  examensTermines: number;
  dernierScore: { bonnes: number; total: number; reussi: boolean } | null;
}

/**
 * `connues` borne le calcul aux questions encore publiées. Sans elle, une
 * question retirée après un signalement resterait comptée « à revoir » sur
 * l'accueil alors que `/revoir` ne peut plus la jouer, et les deux chiffres
 * divergeraient.
 */
export function statistiques(
  etat: Etat,
  connues?: readonly string[],
  jour: string = jourCourant(),
): Statistiques {
  const banque = connues ? new Set(connues) : null;
  const etats = Object.entries(etat.questions)
    .filter(([id]) => banque === null || banque.has(id))
    .map(([, e]) => e);
  const dernier = etat.examens[0];
  return {
    vues: etats.length,
    aRevoir: etats.filter((e) => estDue(e, jour)).length,
    examensTermines: etat.examens.length,
    dernierScore: dernier ? { bonnes: dernier.bonnes, total: dernier.total, reussi: dernier.reussi } : null,
  };
}

/**
 * Traduit une progression relue du navigateur vers la forme du rappel espacé.
 *
 * L'ancien état ne connaissait que `derniereReussie` et `vueLe`. On en tire le
 * moins mensonger : une question réussie vaut une réussite, datée du jour où
 * on l'a vue, donc due le lendemain ; une question ratée est due tout de
 * suite. Personne ne perd sa progression, et personne ne se retrouve « retenu »
 * sur une réussite dont on ne sait pas si elle tenait à autre chose qu'à la
 * correction restée à l'écran.
 *
 * Un état déjà traduit porte `succes` : il repasse tel quel. La migration est
 * donc idempotente, et relire deux fois donne le même état.
 *
 * Une entrée illisible est jetée plutôt que réparée au jugé : mieux vaut une
 * question à redécouvrir qu'un compteur inventé.
 */
export function migrerQuestions(brut: unknown): Progression {
  if (!brut || typeof brut !== 'object') return {};
  const propre: Progression = {};

  for (const [id, valeur] of Object.entries(brut as Record<string, unknown>)) {
    if (!valeur || typeof valeur !== 'object') continue;
    const e = valeur as Record<string, unknown>;
    if (typeof e.vues !== 'number' || typeof e.ratees !== 'number') continue;
    if (typeof e.derniereReussie !== 'boolean' || typeof e.vueLe !== 'string') continue;

    const base = {
      vues: e.vues,
      ratees: e.ratees,
      derniereReussie: e.derniereReussie,
      vueLe: e.vueLe,
    };

    if (typeof e.succes === 'number') {
      propre[id] = {
        ...base,
        succes: e.succes,
        ...(typeof e.dernierSuccesLe === 'string' ? { dernierSuccesLe: e.dernierSuccesLe } : {}),
        ...(typeof e.revoirLe === 'string' ? { revoirLe: e.revoirLe } : {}),
      };
      continue;
    }

    propre[id] = e.derniereReussie
      ? { ...base, succes: 1, dernierSuccesLe: e.vueLe, revoirLe: jourPlus(e.vueLe, intervalle(1)) }
      : { ...base, succes: 0, revoirLe: e.vueLe };
  }

  return propre;
}

function estScoreTheme(v: unknown): v is ScoreTheme {
  if (!v || typeof v !== 'object') return false;
  const { bonnes, total } = v as Record<string, unknown>;
  return (
    Number.isInteger(bonnes) && Number.isInteger(total) &&
    (bonnes as number) >= 0 && (bonnes as number) <= (total as number)
  );
}

/**
 * Un examen relu : le reste passe tel quel, comme avant ; un `parTheme` dont
 * une seule entrée est illisible est jeté en entier. L'examen ne compte alors
 * plus pour `sur`, ce qui vaut mieux qu'un « sans faute » inventé.
 */
function lireExamen(brut: unknown): ExamenPasse {
  if (!brut || typeof brut !== 'object' || !('parTheme' in brut)) return brut as ExamenPasse;
  const { parTheme, ...reste } = brut as ExamenPasse & { parTheme: unknown };
  const lisible =
    parTheme !== null && typeof parTheme === 'object' && !Array.isArray(parTheme) &&
    Object.values(parTheme).every(estScoreTheme);
  return lisible ? { ...reste, parTheme: parTheme as Record<string, ScoreTheme> } : reste;
}

const PALIERS_RANGES: readonly PalierBadge[] = ['parcouru', 'retenu', 'sur'];
const JOUR_RANGE = /^\d{4}-\d{2}-\d{2}$/;

/** Les badges relus : un palier inconnu ou sans date lisible est jeté, un thème vide aussi. */
function lireBadges(brut: unknown): Record<string, BadgesTheme> {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return {};
  const propre: Record<string, BadgesTheme> = {};
  for (const [theme, valeur] of Object.entries(brut as Record<string, unknown>)) {
    if (!valeur || typeof valeur !== 'object') continue;
    const dates = valeur as Record<string, unknown>;
    const gardes: BadgesTheme = {};
    for (const palier of PALIERS_RANGES) {
      const d = dates[palier];
      if (typeof d === 'string' && JOUR_RANGE.test(d)) gardes[palier] = d;
    }
    if (Object.keys(gardes).length > 0) propre[theme] = gardes;
  }
  return propre;
}

export function charger(stockage: Stockage | null = stockageParDefaut()): Etat {
  const brut = lire(CLE_STOCKAGE, stockage);
  if (!brut) return etatInitial();
  try {
    const lu = JSON.parse(brut) as Partial<Etat>;
    if (lu?.version !== VERSION_STOCKAGE) return etatInitial();
    return {
      version: VERSION_STOCKAGE,
      questions: migrerQuestions(lu.questions),
      examens: Array.isArray(lu.examens) ? lu.examens.map(lireExamen) : [],
      dateExamen: lu.dateExamen ?? null,
      enCours: lu.enCours ?? null,
      enCoursSerie: lu.enCoursSerie ?? null,
      lecons: lu.lecons && typeof lu.lecons === 'object' ? lu.lecons : {},
      profil: lireProfil(lu.profil),
      activite: lireActivite(lu.activite),
      badges: lireBadges(lu.badges),
    };
  } catch {
    return etatInitial();
  }
}

/**
 * La date d'examen vient d'être posée, changée ou effacée : les écrans le
 * disent par cet événement, sur `window`, avec la date en `detail` (`null`
 * pour effacée). Personne n'écoute sur le site ; dans l'app, la coquille
 * arme ou tait les rappels (`armerLesRappelsSurLaDate` de `natif.ts`).
 * L'écran n'importe rien de natif : le site ne paie pas un octet pour l'app.
 */
export const EVENEMENT_DATE_EXAMEN = 'permis-cotier:date-examen';

export function annoncerDateExamen(date: string | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<string | null>(EVENEMENT_DATE_EXAMEN, { detail: date }));
}

export function sauvegarder(etat: Etat, stockage: Stockage | null = stockageParDefaut()): void {
  // Quota plein ou écriture refusée : la session continue, sans mémoire.
  ecrire(CLE_STOCKAGE, JSON.stringify(etat), stockage);
}

export function effacer(stockage: Stockage | null = stockageParDefaut()): void {
  ecrire(CLE_STOCKAGE, null, stockage);
}
