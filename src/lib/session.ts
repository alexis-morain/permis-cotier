import { SECONDES_PAR_QUESTION, calculerResultat, corriger } from './quiz';
import type { QuestionJouable, Resultat } from './quiz';

/**
 * Déroulé d'une série de questions, en examen blanc ou en entraînement.
 *
 * Toute la mécanique tient ici, en fonctions pures : le composant React ne
 * fait que dessiner l'état et faire tourner l'horloge. C'est ce qui permet de
 * tester le chrono, la correction et la fin de série sans navigateur.
 *
 * Trois différences entre les modes : le chrono ne tourne qu'en examen, la
 * correction ne s'affiche qu'en entraînement, et l'examen s'ouvre sur un écran
 * de départ. Ce dernier existe pour une raison mesurée : arriver sur /examen
 * lançait le compte à rebours avant qu'on ait lu la consigne.
 */
export type Mode = 'examen' | 'entrainement';

/** L'épreuve n'admet jamais plus de deux bonnes réponses. */
export const MAX_SELECTION = 2;

/** Au-delà d'un jour, une session abandonnée ne se reprend plus, elle se refait. */
export const SAUVEGARDE_PERIMEE_MS = 24 * 60 * 60 * 1000;

export interface Session {
  mode: Mode;
  questions: readonly QuestionJouable[];
  index: number;
  selections: string[][];
  /** Secondes restantes sur la question courante, `null` hors examen. */
  restant: number | null;
  /** Vrai en entraînement une fois la réponse validée. */
  corrigee: boolean;
  juste: boolean | null;
  phase: 'depart' | 'en-cours' | 'resultat';
  resultat: Resultat | null;
  /** Vrai quand le résultat ne porte que sur une partie de la série. */
  interrompu: boolean;
  /** Une ligne par question jouée, pour alimenter la progression locale. */
  journal: { id: string; juste: boolean }[];
}

export type Action =
  | { type: 'commencer' }
  | { type: 'basculer'; proposition: string }
  | { type: 'valider' }
  | { type: 'suivante' }
  | { type: 'tic' }
  | { type: 'terminer' };

export function creerSession(mode: Mode, questions: readonly QuestionJouable[]): Session {
  const vide = questions.length === 0;
  return {
    mode,
    questions,
    index: 0,
    selections: questions.map(() => []),
    // Le chrono ne s'arme qu'au « commencer » : aucune seconde ne se perd
    // pendant qu'on lit le format de l'épreuve.
    restant: null,
    corrigee: false,
    juste: null,
    phase: vide ? 'resultat' : mode === 'examen' ? 'depart' : 'en-cours',
    resultat: vide ? calculerResultat([], []) : null,
    interrompu: false,
    journal: [],
  };
}

export function questionCourante(s: Session): QuestionJouable | undefined {
  return s.questions[s.index];
}

/**
 * Bascule sur le résultat. `jouees` borne le calcul aux questions réellement
 * passées : arrêter au bout de trois questions donne une note sur trois, pas
 * un zéro sur quarante avec trente-sept fautes qu'on n'a jamais commises.
 */
function terminer(s: Session, jouees: number = s.questions.length): Session {
  const n = Math.max(0, Math.min(jouees, s.questions.length));
  return {
    ...s,
    phase: 'resultat',
    restant: null,
    corrigee: false,
    interrompu: n < s.questions.length,
    resultat: calculerResultat(s.questions.slice(0, n), s.selections.slice(0, n)),
  };
}

function inscrire(journal: Session['journal'], id: string, juste: boolean): Session['journal'] {
  return journal.some((l) => l.id === id) ? journal : [...journal, { id, juste }];
}

/** Passe à la question suivante, ou au résultat s'il n'y en a plus. */
function avancer(s: Session): Session {
  const suivant = s.index + 1;
  if (suivant >= s.questions.length) return terminer(s);
  return {
    ...s,
    index: suivant,
    restant: s.mode === 'examen' ? SECONDES_PAR_QUESTION : null,
    corrigee: false,
    juste: null,
  };
}

