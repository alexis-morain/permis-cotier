import type { BadgeAnnonce } from './badges';
import { aujourdhui, charger, sauvegarder } from './progression';
import type { QuestionConnue } from './profil';
import { stockageParDefaut, type Stockage } from './stockage';

export type { BadgeAnnonce } from './badges';

/**
 * Le geste qui peut faire gagner un badge vient d'être enregistré : une
 * leçon finie, une réponse, un examen blanc. On attribue, on garde l'état
 * rendu, et on rend ce que l'écran annonce, une seule fois puisque
 * `attribuerBadges` ne rend jamais deux fois le même badge.
 *
 * `badges.ts` arrive par `import()` : il tire la table des notions, que ni
 * l'écran de jeu ni la leçon ne chargent d'eux-mêmes. L'état se relit après
 * son arrivée, pour compter tout ce qui a été écrit entre-temps.
 *
 * `banque` : les questions publiées, `{ id, theme }`. Celles d'un seul thème
 * suffisent quand le geste ne touche que lui (la leçon).
 */
export async function gagnerAuGeste(
  banque: readonly QuestionConnue[],
  jour: string = aujourdhui(),
  stockage: Stockage | null = stockageParDefaut(),
): Promise<BadgeAnnonce[]> {
  const { attribuerBadges, annoncesDesBadges } = await import('./badges');
  const { etat, nouveaux } = attribuerBadges(charger(stockage), banque, jour);
  if (nouveaux.length === 0) return [];
  sauvegarder(etat, stockage);
  return annoncesDesBadges(nouveaux);
}
