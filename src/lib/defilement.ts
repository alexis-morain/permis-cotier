/**
 * Remonter la page quand l'écran change sous le doigt.
 *
 * Un écran qui en remplace un autre sur place (la leçon pas à pas, la question
 * suivante) laisse la page là où le pouce l'avait menée : en bas du texte
 * précédent. Deux défauts en sortaient. La page se raccourcit, le navigateur
 * la ramène d'un coup à sa nouvelle hauteur, puis un défilement doux finissait
 * le trajet : un saut, puis une glissade. Et viser le haut du bloc faisait
 * **descendre** une page déjà en haut ; dans l'app, l'en-tête collé passait
 * alors sur le titre de l'écran.
 *
 * D'où deux règles. On ne descend jamais : on remonte au plus jusqu'au haut du
 * bloc, ou on ne bouge pas. Et on remonte sec, dans la même image que le
 * changement d'écran : c'est le fondu d'entrée de l'écran qui fait la
 * transition, pas le défilement.
 */

/**
 * Où mettre la page : le haut du bloc moins sa marge, jamais plus bas qu'on
 * n'est, jamais au-dessus du haut de la page.
 */
export function hauteurDeReprise(defilement: number, hautDuBloc: number, marge: number): number {
  return Math.max(0, Math.min(defilement, hautDuBloc - marge));
}

/**
 * Défile sans glisser. `global.css` pose `scroll-behavior: smooth` sur
 * `<html>`, que suit tout `scrollTo` sans option ; `behavior: 'instant'`
 * n'est pas sûr sous Safari 16. On coupe donc le style le temps de l'appel,
 * et on le fait recalculer avant : Chrome lit le style calculé, qui sans cela
 * dit encore `smooth`, et la page glissait quand même.
 */
export function defilerSec(y: number, doc: Document = document): void {
  const fenetre = doc.defaultView;
  if (!fenetre || Math.round(fenetre.scrollY) === Math.round(y)) return;
  const racine = doc.documentElement;
  const avant = racine.style.scrollBehavior;
  racine.style.scrollBehavior = 'auto';
  void fenetre.getComputedStyle(racine).scrollBehavior;
  fenetre.scrollTo(0, y);
  racine.style.scrollBehavior = avant;
}

/**
 * Ramène en vue le haut d'un bloc qui vient de changer : sec, et seulement
 * vers le haut. `marge` est l'espace laissé au-dessus du bloc.
 */
export function remonterAuBloc(bloc: Element, marge: number, doc: Document = document): void {
  const fenetre = doc.defaultView;
  if (!fenetre) return;
  const haut = bloc.getBoundingClientRect().top + fenetre.scrollY;
  const cible = hauteurDeReprise(fenetre.scrollY, haut, marge);
  if (cible < fenetre.scrollY) defilerSec(cible, doc);
}
