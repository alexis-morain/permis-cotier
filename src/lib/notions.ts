/**
 * Les notions du programme : le niveau intermédiaire entre le thème et la
 * question.
 *
 * Un thème de l'arrêté du 28 septembre 2007 est une matière d'examen, pas une
 * unité d'apprentissage. « Feux et marques » couvre douze règles du RIPAM qui
 * ne s'apprennent ni ensemble ni dans le désordre. La notion est cette unité :
 * ce qu'on peut réviser en une fois, et sur quoi on peut être interrogé.
 *
 * Elle sert trois usages :
 *   - mesurer la couverture réelle de la banque, thème par thème et trou par
 *     trou, ce que le seul compte par thème ne montre pas ;
 *   - ordonner la révision, `ordre` donnant la progression dans le thème ;
 *   - alimenter la fiche de révision d'une page thème, `resume` étant la
 *     phrase à retenir.
 *
 * Le découpage suit la progression pédagogique des manuels du domaine, mais
 * chaque notion est rattachée au programme officiel : `ancrage` cite l'alinéa
 * de l'article 1er § 1.2 dont elle relève, et rien n'entre ici qui n'y figure.
 *
 * `cible` est le nombre de questions visé pour la notion. La somme des cibles
 * d'un thème peut dépasser son `cibleJ1` : l'écart est le signal, pas une
 * erreur. Il dit que la pondération du thème est à revoir.
 */
import { CODES_THEMES } from './themes';

export interface Notion {
  /** Slug unique dans toute la banque. */
  readonly code: string;
  /** Code du thème de rattachement. */
  readonly theme: string;
  /** Libellé court, celui affiché dans l'interface. */
  readonly nom: string;
  /** Une à deux phrases : ce qu'il faut avoir retenu. */
  readonly resume: string;
  /** Rang dans la progression du thème, à partir de 1. */
  readonly ordre: number;
  /** Nombre de questions visé pour cette notion. */
  readonly cible: number;
  /** Alinéa du programme officiel dont relève la notion. */
  readonly ancrage: string;
}

