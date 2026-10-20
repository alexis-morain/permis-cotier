/**
 * Le canal par lequel une racine d'onglet apprend que la progression a changé
 * dans un autre onglet (`annoncerSiLaProgressionAChange`, `page.ts`).
 *
 * Un module à part, sans import : les îlots que le site partage avec l'app
 * (la Fiche) s'y rattachent sous `POUR_APP`, et le site n'en reçoit rien.
 */

/** L'événement que `window` reçoit quand la progression a changé ailleurs. */
export const PROGRESSION_CHANGEE = 'app:progression';

/**
 * Se rattacher à `app:progression` ; rend de quoi se détacher (le retour d'un
 * `useEffect`).
 */
export function surProgressionChangee(relire: () => void): () => void {
  window.addEventListener(PROGRESSION_CHANGEE, relire);
  return () => window.removeEventListener(PROGRESSION_CHANGEE, relire);
}
