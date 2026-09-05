/**
 * Le parcours du cours : l'ordre dans lequel on apprend, qui n'est pas celui
 * de l'arrêté.
 *
 * L'arrêté du 28 septembre 2007 liste quatorze thèmes dans l'ordre d'un
 * programme d'examen. Celui qui part de zéro a besoin d'un autre ordre : ce
 * qu'il voit sur l'eau d'abord, parce que c'est concret et visuel, puis les
 * règles de rencontre, puis ce qui se lit et se prépare à terre. Les thèmes
 * qui pèsent le plus à l'épreuve — feux, barre, balisage, VHF — arrivent tôt.
 *
 * Un chapitre regroupe un ou plusieurs thèmes. Une leçon est une notion. Le
 * parcours est la liste des leçons, à plat, numérotées : c'est ce que la page
 * `/cours` affiche et ce que « la leçon suivante » parcourt.
 */
import { CODES_THEMES } from './themes';
import { NOTIONS, notionsDuTheme, type Notion } from './notions';

export interface Chapitre {
  readonly code: string;
  /** Le titre, dit comme une intention : « Lire le balisage ». */
  readonly titre: string;
  /** Une phrase : ce qu'on sait faire à la fin du chapitre. */
  readonly promesse: string;
  /** Les thèmes du programme qu'il couvre, dans l'ordre où on les apprend. */
  readonly themes: readonly string[];
}

export const CHAPITRES: readonly Chapitre[] = [
  {
    code: 'balisage',
    titre: 'Lire le balisage',
    promesse:
      'Reconnaître chaque bouée à sa forme, sa couleur et son voyant, de jour comme de nuit, et savoir de quel côté passer.',
    themes: ['balisage', 'balisage-region-b'],
  },
  {
    code: 'rencontres',
    titre: 'Se croiser sans se toucher',
    promesse:
      'Savoir qui s’écarte et qui maintient dans chaque rencontre, et manœuvrer tôt, franchement, du bon côté.',
    themes: ['barre-route'],
  },
  {
    code: 'feux',
    titre: 'Reconnaître un navire, de jour et de nuit',
    promesse:
      'Lire les feux et les marques d’un navire pour savoir ce qu’il fait, où il va, et s’il peut manœuvrer.',
    themes: ['feux-marques'],
  },
  {
    code: 'signaux',
    titre: 'Se faire entendre',
    promesse:
      'Comprendre les coups de corne, les signaux de brume et les signaux de détresse, et savoir lesquels émettre.',
    themes: ['signaux'],
  },
  {
    code: 'bateau',
    titre: 'Le bateau et son équipement',
    promesse:
      'Savoir ce que le bateau doit avoir à bord selon la distance d’un abri, combien de personnes embarquer, et combien de carburant prévoir.',
    themes: ['securite', 'carburant'],
  },
  {
    code: 'chef-de-bord',
    titre: 'Le permis et le chef de bord',
    promesse:
      'Savoir quand le permis est exigé, ce que le chef de bord doit à son équipage, et quoi faire quand ça tourne mal.',
    themes: ['titre-conduite', 'ski-responsabilites'],
  },
  {
    code: 'vhf',
    titre: 'Appeler à l’aide',
    promesse:
      'Se servir de la VHF : les canaux, l’alphabet, le message de détresse, l’appel sélectif numérique, et qui répond.',
    themes: ['vhf'],
  },
  {
    code: 'meteo-carte',
    titre: 'Météo, carte et marées',
    promesse:
      'Lire un bulletin, une carte marine et un horaire de marée, et décider si on sort.',
    themes: ['meteo', 'carte-marine'],
  },
  {
    code: 'ecluses',
    titre: 'Passer une écluse',
    promesse: 'Lire les feux d’une écluse, attendre son tour, s’amarrer et passer.',
    themes: ['ecluses'],
  },
  {
    code: 'environnement',
    titre: 'Respecter la mer',
    promesse:
      'Savoir ce qu’on ne rejette pas, ce qu’on ne pêche pas, et où on ne va pas.',
    themes: ['environnement'],
  },
] as const;

export interface Lecon {
  readonly notion: Notion;
  readonly chapitre: Chapitre;
  /** Rang dans le parcours entier, à partir de 1. */
  readonly rang: number;
  /** Rang dans le chapitre, à partir de 1. */
  readonly rangDansChapitre: number;
}

/** Toutes les leçons, dans l'ordre du parcours. */
export function leconsDuParcours(): readonly Lecon[] {
  const lecons: Lecon[] = [];
  for (const chapitre of CHAPITRES) {
    let rangDansChapitre = 0;
    for (const theme of chapitre.themes) {
      for (const notion of notionsDuTheme(theme)) {
        rangDansChapitre += 1;
        lecons.push({ notion, chapitre, rang: lecons.length + 1, rangDansChapitre });
      }
    }
  }
  return lecons;
}

export function chapitreParCode(code: string): Chapitre | undefined {
  return CHAPITRES.find((c) => c.code === code);
}

export function chapitreDeLaNotion(codeNotion: string): Chapitre | undefined {
  const notion = NOTIONS.find((n) => n.code === codeNotion);
  return notion ? CHAPITRES.find((c) => c.themes.includes(notion.theme)) : undefined;
}

export function leconParCode(codeNotion: string): Lecon | undefined {
  return leconsDuParcours().find((l) => l.notion.code === codeNotion);
}

/** Les leçons d'un chapitre, dans l'ordre. */
export function leconsDuChapitre(codeChapitre: string): readonly Lecon[] {
  return leconsDuParcours().filter((l) => l.chapitre.code === codeChapitre);
}

/** Ce que la progression sait des leçons : `true` pour celles qui sont faites. */
export type LeconsFaites = Readonly<Record<string, boolean>>;

/**
 * La leçon à faire maintenant : la première non faite dans l'ordre du
 * parcours. Pas « la dernière faite plus une », parce qu'on peut avoir sauté
 * une leçon depuis une fiche de notion, et le parcours doit la rattraper.
 * Tout fait, on repart du début : la révision recommence.
 */
export function prochaineLecon(faites: LeconsFaites): Lecon {
  const lecons = leconsDuParcours();
  return lecons.find((l) => !faites[l.notion.code]) ?? lecons[0]!;
}

export function avancement(codeChapitre: string, faites: LeconsFaites): { faites: number; total: number } {
  const lecons = leconsDuChapitre(codeChapitre);
  return {
    faites: lecons.filter((l) => faites[l.notion.code]).length,
    total: lecons.length,
  };
}

/** Les thèmes que le parcours oublierait, pour que les tests le voient. */
export function themesHorsParcours(): readonly string[] {
  const couverts = new Set(CHAPITRES.flatMap((c) => c.themes));
  return CODES_THEMES.filter((t) => !couverts.has(t));
}
