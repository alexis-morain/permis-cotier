import { POUR_APP } from './cible';
import type { Stockage } from './progression';

/**
 * Les bruitages de l'app : un son court qui dit le résultat d'un geste.
 *
 * Les fichiers sont synthétisés par `scripts/sons_app.py` et joués par le
 * greffon natif `Son` (`ios/App/App/SonPlugin.swift`), en session audio
 * ambiante : ils suivent le bouton silencieux et ne coupent jamais la musique.
 * Sur le site, rien : la branche est morte, comme dans `natif.ts`.
 *
 * On n'appelle pas `jouer` depuis les écrans : `vibrer()` de `natif.ts` le
 * fait, un seul geste donne la vibration et le son.
 */
export type Son = 'choix' | 'juste' | 'faux' | 'lecon' | 'fin-serie' | 'reussi' | 'echoue';

/** Même préfixe que l'apparence ; seule la coupure s'écrit, activé par défaut. */
export const CLE_SON = 'permis-cotier:son';
const COUPE = 'coupe';

function stockageParDefaut(): Stockage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function sonActif(stockage: Stockage | null = stockageParDefaut()): boolean {
  try {
    return stockage?.getItem(CLE_SON) !== COUPE;
  } catch {
    return true;
  }
}

interface GreffonSon {
  jouer(options: { nom: Son }): Promise<void>;
  activer(options: { actif: boolean }): Promise<void>;
}

/**
 * Le greffon ne sort jamais d'une fonction `async` : le mandataire de Capacitor
 * répond à toute propriété, `then` comprise, et une promesse qui le rendrait
 * le prendrait pour une promesse et attendrait une réponse qui ne vient pas.
 */
async function appeler(faire: (g: GreffonSon) => Promise<void>): Promise<void> {
  const { registerPlugin } = await import('@capacitor/core');
  await faire(registerPlugin<GreffonSon>('Son'));
}

export function reglerSon(actif: boolean, stockage: Stockage | null = stockageParDefaut()): void {
  try {
    if (actif) stockage?.removeItem(CLE_SON);
    else stockage?.setItem(CLE_SON, COUPE);
  } catch {
    /* Pas de stockage : le choix vaut pour la page ouverte, pas plus. */
  }
  if (!POUR_APP) return;
  // Le greffon se tait aussi de son côté, et coupe un son qui résonne encore.
  appeler((g) => g.activer({ actif })).catch(() => {});
}

export async function jouer(nom: Son, stockage: Stockage | null = stockageParDefaut()): Promise<void> {
  if (!POUR_APP) return;
  if (!sonActif(stockage)) return;
  try {
    await appeler((g) => g.jouer({ nom }));
  } catch {
    // Greffon absent, ou coquille d'une autre version : on joue sans le son.
  }
}
