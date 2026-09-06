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
 * Chaque thème a son cours, et un seul : `/cours/<thème>`. Un cours est une
 * suite de leçons, une par notion, dans l'ordre de progression du thème. Le
 * parcours est la liste de toutes les leçons, à plat, numérotées : c'est ce
 * que « la leçon suivante » parcourt d'un cours à l'autre.
 *
 * Ce que le cours dit de lui-même — pourquoi il compte, comment l'apprendre,
 * ce qu'on saura faire, ce qu'on rate — est écrit ici, comme la description
 * d'un thème l'est dans `themes.ts`. Rien n'y cite un chiffre de pondération :
 * la part d'un thème dans le tirage se calcule depuis `cibleJ1`, et la page
 * la donne pour ce qu'elle est, une hypothèse de travail.
 */
import { CODES_THEMES } from './themes';
import { NOTIONS, notionsDuTheme, type Notion } from './notions';

export interface Cours {
  /** Le code du thème : un cours par thème, à la même adresse. */
  readonly code: string;
  /** Le titre, dit comme une intention : « Lire le balisage ». */
  readonly titre: string;
  /** Une phrase : ce qu'on sait faire à la fin du cours. */
  readonly promesse: string;
  /** Deux à trois phrases : ce que l'épreuve en demande, à quoi ressemblent les questions. */
  readonly pourquoi: string;
  /** Deux à trois phrases : par quel bout le prendre. */
  readonly methode: string;
  /** Ce qu'on saura faire, une ligne chacun, à l'infinitif. */
  readonly savoirFaire: readonly string[];
  /** Les erreurs que l'épreuve fait faire, une ligne chacune. */
  readonly pieges: readonly string[];
}

