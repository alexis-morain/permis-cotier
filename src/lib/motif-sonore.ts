/**
 * Les seize signaux sonores du RIPAM, tels que `scripts/sons.py` les dessine.
 *
 * La table vient de `sons-motifs.json`, écrit par le même script que les
 * frises de `public/visuels/sons/` : le son ne peut pas se désaccorder du
 * dessin. Ce module dit seulement si un visuel est un signal, et ce que
 * coûte l'écouter ; le moteur qui le joue (`signal-sonore.ts`) se charge au
 * premier appui, pour que l'écran de jeu ne paie rien tant qu'on n'écoute pas.
 */
import table from './sons-motifs.json';

/** b : bref, p : prolongé (sifflet) ; c : coup, v : volée (cloche). */
export type Son = 'b' | 'p' | 'c' | 'v';
/** Une durée en secondes, ce qui sonne (rien pour un silence), et le navire qui l'émet. */
export type Pas = [number, Son | null, number | null];

export interface SignalSonore {
  nom: string;
  instrument: 'sifflet' | 'cloche';
  motif: Pas[];
  /** En secondes, le motif sans la pause de répétition, que rien ne joue. */
  duree: number;
}

export interface TableSonore {
  sifflet: { hz: Record<string, number> };
  cloche: { hz: number; partiels: number[][]; volee: number[] };
  signaux: Record<string, Omit<SignalSonore, 'nom'>>;
}

// Le JSON se type en chaînes larges ; `test_sons.py` en garantit la forme.
export const TABLE = table as unknown as TableSonore;

/** Le signal que montre ce visuel (`sons/<nom>.svg`), ou rien : pas de bouton. */
export function motifDe(fichier: string): SignalSonore | null {
  const nom = /^sons\/([a-z-]+)\.svg$/.exec(fichier)?.[1];
  const entree = nom ? TABLE.signaux[nom] : undefined;
  return nom && entree ? { nom, ...entree } : null;
}

/** La durée écrite sur le bouton : un prolongé coûte cinq secondes, on le dit. */
export function secondesEcrites(signal: SignalSonore): number {
  return Math.round(signal.duree);
}

export function libelleEcoute(signal: SignalSonore): string {
  return `Écouter le signal, ${secondesEcrites(signal)} s`;
}
