---
name: permis-cotier
description: Une page blanche de carnet de bord, où quatre étiquettes pâles disent de quel morceau du programme on parle.
colors:
  fond: "#ffffff"
  fond-carte: "#ffffff"
  fond-2: "#f7f7f5"
  filet: "#e9e9e7"
  filet-fort: "#8e8c86"
  texte: "#37352f"
  texte-doux: "#6b6a65"
  action: "#191918"
  action-survol: "#3b3a36"
  sur-action: "#ffffff"
  teinte: "#efefed"
  lien: "#1d63c9"
  anneau: "#1d63c9"
  vert: "#3f8458"
  vert-texte: "#245133"
  vert-pale: "#e3f0e4"
  rouge: "#c4332b"
  rouge-texte: "#8f2721"
  rouge-pale: "#fbeceb"
  jaune: "#ffc72c"
  sur-jaune: "#191918"
  bleu: "#e1edf6"
  bleu-texte: "#1d4466"
  bleu-trait: "#3a78ad"
  rose: "#f8e4ec"
  rose-texte: "#6e2a48"
  rose-trait: "#c0477f"
  sable: "#fbf0d4"
  sable-texte: "#5c4210"
  sable-trait: "#a87316"
  orange: "#f8e6d7"
  orange-texte: "#693913"
  orange-trait: "#b8682a"
colors-sombre:
  fond: "#191919"
  fond-carte: "#191919"
  fond-2: "#252525"
  filet: "#2f2f2f"
  filet-fort: "#74736f"
  texte: "#e6e5e3"
  texte-doux: "#9b9a97"
  action: "#e6e5e3"
  action-survol: "#ffffff"
  sur-action: "#191919"
  teinte: "#2c2c2b"
  lien: "#5c9fe8"
  vert-texte: "#8fd2a3"
  vert-pale: "#18301f"
  rouge-texte: "#f4a59e"
  rouge-pale: "#3a1c1a"
  bleu: "#1f3447"
  bleu-texte: "#a9cbe8"
  rose: "#3e2230"
  rose-texte: "#eeb3cd"
  sable: "#3b3016"
  sable-texte: "#efd38c"
  orange: "#3d2a1b"
  orange-texte: "#f0bf94"
