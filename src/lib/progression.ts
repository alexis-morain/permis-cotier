import type { EtatQuestion, Progression } from './quiz';
import type { SessionSauvegardee } from './session';

/**
 * Progression locale, dans le navigateur. Aucun compte, aucune donnée
 * personnelle, rien qui parte sur un serveur. Le code de synchronisation
 * anonyme arrive à J2 et réutilisera ce même objet.
 *
 * `VERSION_STOCKAGE` : à incrémenter quand la forme de l'état change. Un état
 * d'une autre version est jeté plutôt que migré, la progression n'a pas assez
 * de valeur pour justifier du code de migration.
 */
export const VERSION_STOCKAGE = 1;
export const CLE_STOCKAGE = 'permis-cotier:progression';
const MAX_EXAMENS = 50;

export interface ExamenPasse {
  date: string;
  bonnes: number;
  total: number;
  reussi: boolean;
}

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
   * Les leçons du cours qu'on a suivies jusqu'au bout, avec le score de leur
   * vérification. Même statut que `enCours` : champ facultatif, ajouté sans
   * changer la version, un état écrit avant lui se relit sans rien perdre.
   */
  lecons: Record<string, LeconSuivie>;
}

export interface LeconSuivie {
  faiteLe: string;
  /** Questions justes à la vérification de fin de leçon. */
  bonnes: number;
  /** Questions posées ; zéro quand la notion n'a pas encore de question. */
  total: number;
}

/** Le sous-ensemble de localStorage qu'on utilise, pour pouvoir le remplacer en test. */
export interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

export function etatInitial(): Etat {
  return { version: VERSION_STOCKAGE, questions: {}, examens: [], dateExamen: null, enCours: null, lecons: {} };
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

/** Les codes des leçons faites, sous la forme que le parcours attend. */
export function leconsFaites(etat: Etat): Record<string, boolean> {
  return Object.fromEntries(Object.keys(etat.lecons).map((code) => [code, true]));
}

export function enregistrerEnCours(etat: Etat, session: SessionSauvegardee): Etat {
  return { ...etat, enCours: session };
}

export function effacerEnCours(etat: Etat): Etat {
  return { ...etat, enCours: null };
}

export function enregistrerReponse(etat: Etat, id: string, reussie: boolean, date: string): Etat {
  const avant: EtatQuestion = etat.questions[id] ?? { vues: 0, ratees: 0, derniereReussie: false, vueLe: date };
  return {
    ...etat,
    questions: {
      ...etat.questions,
      [id]: {
        vues: avant.vues + 1,
        ratees: avant.ratees + (reussie ? 0 : 1),
        derniereReussie: reussie,
        vueLe: date,
      },
    },
  };
}

export function enregistrerExamen(etat: Etat, examen: ExamenPasse): Etat {
  return { ...etat, examens: [examen, ...etat.examens].slice(0, MAX_EXAMENS) };
}

export interface Statistiques {
  vues: number;
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
export function statistiques(etat: Etat, connues?: readonly string[]): Statistiques {
  const banque = connues ? new Set(connues) : null;
  const etats = Object.entries(etat.questions)
    .filter(([id]) => banque === null || banque.has(id))
    .map(([, e]) => e);
  const dernier = etat.examens[0];
  return {
    vues: etats.length,
    aRevoir: etats.filter((e) => !e.derniereReussie).length,
    examensTermines: etat.examens.length,
    dernierScore: dernier ? { bonnes: dernier.bonnes, total: dernier.total, reussi: dernier.reussi } : null,
  };
}

function stockageParDefaut(): Stockage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Navigation privée ou cookies bloqués : on tourne sans mémoire.
    return null;
  }
}

export function charger(stockage: Stockage | null = stockageParDefaut()): Etat {
  if (!stockage) return etatInitial();
  try {
    const brut = stockage.getItem(CLE_STOCKAGE);
    if (!brut) return etatInitial();
    const lu = JSON.parse(brut) as Partial<Etat>;
    if (lu?.version !== VERSION_STOCKAGE) return etatInitial();
    return {
      version: VERSION_STOCKAGE,
      questions: lu.questions ?? {},
      examens: Array.isArray(lu.examens) ? lu.examens : [],
      dateExamen: lu.dateExamen ?? null,
      enCours: lu.enCours ?? null,
      lecons: lu.lecons && typeof lu.lecons === 'object' ? lu.lecons : {},
    };
  } catch {
    return etatInitial();
  }
}

export function sauvegarder(etat: Etat, stockage: Stockage | null = stockageParDefaut()): void {
  if (!stockage) return;
  try {
    stockage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
  } catch {
    // Quota plein ou écriture refusée : la session continue, sans mémoire.
  }
}

export function effacer(stockage: Stockage | null = stockageParDefaut()): void {
  if (!stockage) return;
  try {
    stockage.removeItem(CLE_STOCKAGE);
  } catch {
    /* rien à faire */
  }
}

export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}
