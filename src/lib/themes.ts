/**
 * Les quatorze thèmes du programme, dans l'ordre de l'arrêté du 28 septembre
 * 2007, art. 1er § 1.2 (version en vigueur au 1er juin 2022).
 *
 * `cibleJ1` est la répartition visée pour la mise en ligne, 120 questions au
 * total. Aucune pondération officielle n'est publiée : ces nombres sont une
 * hypothèse de travail, ajustée avec les signalements. Le tirage de l'examen
 * blanc utilise les mêmes proportions.
 */
export interface Theme {
  readonly code: string;
  /** Libellé court, celui affiché dans l'interface. */
  readonly nom: string;
  /** Formulation de l'arrêté, citée sur la page thème. */
  readonly intitule: string;
  /** Deux à trois phrases, contenu indexable de la page thème. */
  readonly description: string;
  readonly cibleJ1: number;
}

export const THEMES: readonly Theme[] = [
  {
    code: 'balisage',
    nom: 'Balisage',
    intitule: 'Balisage des côtes, des plages et pictogrammes',
    description:
      "Le système de balisage maritime de la région A : marques latérales, cardinales, de danger isolé, d'eaux saines et marques spéciales. On y ajoute le balisage des plages et des zones réservées aux baigneurs, ainsi que les pictogrammes affichés à terre. C'est le thème le plus visuel de l'épreuve : la forme, la couleur et le voyant suffisent presque toujours à répondre.",
    cibleJ1: 16,
  },
  {
    code: 'balisage-region-b',
    nom: 'Balisage région B',
    intitule: 'Initiation au balisage de la région B',
    description:
      "En région B, qui couvre les Amériques, le Japon, la Corée et les Philippines, les couleurs des marques latérales sont inversées par rapport à la région A. Le programme n'en demande qu'une initiation, mais la question tombe et se joue sur ce seul renversement.",
    cibleJ1: 2,
  },
  {
    code: 'barre-route',
    nom: 'Règles de barre et de route',
    intitule: 'Règles de barre et de route',
    description:
      "Qui manœuvre, qui garde son cap, et ce qu'on fait quand deux navires se rapprochent au point de risquer l'abordage. Les règles 4 à 19 du RIPAM couvrent la veille, la vitesse de sécurité, le risque d'abordage, la conduite par visibilité réduite et la hiérarchie entre navires. C'est le thème le plus lourd de l'épreuve.",
    cibleJ1: 18,
  },
  {
    code: 'signaux',
    nom: 'Signaux',
    intitule:
      'Signaux phoniques, signaux de détresse, signaux portuaires et signaux météorologiques',
    description:
      "Un son bref, un son prolongé, et ce qu'ils veulent dire selon qu'on vire, qu'on doute de la manœuvre d'un autre ou qu'on remonte un chenal. Le thème couvre aussi les signaux de détresse reconnus, les feux et pavillons des entrées de port et les avis de coup de vent.",
    cibleJ1: 10,
  },
  {
    code: 'feux-marques',
    nom: 'Feux et marques',
    intitule: 'Feux et marques des navires',
    description:
      "Reconnaître de nuit ce qu'on a devant soi, sa route et son activité, à partir des seuls feux. Les règles 20 à 31 du RIPAM fixent les couleurs, les secteurs, la portée et la disposition selon le type et la longueur du navire, et les marques de jour correspondantes. Chaque combinaison a une seule lecture possible.",
    cibleJ1: 20,
  },
  {
    code: 'securite',
    nom: 'Navigation et sécurité',
    intitule:
      'Navigation et sécurité, catégories de conception, matériel de sécurité, pièces administratives',
    description:
      "Ce qu'il faut avoir à bord et sous quelle forme : équipement de sécurité selon la distance d'un abri, catégories de conception A à D d'un bateau, titres et pièces à présenter en cas de contrôle. Le thème mêle la division 240 et les obligations administratives du plaisancier.",
    cibleJ1: 12,
  },
  {
    code: 'titre-conduite',
    nom: 'Titre de conduite',
    intitule: 'Réglementation relative au titre de conduite',
    description:
      "Qui a besoin d'un permis, pour quel bateau, dans quelles limites. Le thème couvre les options côtière et eaux intérieures, l'extension hauturière, les équivalences, la validité du titre et les cas de suspension ou de retrait.",
    cibleJ1: 6,
  },
  {
    code: 'vhf',
    nom: 'VHF et SMDSM',
    intitule:
      'Service mobile maritime, radiotéléphonie, VHF, éléments du SMDSM',
    description:
      "Le canal 16, la procédure d'appel, la différence entre MAYDAY, PAN PAN et SÉCURITÉ, et ce que fait un ASN quand on soulève le capot rouge. Le thème couvre aussi la licence de station, le CRR et la place de la VHF dans le SMDSM. Il pèse lourd : cinq à sept questions sur quarante d'après les opérateurs.",
    cibleJ1: 15,
  },
  {
    code: 'ski-responsabilites',
    nom: 'Ski nautique et responsabilités',
    intitule:
      'Ski nautique et engins tractés, responsabilités du chef de bord',
    description:
      "Les conditions de remorquage d'un skieur ou d'une bouée, et ce dont répond le chef de bord : sécurité des personnes embarquées, respect des règles, conséquences en cas d'accident.",
    cibleJ1: 2,
  },
  {
    code: 'carburant',
    nom: 'Autonomie en carburant',
    intitule: 'Autonomie en carburant',
    description:
      "Calculer combien de temps on peut tenir, et la règle des tiers qui garde une marge pour le retour et l'imprévu. Les questions sont arithmétiques : consommation horaire, capacité du réservoir, durée de route.",
    cibleJ1: 2,
  },
  {
    code: 'environnement',
    nom: 'Environnement',
    intitule: 'Protection de l’environnement et de la ressource',
    description:
      "Ce qu'on n'a pas le droit de rejeter et où, le mouillage sur herbier, les zones protégées et les règles de pêche de loisir. Le thème couvre aussi le traitement des eaux noires et les sanctions en cas de pollution.",
    cibleJ1: 6,
  },
  {
    code: 'meteo',
    nom: 'Météorologie',
    intitule: 'Météorologie',
    description:
      "Lire un bulletin, comprendre l'échelle de Beaufort, l'état de la mer, le rôle des dépressions et des anticyclones. Le thème inclut les signes annonciateurs d'un grain et les sources de prévision à consulter avant de partir.",
    cibleJ1: 5,
  },
  {
    code: 'carte-marine',
    nom: 'Lecture de carte',
    intitule: 'Initiation à la lecture d’une carte marine',
    description:
      "Les sondes, les zéro des cartes, les principaux symboles, la rose des vents et la mesure d'une distance en milles. Le programme n'exige qu'une initiation : pas de calcul de marée ni de route au compas.",
    cibleJ1: 4,
  },
  {
    code: 'ecluses',
    nom: 'Écluses',
    intitule: 'Règles d’utilisation des écluses',
    description:
      "L'ordre de passage, les feux d'entrée et de sortie, l'amarrage pendant le remplissage. Le thème vient de la partie commune du programme et tombe rarement, mais il fait partie de l'épreuve côtière.",
    cibleJ1: 2,
  },
] as const;

export const CODES_THEMES: readonly string[] = THEMES.map((t) => t.code);

export function themeParCode(code: string): Theme | undefined {
  return THEMES.find((t) => t.code === code);
}

export function estCodeTheme(code: string): boolean {
  return CODES_THEMES.includes(code);
}

export function cibleTotaleJ1(): number {
  return THEMES.reduce((total, t) => total + t.cibleJ1, 0);
}