typography:
  famille: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif"
  display: { fontSize: "clamp(1.875rem, 4.2vw, 2.5rem)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em" }
  titre: { fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.3 }
  sous-titre: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.3 }
  chapeau: { fontSize: "1.25rem", fontWeight: 400, lineHeight: 1.45 }
  corps: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5 }
  petit: { fontSize: "0.875rem", fontWeight: 400, lineHeight: 1.5 }
  legende: { fontSize: "0.8125rem", fontWeight: 400, lineHeight: 1.45 }
  etiquette: { fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.3 }
  enonce: { fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.01em" }
rounded:
  etiquette: "4px"
  controle: "6px"
  panneau: "10px"
spacing: ["0.25rem", "0.5rem", "0.75rem", "1rem", "1.5rem", "2rem", "3rem", "4.5rem"]
---

# Design

Monde visuel arrêté le 28 octobre 2026, « la page calme ». Il remplace la
« signalétique de mer » du 5 septembre (bandes marine, jaune cardinal sur
tous les boutons, Archivo étendue, bord plein de 3 px), qui criait partout à la
fois. Le modèle est `tri-offres` (« The Quiet Page ») ; les références sont
Notion pour la page, les propriétés et les étiquettes, OpenSEO pour l'action
noire et la sans posée avec soin.

Vaut pour le site et pour l'app. Ce qui ne vaut que pour l'app est dans
`docs/app-da.md`, qui ne contredit rien d'ici.

## Le parti

**Une page blanche de carnet de bord.** Marges larges, encre gris chaud, rien
qui réclame l'œil sauf la seule décision à l'écran : la question, le bouton qui
la valide. On vient réviser dix minutes entre deux choses ; le calme et la
lisibilité battent l'astuce.

Ce qui porte du sens tient en trois couleurs, et seulement trois : le vert et
le rouge du verdict, et quatre étiquettes pâles qui disent de quel morceau du
programme on parle. Tout le reste est gris.

Ce qu'on reconnaît de loin : la page blanche, une action noire (jaune dans
l'app), les étiquettes de groupe, le pavillon Q jaune du reçu.

## Couleur

| Rôle | Clair | Sombre |
|---|---|---|
| Fond de page, surface (`--fond`, `--fond-carte`) | `#ffffff` | `#191919` |
| Lavis, seconde surface (`--fond-2`) | `#f7f7f5` | `#252525` |
| Filet (`--filet`) | `#e9e9e7` | `#2f2f2f` |
| Bord de champ (`--filet-fort`) | `#8e8c86` | `#74736f` |
| Encre (`--texte`) | `#37352f` | `#e6e5e3` |
| Encre douce (`--texte-doux`) | `#6b6a65` | `#9b9a97` |
| Action (`--action`, texte `--sur-action`) | `#191918`, blanc | `#e6e5e3`, `#191919` |
| Choisi (`--teinte`) | `#efefed` | `#2c2c2b` |
| Lien et anneau (`--lien`, `--anneau`) | `#1d63c9` | `#5c9fe8` |
| Juste (`--vert`, `--vert-texte`, `--vert-pale`) | `#3f8458`, `#245133`, `#e3f0e4` | ajusté |
| Faux (`--rouge`, `--rouge-texte`, `--rouge-pale`) | `#c4332b`, `#8f2721`, `#fbeceb` | ajusté |
| Jaune cardinal (`--jaune`, texte `--sur-jaune`) | `#ffc72c`, `#191918` | idem |

Le sombre est le gris de Notion, pas un marine : `#191919`, une surface un cran
au-dessus en `#252525`.

- **Lavis** : la surface calme. Le cadre d'un visuel, le champ de recherche de
  l'en-tête, le survol d'un bouton second et d'une rangée, le pied de page.
- **Filet** : chaque séparation d'un pixel, le contour d'un panneau, la
  proposition au repos.
- **Bord de champ** : le contour d'un champ, d'un bouton second, d'une case :
  il tient 3:1 sur le blanc pour qu'un contrôle se lise comme un contrôle.
- **Action** : le fond du bouton principal du site, la case cochée, la lettre
  d'une proposition cochée, l'onglet courant. `--teinte` est le fond de ce qui
  est choisi (proposition cochée, entrée de navigation courante).
- **Lien** : les liens dans le texte et l'anneau de focus. Rien d'autre n'est
  bleu.
- **Jaune cardinal** : le bouton principal de l'app, la marque (le glyphe
  cardinal de l'en-tête et de l'icône), le pavillon Q du reçu. Jamais un fond de
  panneau, jamais un lien.

### Les étiquettes de groupe

Les quatorze thèmes se rangent en quatre groupes, chacun avec une étiquette
pâle : un fond, une encre pour le texte posé dessus, un trait pour les petites
marques sur le blanc. La table est `src/lib/groupes.ts`, tenue par son test.

| Groupe | Couleur | Thèmes |
|---|---|---|
| Ce qu'on voit sur l'eau | bleu | Balisage, Balisage région B, Feux et marques, Signaux |
| Qui passe en premier | rose | Règles de barre et de route, Écluses |
| Préparer la sortie | sable (jaune pâle) | Météorologie, Carte marine et marées, Autonomie en carburant |
| Sécurité et papiers | orange | Navigation et sécurité, VHF et SMDSM, Titre de conduite, Ski nautique et responsabilités, Environnement |

### Règles nommées

**La règle du verdict.** Le vert et le rouge ne disent que juste ou faux (une
proposition corrigée, un examen reçu ou recalé, le chrono qui expire). Jamais
une décoration, jamais un groupe. La couleur ne suffit jamais seule : un mot ou
un signe (✓, ✕, « Juste », « Reçu ») l'accompagne (WCAG 1.4.1).

**La règle d'une couleur par groupe.** Bleu, rose, sable et orange désignent
chacun un groupe de thèmes, partout. Une nouvelle surface ne reprend une de ces
couleurs que pour le même groupe.

**La règle du gris par défaut.** Un panneau est blanc avec un filet ; seule son
étiquette porte la couleur. Les fonds colorés sont réservés aux étiquettes, à
la proposition corrigée et à la feuille de correction de l'app.

**La règle des paires testées.** Chaque paire texte sur fond et bord sur fond
est tenue par `src/styles/contraste.test.ts`, en clair et en sombre : 4,5:1 pour
le texte, 3:1 pour un bord de contrôle. Une paire nouvelle entre au test avant
de partir.

## Typographie

**Famille** : la sans du système, `ui-sans-serif, -apple-system,
BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`. Rien ne se
télécharge : la page a l'air native sur chaque appareil, comme Notion, et l'app
parle la police que le doigt connaît.

