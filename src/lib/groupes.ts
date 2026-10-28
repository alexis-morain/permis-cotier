/**
 * Les quatre groupes de thèmes, une étiquette pâle chacun (DESIGN.md, « Les
 * étiquettes de groupe »). Ils rangent ce qui se travaille ensemble, sans
 * toucher à l'ordre de l'arrêté que garde `themes.ts`.
 *
 * La couleur est le suffixe de la classe : `.etiquette--bleu`, posée dans
 * `global.css` avec son fond, son encre et son trait, en clair et en sombre.
 */
export type CouleurGroupe = 'bleu' | 'rose' | 'sable' | 'orange';

export interface Groupe {
  readonly couleur: CouleurGroupe;
  readonly nom: string;
  readonly themes: readonly string[];
}

export const GROUPES: readonly Groupe[] = [
  {
    couleur: 'bleu',
    nom: 'Ce qu’on voit sur l’eau',
    themes: ['balisage', 'balisage-region-b', 'feux-marques', 'signaux'],
  },
  { couleur: 'rose', nom: 'Qui passe en premier', themes: ['barre-route', 'ecluses'] },
  { couleur: 'sable', nom: 'Préparer la sortie', themes: ['meteo', 'carte-marine', 'carburant'] },
  {
    couleur: 'orange',
    nom: 'Sécurité et papiers',
    themes: ['securite', 'vhf', 'titre-conduite', 'ski-responsabilites', 'environnement'],
  },
];

export function groupeDuTheme(code: string): Groupe | undefined {
  return GROUPES.find((g) => g.themes.includes(code));
}
