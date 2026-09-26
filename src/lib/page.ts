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

/** Une miette du fil d'Ariane, telle que `Base.astro` la reçoit. */
interface Miette {
  nom: string;
  chemin: string;
}

/**
 * Les racines des cinq onglets de la coquille. On y arrive par la barre
 * d'onglets, pas par un lien : un bouton « Retour » n'y mènerait nulle part
 * de sensé.
 */
const RACINES_D_ONGLET = new Set(['/', '/accueil', '/cours', '/examen', '/entrainement', '/profil']);

/**
 * Le seul lien que le fil d'Ariane garde dans l'app : l'échelon du dessus.
 *
 * Les miettes arrivent sans l'accueil, qui est ajouté en tête du fil. Une
 * seule miette, c'est donc l'accueil qui est au-dessus. Aucune miette, ou une
 * racine d'onglet : pas de bouton.
 */
export function lienRetour(chemin: string, miettes: readonly Miette[]): Miette | null {
  const nu = chemin.length > 1 ? chemin.replace(/\/+$/, '') : chemin;
  if (miettes.length === 0 || RACINES_D_ONGLET.has(nu)) return null;
  return miettes.length === 1 ? { nom: 'Accueil', chemin: '/' } : (miettes[miettes.length - 2] ?? null);
}
