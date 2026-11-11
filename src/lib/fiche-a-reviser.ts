/**
 * La fiche de révision que propose l'écran de verdict d'un examen blanc : celle
 * du thème où l'on a le plus perdu de points.
 *
 * Ce module reste léger à dessein : l'écran de jeu l'embarque, et
 * `revision.ts` (schémas Zod de toute la fiche) n'a rien à y faire. Le chemin
 * du PDF est le même que celui des pages `/fiches-revision` ; le test les
 * compare.
 */
import { POUR_APP } from './cible';
import { CODES_THEMES } from './themes';

/** Le domaine du site, comme `SITE.domaine` (le test les compare). */
const DOMAINE = 'https://lepermiscotier.fr';

/**
 * L'adresse du PDF d'un thème. Dans l'app, il part du site : la coquille ouvre
 * un lien d'une autre origine dans Safari intégré, qui l'affiche, le partage
 * et l'imprime, sans quitter l'écran de verdict. C'est le mécanisme des pages
 * `/fiches-revision`, pas un autre.
 */
export function lienPdfFiche(theme: string, pourApp: boolean = POUR_APP): string {
  const chemin = `/fiches-revision/${theme}.pdf`;
  return pourApp ? new URL(chemin, DOMAINE).href : chemin;
}

export interface FichePourLeVerdict {
  readonly theme: string;
  readonly erreurs: number;
}

/**
 * Le thème le plus raté d'un examen, ou `null` s'il n'y a eu aucune erreur.
 * Le plus d'erreurs d'abord, puis la plus mauvaise note, puis l'ordre du
 * programme : le résultat ne dépend jamais de l'ordre des clés.
 */
export function fichePourLeVerdict(
  parTheme: Readonly<Record<string, { bonnes: number; total: number }>>,
): FichePourLeVerdict | null {
  const candidats = Object.entries(parTheme)
    .filter(([code]) => CODES_THEMES.includes(code))
    .map(([theme, n]) => ({ theme, erreurs: n.total - n.bonnes, note: n.total > 0 ? n.bonnes / n.total : 1 }))
    .filter((c) => c.erreurs > 0)
    .sort(
      (a, b) =>
        b.erreurs - a.erreurs ||
        a.note - b.note ||
        CODES_THEMES.indexOf(a.theme) - CODES_THEMES.indexOf(b.theme),
    );
  const premier = candidats[0];
  return premier ? { theme: premier.theme, erreurs: premier.erreurs } : null;
}
