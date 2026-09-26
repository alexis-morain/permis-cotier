import { POUR_APP } from './cible';

/**
 * Quand la page est prête à recevoir ses écouteurs.
 *
 * Sur le site, chaque page est un chargement complet : le script tourne une
 * fois, au bon moment, et `faire()` s'appelle tout de suite. Dans la coquille,
 * `<ClientRouter />` remplace le `<main>` sans recharger la page : le script
 * ne retourne pas, mais Astro émet `astro:page-load` à chaque navigation, et
 * c'est là qu'il faut se rattacher. Le premier chargement l'émet aussi.
 *
 * Un seul point d'entrée pour les deux cas, pour qu'aucun script de page ne
 * doive connaître la cible.
 */
export function quandLaPageEstPrete(faire: () => void): void {
  if (!POUR_APP) {
    faire();
    return;
  }
  document.addEventListener('astro:page-load', () => faire());
}
