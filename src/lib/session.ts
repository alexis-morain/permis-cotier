import { SECONDES_PAR_QUESTION, calculerResultat, corriger } from './quiz';
import type { QuestionJouable, Resultat } from './quiz';

/**
 * Déroulé d'une série de questions, en examen blanc ou en entraînement.
 *
 * Toute la mécanique tient ici, en fonctions pures : le composant React ne
 * fait que dessiner l'état et faire tourner l'horloge. C'est ce qui permet de
 * tester le chrono, la correction et la fin de série sans navigateur.
 *
 * Deux différences entre les modes, et deux seulement : le chrono ne tourne
 * qu'en examen, et la correction ne s'affiche qu'en entraînement.
 */
export type Mode = 'examen' | 'entrainement';

/** L'épreuve n'admet jamais plus de deux bonnes réponses. */
export const MAX_SELECTION = 2;

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
  phase: 'en-cours' | 'resultat';
  resultat: Resultat | null;
  /** Une ligne par question jouée, pour alimenter la progression locale. */
  journal: { id: string; juste: boolean }[];
}

export type Action =
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
    restant: mode === 'examen' && !vide ? SECONDES_PAR_QUESTION : null,
    corrigee: false,
    juste: null,
    phase: vide ? 'resultat' : 'en-cours',
    resultat: vide ? calculerResultat([], []) : null,
    journal: [],
  };
}

export function questionCourante(s: Session): QuestionJouable | undefined {
  return s.questions[s.index];
}

function terminer(s: Session): Session {
  return {
    ...s,
    phase: 'resultat',
    restant: null,
    corrigee: false,
    resultat: calculerResultat(s.questions, s.selections),
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
  if (s.phase === 'resultat' && action.type !== 'terminer') return s;
  const question = questionCourante(s);

  switch (action.type) {
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
      return s.phase === 'resultat' ? s : terminer(s);
  }
}
