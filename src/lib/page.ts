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

/** Le préfixe de tout ce que l'app garde dans `localStorage`. */
const PREFIXE_STOCKAGE = 'permis-cotier:';

/**
 * Les racines qu'on recharge quand la progression a bougé ailleurs. Toutes,
 * sauf l'examen : l'épreuve s'y joue et son résultat s'y affiche, et rien de
 * ce qu'un autre onglet écrit ne change son écran de départ. Le recharger
 * effacerait le résultat qu'on vient de quitter des yeux.
 */
const RACINES_A_RAFRAICHIR = new Set([...RACINES_D_ONGLET].filter((r) => r !== '/examen'));

/**
 * Tout ce que l'app garde, nom et valeur, en une chaîne comparable. `null`
 * quand le stockage manque ou refuse d'être lu.
 */
function photographierLeStockage(): string | null {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    const cles: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const cle = localStorage.key(i);
      if (cle?.startsWith(PREFIXE_STOCKAGE)) cles.push(cle);
    }
    cles.sort();
    return JSON.stringify(cles.map((cle) => [cle, localStorage.getItem(cle)]));
  } catch {
    // Navigation privée, données de site bloquées : on ne compare rien.
    return null;
  }
}

/**
 * Recharger la racine d'un onglet quand la progression a changé dans un autre.
 *
 * Chaque onglet de la coquille est sa propre webview, chargée une fois : une
 * leçon faite dans Cours ou une date posée dans la Fiche ne se voyait dans
 * Accueil qu'après avoir tué l'app. La coquille émet `app:onglet` sur
 * `window` chaque fois qu'un onglet revient à l'écran ; on compare alors le
 * stockage à la photo prise quand l'écran a été rendu. S'il a bougé et que
 * l'écran est une racine d'onglet, on recharge : tous ses îlots relisent la
 * progression. Sinon on ne touche à rien, et le défilement reste.
 *
 * La photo se reprend à chaque écran que le routeur affiche : un écran rendu
 * après une écriture la montre déjà, il n'a pas à être rechargé pour elle.
 * Une page profonde (une leçon, une série) n'est jamais rechargée : on y
 * perdrait sa place.
 */
export function rafraichirSiLaProgressionAChange(): void {
  let photo = photographierLeStockage();
  document.addEventListener('astro:page-load', () => {
    photo = photographierLeStockage();
  });

  const comparer = () => {
    const maintenant = photographierLeStockage();
    if (photo === null || maintenant === null || maintenant === photo) return;
    const nu = location.pathname.length > 1 ? location.pathname.replace(/\/+$/, '') : location.pathname;
    if (!RACINES_A_RAFRAICHIR.has(nu)) return;
    location.reload();
  };

  window.addEventListener('app:onglet', comparer);
  window.addEventListener('pageshow', (evenement) => {
    if ((evenement as PageTransitionEvent).persisted) comparer();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') comparer();
  });
}