export const NOTIONS: readonly Notion[] = [
  // ---------------------------------------------------------------- balisage
  {
    code: 'balisage-lateral',
    theme: 'balisage',
    nom: 'Marques latérales',
    resume:
      "En région A, la marque bâbord est rouge et cylindrique, la marque tribord verte et conique. Le côté se lit toujours dans le sens conventionnel du chenal, c'est-à-dire en venant du large vers le port.",
    ordre: 1,
    cible: 3,
    ancrage: 'balisage des côtes',
  },
  {
    code: 'balisage-chenal-prefere',
    theme: 'balisage',
    nom: 'Chenal préféré',
    resume:
      "À la séparation de deux chenaux, la marque garde la couleur du côté qu'elle indique pour le chenal principal et porte une bande large de l'autre couleur. La forme, elle, ne ment pas.",
    ordre: 2,
    cible: 1,
    ancrage: 'balisage des côtes',
  },
  {
    code: 'balisage-cardinal',
    theme: 'balisage',
    nom: 'Marques cardinales',
    resume:
      "Quatre marques noires et jaunes, distinguées par leur voyant : deux cônes pointes en haut au Nord, pointes opposées à l'Est, pointes en bas au Sud, pointes jointes à l'Ouest. On passe du côté que la marque annonce.",
    ordre: 3,
    cible: 4,
    ancrage: 'balisage des côtes',
  },
  {
    code: 'balisage-danger-isole',
    theme: 'balisage',
    nom: 'Danger isolé',
    resume:
      "Corps noir à une ou plusieurs bandes rouges, voyant de deux sphères noires superposées. Elle est mouillée sur le danger même, qui est entouré d'eaux saines.",
    ordre: 4,
    cible: 1,
    ancrage: 'balisage des côtes',
  },
  {
    code: 'balisage-eaux-saines',
    theme: 'balisage',
    nom: 'Eaux saines',
    resume:
      "Bandes verticales rouges et blanches, voyant sphérique rouge. Elle signale que l'eau est saine tout autour, et sert souvent d'atterrissage ou de milieu de chenal.",
    ordre: 5,
    cible: 1,
    ancrage: 'balisage des côtes',
  },
  {
    code: 'balisage-speciale',
    theme: 'balisage',
    nom: 'Marques spéciales',
    resume:
      "Jaunes, voyant en croix jaune. Elles ne signalent pas un danger pour la navigation mais une zone particulière : chenal traversier, zone de mouillage, câble, installation.",
    ordre: 6,
    cible: 1,
    ancrage: 'balisage des côtes',
  },
  {
    code: 'balisage-danger-nouveau',
    theme: 'balisage',
    nom: 'Danger nouveau',
    resume:
      "Un danger non encore porté sur les cartes se balise par une marque conventionnelle doublée, ou par une marque bleue et jaune si le danger est grave.",
    ordre: 7,
    cible: 1,
    ancrage: 'balisage des côtes',
  },
  {
    code: 'balisage-feux',
    theme: 'balisage',
    nom: 'Le balisage de nuit',
    resume:
      "La couleur du feu reprend celle de la marque, et le rythme dit le reste : scintillant continu au Nord, trois scintillements à l'Est, six plus un éclat long au Sud, neuf à l'Ouest.",
    ordre: 8,
    cible: 4,
    ancrage: 'balisage des côtes',
  },
  {
    code: 'balisage-plages',
    theme: 'balisage',
    nom: 'Balisage des plages et bande des 300 mètres',
    resume:
      "La bande littorale des 300 mètres est limitée par des bouées jaunes sphériques. À l'intérieur, la vitesse est limitée à 5 nœuds, et les chenaux traversiers sont balisés de jaune.",
    ordre: 9,
    cible: 3,
    ancrage: 'balisage des plages',
  },
  {
    code: 'balisage-pictogrammes',
    theme: 'balisage',
    nom: 'Pictogrammes',
    resume:
      "Un pictogramme rond cerclé de rouge et barré interdit, un pictogramme rond bleu à figure blanche oblige, un carré informe. Ils s'affichent à terre et régissent la bande littorale.",
    ordre: 10,
    cible: 2,
    ancrage: 'pictogrammes',
  },

  // -------------------------------------------------------- balisage région B
  {
    code: 'region-b-lateral',
    theme: 'balisage-region-b',
    nom: 'Inversion des marques latérales',
    resume:
      "En région B — Amériques, Japon, Corée, Philippines — la marque bâbord est verte et la marque tribord rouge. Seule la couleur change, la forme reste cylindrique à bâbord et conique à tribord.",
    ordre: 1,
    cible: 2,
    ancrage: 'initiation au système de balisage région B',
  },
  {
    code: 'region-b-invariants',
    theme: 'balisage-region-b',
    nom: 'Ce qui ne change pas',
    resume:
      "Les marques cardinales, de danger isolé, d'eaux saines et spéciales sont identiques dans les deux régions. L'inversion ne porte que sur le balisage latéral.",
    ordre: 2,
    cible: 1,
    ancrage: 'initiation au système de balisage région B',
  },

  // ------------------------------------------------------------- barre-route
  {
    code: 'barre-veille-vitesse',
    theme: 'barre-route',
    nom: 'Veille et vitesse de sécurité',
    resume:
      "La veille est permanente, visuelle et auditive, par tous les moyens disponibles. La vitesse de sécurité est celle qui permet de s'arrêter sur la distance qu'on voit.",
    ordre: 1,
    cible: 2,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-risque-abordage',
    theme: 'barre-route',
    nom: "Risque d'abordage",
    resume:
      "Le relèvement au compas d'un navire qui s'approche ne change pas : le risque d'abordage existe. Dans le doute, on considère qu'il existe.",
    ordre: 2,
    cible: 2,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-manoeuvre-evitement',
    theme: 'barre-route',
    nom: "Manœuvre pour éviter l'abordage",
    resume:
      "La manœuvre est franche, faite assez tôt pour être vue, et à bonne distance. Un changement de cap suffisamment ample vaut mieux qu'une succession de petites corrections.",
    ordre: 3,
    cible: 2,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-chenal-etroit',
    theme: 'barre-route',
    nom: 'Chenaux étroits',
    resume:
      "On navigue aussi près que possible de la limite tribord du chenal. Un navire de moins de 20 mètres ou un voilier ne gêne pas le passage d'un navire qui ne peut naviguer qu'à l'intérieur du chenal.",
    ordre: 4,
    cible: 2,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-voiliers',
    theme: 'barre-route',
    nom: 'Entre voiliers',
    resume:
      "Bord opposé : celui qui reçoit le vent de bâbord s'écarte. Même bord : celui qui est au vent s'écarte. Dans le doute sur les amures de l'autre, on s'écarte.",
    ordre: 5,
    cible: 3,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-rattrapant',
    theme: 'barre-route',
    nom: 'Navire rattrapant',
    resume:
      "Rattrape celui qui vient de plus de 22,5° sur l'arrière du travers. Il s'écarte, quel que soit son type, et le reste jusqu'à ce qu'il ait dépassé et paré l'autre.",
    ordre: 6,
    cible: 2,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-routes-opposees',
    theme: 'barre-route',
    nom: 'Routes directement opposées',
    resume:
      "Deux navires à propulsion mécanique qui se rencontrent bout à bout viennent chacun sur tribord pour passer bâbord contre bâbord. Dans le doute, on suppose que c'est le cas.",
    ordre: 7,
    cible: 2,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-routes-croisees',
    theme: 'barre-route',
    nom: 'Routes qui se croisent',
    resume:
      "Entre deux navires à propulsion mécanique, celui qui voit l'autre sur sa tribord s'écarte, et évite de couper sa route sur l'avant.",
    ordre: 8,
    cible: 2,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-privilegie-non-privilegie',
    theme: 'barre-route',
    nom: 'Qui s’écarte, qui maintient',
    resume:
      "Celui qui doit s'écarter manœuvre tôt et franchement. Celui qui doit maintenir garde son cap et sa vitesse, mais peut manœuvrer seul quand la collision devient inévitable sans lui.",
    ordre: 9,
    cible: 2,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-hierarchie-privileges',
    theme: 'barre-route',
    nom: 'Hiérarchie entre navires',
    resume:
      "Dans l'ordre : non maître de sa manœuvre, capacité de manœuvre restreinte, handicapé par son tirant d'eau, en train de pêcher, à voile, à propulsion mécanique. Chacun s'écarte de ceux qui le précèdent.",
    ordre: 10,
    cible: 3,
    ancrage: 'règles de barre et de route',
  },
  {
    code: 'barre-visibilite-reduite',
    theme: 'barre-route',
    nom: 'Par visibilité réduite',
    resume:
      "Vitesse adaptée, machine prête à manœuvrer. Un navire détecté au radar seul impose d'éviter de venir sur bâbord si l'écho est sur l'avant du travers, et d'éviter de venir vers un navire par le travers ou l'arrière du travers.",
    ordre: 11,
    cible: 2,
    ancrage: 'règles de barre et de route',
  },

  // ----------------------------------------------------------------- signaux
  {
    code: 'signaux-manoeuvre',
    theme: 'signaux',
    nom: 'Signaux de manœuvre',
    resume:
      "En vue l'un de l'autre : un son bref pour venir sur tribord, deux pour bâbord, trois pour battre en arrière. Le son bref dure environ une seconde.",
    ordre: 1,
    cible: 2,
    ancrage: 'signaux phoniques de manœuvre',
  },
  {
    code: 'signaux-avertissement',
    theme: 'signaux',
    nom: "Signal d'avertissement",
    resume:
      "Au moins cinq sons brefs et rapprochés : je ne comprends pas tes intentions, ou je doute que tu manœuvres assez. Il peut être doublé d'un signal lumineux.",
    ordre: 2,
    cible: 1,
    ancrage: "signaux phoniques d'avertissement",
  },
  {
    code: 'signaux-chenal',
    theme: 'signaux',
    nom: 'Dépassement en chenal étroit',
    resume:
      "Deux sons prolongés puis un bref pour dépasser par tribord, deux prolongés puis deux brefs par bâbord. L'autre marque son accord par prolongé-bref-prolongé-bref.",
    ordre: 3,
    cible: 1,
    ancrage: 'signaux phoniques de manœuvre',
  },
  {
    code: 'signaux-coude',
    theme: 'signaux',
    nom: 'Signal du coude',
    resume:
      "À l'approche d'un coude où la vue est masquée, un son prolongé. Tout navire qui l'entend de l'autre côté répond par un son prolongé.",
    ordre: 4,
    cible: 1,
    ancrage: 'signaux phoniques de manœuvre',
  },
  {
    code: 'signaux-lumineux',
    theme: 'signaux',
    nom: 'Signaux lumineux de manœuvre',
    resume:
      "Un feu blanc visible sur tout l'horizon peut doubler les signaux au sifflet, avec le même nombre d'éclats.",
    ordre: 5,
    cible: 1,
    ancrage: 'signaux phoniques de manœuvre',
  },
  {
    code: 'signaux-brume',
    theme: 'signaux',
    nom: 'Signaux par visibilité réduite',
    resume:
      "En route avec erre : un son prolongé toutes les deux minutes. Sans erre : deux sons prolongés. Voilier, pêcheur, remorqueur et navire gêné : un prolongé suivi de deux brefs. Au mouillage : la cloche.",
    ordre: 6,
    cible: 3,
    ancrage: 'signaux phoniques par visibilité réduite',
  },
  {
    code: 'signaux-attirer-attention',
    theme: 'signaux',
    nom: "Attirer l'attention",
    resume:
      "Tout signal qui ne peut être confondu avec un signal réglementaire, ou un projecteur dirigé vers le danger. Un feu intermittent ou tournant de forte intensité est à éviter.",
    ordre: 7,
    cible: 1,
    ancrage: 'signaux de détresse',
  },
  {
    code: 'signaux-detresse',
    theme: 'signaux',
    nom: 'Signaux de détresse',
    resume:
      "La liste est fermée : fusée à parachute rouge, feu à main rouge, fumigène orange, pavillons N et C, carré et boule, flammes sur le navire, SOS, MAYDAY, bras étendus abaissés lentement. On ne les emploie que pour signaler une détresse.",
    ordre: 8,
    cible: 3,
    ancrage: 'signaux de détresse',
  },
  {
    code: 'signaux-portuaires',
    theme: 'signaux',
    nom: 'Signaux portuaires',
    resume:
      "Trois feux rouges en colonne interdisent l'entrée et la sortie, trois verts les autorisent. Un feu blanc au-dessus signale un mouvement en cours.",
    ordre: 9,
    cible: 2,
    ancrage: 'signaux régissant le trafic portuaire',
  },
  {
    code: 'signaux-meteo',
    theme: 'signaux',
    nom: 'Signaux météorologiques',
    resume:
      "Le sémaphore signale les avis de vent fort par des feux ou des pavillons, et l'avis de coup de vent annonce force 8. Les signaux annoncent la zone et l'échéance.",
    ordre: 10,
    cible: 2,
    ancrage: 'signaux météorologiques',
  },

  // ------------------------------------------------------------ feux-marques
  {
    code: 'feux-definitions',
    theme: 'feux-marques',
    nom: 'Définitions et secteurs',
    resume:
      "Feu de tête de mât blanc sur 225°, feux de côté vert et rouge sur 112,5° chacun, feu de poupe blanc sur 135°. Ensemble ils couvrent l'horizon sans recouvrement.",
    ordre: 1,
    cible: 2,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'feux-portee',
    theme: 'feux-marques',
    nom: 'Portée des feux',
    resume:
      "La portée dépend de la longueur du navire. En dessous de 12 mètres, le feu de tête de mât porte à 2 milles, les feux de côté à 1 mille.",
    ordre: 2,
    cible: 1,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'feux-moteur-route',
    theme: 'feux-marques',
    nom: 'Navire à moteur faisant route',
    resume:
      "Feu de tête de mât, feux de côté, feu de poupe. Au-dessus de 50 mètres, un second feu de tête de mât plus haut et sur l'arrière. En dessous de 12 mètres, un feu blanc visible sur tout l'horizon peut remplacer tête de mât et poupe.",
    ordre: 3,
    cible: 3,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'feux-remorquage',
    theme: 'feux-marques',
    nom: 'Remorquage et poussage',
    resume:
      "Deux feux de tête de mât superposés, trois si la remorque dépasse 200 mètres, plus un feu de remorquage jaune au-dessus du feu de poupe. De jour et au-delà de 200 mètres, une marque biconique.",
    ordre: 4,
    cible: 3,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'feux-voile-aviron',
    theme: 'feux-marques',
    nom: 'Voile et aviron',
    resume:
      "Feux de côté et feu de poupe, sans feu de tête de mât. Un voilier peut ajouter deux feux superposés rouge sur vert en tête de mât. À la voile et au moteur, il montre de jour un cône pointe en bas.",
    ordre: 5,
    cible: 3,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'feux-peche',
    theme: 'feux-marques',
    nom: 'Navires de pêche',
    resume:
      "Chalutier : vert sur blanc. Autre pêche : rouge sur blanc, et un feu blanc vers l'engin s'il s'étend à plus de 150 mètres. Avec de l'erre, ils ajoutent feux de côté et de poupe. De jour, deux cônes pointes jointes.",
    ordre: 6,
    cible: 3,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'feux-manoeuvre-restreinte',
    theme: 'feux-marques',
    nom: 'Manœuvre restreinte et plongée',
    resume:
      "Non maître de sa manœuvre : deux feux rouges superposés, deux boules de jour. Capacité de manœuvre restreinte : rouge, blanc, rouge, et boule-bicône-boule de jour. Un support de plongée trop petit montre le pavillon A rigide.",
    ordre: 7,
    cible: 3,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'feux-tirant-eau',
    theme: 'feux-marques',
    nom: "Handicapé par son tirant d'eau",
    resume:
      "Trois feux rouges superposés visibles sur tout l'horizon, en plus des feux de navire à propulsion mécanique. De jour, un cylindre.",
    ordre: 8,
    cible: 1,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'feux-pilote',
    theme: 'feux-marques',
    nom: 'Bateau-pilote',
    resume:
      "Deux feux superposés en tête de mât, blanc au-dessus de rouge. En service, il ajoute feux de côté et de poupe s'il fait route, ou les feux de mouillage s'il est au mouillage.",
    ordre: 9,
    cible: 1,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'feux-mouillage-echoue',
    theme: 'feux-marques',
    nom: 'Mouillage et échouement',
    resume:
      "Au mouillage : un feu blanc visible sur tout l'horizon à l'avant, un second à l'arrière au-delà de 50 mètres, une boule de jour. Échoué : deux feux rouges superposés et trois boules. Sous 7 mètres hors chenal, rien n'est exigé.",
    ordre: 10,
    cible: 3,
    ancrage: 'feux et marques des navires',
  },
  {
    code: 'marques-jour',
    theme: 'feux-marques',
    nom: 'Les marques de jour',
    resume:
      "Boule, cône, cylindre et bicône, noirs, se lisent seuls : une boule au mouillage, un cône pointe en bas au moteur et à la voile, deux cônes pointes jointes en pêche, un cylindre pour le tirant d'eau.",
    ordre: 11,
    cible: 2,
    ancrage: 'feux et marques des navires',
  },

  // ---------------------------------------------------------------- securite
  {
    code: 'securite-categories-conception',
    theme: 'securite',
    nom: 'Catégories de conception',
    resume:
      "Le marquage CE range le bateau de A à D selon la force du vent et la hauteur de vague qu'il supporte : D jusqu'à force 4, C jusqu'à 6, B jusqu'à 8, A au-delà.",
    ordre: 1,
    cible: 2,
    ancrage: 'catégories de conception des navires de plaisance marqués CE',
  },
  {
    code: 'securite-charge-personnes',
    theme: 'securite',
    nom: 'Nombre de personnes et charge',
    resume:
      "Le nombre maximal est porté sur la plaque constructeur ou dans le manuel du propriétaire. Les enfants de moins d'un an n'y comptent pas.",
    ordre: 2,
    cible: 2,
    ancrage: 'le nombre de personnes ou la charge embarquées',
  },
  {
    code: 'securite-armement-basique',
    theme: 'securite',
    nom: 'Armement basique',
    resume:
      "Jusqu'à 2 milles d'un abri : équipement individuel de flottabilité par personne, moyen de repérage lumineux, moyen mobile de lutte contre l'incendie, dispositif d'assèchement, moyen de remonter à bord, annuaire des marées.",
    ordre: 3,
    cible: 2,
    ancrage: "matériel d'armement et de sécurité",
  },
  {
    code: 'securite-armement-cotier',
    theme: 'securite',
    nom: 'Armement côtier',
    resume:
      "De 2 à 6 milles, l'armement basique plus trois feux à main, un compas magnétique, la carte de la zone, le règlement anticollision et un dispositif de repérage et d'assistance.",
    ordre: 4,
    cible: 3,
    ancrage: "matériel d'armement et de sécurité",
  },
  {
    code: 'securite-equipement-individuel',
    theme: 'securite',
    nom: 'Équipements individuels de flottabilité',
    resume:
      "Un par personne embarquée, adapté à sa morphologie. La performance exigée dépend de la distance d'un abri : 50 newtons près du bord, 100 au-delà de 2 milles.",
    ordre: 5,
    cible: 2,
    ancrage: "matériel d'armement et de sécurité",
  },
  {
    code: 'securite-incendie-mouillage',
    theme: 'securite',
    nom: 'Incendie et mouillage',
    resume:
      "Le type d'extincteur, son emplacement et sa signalisation viennent de la notice du constructeur. La ligne de mouillage est exigée dès la navigation côtière.",
    ordre: 6,
    cible: 2,
    ancrage: "matériel d'armement et de sécurité",
  },
  {
    code: 'securite-responsabilite-armement',
    theme: 'securite',
    nom: 'Le chef de bord et l’armement',
    resume:
      "Le chef de bord s'assure que le matériel est à bord, en état de marche, dans sa période de validité et accessible. La division 240 met cette vérification à sa charge, pas à celle du loueur ni du passager.",
    ordre: 7,
    cible: 2,
    ancrage: "matériel d'armement et de sécurité",
  },
  {
    code: 'securite-limitations',
    theme: 'securite',
    nom: 'Limitations de navigation',
    resume:
      "Zones interdites, limitation à 5 nœuds dans la bande des 300 mètres, distance de sécurité autour du pavillon de plongée, interdiction de circuler sur les zones de conchyliculture.",
    ordre: 8,
    cible: 3,
    ancrage: 'les limitations de la navigation',
  },
  {
    code: 'securite-plongeurs',
    theme: 'securite',
    nom: 'Signalisation des plongeurs',
    resume:
      "Un pavillon Alpha ou un pavillon rouge à bande blanche diagonale signale des plongeurs en immersion. On s'en écarte et on réduit sa vitesse.",
    ordre: 9,
    cible: 1,
    ancrage: 'signalisation des plongeurs sous-marins et distance de sécurité',
  },
  {
    code: 'securite-visibilite-restreinte',
    theme: 'securite',
    nom: 'Conduite en visibilité restreinte',
    resume:
      "On réduit l'allure, on se signale, on renforce la veille et on prépare le mouillage. La navigation entre plaisanciers et professionnels s'y joue à la prudence de chacun.",
    ordre: 10,
    cible: 1,
    ancrage: 'la conduite en visibilité restreinte',
  },
  {
    code: 'securite-pieces-administratives',
    theme: 'securite',
    nom: 'Pièces administratives',
    resume:
      "Titre de navigation, titre de conduite, licence de station radio, acte de francisation au-delà de 7 mètres, et les marques extérieures d'immatriculation sur la coque.",
    ordre: 11,
    cible: 3,
    ancrage: 'les pièces administratives à posséder à bord',
  },

  // ---------------------------------------------------------- titre-conduite
  {
    code: 'titre-obligation',
    theme: 'titre-conduite',
    nom: 'Quand le permis est exigé',
    resume:
      "Le titre est exigé pour conduire un bateau de plaisance à moteur dont la puissance dépasse le seuil réglementaire, en mer comme en eaux intérieures.",
    ordre: 1,
    cible: 1,
    ancrage: 'réglementation relative au titre de conduite',
  },
  {
    code: 'titre-options',
    theme: 'titre-conduite',
    nom: 'Options et extension',
    resume:
      "L'option côtière autorise la navigation jusqu'à 6 milles d'un abri, l'extension hauturière la lève, l'option eaux intérieures couvre le domaine fluvial.",
    ordre: 2,
    cible: 2,
    ancrage: 'réglementation relative au titre de conduite',
  },
  {
    code: 'titre-examen',
    theme: 'titre-conduite',
    nom: "Déroulement de l'examen",
    resume:
      "Quarante questions, cinq erreurs admises, et le bénéfice de la théorie conservé dix-huit mois. La formation pratique est validée par un établissement agréé.",
    ordre: 3,
    cible: 2,
    ancrage: 'réglementation relative au titre de conduite',
  },
  {
    code: 'titre-conditions',
    theme: 'titre-conduite',
    nom: 'Conditions de délivrance',
    resume:
      "Âge minimal, aptitude médicale et formation pratique conditionnent la délivrance du titre.",
    ordre: 4,
    cible: 1,
    ancrage: 'réglementation relative au titre de conduite',
  },
  {
    code: 'titre-sanctions',
    theme: 'titre-conduite',
    nom: 'Suspension et retrait',
    resume:
      "Le titre peut être suspendu ou retiré, notamment après une infraction grave ou un accident mettant en cause la conduite.",
    ordre: 5,
    cible: 1,
    ancrage: 'réglementation relative au titre de conduite',
  },

  // --------------------------------------------------------------------- vhf
  {
    code: 'vhf-emport',
    theme: 'vhf',
    nom: 'Quelle VHF emporter',
    resume:
      "L'emport suit la distance à l'abri : rien d'imposé en basique, une VHF fixe dès le semi-hauturier, et en hauturier une VHF portative étanche et une balise de détresse en plus. Le chef de bord répond de l'adéquation de sa station à la zone où il navigue.",
    ordre: 1,
    cible: 3,
    ancrage:
      'le matériel d’armement et de sécurité des navires de plaisance de la catégorie côtière et ses compléments',
  },
  {
    code: 'vhf-licence-mmsi',
    theme: 'vhf',
    nom: 'Licence de station et MMSI',
    resume:
      "L'ANFR délivre la licence d'exploitation de la station et attribue le numéro MMSI à neuf chiffres qui identifie le navire en appel sélectif numérique.",
    ordre: 2,
    cible: 2,
    ancrage: 'connaissances élémentaires du service mobile maritime',
  },
  {
    code: 'vhf-crr',
    theme: 'vhf',
    nom: "Certificat d'opérateur",
    resume:
      "Le certificat restreint de radiotéléphoniste est exigé pour exploiter une VHF fixe hors des eaux territoriales françaises. Le chef de bord répond de l'usage de la station.",
    ordre: 3,
    cible: 2,
    ancrage: 'bon usage d’une station radioélectrique VHF',
  },
  {
    code: 'vhf-canaux',
    theme: 'vhf',
    nom: 'Canaux et puissances',
    resume:
      "Le canal 16 est celui de la détresse et de l'appel, le 70 celui de l'ASN. On appelle sur 16 puis on dégage sur un canal de travail. La puissance se réduit à 1 watt en portée courte.",
    ordre: 4,
    cible: 2,
    ancrage: 'fréquences, voies',
  },
  {
    code: 'vhf-alphabet',
    theme: 'vhf',
    nom: 'Alphabet phonétique',
    resume:
      "L'alphabet international épelle les indicatifs et les noms : Alpha, Bravo, Charlie, Delta… Il évite la confusion sur une liaison brouillée.",
    ordre: 5,
    cible: 2,
    ancrage: 'alphabet phonétique et notions de langue anglaise de base',
  },
  {
    code: 'vhf-smdsm-zones',
    theme: 'vhf',
    nom: 'Zones du SMDSM',
    resume:
      "A1 est couverte par la VHF depuis une station côtière, A2 par la MF, A3 par le satellite géostationnaire, A4 par les régions polaires. La plaisance côtière navigue en A1.",
    ordre: 6,
    cible: 2,
    ancrage: 'zones du système mondial de détresse et de sécurité en mer',
  },
  {
    code: 'vhf-asn',
    theme: 'vhf',
    nom: 'Appel sélectif numérique',
    resume:
      "L'ASN transmet en une pression une alerte numérique portant l'identité du navire et, si la VHF reçoit le GPS, sa position. L'alerte part sur le canal 70, la conversation suit sur le 16.",
    ordre: 7,
    cible: 2,
    ancrage: 'appel sélectif numérique (ASN)',
  },
  {
    code: 'vhf-detresse',
    theme: 'vhf',
    nom: 'Message de détresse',
    resume:
      "MAYDAY répété trois fois, l'identité du navire, sa position, la nature de la détresse, l'assistance demandée et le nombre de personnes à bord. Il ne s'emploie qu'en danger grave et imminent.",
    ordre: 8,
    cible: 3,
    ancrage: 'communications liées à la détresse et à la sécurité',
  },
  {
    code: 'vhf-urgence-securite',
    theme: 'vhf',
    nom: 'Urgence et sécurité',
    resume:
      "PAN PAN annonce un message urgent sans danger imminent, SÉCURITÉ un avis de navigation ou de météo. Les trois niveaux ne se confondent pas.",
    ordre: 9,
    cible: 2,
    ancrage: 'communications liées à la détresse et à la sécurité',
  },
  {
    code: 'vhf-relais',
    theme: 'vhf',
    nom: 'Relayer une détresse',
    resume:
      "Un navire qui entend une détresse sans réponse d'une station côtière la relaie par MAYDAY RELAY, en donnant l'identité du navire en détresse et sa position.",
    ordre: 10,
    cible: 1,
    ancrage: 'communications liées à la détresse et à la sécurité',
  },
  {
    code: 'vhf-fausses-alertes',
    theme: 'vhf',
    nom: 'Protection des fréquences',
    resume:
      "Le canal 16 est veillé et réservé. Une fausse alerte se corrige immédiatement par un message annulant l'appel, et les essais se font sur un canal de travail.",
    ordre: 11,
    cible: 2,
    ancrage: 'protection des fréquences de détresse',
  },
  {
    code: 'vhf-sauvetage',
    theme: 'vhf',
    nom: 'Organisation du sauvetage',
    resume:
      "Le CROSS coordonne le sauvetage dans sa zone, engage les moyens et reste l'interlocuteur du navire en détresse. La convention SAR découpe les responsabilités entre États.",
    ordre: 12,
    cible: 2,
    ancrage: 'organisation du sauvetage en mer',
  },

  // ----------------------------------------------------- ski-responsabilites
  {
    code: 'ski-conditions',
    theme: 'ski-responsabilites',
    nom: 'Ski nautique et engins tractés',
    resume:
      "Le remorquage se fait de jour, hors bande des 300 mètres sauf chenal, avec une personne à bord chargée de surveiller le skieur en plus du pilote.",
    ordre: 1,
    cible: 2,
    ancrage: 'règles de la pratique du ski nautique et des engins tractés',
  },
  {
    code: 'vnm-regles',
    theme: 'ski-responsabilites',
    nom: 'Véhicules nautiques à moteur',
    resume:
      "Le scooter des mers navigue de jour seulement et dans une limite de distance d'abri qui dépend du nombre de places. Le port du gilet et le coupe-circuit y sont la règle.",
    ordre: 2,
    cible: 2,
    ancrage: 'règles de la pratique du ski nautique et des engins tractés',
  },
  {
    code: 'responsabilite-chef-de-bord',
    theme: 'ski-responsabilites',
    nom: 'Responsabilité du chef de bord',
    resume:
      "Il répond du bateau, de l'équipage et du respect des règles. Sa responsabilité est civile et pénale, et elle ne se délègue pas.",
    ordre: 3,
    cible: 2,
    ancrage: 'la responsabilité du chef de bord et ses conséquences juridiques',
  },
  {
    code: 'conduite-detresse',
    theme: 'ski-responsabilites',
    nom: 'Réactions en cas de danger grave',
    resume:
      "Alerter tôt par VHF plutôt que par téléphone, faire mettre les gilets, rester à bord tant que le bateau flotte, et ne pas se mettre en danger pour sauver du matériel.",
    ordre: 4,
    cible: 2,
    ancrage: 'les bonnes réactions du chef de bord en cas de danger grave',
  },
  {
    code: 'conduite-incendie-voie-eau',
    theme: 'ski-responsabilites',
    nom: 'Incendie et voie d’eau',
    resume:
      "Incendie : couper l'alimentation, attaquer à la base des flammes, mettre le feu sous le vent. Voie d'eau : localiser, aveugler, assécher, et rallier l'abri le plus proche.",
    ordre: 5,
    cible: 2,
    ancrage: 'les bonnes réactions du chef de bord en cas de danger grave',
  },
  {
    code: 'conduite-homme-a-la-mer',
    theme: 'ski-responsabilites',
    nom: 'Homme à la mer',
    resume:
      "Un équipier ne quitte pas la personne des yeux, on jette une bouée, on marque la position au GPS et on revient face au vent, moteur débrayé à l'approche.",
    ordre: 6,
    cible: 2,
    ancrage: 'les bonnes réactions du chef de bord en cas de danger grave',
  },
  {
    code: 'conduite-echouement-panne',
    theme: 'ski-responsabilites',
    nom: 'Échouement et panne',
    resume:
      "Échouement : vérifier la coque et l'état de la marée avant de tenter de se déséchouer. Panne moteur : mouiller si on dérive vers un danger, puis demander assistance.",
    ordre: 7,
    cible: 1,
    ancrage: 'les bonnes réactions du chef de bord en cas de danger grave',
  },

  // --------------------------------------------------------------- carburant
  {
    code: 'carburant-autonomie',
    theme: 'carburant',
    nom: "Calcul d'autonomie",
    resume:
      "L'autonomie se déduit de la capacité du réservoir et de la consommation horaire au régime tenu. La consommation croît vite avec la vitesse.",
    ordre: 1,
    cible: 2,
    ancrage: "notions d'autonomie en matière de carburant",
  },
  {
    code: 'carburant-regle-tiers',
    theme: 'carburant',
    nom: 'Règle des tiers',
    resume:
      "Un tiers pour l'aller, un tiers pour le retour, un tiers de réserve. La marge absorbe le vent contraire, le courant et le détour.",
    ordre: 2,
    cible: 2,
    ancrage: "notions d'autonomie en matière de carburant",
  },

  // ----------------------------------------------------------- environnement
  {
    code: 'env-rejets',
    theme: 'environnement',
    nom: 'Rejets interdits',
    resume:
      "Le rejet d'hydrocarbures, d'ordures et d'eaux usées est interdit ou strictement encadré selon la distance à la côte. Les infractions sont lourdement sanctionnées.",
    ordre: 1,
    cible: 2,
    ancrage: 'la protection de l’environnement : les rejets',
  },
  {
    code: 'env-equipement-sanitaire',
    theme: 'environnement',
    nom: 'Équipement sanitaire',
    resume:
      "Un navire équipé de toilettes retient ou traite ses eaux usées : capacités de rétention, avec raccord de vidange normalisé si les réservoirs sont fixes, ou installation de traitement. C'est la présence de toilettes qui déclenche l'obligation, pas l'habitabilité.",
    ordre: 2,
    cible: 1,
    ancrage: 'l’équipement sanitaire des navires habitables',
  },
  {
    code: 'env-antisalissures',
    theme: 'environnement',
    nom: 'Peintures antisalissures',
    resume:
      "Les antifoulings les plus toxiques sont interdits, et le carénage se fait sur une aire équipée qui récupère les résidus.",
    ordre: 3,
    cible: 1,
    ancrage: 'les peintures antisalissures',
  },
  {
    code: 'env-peche-loisir',
    theme: 'environnement',
    nom: 'Pêche de loisir',
    resume:
      "Le produit de la pêche de loisir ne peut être ni vendu, ni colporté, ni acheté. Certaines espèces doivent être marquées, et les tailles minimales s'appliquent.",
    ordre: 4,
    cible: 2,
    ancrage: 'protection de la ressource halieutique',
  },
  {
    code: 'env-peche-sous-marine',
    theme: 'environnement',
    nom: 'Pêche sous-marine',
    resume:
      "Le fusil-harpon est interdit aux moins de seize ans. Elle est interdite avec un scaphandre, de nuit, et à proximité des engins de pêche professionnelle. Le plongeur signale sa présence.",
    ordre: 5,
    cible: 1,
    ancrage: 'réglementation de la pêche sous-marine',
  },
  {
    code: 'env-faune-flore',
    theme: 'environnement',
    nom: 'Faune et flore',
    resume:
      "On ne poursuit pas les cétacés, on garde ses distances et on ne coupe pas leur route. Le mouillage sur herbier de posidonie est interdit là où il est réglementé.",
    ordre: 6,
    cible: 2,
    ancrage: 'protection de la faune et de la flore',
  },
  {
    code: 'env-aires-protegees',
    theme: 'environnement',
    nom: 'Aires marines protégées',
    resume:
      "Parcs nationaux, parcs naturels marins et réserves imposent des règles propres : mouillage, vitesse, pêche et débarquement peuvent y être limités.",
    ordre: 7,
    cible: 1,
    ancrage: 'protection de la faune et de la flore',
  },

  // ------------------------------------------------------------------- meteo
  {
    code: 'meteo-sources',
    theme: 'meteo',
    nom: 'Se procurer les prévisions',
    resume:
      "Bulletins côtiers et du large diffusés par VHF, sémaphores, radio, capitaineries et sites spécialisés. On consulte avant de partir et on réactualise en mer.",
    ordre: 1,
    cible: 2,
    ancrage: 'la météorologie : savoir se procurer les prévisions',
  },
  {
    code: 'meteo-beaufort',
    theme: 'meteo',
    nom: 'Échelle de Beaufort',
    resume:
      "Elle gradue la force du vent de 0 à 12. Force 7 est un grand frais, force 8 un coup de vent qui déclenche l'avis, force 10 une tempête.",
    ordre: 2,
    cible: 3,
    ancrage: 'connaître l’échelle anémométrique Beaufort',
  },
  {
    code: 'meteo-etat-mer',
    theme: 'meteo',
    nom: "État de la mer",
    resume:
      "Une échelle distincte de Beaufort, de 0 à 9, qui décrit la hauteur des vagues. Elle dépend aussi du fetch, de la durée du vent et du courant.",
    ordre: 3,
    cible: 2,
    ancrage: 'l’état de la mer',
  },
  {
    code: 'meteo-facteurs',
    theme: 'meteo',
    nom: 'Facteurs météorologiques',
    resume:
      "Dépression et anticyclone commandent le vent, la brise thermique se lève l'après-midi près des côtes, et les vents de Méditerranée — mistral, tramontane — se lèvent vite et fort.",
    ordre: 4,
    cible: 2,
    ancrage: 'la météorologie',
  },
  {
    code: 'meteo-bulletin',
    theme: 'meteo',
    nom: 'Lire un bulletin',
    resume:
      "Le bulletin donne l'avis en cours, la situation générale, puis la prévision par zone : vent, mer, visibilité. Le BMS annonce un phénomène dangereux.",
    ordre: 5,
    cible: 2,
    ancrage: 'la météorologie : savoir se procurer les prévisions',
  },
  {
    code: 'meteo-decision',
    theme: 'meteo',
    nom: 'Décider de sa sortie',
    resume:
      "On croise la prévision avec la catégorie de conception du bateau, le plan d'eau et l'expérience de l'équipage. Renoncer fait partie de la décision.",
    ordre: 6,
    cible: 1,
    ancrage: 'la météorologie',
  },

  // ------------------------------------------------------------- carte-marine
  {
    code: 'carte-generalites',
    theme: 'carte-marine',
    nom: 'Lire une carte marine',
    resume:
      "Le nord est en haut, l'échelle est indiquée, et le titre porte le zéro des sondes et l'unité employée. Une carte à jour est exigée à bord dès la navigation côtière.",
    ordre: 1,
    cible: 1,
    ancrage: 'initiation à la lecture d’une carte marine',
  },
  {
    code: 'carte-distances',
    theme: 'carte-marine',
    nom: 'Mesurer une distance',
    resume:
      "Le mille marin vaut une minute de latitude. On le mesure sur l'échelle des latitudes, sur les bords verticaux de la carte, jamais sur les bords horizontaux.",
    ordre: 2,
    cible: 2,
    ancrage: 'initiation à la lecture d’une carte marine',
  },
  {
    code: 'carte-symboles',
    theme: 'carte-marine',
    nom: 'Symboles élémentaires',
    resume:
      "Le blanc est profond, le bleu peu profond, le vert découvre à basse mer, le jaune est la terre. Les sondes sont comptées depuis le zéro des cartes, la nature des fonds est abrégée.",
    ordre: 3,
    cible: 3,
    ancrage: 'connaissance des symboles élémentaires',
  },
  {
    code: 'carte-dangers-amers',
    theme: 'carte-marine',
    nom: 'Dangers et points remarquables',
    resume:
      "Roches, épaves et hauts-fonds ont chacun leur symbole. Phares, clochers et châteaux d'eau servent d'amers et portent la description de leur feu.",
    ordre: 4,
    cible: 2,
    ancrage: 'connaissance des symboles élémentaires',
  },
  {
    code: 'maree-principe',
    theme: 'carte-marine',
    nom: 'Pourquoi il y a des marées',
    resume:
      "L'attraction de la Lune et du Soleil creuse et gonfle la mer deux fois par jour sur la façade atlantique. Vives-eaux quand les deux astres s'alignent, mortes-eaux quand ils sont en quadrature.",
    ordre: 5,
    cible: 1,
    ancrage: 'notions élémentaires sur la marée',
  },
  {
    code: 'maree-definitions',
    theme: 'carte-marine',
    nom: 'Le vocabulaire de la marée',
    resume:
      "Pleine mer et basse mer bornent le cycle, le marnage est leur différence, la hauteur d'eau se compte depuis le zéro des cartes, et la profondeur est la sonde plus la hauteur.",
    ordre: 6,
    cible: 2,
    ancrage: 'notions élémentaires sur la marée',
  },
  {
    code: 'maree-coefficient',
    theme: 'carte-marine',
    nom: 'Coefficients',
    resume:
      "Le coefficient va de 20 à 120. En dessous de 45 c'est morte-eau, au-dessus de 95 vive-eau. Plus il est fort, plus le marnage et les courants sont grands.",
    ordre: 7,
    cible: 2,
    ancrage: 'notions élémentaires sur la marée',
  },
  {
    code: 'maree-consequences',
    theme: 'carte-marine',
    nom: 'Conséquences sur la navigation',
    resume:
      "La marée décide de la hauteur d'eau sur un haut-fond, du tirant d'air sous un pont et de la force du courant dans un passage. L'annuaire des marées est au nombre des équipements obligatoires.",
    ordre: 8,
    cible: 2,
    ancrage: 'la marée et ses conséquences sur la navigation',
  },

  // ----------------------------------------------------------------- ecluses
  {
    code: 'ecluses-signaux-acces',
    theme: 'ecluses',
    nom: "Signaux d'accès à l'écluse",
    resume:
      "Deux rouges interdisent l'accès. Trois signaux annoncent seulement l'ouverture prochaine sans l'autoriser : un rouge éteint sur deux, un rouge et un vert juxtaposés, un rouge au-dessus d'un vert. Seuls un vert isolé ou deux verts juxtaposés ouvrent l'accès.",
    ordre: 1,
    cible: 3,
    ancrage: 'règles d’utilisation des écluses gardées ou automatiques',
  },
  {
    code: 'ecluses-approche',
    theme: 'ecluses',
    nom: "Approche et attente",
    resume:
      "On attend son tour au garage sans dépasser ni gêner la sortie, et une écluse sans feu ni panneau ne s'aborde pas comme une écluse qui autorise. L'ordre de passage se prend derrière celui qui est arrivé avant.",
    ordre: 2,
    cible: 2,
    ancrage: 'règles d’utilisation des écluses gardées ou automatiques',
  },
  {
    code: 'ecluses-passage',
    theme: 'ecluses',
    nom: 'Passage et amarrage',
    resume:
      "Les commerciaux passent avant la plaisance. On s'amarre avant et arrière sans raidir, on file ou on reprend au fur et à mesure, moteur prêt et pare-battages en place.",
    ordre: 3,
    cible: 2,
    ancrage: 'règles d’utilisation des écluses gardées ou automatiques',
  },
] as const;