export const COURS: readonly Cours[] = [
  {
    code: 'balisage',
    titre: 'Lire le balisage',
    promesse:
      'Reconnaître chaque bouée à sa forme, sa couleur et son voyant, de jour comme de nuit, et savoir de quel côté passer.',
    pourquoi:
      'C’est le thème le plus visuel de l’épreuve, et l’un des plus lourds. La question montre une bouée, ou décrit un feu, et demande ce qu’elle signale ou de quel côté passer. Rien à raisonner : il faut avoir vu, et retenu.',
    methode:
      'Apprends d’abord le voyant, il donne la couleur, et la couleur donne le nom. Fais le jour en entier avant la nuit : les feux reprennent la logique des marques, il suffit d’y ajouter le rythme.',
    savoirFaire: [
      'Distinguer une marque latérale d’une cardinale au premier coup d’œil',
      'Contourner une cardinale du bon côté sans hésiter',
      'Reconnaître de nuit une cardinale à son nombre de scintillements',
      'Savoir ce qu’on a le droit de faire dans la bande des 300 mètres',
    ],
    pieges: [
      'Oublier que le sens conventionnel s’inverse en sortant du port : la rouge passe à droite',
      'Passer entre une cardinale et la côte parce qu’elle a l’air près du bord',
      'Prendre un feu rouge pour une bouée quand c’est le feu de côté d’un navire',
    ],
  },
  {
    code: 'balisage-region-b',
    titre: 'Le balisage en région B',
    promesse: 'Savoir ce qui s’inverse en région B, et ce qui ne change pas.',
    pourquoi:
      'Le programme ne demande qu’une initiation, et l’épreuve pose une question, parfois deux. Elle se joue sur un seul renversement : en région B, le rouge passe à tribord.',
    methode:
      'Deux leçons, moins de dix minutes. Retiens l’inversion des latérales, et la liste de ce qui reste identique : cardinales, danger isolé, eaux saines, marques spéciales.',
    savoirFaire: [
      'Dire de quel côté est la rouge en entrant dans un port américain',
      'Savoir que les cardinales se lisent pareil dans le monde entier',
    ],
    pieges: [
      'Inverser aussi les cardinales : elles ne changent pas',
      'Croire que la forme s’inverse avec la couleur : le cylindre reste à bâbord',
    ],
  },
  {
    code: 'barre-route',
    titre: 'Se croiser sans se toucher',
    promesse:
      'Savoir qui s’écarte et qui maintient dans chaque rencontre, et manœuvrer tôt, franchement, du bon côté.',
    pourquoi:
      'Avec les feux, c’est le thème le plus lourd de l’épreuve. La question décrit une rencontre, souvent avec un dessin, et demande qui s’écarte ou quelle manœuvre est juste. Les règles 4 à 19 du RIPAM s’y appliquent, et elles s’emboîtent.',
    methode:
      'Prends les rencontres une par une : rattrapant, routes opposées, routes qui se croisent. Puis la hiérarchie entre navires, qui règle tout le reste. Chaque leçon a son dessin vu de dessus, c’est celui que l’épreuve reprend.',
    savoirFaire: [
      'Dire qui s’écarte dans une rencontre entre deux navires à moteur',
      'Reconnaître un rattrapant à son secteur, de jour et de nuit',
      'Placer un voilier, un pêcheur, un navire non maître de sa manœuvre dans la hiérarchie',
      'Manœuvrer tôt, franchement, et du bon côté',
    ],
    pieges: [
      'Croire que le voilier est toujours privilégié : rattrapant, il s’écarte',
      'Venir sur bâbord face à un navire qui arrive de face',
      'Chercher un privilégié par visibilité réduite : il n’y en a plus',
    ],
  },
  {
    code: 'feux-marques',
    titre: 'Reconnaître un navire, de jour et de nuit',
    promesse:
      'Lire les feux et les marques d’un navire pour savoir ce qu’il fait, où il va, et s’il peut manœuvrer.',
    pourquoi:
      'Le thème qui pèse le plus dans notre tirage. La question montre des feux, ou décrit ce que tu vois, et demande quel navire c’est, où il va, s’il peut manœuvrer. Chaque combinaison a une lecture, et une seule.',
    methode:
      'Commence par les secteurs et les couleurs, tout en découle. Puis apprends les navires par famille : moteur, remorquage, voile, pêche, ceux qui ne peuvent pas manœuvrer. Les marques de jour reprennent la même logique avec des cônes et des boules.',
    savoirFaire: [
      'Lire un feu de côté et savoir sous quel angle tu vois le navire',
      'Reconnaître un chalutier, un remorqueur, un bateau-pilote à ses feux',
      'Distinguer un navire non maître de sa manœuvre d’un navire à capacité de manœuvre restreinte',
      'Reconnaître les marques de jour qui correspondent à chaque feu',
    ],
    pieges: [
      'Confondre deux feux rouges superposés et trois',
      'Prendre le feu blanc d’un navire au mouillage pour un feu de poupe',
      'Croire que le feu de tête de mât se voit sur tout l’horizon : c’est 225 degrés',
    ],
  },
  {
    code: 'signaux',
    titre: 'Se faire entendre',
    promesse:
      'Comprendre les coups de sifflet, les signaux de brume et les signaux de détresse, et savoir lesquels émettre.',
    pourquoi:
      'Un son bref, un son prolongé, et l’épreuve te demande ce que ça veut dire, ou lequel émettre. Le thème couvre aussi les signaux de brume, de détresse, et ceux des entrées de port. Le tracé du signal accompagne souvent la question.',
    methode:
      'Écoute chaque signal sur son tracé animé : bref, long, combien. Range-les en trois familles, manœuvre, doute, brume, et apprends la détresse à part : elle se reconnaît, elle ne se déduit pas.',
    savoirFaire: [
      'Dire ce que signifient un, deux, trois ou cinq sons brefs',
      'Reconnaître un navire en brume à son signal, avec ou sans erre',
      'Citer les signaux de détresse reconnus, et ceux qui n’en sont pas',
      'Lire les feux et pavillons d’une entrée de port',
    ],
    pieges: [
      'Lire deux longs et un bref comme un signal de manœuvre : c’est une demande de dépassement',
      'Confondre le navire stoppé et le navire qui fait route en brume',
      'Prendre une fusée blanche pour un signal de détresse',
    ],
  },
  {
    code: 'securite',
    titre: 'Le bateau et son équipement',
    promesse:
      'Savoir ce que le bateau doit avoir à bord selon la distance d’un abri, combien de personnes embarquer, et quelles pièces présenter à un contrôle.',
    pourquoi:
      'La division 240 fixe l’armement par zone, basique, côtier, semi-hauturier, hauturier, et l’épreuve te demande ce qui manque ou ce qui suffit. Le thème mêle des listes à apprendre et des règles de bon sens à comprendre.',
    methode:
      'Apprends d’abord les quatre distances d’un abri, tout s’accroche dessus. Puis la liste basique par cœur, et ce que le côtier y ajoute. Le reste, catégories de conception, plongeurs, pièces à bord, se lit une fois et se retient.',
    savoirFaire: [
      'Donner la liste de l’armement basique sans rien oublier',
      'Dire ce que le côtier ajoute au basique',
      'Lire la catégorie de conception d’un bateau et savoir ce qu’elle autorise',
      'Savoir quelles pièces présenter à un contrôle',
    ],
    pieges: [
      'Lire « 2 milles » comme une distance de la côte : c’est une distance d’un abri',
      'Compter les enfants de moins de deux ans dans le nombre de personnes',
      'Oublier le document de marée dans l’armement basique hors Méditerranée',
    ],
  },
  {
    code: 'carburant',
    titre: 'Ne pas tomber en panne',
    promesse: 'Calculer combien de temps le réservoir te laisse, et garder la marge que la règle des tiers impose.',
    pourquoi:
      'Deux questions au plus, toujours un calcul : une consommation horaire, un réservoir, une durée de route. Elles se ratent par précipitation, pas par ignorance.',
    methode:
      'Deux leçons, une méthode : poser le calcul en heures, puis appliquer les tiers. Fais-le une fois au crayon, tu ne le rateras plus.',
    savoirFaire: [
      'Convertir un réservoir et une consommation en heures d’autonomie',
      'Appliquer la règle des tiers à un aller-retour',
    ],
    pieges: [
      'Compter toute l’autonomie pour l’aller',
      'Oublier que le vent et la mer font consommer plus au retour',
    ],
  },
  {
    code: 'titre-conduite',
    titre: 'Ce que le permis autorise',
    promesse:
      'Savoir quand le permis est exigé, ce que l’option côtière autorise, comment on l’obtient et comment on le perd.',
    pourquoi:
      'Le décret du 2 août 2007 fixe qui doit avoir un permis, pour quel bateau et jusqu’où. L’épreuve y prend quelques questions, souvent sur les seuils : la puissance du moteur, la distance d’un abri, les eaux intérieures.',
    methode:
      'Cinq leçons courtes. Retiens les seuils, puis la logique des options : côtière, eaux intérieures, extension hauturière. La suspension et le retrait se lisent une fois.',
    savoirFaire: [
      'Dire à partir de quelle puissance le permis est exigé',
      'Donner la limite de l’option côtière et ce que l’extension hauturière ajoute',
      'Décrire l’épreuve et les conditions pour s’y présenter',
      'Savoir ce qui fait suspendre ou retirer un permis',
    ],
    pieges: [
      'Croire que le permis côtier autorise les rivières et les canaux',
      'Oublier les dix-huit mois pour valider la pratique après l’épreuve théorique',
      'Confondre suspension et retrait',
    ],
  },
  {
    code: 'ski-responsabilites',
    titre: 'Répondre de son équipage',
    promesse:
      'Tracter un skieur dans les règles, savoir ce que le chef de bord doit à son équipage, et quoi faire quand ça tourne mal.',
    pourquoi:
      'Un thème court à l’épreuve, mais qui mélange trois textes : l’arrêté sur le ski nautique, la division 240 pour le chef de bord et les véhicules nautiques à moteur, et la conduite à tenir en cas de danger. Les questions sur l’homme à la mer ou l’incendie sont de bon sens, à condition d’avoir lu l’ordre des gestes.',
    methode:
      'Commence par le ski et le véhicule nautique à moteur, qui se retiennent par leurs chiffres. Puis la responsabilité, une leçon. Puis les quatre leçons d’urgence, dans l’ordre : elles se lisent comme des procédures.',
    savoirFaire: [
      'Dire combien de personnes il faut à bord pour tracter un skieur',
      'Savoir ce qu’un véhicule nautique à moteur peut faire, et jusqu’où',
      'Décrire ce dont le chef de bord répond',
      'Donner l’ordre des gestes pour un homme à la mer, un incendie, une voie d’eau',
    ],
    pieges: [
      'Croire qu’on peut tracter seul à bord',
      'Sauter à l’eau pour rejoindre l’homme à la mer : on le rejoint avec le bateau',
      'Éteindre un feu de carburant à l’eau',
    ],
  },
  {
    code: 'vhf',
    titre: 'Appeler à l’aide',
    promesse:
      'Se servir de la VHF : les canaux, l’alphabet, le message de détresse, l’appel sélectif numérique, et qui répond.',
    pourquoi:
      'D’après les opérateurs, cinq à sept questions sur quarante viennent de la VHF. Elles portent sur le canal 16, la procédure d’appel, la différence entre MAYDAY, PAN PAN et SÉCURITÉ, l’appel sélectif numérique, et sur qui répond : le CROSS.',
    methode:
      'Douze leçons, c’est le cours le plus long. Apprends les canaux et l’alphabet comme des tables, puis les trois messages dans l’ordre exact de leurs mots : l’épreuve les fait réciter. Finis par l’organisation du sauvetage, qui donne du sens à tout le reste.',
    savoirFaire: [
      'Savoir quelle VHF emporter selon la distance d’un abri',
      'Épeler un nom dans l’alphabet international',
      'Émettre un message de détresse complet, dans l’ordre',
      'Distinguer détresse, urgence et sécurité, et savoir quel mot ouvre chacune',
      'Savoir ce que fait l’appel sélectif numérique, et ce dont il ne dispense pas',
    ],
    pieges: [
      'Appeler sur le 16 puis y rester pour parler : on dégage sur un canal de travail',
      'Donner la nature de la détresse avant la position : la position vient d’abord',
      'Croire que l’appel sélectif numérique remplace le message vocal : il l’annonce',
    ],
  },
  {
    code: 'meteo',
    titre: 'Lire le ciel et le bulletin',
    promesse: 'Lire un bulletin, traduire une force de vent en état de la mer, et décider si tu sors.',
    pourquoi:
      'Quelques questions, presque toutes sur l’échelle de Beaufort et sur les mots d’un bulletin : force, mer, visibilité, tendance. Une ou deux sur les dépressions et sur les signes d’un grain.',
    methode:
      'Apprends Beaufort en deux moitiés, 0 à 6 puis 7 à 12, avec l’état de la mer qui va avec. Le reste est de la lecture : où trouver le bulletin, ce que veulent dire ses mots, et la décision, qui croise le bulletin avec la catégorie du bateau.',
    savoirFaire: [
      'Donner la force Beaufort d’une vitesse de vent, et l’inverse',
      'Décrire la mer pour une force donnée',
      'Lire un bulletin côtier et repérer ce qui compte',
      'Décider de sortir ou non selon le bulletin et le bateau',
    ],
    pieges: [
      'Confondre force 6 et 6 nœuds',
      'Lire « mer forte » comme une mer moyenne : c’est déjà 2,5 à 4 mètres de creux',
      'Partir sur la prévision du matin sans regarder la tendance de l’après-midi',
    ],
  },
  {
    code: 'carte-marine',
    titre: 'Lire la carte et la marée',
    promesse:
      'Lire une carte marine, y mesurer une distance, comprendre la marée et ce qu’elle change pour ta hauteur d’eau.',
    pourquoi:
      'Le programme ne demande qu’une initiation, pas de route au compas. Les questions portent sur les sondes, le zéro des cartes, les symboles, le mille sur l’échelle des latitudes, et sur le vocabulaire de la marée : pleine mer, basse mer, marnage, coefficient.',
    methode:
      'Quatre leçons de carte, quatre de marée. Pour la carte, retiens que tout se mesure sur l’échelle des latitudes et que les sondes se comptent depuis le zéro des cartes. Pour la marée, le vocabulaire d’abord, puis le coefficient, puis ce que ça change quand tu passes un seuil.',
    savoirFaire: [
      'Mesurer une distance en milles sur une carte',
      'Lire une sonde et savoir si elle découvre',
      'Reconnaître les symboles d’un danger, d’une épave, d’un amer',
      'Dire ce que signifient marnage et coefficient',
      'Prévoir la hauteur d’eau avant de passer un seuil',
    ],
    pieges: [
      'Mesurer une distance sur l’échelle des longitudes',
      'Oublier que la hauteur d’eau s’ajoute à la sonde : le zéro des cartes est celui des plus basses mers',
      'Croire qu’un gros coefficient donne plus d’eau partout : il en donne aussi moins à basse mer',
    ],
  },
  {
    code: 'ecluses',
    titre: 'Passer une écluse',
    promesse: 'Lire les feux d’une écluse, attendre son tour, s’amarrer et passer.',
    pourquoi:
      'Le thème vient de la partie commune du programme et tombe rarement : une question, parfois aucune. Mais elle se rate bêtement quand on n’a jamais vu les feux d’une écluse.',
    methode:
      'Trois leçons, un quart d’heure. Les feux d’accès d’abord, avec leurs dessins, puis l’attente et le passage, qui tiennent surtout du bon sens et de l’amarrage.',
    savoirFaire: [
      'Lire les feux d’accès d’une écluse et savoir si on entre',
      'Attendre son tour sans gêner',
      'S’amarrer dans le sas et suivre la montée ou la descente',
    ],
    pieges: [
      'Entrer sur deux feux rouges parce que l’écluse a l’air prête',
      'Amarrer à poste fixe dans le sas : l’amarre doit suivre le niveau',
    ],
  },
  {
    code: 'environnement',
    titre: 'Respecter la mer',
    promesse: 'Savoir ce qu’on ne rejette pas, ce qu’on ne pêche pas, et où on ne va pas.',
    pourquoi:
      'Ce qu’on rejette, où on mouille, ce qu’on pêche et ce qu’on laisse. Quelques questions à l’épreuve, sur les rejets interdits, les cuves à eaux noires, la pêche de loisir et les aires protégées. Elles se répondent surtout par des seuils et des distances.',
    methode:
      'Sept leçons courtes. Retiens les interdictions et leurs limites chiffrées, puis les règles de pêche : tailles, marquage, engins. Les aires protégées se lisent une fois.',
    savoirFaire: [
      'Savoir ce qu’on ne rejette jamais, et à quelle distance certains rejets sont tolérés',
      'Dire ce qu’un navire habitable doit avoir pour ses eaux noires',
      'Connaître les règles de la pêche de loisir et de la pêche sous-marine',
      'Reconnaître une aire marine protégée et ce qu’elle interdit',
    ],
    pieges: [
      'Croire qu’un rejet est permis dès qu’on est loin de la côte',
      'Vendre le produit de sa pêche de loisir',
      'Mouiller sur un herbier parce que l’eau y est claire',
    ],
  },
] as const;

