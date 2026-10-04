# Design

Monde visuel arrêté le 2026-09-05 pour la refonte de direction artistique.
Remplace l'ancien parti « carte marine » (papier chamois, serif, magenta),
jugé trop proche des sites générés.

## Le parti

Le site ressemble aux objets qu'il fait apprendre, pas au manuel qui les
décrit : une bouée, un gilet, un panneau de port. Il emprunte aux applications
d'apprentissage leur grammaire, que le candidat connaît déjà, et il la peint
aux couleurs de la mer réglementée.

Ce qu'on reconnaît de loin : le bleu marine et le jaune cardinal, les capitales
étendues très grasses, les boutons à bord plein qui s'enfoncent.

## Couleur

| Rôle | Clair | Sombre |
|---|---|---|
| Encre, fond de bande | `#0b1d3a` marine | `#eef2f9` texte |
| Fond de page | `#f3f6fb` brume | `#0a1730` |
| Surface | `#ffffff` | `#122446` |
| Accent, action | `#ffc72c` jaune cardinal, texte marine dessus | idem |
| Juste | `#0f8544` fond, `#0b6b37` texte, `#d8f3e2` pâle | ajusté |
| Faux | `#d92b22` fond, `#a8231c` texte, `#fde0dd` pâle | ajusté |
| Filet | `#cfd8e6`, fort `#a9b7cc` | `#2a3f66` |

Le jaune est la seule couleur d'action. Le vert et le rouge ne servent qu'au
verdict et au chrono qui expire. Aucun gris neutre : tout est teinté marine.

## Typographie

Une famille, Archivo variable, sur deux largeurs.

- Display : largeur 125 %, graisse 800, interlettrage -0,01 em. Titres de page,
  grands nombres, chrono, compteur, wordmark.
- Interface et corps : largeur 100 %, graisses 400, 600, 700. Corps 17 px,
  interligne 1,5, mesure 56 ch, soit soixante-douze caractères rendus.
- Chiffres tabulaires partout.

## Forme

- Rayon unique `1rem` sur les boutons, propositions, encadrés, visuels ;
  `0.625rem` sur les champs et petites pastilles ; cercle sur la lettre des
  propositions.
- Bordures 2 px, jamais colorées sur un seul côté.
- Pas d'ombre portée. La seule profondeur est le **bord plein** de 3 px sous
  les boutons et les propositions, qui disparaît quand on appuie. Nulle part
  ailleurs.
- Une bande marine pleine largeur ouvre l'accueil, soulignée d'une ligne jaune
  de 6 px, la « ligne de flottaison ». C'est le seul endroit où elle apparaît.
- Les liens sont soulignés d'un trait jaune de 2 px, comme un surligneur.
- Un chapeau, un résumé, une réponse courte se distinguent par la largeur
  125 % et la graisse 600, rien d'autre : ni trait de côté, ni label au-dessus.
  Le fil d'Ariane dit où l'on est ; le titre n'a pas besoin d'un sur-titre.
- Un bouton désactivé garde sa place et sa forme et perd sa couleur d'action :
  fond `--fond-2` (jaune pâle pour le principal), texte doux, relief en filet.
  Jamais d'opacité : à 50 %, le texte se devine au lieu de se lire.

## Mouvement

Transform et opacité seulement, 120 à 200 ms, sortie exponentielle. Un seul
moment écrit : le verdict, qui colore d'un coup la barre d'action, marque la
lettre des propositions corrigées et fait monter l'explication. Tout se coupe
sous `prefers-reduced-motion`.

Le reste n'est pas un moment, c'est de la preuve : un contrôle répond en
120 ms, une jauge se remplit en 200 ms, une question ou un écran de résultat
qui remplace le précédent entre en 180 ms, pour qu'on voie que la page a
changé. Deux exceptions, nommées dans le test `mouvement.test.ts` et nulle
part ailleurs : l'horloge du chrono glisse une seconde en linéaire entre deux
battements, et la silhouette bat le temps que la banque arrive. Rien ne
clignote pour attirer l'œil, les cinq dernières secondes se disent en rouge.

Quand le son des signaux arrivera, il fera le même geste que le verdict : la
frise repart du début à l'instant où le son part, et s'arrête avec lui. Aucun
mouvement propre au son, aucun son sans geste du candidat.

## Écran de jeu

Compteur et chrono en display, jauge du chrono en jaune (rouge sur les cinq
dernières secondes), avancement de l'examen en marine dessous. Propositions en
cartes blanches à bord plein, lettre dans un cercle ; cochée, la carte passe
jaune pâle avec bordure marine ; corrigée, verte ou rouge. Sous 46 rem, la barre
d'action est collée en bas et prend la couleur du verdict.

## Ce qu'on refuse

Sur-titre au-dessus d'un titre, grille de cartes identiques, bordure colorée de
côté, ombre douce, dégradé sur du texte, icônes en emoji, beige.