**Caractère** : sobre et exact. La hiérarchie vient des pas de taille et de
graisse, pas d'une seconde famille. Chiffres tabulaires partout
(`font-variant-numeric: tabular-nums` sur le corps).

- **Display** (700, 2,5 rem au plus, interligne 1,15, -0,02 em) : le `h1` de
  chaque écran, un seul.
- **Énoncé** (700, 1,5 rem, 1,3) : la question en jeu.
- **Titre** (600, 1,25 rem) : les `h2` de section.
- **Sous-titre** (600, 1 rem) : `h3`, titres de panneau.
- **Chapeau** (400, 1,25 rem, 1,45, encre douce) : la phrase d'ouverture d'une
  page, 34 rem au plus.
- **Corps** (400, 1 rem, 1,5) : la prose, mesurée à 40 rem au plus
  (`--mesure`), soit soixante-dix caractères.
- **Petit** (0,875 rem) : navigation, rangées de tableau, pied.
- **Légende** (0,8125 rem) : méta, compteurs, en-têtes de colonne. Jamais
  plus petit, sauf le libellé d'onglet natif de l'app (11 pt, la mesure d'iOS).
- **Étiquette** (600, 0,8125 rem) : le nom d'un groupe ou d'un verdict.

**La règle de la police native.** Aucun `@font-face`, aucun CDN, aucun
`@import`. Graisses 400, 600 et 700, cette dernière pour le display, l'énoncé
et les grands chiffres.

## Mise en page

Une colonne centrée de 72 rem au plus (`.page`), partagée par l'en-tête, la
page et le pied. Le blanc sépare ; le filet est l'exception. Les échelons
d'espace vont de 0,25 à 4,5 rem.

- **L'en-tête** : blanc, 56 px, un filet dessous. La marque à gauche, le champ
  de recherche sur lavis avec sa touche `/`, la navigation à droite en petit et
  en encre douce ; l'entrée courante est en encre, 600, sur `--teinte`.
- **L'accueil** : le texte à gauche, un panneau à droite (la question à
  essayer, ou les derniers examens de qui revient) à partir de 52 rem. Plus de
  bande pleine largeur : la page reste blanche du haut en bas.
- **Le programme** est une vue de base, comme une base Notion : un tableau
  sobre, une rangée par thème (nom en 600, étiquette de groupe, comptes en
  chiffres tabulaires), filets entre les rangées, lavis au survol. Plus de
  grille de cartes.
- **L'examen du site** : à partir de 60 rem, deux colonnes, la question à
  37 rem au plus à gauche, le **carnet** à droite (17 rem, collé à 1,5 rem du
  haut) qui dit la question en cours, le temps et la règle d'admission. Sous
  60 rem, une colonne.

**La règle d'une décision.** Un écran pose une question ou propose une action
principale ; le carnet à côté est la seule autre chose en vue.

## Profondeur

