import type { Profil } from './progression';

/**
 * La raison du candidat, et les phrases qui la rappellent. Séparées de
 * `profil.ts` pour que le résultat d'examen les montre sans tirer la fiche
 * entière, sa table des notions comprise, sur `/examen`.
 */

export interface Motivation {
  readonly code: string;
  /** La case, à la première personne. */
  readonly libelle: string;
  /**
   * Ce qu'on rappelle au candidat, à la deuxième personne : un groupe qui
   * complète « Tu passes ce permis pour … », minuscule initiale, sans point.
   */
  readonly rappel: string;
}

export const MOTIVATIONS: readonly Motivation[] = [
  { code: 'famille', libelle: 'Emmener ma famille ou mes amis en mer', rappel: 'emmener les tiens en mer, toi à la barre' },
  { code: 'location', libelle: 'Louer un bateau en vacances', rappel: 'louer un bateau cet été, sans demander à personne' },
  { code: 'bateau', libelle: 'Avoir mon propre bateau', rappel: 'avoir ton bateau à toi, et la mer devant' },
  { code: 'peche', libelle: 'Aller pêcher au large', rappel: 'aller pêcher là où la côte ne se voit plus' },
  { code: 'glisse', libelle: 'Tracter du ski, du wake, ou piloter un jet', rappel: 'tracter, glisser, piloter' },
  { code: 'plongee', libelle: 'Plonger ou pêcher sous l’eau loin de la plage', rappel: 'mouiller au-dessus du bon tombant, par tes propres moyens' },
  { code: 'travail', libelle: 'J’en ai besoin pour mon travail', rappel: 'ton travail, qui l’attend' },
  { code: 'hauturier', libelle: 'C’est la première marche vers le hauturier', rappel: 'passer ensuite le hauturier, celui-ci d’abord' },
  { code: 'defi', libelle: 'Un vieux rêve, ou un défi que je me suis lancé', rappel: 'tenir un vieux rêve, ou le défi que tu t’es lancé' },
];

/** La raison à rappeler : la phrase du candidat, sinon sa première case, sinon rien. */
export function rappel(profil: Profil): string | null {
  const phrase = profil.phrase.trim();
  if (phrase) return phrase;
  for (const code of profil.motivations) {
    const m = MOTIVATIONS.find((x) => x.code === code);
    if (m) return m.rappel;
  }
  return null;
}

/**
 * Ce qui ferme « Tu passes ce permis pour « … » » : un point, sauf si la
 * raison du candidat en porte déjà un (les rappels de `MOTIVATIONS` n'en ont
 * jamais). Partagé par le résultat, la fiche, l'accueil et le questionnaire,
 * pour que « …pêcher.». » ne se voie nulle part.
 */
export function pointFinal(raison: string): string {
  return /[.!?…]$/.test(raison.trim()) ? '' : '.';
}