export function reduire(s: Session, action: Action): Session {
  if (s.phase === 'resultat') return s;
  if (s.phase === 'depart') {
    if (action.type !== 'commencer') return s;
    return { ...s, phase: 'en-cours', restant: s.mode === 'examen' ? SECONDES_PAR_QUESTION : null };
  }
  const question = questionCourante(s);

  switch (action.type) {
    case 'commencer':
      return s;

    case 'basculer': {
      if (!question || s.corrigee) return s;
      const actuelle = s.selections[s.index] ?? [];
      let suivante: string[];
      if (actuelle.includes(action.proposition)) {
        suivante = actuelle.filter((p) => p !== action.proposition);
      } else if (actuelle.length >= MAX_SELECTION) {
        return s;
      } else {
        suivante = [...actuelle, action.proposition];
      }
      const selections = [...s.selections];
      selections[s.index] = suivante;
      return { ...s, selections };
    }

    case 'valider': {
      if (!question) return s;
      const selection = s.selections[s.index] ?? [];
      const juste = corriger(question, selection);

      if (s.mode === 'entrainement') {
        // Rien à corriger tant que rien n'est coché, et une seule correction.
        if (selection.length === 0 || s.corrigee) return s;
        return { ...s, corrigee: true, juste, journal: inscrire(s.journal, question.id, juste) };
      }

      // En examen, valider veut dire « je passe ». Aucun retour avant la fin.
      return avancer({ ...s, journal: inscrire(s.journal, question.id, juste) });
    }

    case 'suivante': {
      if (!question) return s;
      if (s.mode === 'entrainement' && !s.corrigee) return s;
      return avancer(s);
    }

    case 'tic': {
      if (s.mode !== 'examen' || s.restant === null || !question) return s;
      const restant = s.restant - 1;
      if (restant > 0) return { ...s, restant };
      const juste = corriger(question, s.selections[s.index] ?? []);
      return avancer({ ...s, journal: inscrire(s.journal, question.id, juste) });
    }

    case 'terminer':
      // Les questions jamais atteintes ne comptent pas : `index` est le nombre
      // de questions passées, la courante n'étant pas encore validée.
      return terminer(s, s.index);
  }
}

/**
 * Ce qu'il faut garder pour reprendre une série interrompue. On stocke des
 * identifiants, pas des questions : la banque bouge d'une publication à
 * l'autre, et une sauvegarde qui cite une question disparue est jetée.
 */
export interface SessionSauvegardee {
  mode: Mode;
  theme: string | null;
  ids: string[];
  index: number;
  selections: string[][];
  restant: number | null;
  journal: { id: string; juste: boolean }[];
  /** Date d'écriture, en millisecondes. */
  majLe: number;
}

/** Rend `null` quand il n'y a rien à reprendre : série finie, ou pas commencée. */
export function extraireSauvegarde(
  s: Session,
  theme?: string,
  maintenant: number = Date.now(),
): SessionSauvegardee | null {
  if (s.phase !== 'en-cours') return null;
  return {
    mode: s.mode,
    theme: theme ?? null,
    ids: s.questions.map((q) => q.id),
    index: s.index,
    selections: s.selections.map((choix) => [...choix]),
    restant: s.restant,
    journal: s.journal.map((ligne) => ({ ...ligne })),
    majLe: maintenant,
  };
}

/**
 * Reconstruit une session depuis une sauvegarde, ou rend `null` si elle ne
 * colle plus : autre mode, autre thème, question disparue, ou trop vieille.
 */
export function restaurerSession(
  sauvegarde: SessionSauvegardee | null | undefined,
  banque: readonly QuestionJouable[],
  mode: Mode,
  theme?: string,
  maintenant: number = Date.now(),
): Session | null {
  if (!sauvegarde || sauvegarde.mode !== mode) return null;
  if ((sauvegarde.theme ?? null) !== (theme ?? null)) return null;
  if (maintenant - sauvegarde.majLe > SAUVEGARDE_PERIMEE_MS) return null;
  if (!Array.isArray(sauvegarde.ids) || sauvegarde.ids.length === 0) return null;

  const parId = new Map(banque.map((q) => [q.id, q]));
  const questions: QuestionJouable[] = [];
  for (const id of sauvegarde.ids) {
    const question = parId.get(id);
    if (!question) return null;
    questions.push(question);
  }

  const index = sauvegarde.index;
  if (!Number.isInteger(index) || index < 0 || index >= questions.length) return null;

  return {
    mode,
    questions,
    index,
    selections: questions.map((_, i) => [...(sauvegarde.selections[i] ?? [])]),
    restant: mode === 'examen' ? (sauvegarde.restant ?? SECONDES_PAR_QUESTION) : null,
    corrigee: false,
    juste: null,
    phase: 'en-cours',
    resultat: null,
    interrompu: false,
    journal: (sauvegarde.journal ?? []).map((ligne) => ({ ...ligne })),
  };
}
