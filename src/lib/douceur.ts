/**
 * Le défilement doux, sauf pour qui a demandé qu'on arrête de bouger.
 *
 * `prefers-reduced-motion` n'est pas un goût, c'est une règle d'accessibilité :
 * elle vit à un seul endroit. Elle était recopiée à l'identique dans l'écran
 * de jeu, la leçon et le questionnaire — trois copies, donc trois occasions
 * d'en corriger deux.
 */
export function douceur(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
