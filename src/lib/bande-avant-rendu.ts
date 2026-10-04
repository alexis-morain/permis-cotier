/**
 * L'entrée du script en ligne de la bande d'ouverture. `scripts/bande-avant-rendu.mjs`
 * l'empaquette au build en une fonction immédiate, que `index.astro` pose en
 * tête de la grille de la bande. Pas de module, pas de requête : il tourne
 * pendant la lecture de la page, avant la première peinture.
 *
 * Une panne ici ne doit rien casser : le nouveau venu garde sa bande, comme
 * sans JavaScript.
 */
import { charger } from './progression';
import { aujourdhui } from './jour';
import { monterBande } from './bande-rendu';

try {
  monterBande(document, charger(), aujourdhui());
} catch {
  /* la bande du nouveau venu reste */
}
