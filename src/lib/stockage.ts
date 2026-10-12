/**
 * Le `localStorage` tolérant, une seule fois.
 *
 * Quatre modules le recopiaient (`son`, `apparence`, `progression`, `mesure`),
 * chacun avec son `try`. Le stockage peut manquer (rendu serveur), être
 * verrouillé (Safari en navigation privée, cookies bloqués) ou plein : aucun
 * de ces cas ne doit casser un écran. On lit `null`, on n'écrit rien, et la
 * page tourne sans mémoire.
 *
 * Chaque fonction prend le stockage en dernier argument, pour que les tests
 * en donnent un faux ; par défaut, celui du navigateur.
 */

/** Le sous-ensemble de localStorage qu'on utilise, pour pouvoir le remplacer en test. */
export interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
  removeItem(cle: string): void;
}

/**
 * Le préfixe de tout ce que le site garde dans `localStorage`. Seule la clé
 * d'Umami (`umami.disabled`) y échappe : c'est le traceur qui la lit.
 */
export const PREFIXE_STOCKAGE = 'permis-cotier:';

export function stockageParDefaut(): Stockage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Navigation privée ou cookies bloqués : on tourne sans mémoire.
    return null;
  }
}

/** La valeur rangée sous `cle`, ou `null` : absente, ou stockage hors d'usage. */
export function lire(cle: string, stockage: Stockage | null = stockageParDefaut()): string | null {
  try {
    return stockage?.getItem(cle) ?? null;
  } catch {
    return null;
  }
}

/**
 * Range `valeur` sous `cle`, ou retire la clé quand `valeur` vaut `null`.
 * Rend `false` quand rien n'a pu s'écrire : le choix vaut alors pour la page
 * ouverte, pas plus, et l'appelant n'a d'ordinaire rien à en faire.
 */
export function ecrire(
  cle: string,
  valeur: string | null,
  stockage: Stockage | null = stockageParDefaut(),
): boolean {
  if (!stockage) return false;
  try {
    if (valeur === null) stockage.removeItem(cle);
    else stockage.setItem(cle, valeur);
    return true;
  } catch {
    return false;
  }
}
