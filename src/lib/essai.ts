/**
 * La correction de la question qu'on essaie sur l'accueil.
 *
 * La règle est celle de l'épreuve : la réponse est juste si les cases cochées
 * sont exactement les bonnes. Une bonne case seule ne suffit pas quand il en
 * faut deux, une case de trop rend la réponse fausse.
 */

/** Ce que la correction dit d'une proposition ; rien si elle n'est ni cochée ni attendue. */
export type EtatProposition = 'bonne' | 'oubliee' | 'fausse';

export interface Correction {
  juste: boolean;
  /** Les bonnes réponses qui n'ont pas été cochées. */
  oubliees: number;
  etats: Record<string, EtatProposition>;
}

export function corriger(cochees: readonly string[], reponses: readonly string[]): Correction {
  const attendues = new Set(reponses);
  const choisies = new Set(cochees);
  const etats: Record<string, EtatProposition> = {};
  for (const id of attendues) etats[id] = choisies.has(id) ? 'bonne' : 'oubliee';
  for (const id of choisies) if (!attendues.has(id)) etats[id] = 'fausse';
  const oubliees = Object.values(etats).filter((e) => e === 'oubliee').length;
  const fausses = Object.values(etats).filter((e) => e === 'fausse').length;
  return { juste: oubliees === 0 && fausses === 0, oubliees, etats };
}
