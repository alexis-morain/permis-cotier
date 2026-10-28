import type { ThemeCompte } from './banque';
import { groupeDuTheme, type CouleurGroupe } from './groupes';

/**
 * Une rangée de la vue « Le programme » : le thème, son groupe et ses
 * comptes. La page pose ces rangées dans un tableau, rien de plus.
 */
export interface LigneProgramme {
  code: string;
  nom: string;
  intitule: string;
  description: string;
  groupe: { couleur: CouleurGroupe; nom: string };
  /** Le nombre de questions publiées, ou « à venir ». */
  questions: string;
  aVenir: boolean;
  cible: number;
}

/** Le tableau porte le mot « Questions » en tête de colonne : la cellule garde le chiffre. */
export function libelleQuestions(publiees: number): string {
  return publiees > 0 ? String(publiees) : 'à venir';
}

export function lignesProgramme(themes: readonly ThemeCompte[]): LigneProgramme[] {
  return themes.map((t) => {
    const groupe = groupeDuTheme(t.code);
    if (!groupe) throw new Error(`thème sans groupe : ${t.code}`);
    return {
      code: t.code,
      nom: t.nom,
      intitule: t.intitule,
      description: t.description,
      groupe: { couleur: groupe.couleur, nom: groupe.nom },
      questions: libelleQuestions(t.publiees),
      aVenir: t.publiees === 0,
      cible: t.cibleJ1,
    };
  });
}
