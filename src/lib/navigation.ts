/**
 * La barre de navigation du site, sur un téléphone.
 *
 * Sous 48 rem, les six entrées ne tiennent pas : la barre défile au doigt et
 * un fondu, à droite, dit qu'il y a une suite. Elle s'ouvrait toujours sur
 * « Cours » ; sur `/profil`, l'entrée soulignée, « Ta fiche », était hors de
 * l'écran et la page ne disait pas où l'on était. Le script de ce module amène
 * l'entrée courante dans le champ avant le premier affichage.
 */

interface Mesures {
  /** Largeur visible de la barre. */
  visible: number;
  /** Largeur de tout son contenu, ce qui défile compris. */
  contenu: number;
  /** Largeur du fondu à droite, où un mot ne se lit plus en entier. */
  fondu: number;
  /** Début de l'entrée courante, compté depuis le début du contenu. */
  debut: number;
  largeur: number;
}

/**
 * Le défilement qui montre l'entrée courante. Une entrée qui se lit déjà ne
 * fait rien bouger : la barre garde son ordre de lecture. Une entrée cachée
 * vient au milieu, sans dépasser la fin de la barre.
 *
 * Écrite sans dépendance ni chaîne : le script de page en reprend le texte
 * compilé, espaces resserrés.
 */
export function decalageNavigation({ visible, contenu, fondu, debut, largeur }: Mesures): number {
  if (debut + largeur <= visible - fondu) return 0;
  const milieu = debut + largeur / 2 - visible / 2;
  return Math.max(0, Math.min(milieu, contenu - visible));
}

/**
 * Le script en ligne posé juste après la barre : il tourne pendant la lecture
 * du HTML, avant que la page ne s'affiche, donc sans saut visible. Le fondu se
 * lit dans la marge droite de la barre, que le CSS règle à sa largeur.
 */
export const SCRIPT_DEFILEMENT_NAVIGATION =
  "(function(){try{var a=document.querySelector('.entete nav a[aria-current=\"page\"]');if(!a)return;" +
  'var n=a.parentElement;if(n.scrollWidth<=n.clientWidth)return;' +
  'var r=a.getBoundingClientRect();' +
  `n.scrollLeft=(${decalageNavigation.toString().replace(/\s+/g, ' ')})({visible:n.clientWidth,contenu:n.scrollWidth,` +
  'fondu:parseFloat(getComputedStyle(n).paddingRight)||0,debut:r.left-n.getBoundingClientRect().left+n.scrollLeft,largeur:r.width})' +
  '}catch(e){}})();';
