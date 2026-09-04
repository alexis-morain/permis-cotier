import { SECONDES_PAR_QUESTION, calculerResultat, corriger } from './quiz';
import type { QuestionJouable, Resultat } from './quiz';

/**
 * Déroulé d'une série de questions, en examen blanc ou en entraînement.
 *
 * Toute la mécanique tient ici, en fonctions pures : le composant React ne
 * fait que dessiner l'état et faire tourner l'horloge. C'est ce qui permet de
 * tester le chrono, la correction et la fin de série sans navigateur.
 *
 * Le chrono est une horloge murale : la session garde l'instant limite de la
 * question, pas un compteur qu'on décrémente. Un `setInterval` d'une seconde
 * est étranglé par le navigateur dès que l'onglet passe en arrière-plan, et le
 * compte à rebours se figeait au lieu de courir. Le temps réel décide.
 *
 * Trois différences entre les modes : le chrono ne tourne qu'en examen, la
 * correction ne s'affiche qu'en entraînement, et l'examen s'ouvre sur un écran
 * de départ. Ce dernier existe pour une raison mesurée : arriver sur /examen
 * lançait le compte à rebours avant qu'on ait lu la consigne.
 */
export type Mode = 'examen' | 'entrainement';

/**
 * L'épreuve n'admet jamais plus de deux bonnes réponses. Comme les vingt
 * secondes, la règle ne figure pas dans l'arrêté du 28 septembre 2007, qui ne
 * dit que « questionnaire à choix multiple », quarante questions et cinq
 * erreurs admises : elle vient de la description de l'épreuve par les
 * opérateurs agréés.
 */
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
  /** Instant limite de la question courante, en millisecondes. */
  echeance: number | null;
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

/**
 * `maintenant` circule dans les actions qui touchent au chrono : le réducteur
 * reste une fonction pure, l'horloge est une entrée comme une autre.
 */
export type Action =
  | { type: 'commencer'; maintenant?: number }
  | { type: 'basculer'; proposition: string }
  | { type: 'valider'; maintenant?: number }
  | { type: 'suivante'; maintenant?: number }
  | { type: 'tic'; maintenant?: number }
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
    echeance: null,
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

/** Secondes restantes jusqu'à `echeance`, jamais négatives. */
function secondesRestantes(echeance: number, maintenant: number): number {
  return Math.max(0, Math.ceil((echeance - maintenant) / 1000));
}

/** Arme le chrono de la question courante, en examen seulement. */
function armer(s: Session, maintenant: number): Session {
  if (s.mode !== 'examen') return { ...s, restant: null, echeance: null };
  return {
    ...s,
    restant: SECONDES_PAR_QUESTION,
    echeance: maintenant + SECONDES_PAR_QUESTION * 1000,
  };
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
    echeance: null,
    corrigee: false,
    interrompu: n < s.questions.length,
    resultat: calculerResultat(s.questions.slice(0, n), s.selections.slice(0, n)),
  };
}

function inscrire(journal: Session['journal'], id: string, juste: boolean): Session['journal'] {
  return journal.some((l) => l.id === id) ? journal : [...journal, { id, juste }];
}

/** Passe à la question suivante, ou au résultat s'il n'y en a plus. */
function avancer(s: Session, maintenant: number): Session {
  const suivant = s.index + 1;
  if (suivant >= s.questions.length) return terminer(s);
  return armer({ ...s, index: suivant, corrigee: false, juste: null }, maintenant);
}

export function reduire(s: Session, action: Action): Session {
  if (s.phase === 'resultat') return s;
  if (s.phase === 'depart') {
    if (action.type !== 'commencer') return s;
    return armer({ ...s, phase: 'en-cours' }, action.maintenant ?? Date.now());
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
      return avancer(
        { ...s, journal: inscrire(s.journal, question.id, juste) },
        action.maintenant ?? Date.now(),
      );
    }

    case 'suivante': {
      if (!question) return s;
      if (s.mode === 'entrainement' && !s.corrigee) return s;
      return avancer(s, action.maintenant ?? Date.now());
    }

    case 'tic': {
      if (s.mode !== 'examen' || s.echeance === null || !question) return s;
      const maintenant = action.maintenant ?? Date.now();
      const restant = secondesRestantes(s.echeance, maintenant);
      if (restant > 0) return restant === s.restant ? s : { ...s, restant };
      // Le temps de la question est passé, même si l'onglet dormait. On n'en
      // consomme qu'une par retour : une absence de dix minutes ne brûle pas
      // trente questions d'un coup.
      const juste = corriger(question, s.selections[s.index] ?? []);
      return avancer({ ...s, journal: inscrire(s.journal, question.id, juste) }, maintenant);
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
  /** Instant limite de la question courante, absolu : un rafraîchissement ne
   *  redonne pas les secondes déjà écoulées. */
  echeance: number | null;
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
    echeance: s.echeance,
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

  // L'échéance sauvegardée tient tant qu'elle est devant : rafraîchir en
  // boucle ne rend pas une seconde. Passée, la question repart entière plutôt
  // que d'être perdue d'office par quelqu'un dont le téléphone s'est verrouillé.
  const echeance =
    mode === 'examen'
      ? sauvegarde.echeance !== null && sauvegarde.echeance > maintenant
        ? sauvegarde.echeance
        : maintenant + SECONDES_PAR_QUESTION * 1000
      : null;

  return {
    mode,
    questions,
    index,
    selections: questions.map((_, i) => [...(sauvegarde.selections[i] ?? [])]),
    restant: echeance === null ? null : secondesRestantes(echeance, maintenant),
    echeance,
    corrigee: false,
    juste: null,
    phase: 'en-cours',
    resultat: null,
    interrompu: false,
    journal: (sauvegarde.journal ?? []).map((ligne) => ({ ...ligne })),
  };
}
