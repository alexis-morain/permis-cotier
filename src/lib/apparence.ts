import { POUR_APP } from './cible';
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

/** L'apparence qui s'affiche vraiment : le choix, ou le système en `auto`. */
export function estSombre(apparence: Apparence, systemeSombre: boolean): boolean {
  return apparence === 'auto' ? systemeSombre : apparence === 'sombre';
}

function systemeSombre(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/**
 * La barre d'état de la coquille, accordée au fond de la page : l'heure et la
 * batterie en sombre sur fond clair, en clair sur fond sombre. Sans cela, une
 * apparence forcée à l'inverse du système laisse des icônes illisibles.
 *
 * Le nom des styles de Capacitor dit le fond, pas les icônes : `Style.Dark`
 * pose des icônes claires. Sur le site, rien ; un greffon absent, rien non
 * plus.
 */
export async function accorderBarreEtat(sombre: boolean): Promise<void> {
  if (!POUR_APP) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: sombre ? Style.Dark : Style.Light });
  } catch {
    // Greffon absent, ou coquille d'une autre version : la barre reste.
  }
}

/** La même chose, d'après ce que la page affiche en ce moment. */
export function accorderBarreEtatALaPage(): Promise<void> {
  return accorderBarreEtat(estSombre(lireApparence(), systemeSombre()));
}

/**
 * Ce qui tourne en tête de page, avant le premier rendu, pour que la page
 * n'apparaisse pas claire puis passe sombre. Le même contrat que ci-dessus,
 * écrit sans import parce qu'il est inséré tel quel dans le HTML.
 */
export const SCRIPT_APPARENCE = `(function(){try{var v=localStorage.getItem('${CLE_APPARENCE}');if(v==='clair'||v==='sombre'){document.documentElement.setAttribute('${ATTRIBUT}',v);}}catch(e){}})();`;