export interface Lecon {
  readonly notion: Notion;
  readonly cours: Cours;
  /** Rang dans le parcours entier, à partir de 1. */
  readonly rang: number;
  /** Rang dans le cours, à partir de 1. */
  readonly rangDansCours: number;
  /** L'adresse de la leçon : `/cours/<thème>/<notion>`. */
  readonly chemin: string;
}

export function cheminCours(code: string): string {
  return `/cours/${code}`;
}

export function cheminLecon(notion: Pick<Notion, 'code' | 'theme'>): string {
  return `/cours/${notion.theme}/${notion.code}`;
}

/** Toutes les leçons, dans l'ordre du parcours. */
export function leconsDuParcours(): readonly Lecon[] {
  const lecons: Lecon[] = [];
  for (const cours of COURS) {
    notionsDuTheme(cours.code).forEach((notion, i) => {
      lecons.push({ notion, cours, rang: lecons.length + 1, rangDansCours: i + 1, chemin: cheminLecon(notion) });
    });
  }
  return lecons;
}

export function coursParCode(code: string): Cours | undefined {
  return COURS.find((c) => c.code === code);
}

export function coursDeLaNotion(codeNotion: string): Cours | undefined {
  const notion = NOTIONS.find((n) => n.code === codeNotion);
  return notion ? coursParCode(notion.theme) : undefined;
}

