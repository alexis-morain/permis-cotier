import { POUR_APP } from './cible';
import { avecGreffon } from './greffons';
import { ecrire, lire, stockageParDefaut, type Stockage } from './stockage';

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

export function sonActif(stockage: Stockage | null = stockageParDefaut()): boolean {
  return lire(CLE_SON, stockage) !== COUPE;
}

export function reglerSon(actif: boolean, stockage: Stockage | null = stockageParDefaut()): void {
  // Pas de stockage : le choix vaut pour la page ouverte, pas plus.
  ecrire(CLE_SON, actif ? null : COUPE, stockage);
  if (!POUR_APP) return;
  // Le greffon se tait aussi de son côté, et coupe un son qui résonne encore.
  avecGreffon('Son', (g) => g.activer({ actif })).catch(() => {});
}

export async function jouer(nom: Son, stockage: Stockage | null = stockageParDefaut()): Promise<void> {
  if (!POUR_APP) return;
  if (!sonActif(stockage)) return;
  try {
    await avecGreffon('Son', (g) => g.jouer({ nom }));
  } catch {
    // Greffon absent, ou coquille d'une autre version : on joue sans le son.
  }
}