export const CODES_NOTIONS: readonly string[] = NOTIONS.map((n) => n.code);

export function notionParCode(code: string): Notion | undefined {
  return NOTIONS.find((n) => n.code === code);
}

export function estCodeNotion(code: string): boolean {
  return CODES_NOTIONS.includes(code);
}

/** Les notions d'un thème, dans l'ordre de la progression. */
export function notionsDuTheme(codeTheme: string): readonly Notion[] {
  return NOTIONS.filter((n) => n.theme === codeTheme).sort(
    (a, b) => a.ordre - b.ordre,
  );
}

/** Somme des cibles des notions d'un thème. */
export function cibleNotionsDuTheme(codeTheme: string): number {
  return notionsDuTheme(codeTheme).reduce((total, n) => total + n.cible, 0);
}

/**
 * Vérifie qu'aucune notion ne pointe vers un thème inconnu. Appelé par les
 * tests : une faute de frappe dans `theme` rendrait la notion invisible.
 */
export function notionsOrphelines(): readonly Notion[] {
  return NOTIONS.filter((n) => !CODES_THEMES.includes(n.theme));
}

/**
 * La notion qui précède et celle qui suit, dans le même thème. C'est la
 * progression du thème qui fait l'ordre, pas l'ordre alphabétique : passer
 * d'une notion à la suivante doit revenir à avancer dans la révision.
 */
export function notionsVoisines(code: string): {
  precedente?: Notion;
  suivante?: Notion;
} {
  const notion = notionParCode(code);
  if (!notion) return {};
  const fratrie = notionsDuTheme(notion.theme);
  const rang = fratrie.findIndex((n) => n.code === code);
  return { precedente: fratrie[rang - 1], suivante: fratrie[rang + 1] };
}