/** Le cours qui vient après dans le parcours ; aucun après le dernier. */
export function coursSuivant(code: string): Cours | undefined {
  const i = COURS.findIndex((c) => c.code === code);
  return i >= 0 ? COURS[i + 1] : undefined;
}

export function leconParCode(codeNotion: string): Lecon | undefined {
  return leconsDuParcours().find((l) => l.notion.code === codeNotion);
}

/** Les leçons d'un cours, dans l'ordre. */
export function leconsDuCours(code: string): readonly Lecon[] {
  return leconsDuParcours().filter((l) => l.cours.code === code);
}

/** Ce que la progression sait des leçons : `true` pour celles qui sont faites. */
export type LeconsFaites = Readonly<Record<string, boolean>>;

/**
 * La leçon à faire maintenant : la première non faite dans l'ordre du
 * parcours, ou du cours si on en donne un. Pas « la dernière faite plus
 * une », parce qu'on peut avoir sauté une leçon depuis une fiche de notion,
 * et le parcours doit la rattraper. Tout fait, on repart du début : la
 * révision recommence.
 */
export function prochaineLecon(faites: LeconsFaites, cours?: string): Lecon {
  const lecons = cours ? leconsDuCours(cours) : leconsDuParcours();
  return lecons.find((l) => !faites[l.notion.code]) ?? lecons[0]!;
}

export function avancement(code: string, faites: LeconsFaites): { faites: number; total: number } {
  const lecons = leconsDuCours(code);
  return {
    faites: lecons.filter((l) => faites[l.notion.code]).length,
    total: lecons.length,
  };
}

/** Les thèmes que le parcours oublierait, pour que les tests le voient. */
export function themesHorsParcours(): readonly string[] {
  const couverts = new Set(COURS.map((c) => c.code));
  return CODES_THEMES.filter((t) => !couverts.has(t));
}
