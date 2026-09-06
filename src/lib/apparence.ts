import type { Stockage } from './progression';

/**
 * Clair, sombre, ou comme le système. Le choix vit sous sa propre clé, hors
 * de la progression : effacer sa progression ne change pas la couleur de la
 * page, et le script en tête de page n'a qu'une chaîne à lire, pas un JSON.
 *
 * Le CSS lit l'attribut `data-apparence` sur `<html>` : absent, il suit
 * `prefers-color-scheme` ; `clair` ou `sombre`, il force.
 */
export type Apparence = 'auto' | 'clair' | 'sombre';

export const CLE_APPARENCE = 'permis-cotier:apparence';
const ATTRIBUT = 'data-apparence';

export const APPARENCES: readonly { code: Apparence; nom: string }[] = [
  { code: 'auto', nom: 'Comme le système' },
  { code: 'clair', nom: 'Clair' },
  { code: 'sombre', nom: 'Sombre' },
];

function stockageParDefaut(): Stockage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function lireApparence(stockage: Stockage | null = stockageParDefaut()): Apparence {
  try {
    const v = stockage?.getItem(CLE_APPARENCE);
    return v === 'clair' || v === 'sombre' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function choisirApparence(apparence: Apparence, stockage: Stockage | null = stockageParDefaut()): void {
  try {
    if (apparence === 'auto') stockage?.removeItem(CLE_APPARENCE);
    else stockage?.setItem(CLE_APPARENCE, apparence);
  } catch {
    /* Pas de stockage : le choix vaut pour la page ouverte, pas plus. */
  }
}

interface Racine {
  setAttribute(nom: string, valeur: string): void;
  removeAttribute(nom: string): void;
}

export function appliquerApparence(
  apparence: Apparence,
  racine: Racine | null = typeof document === 'undefined' ? null : document.documentElement,
): void {
  if (!racine) return;
  if (apparence === 'auto') racine.removeAttribute(ATTRIBUT);
  else racine.setAttribute(ATTRIBUT, apparence);
}

/**
 * Ce qui tourne en tête de page, avant le premier rendu, pour que la page
 * n'apparaisse pas claire puis passe sombre. Le même contrat que ci-dessus,
 * écrit sans import parce qu'il est inséré tel quel dans le HTML.
 */
export const SCRIPT_APPARENCE = `(function(){try{var v=localStorage.getItem('${CLE_APPARENCE}');if(v==='clair'||v==='sombre'){document.documentElement.setAttribute('${ATTRIBUT}',v);}}catch(e){}})();`;