À plat. La séparation vient du blanc d'abord, du filet ensuite, du lavis enfin.
Une seule ombre, `--ombre-flottante` (l'ombre de menu de Notion), et seulement
sur ce qui flotte au-dessus de la page : la fenêtre de recherche, une feuille
de correction qui monte dans l'app.

**La règle de l'ombre qui flotte.** Une ombre veut dire « ceci est au-dessus
de la page et va partir ». Panneaux, cartes et boutons n'en ont jamais.

## Formes

Trois coins, chacun son métier : 4 px pour les petites marques (étiquettes,
lettre d'une proposition, touche de clavier), 6 px pour les contrôles
(boutons, champs, propositions, segments), 10 px pour les panneaux (encadrés,
cadre d'un visuel, fenêtre de recherche, feuille de correction). Les bordures
font un pixel partout ; les seules lignes de 2 px sont l'anneau de focus, le
soulignement de l'onglet courant et celui d'un lien survolé.

Le cadre de téléphone des captures de l'accueil est le seul arrondi au-delà,
parce qu'il dessine un objet : bord noir `#191918`, filet clair.

La marque est le carré noir `#191918` aux coins de 5 px qui porte deux cônes
jaunes, la marque cardinale nord : le seul jaune de l'en-tête.

Les icônes sont en SVG en ligne, trait en `currentColor`, décoratives
(`aria-hidden`).

## Composants

### Boutons

- **Principal du site** : fond `--action`, texte `--sur-action` 600, coins
  6 px, 2,75 rem de haut, 1,25 rem de côté. Un par écran. Survol
  `--action-survol` ; appuyé, il descend d'un pixel.
- **Principal de l'app** : jaune cardinal, texte `--sur-jaune` 600, mêmes
  formes. C'est la seule couleur franche de l'app, hors le verdict et le
  pavillon Q.
- **Second** : blanc, filet `--filet-fort`, encre ; survol sur lavis.
- **Discret** : du texte souligné, sans cadre.
- **Désactivé** : garde sa place et sa forme, fond lavis, filet, encre douce.
  Jamais d'opacité : à 50 %, le texte se devine au lieu de se lire.

### Liens

Bleu `--lien`, soulignés d'un pixel dans le texte (le bleu seul ne se distingue
pas assez de l'encre), deux pixels au survol. Dans une navigation ou une liste
de liens, sans soulignement, en encre.

### Étiquettes

Un pavé de 4 px de coin, fond pâle, encre sombre, 600, 0,8125 rem : il nomme un
groupe de thèmes ou un verdict (« 32 sur 40 » sur rouge pâle), jamais une
valeur quelconque. Classe `.etiquette` et ses variantes `--bleu`, `--rose`,
`--sable`, `--orange`, `--juste`, `--faux`.

### Panneaux

Blanc, filet d'un pixel, coins 10 px, marge 1 rem 1,25 rem 1,25 rem (classe
`.encadre`). Tête : le titre ou l'étiquette à gauche, un lien à droite. Pied :
une ligne en encre douce sous un filet.

### Propositions

Une rangée par réponse, filet au repos, coins 6 px, la lettre dans un carré de
4 px cerné du bord de champ. Survol : bord de champ. Cochée : fond `--teinte`,
bord de champ, lettre pleine en `--action`. Corrigée : fond vert ou rouge
pâle, bord et lettre en `--vert` ou `--rouge`, avec ✓ ou ✕ et un mot pour le
lecteur d'écran.

### Le chrono

Un trait de 2 px sur le filet, en encre ; rouge sur les cinq dernières
secondes. Le compte en secondes est dans le carnet.

### Le carnet

Le panneau à droite de l'examen du site : « Ton examen », trois propriétés en
liste de définitions (libellé en encre douce, valeur en 600, chiffres
tabulaires), une grille de quarante cases (faite en encre, courante cerclée),
et un pied qui rappelle qu'aucune correction ne vient avant la fin.

### Le pavillon Q

Au reçu d'un examen blanc seulement : le pavillon jaune uni hissé le long d'un
mât en encre, à gauche du score. La libre pratique du Code international des
signaux, l'entrée au port.

## Mouvement

Transform et opacité seulement, 120 à 200 ms, courbe
`cubic-bezier(0.16, 1, 0.3, 1)` qui part vite et se pose. Deux moments écrits,
pas un de plus. Le verdict, qui colore d'un coup les propositions corrigées et
fait monter l'explication (dans l'app, la feuille de correction). L'examen
blanc reçu, qui hisse le pavillon Q. Recalé, interrompu, entraînement n'ont pas
de moment. Tout se coupe sous `prefers-reduced-motion`, le pavillon est alors
en tête d'emblée.

Le reste n'est pas un moment, c'est de la preuve : un contrôle répond en
120 à 160 ms, une jauge se remplit en 200 ms, une question qui remplace la
précédente entre en 180 ms. Deux exceptions, nommées dans
`src/styles/mouvement.test.ts` et nulle part ailleurs : l'horloge du chrono
glisse une seconde en linéaire entre deux battements, et la silhouette bat le
temps que la banque arrive. Rien ne clignote pour attirer l'œil.

Le son fait le même geste que le verdict : la frise d'un signal repart du début
à l'instant où le son part, et s'arrête avec lui. Aucun son sans geste du
candidat ; le son se règle et se coupe.

L'app a perdu son bouton qui s'enfonce de 3 px : le caractère « app
d'apprentissage » passe par le jaune du bouton principal, la feuille de
correction qui monte, le retour haptique et le son.

## Copie

Tutoiement, guillemets français, apostrophes courbes, aucun tiret cadratin.
Les classes restent en français, comme le reste du code.

## Ce qu'on refuse

Une police téléchargée. Une bande pleine largeur colorée. Le jaune sur un
bouton du site. Une ombre sur ce qui ne flotte pas. Un bord coloré d'un seul
côté. Un panneau rempli d'une couleur de groupe. Le violet, les dégradés, le
verre dépoli, un second accent. Un sur-titre au-dessus d'un titre, une grille
de cartes identiques, une rangée de chiffres. Le beige, les icônes en emoji.
