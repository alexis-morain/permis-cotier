# L'app iOS — état des lieux

Ce fichier dit où en est la coquille iPhone, ce qui la bloque, et ce qu'il
resterait à faire. Il existe pour qu'on puisse reprendre le chantier sans
relire les commits.
La direction artistique et les règles écran par écran sont dans `docs/app-da.md`.

## Avant chaque version

`app-ios.yml` soumet seul dès qu'une CI est verte sur `main`. Le rituel se fait
donc **avant la fusion** qui ouvre une version, pas après.

1. **Preflight.** `capacitor-apple-review-preflight`, puis `app-store-review`
   pour ce qu'il ne couvre pas (required-reason API, label de confidentialité,
   ATT), en lecture locale. La réponse 4.2 de `docs/app-da.md` (« Ce qu'Apple
   regarde ») se relit contre le code et se tient à jour.
2. **Sortie** dans `docs/preflight-<version>.md` : bloquants d'un côté, ménage
   de l'autre, chaque point avec son fichier et sa ligne. Un bloquant ferme la
   version ; le ménage va au journal.
3. **Le compte de la fiche.** `python scripts/app_store.py verifier-fiche`
   (en CI, et refait par `preparer`) compte les questions publiées de
   `data/questions/` et relit `ios/nouveautes.txt`, `ios/a-tester.txt` et
   `docs/fiche-app-store/*.txt`. Règle : un nombre de cent ou plus suivi de
   « questions » est **exact**, ou **arrondi par en dessous** à la centaine
   près, « plus de N » avec N ≤ compte < N + 100 (658 : « plus de 600 »). Un
   bump de banque qui franchit la centaine rend la CI rouge jusqu'à ce que la
   fiche suive. Sous cent, le nombre parle d'un examen ou d'une série.

`docs/fiche-app-store/` est la copie de ce qu'App Store Connect affiche
(description, sous-titre, mots-clés, notes au relecteur) : ces champs se posent
à la main, le script ne pousse que les nouveautés et « À tester ». Sous `docs/`,
une retouche de fiche ne reconstruit pas l'app (`hors_app()`). Toute correction
de la copie se reporte en ligne, et inversement.

## 30 octobre 2026 — les usages Mac (lot 3)

Plan « iPad et Mac », lot 3 : ce qui fait d'une app iPad agrandie une app Mac.
Branche `app-mac-usages`. Essayé à l'écran le 30 à midi, sur le créneau
d'Alexis (« À l'écran », plus bas) ; trois défauts trouvés et corrigés.

### La barre de menus (`MenusMac.swift`, Catalyst seul)

`AppDelegate.buildMenu` appelle `MenusMac.construire`. Les actions vivent dans
une extension de `BarreOnglets`, qui sait quel onglet est devant et se trouve
sur la chaîne des répondeurs entre la webview et l'app.

| Menu | Lignes |
|---|---|
| Permis Côtier | À propos (celui du système), **Réglages… ⌘,** |
| Fichier | **Nouvel examen blanc ⌘N**, puis Fermer et Tout fermer du système |
| Édition | celui du système (copier-coller du signalement) |
| **Examen** | Valider (sans raccourci : Entrée dans la page), Passer la question ⌘→, Quitter l'examen ⌘. |
| Présentation | Agrandir le texte ⌘+, Réduire ⌘−, Taille réelle ⌘0 ; Accueil à Fiche ⌘1 à ⌘5 ; Masquer/Afficher la barre latérale ⌃⌘S ; plein écran du système |
| Fenêtre | celui du système |
| Aide | Le site lepermiscotier.fr, Signaler une erreur… |

Retirés : Format, barre d'outils, nouvelle fenêtre, les entrées de document de
Fichier (Dupliquer, Déplacer, Renommer, Exporter). Sur un clavier AZERTY, AppKit
traduit seul les raccourcis à la touche physique : ⌘1 s'affiche ⌘&, ⌘. s'affiche
⌘;, ⌘0 s'affiche ⌘À.

**Pièges du constructeur de menus** (vus le 30) : `replaceChildren` sur
Présentation fait lever une `NSInvalidArgumentException` au lancement ; un bloc
en ligne dans un autre bloc en ligne disparaît ; `insertSibling` après un bloc
en ligne aussi. Seuls trois `insertChild` en tête tiennent, et l'ordre affiché
n'est pas celui de l'insertion : la barre latérale finit en dernier.

- **Le menu Examen relaie, il ne refait rien.** `EcranWeb.relayer` envoie
  `app:commande` (`{ nom: 'valider' | 'passer' | 'quitter' }`) à la page, qui
  fait ce que font ses touches (`useClavier`, `quiz/effets.ts`). Grisé hors
  série : la page dit à `pleinEcran` si une série court et si c'est un examen
  (`pleinEcran({ actif, examen })`), `EcranWeb.serie` le garde, et toute
  nouvelle adresse l'oublie. « Passer la question » n'existe qu'en examen ;
  « Quitter » devient « Quitter la série » en entraînement.
- **Pas de raccourci de menu sans ⌘.** Un raccourci Entrée ou Échap pris par
  le menu ne parviendrait plus à la page, champs compris. D'où ⌘. (le
  « annuler » du Mac) ; Échap reste à la page. **⌘↩ n'arrive jamais au menu** :
  la webview le garde (essayé deux fois à l'écran, rien), « Valider » n'a donc
  pas de raccourci.
- **Liens d'un autre site** : `Browser` (Safari intégré) n'ouvrait rien sur Mac.
  `NavigateurMacPlugin` (`GreffonsMuets.swift`) le remplace sous le même nom
  JavaScript et ouvre le navigateur par défaut (`UIApplication.open`).
- **Réglages ⌘,** ouvre l'onglet Fiche sur `/parametres`, avec son retour
  « ‹ Ta fiche ». Pas de feuille : il y faudrait une sixième webview, où le
  retour et les liens de la page n'auraient pas de sens.
- **Nouvel examen ⌘N** amène l'onglet Examen tel qu'il est : un examen commencé
  y reste, à reprendre ou à arrêter.
- **Taille du texte** : `pageZoom` de chaque webview, paliers 80 % à 200 %,
  gardé dans `UserDefaults` (`texteMac.zoom`), posé au chargement de chaque onglet.
- **Signaler une erreur…** ouvre `/signaler` dans l'onglet courant, qui prépare
  le courrier à `contact@` comme depuis une question.

### Le nom dans la barre de menus

`CFBundleName` valait `$(PRODUCT_NAME)`, soit « App ». Il vaut maintenant
`$(NOM_DU_PAQUET)`, réglage de build : `$(PRODUCT_NAME)` partout, **« Permis
Côtier » pour le SDK macOS seul**. L'iOS garde « App », son module et son
exécutable ne bougent pas (vérifié dans l'archive). « Permis Côtier » (13
caractères) plutôt que « Le Permis Côtier » (16, au-dessus des 15 conseillés),
qui donnerait « À propos de Le Permis Côtier ». Le Dock et le Finder
gardent `CFBundleDisplayName`, « Le Permis Côtier ».

### Côté web (le site en profite)

- **Échap** : en examen, ouvre la confirmation d'arrêt, et la referme au second
  appui. En entraînement, suit le lien de l'écran (la croix de l'app,
  « Changer de thème » du site) : la série est écrite, rien n'est perdu.
- **↑ et ↓** font circuler le focus entre les propositions, en boucle ;
  l'espace coche. Sans rien cocher.
- `surMac()` (`src/lib/cible.ts`) : la coquille pose `window.coquilleMac` par un
  `WKUserScript` en début de document. Sur `window` et pas sur `<html>`, dont le
  routeur d'Astro remplace les attributs.
- **Sons sur Mac** : actifs au premier lancement, comme sur iPhone (pas de
  bouton silencieux, mais la session ambiante suit le volume du système). Le
  Réglage dit « Les sons suivent le volume de ton Mac. »

### Vérifié

- Vitest : 9 tests du clavier et des commandes, 1 du texte des sons ; gate vert.
- Build Catalyst, sans signature et signé : verts, aucun avertissement sur notre code ;
  `CFBundleName` = « Permis Côtier ».
- Archive iOS par la commande de `app-ios.yml` : verte, `CFBundleName` = « App »,
  `minos 16.0`, aucun symbole de `MenusMac`.

### À l'écran (30 octobre, midi, MacBook Air, macOS 26, Stage Manager)

App signée lancée par `open`, pilotée par Peekaboo (menus par AX, touches au
premier plan après vérification). Captures gardées hors du dépôt.

- **Barre de menus** : « Permis Côtier » (À propos, Réglages ⌘,, Masquer,
  Quitter), Examen grisé hors série et actif pendant l'épreuve, aucun doublon
  ajouté par UIKit (pas de deuxième barre latérale, pas de ⌘1 à ⌘5 du système).
- **Examen** : ⌘3 ouvre l'onglet, Entrée lance, B coche ; « Valider » du menu
  valide ; ⌘→ passe ; ↓ pose le focus sur une proposition, anneau visible ;
  Échap ouvre « Arrêter l'examen ? », un second Échap le referme ; « Quitter
  l'examen » du menu l'ouvre aussi. **⌘↩ sans effet** : retiré (voir plus haut).
- **Présentation** : ⌘+ deux fois agrandit la page, Taille réelle la rend ;
  la barre latérale se masque et revient ; ⌘, ouvre Réglages dans la Fiche, où
  le texte dit « Les sons suivent le volume de ton Mac. »
- **Clavier** : Tab ne va qu'aux champs, ⌥Tab atteint liens et boutons avec
  l'anneau. C'est le Mac par défaut (Réglages Système > Clavier > Navigation au
  clavier), comme Safari : rien à corriger.
- **Défaut, non corrigé** : Tab sur « Date de l'examen » ouvre le calendrier de
  WebKit, et la date du jour est **enregistrée** dès l'ouverture, sans validation
  (« Effacer la date » apparaît). Même comportement qu'un `<input type="date">`
  vide sur iPhone. Le calendrier (une fenêtre à part) ne répond pas aux clics
  programmés. Date effacée à la main ensuite. **Décidé le 30 : laissé.** C'est
  WebKit, comme sur iPhone ; « Effacer la date » le rattrape, et une date du
  jour n'arme aucun rappel (leurs heures sont passées). Réécrire la saisie
  toucherait un écran iOS qui marche, pour un cas qui ne naît que de Tab sur Mac.
- **Liens externes** : « MIT » des Licences n'ouvrait rien (défaut corrigé) ;
  après correction, le navigateur par défaut passe au premier plan.
- **La fenêtre de 500 × 500** : une fenêtre de l'app, sans titre, à (0, 456),
  hors écran, présente dès le lancement, couche 0 (CGWindowList). Elle passe à
  64 × 64 quand le calendrier s'ouvre. Probablement une fenêtre d'hébergement
  d'UIKit pour le Mac (texte, pointeur), sans effet visible ; sa classe n'a pas
  pu être lue (le diagnostic interne n'a rien écrit). Laissée.

**Pas essayé** : Partager (il faut un examen reçu), rappels (la date ci-dessus
les aurait armés pour un jour déjà passé : rien de programmé), sons à
l'oreille, survol et curseur main (la souris n'a pas été bougée, sauf deux
clics). **Traces** dans les données partagées avec la 1.0.7 : un examen
interrompu (8 questions), date d'examen posée puis effacée.

## 30 octobre 2026 — deux défauts iPad de la PR #56

- **La barre du haut ne tenait pas les cinq entrées** sous le 13 pouces en
  portrait. UIKit la plafonne à un peu plus de la moitié de la largeur et range
  le reste derrière une flèche : « Fiche » cachée sur un iPad Pro 11 pouces en
  portrait (834 pt), « Entraînement » aussi sur l'iPad mini (744 pt). Sous
  1 000 pt de large, `BarreOnglets` pose `traitOverrides.horizontalSizeClass =
  .compact` : la barre du bas de l'iPhone, où les cinq tiennent. Le repli que
  UIKit fait déjà en largeur compacte, demandé plus tôt. Au-delà (13 pouces en
  portrait, tout iPad en paysage), barre du haut et barre latérale.
- **Le bouton « Modifier »** en tête de la barre latérale : UIKit le pose dès
  qu'un `UITab` a un placement personnalisable, ce qui est le cas par défaut
  (`automatic`). Les cinq passent en `preferredPlacement = .fixed`.
- Vu au simulateur en iOS 26.5 : iPad mini (A17 Pro) et iPad Pro 11 pouces (M5)
  en portrait, barre du bas avec les cinq entrées, cachée pendant l'examen et
  rendue au résultat ; iPad Pro 13 pouces (M5), barre du haut entière, barre
  latérale sans « Modifier ». Paysage non essayé (rotation impossible au
  simulateur fenêtré).

## 29 octobre 2026 — l'iPad (lot 1 du plan « iPad et Mac »)

### Ce qui a changé

- **Projet** : `TARGETED_DEVICE_FAMILY = "1,2"`, `UISupportedInterfaceOrientations~ipad`
  (les quatre), l'iPhone reste en portrait. Aucun `UIRequiresFullScreen` :
  Split View, Slide Over et Stage Manager sont permis.
- **Navigation** (`BarreOnglets.swift`) : sur iPad en iOS 18 ou plus, les cinq
  entrées sont des `UITab` en mode `.tabSidebar`, avec `sidebar.preferredLayout
  = .tile`. UIKit retombe seul sur la barre d'onglets en largeur compacte. Sur
  iPad en iOS 16-17 et sur iPhone, rien ne change (`viewControllers`). Les cinq
  `EcranWeb` sont créées d'avance (l'objet ne charge sa webview qu'à la première
  visite) ; `selectionner(chemin:)` les retrouve, et le greffon `Ecran` n'appelle
  plus `viewControllers`, que `tabs` rend muet.
- **`Ecran`** : pendant l'examen, `setTabBarHidden` puis, en mode barre
  latérale, `sidebar.isHidden = true` ; à la fin, la barre latérale revient
  dans l'état où la personne l'avait laissée. `basculerAvantIOS18` n'a pas
  bougé.
- **Web (build app seulement, sous `html[data-app]`)** : `.page` plafonnée à
  46 rem ; l'accueil recentré en 44 rem ; dès 50 rem, l'examen perd la grille
  « question + carnet » du site (le carnet est caché dans l'app) et redevient la
  colonne de 44 rem, `align-items: stretch`. Les barres du bas, pleine largeur
  par `margin-inline: calc(50% - 50vw)`, recalent leur contenu sur la colonne
  (`padding-inline: … 50vw - 22rem …`). Avant, à 1032 pt, la colonne partait à
  gauche et la barre « Passer » débordait. Gardé par `src/styles/ipad.test.ts`.
- **Textes** : « Les sons suivent le mode silencieux de ton appareil », « sur
  cet appareil » (Réglages, questionnaire, À propos de l'app, fiche App Store).
- Le site public ne change pas : diff de `dist/` contre `db36e0a`, seuls
  bougent les identifiants d'îlots, les dates du sitemap et `sw.js` ;
  `npm run poids` identique.

### Ce qui a été vérifié

- Chromium aux largeurs 320, 744, 1032 et 1366 pt, sur `dist-app/` : accueil,
  cours, leçon, examen (départ et question), correction, entraînement, fiche,
  réglages, signalement. Plus de ligne de 150 caractères, plus de débord.
- Simulateur, iPad Pro 13 pouces (M5) en iOS 26.5 : lancement, navigation du
  haut avec le bouton de barre latérale, barre latérale ouverte (elle recouvre
  la page en portrait), bascule d'onglet, examen qui cache la navigation et la
  rend. iPad Pro 13 pouces (M4) en 17.5 : barre d'onglets du bas, examen qui la
  cache. iPad mini (A17 Pro) en 26.5 et iPhone 17 Pro en 26.5 : pas de
  régression.
- Le pilotage du simulateur passait par un harnais jetable lu dans
  l'environnement (`SIMCTL_CHILD_STEPS`), jamais committé : `simctl` ne sait ni
  toucher ni tourner.

### Ce qui reste

- **Rotation, Split View, Slide Over, Stage Manager non essayés** : les iPad
  du simulateur sont en mode fenêtré, qui refuse `requestGeometryUpdate`, et
  `simctl` ne rend pas la main sur le Split View. À voir sur un vrai iPad ou
  par le menu du simulateur. Surtout : la barre latérale en paysage (est-elle en
  tuile à côté de la page ?), et sa disparition pendant l'examen quand elle est
  ouverte.
- Examen en deux colonnes en paysage large (visuel à gauche, propositions à
  droite) : écarté, ce n'est pas simple, et la colonne tient.
- Iconographie et fiche : captures iPad 13 pouces, voir `docs/captures-app-store/ipad/`
  du dossier de gestion ; copie de la fiche à reporter à la main (« ton
  téléphone » → « ton appareil » dans la description).
- La page d'accueil du site et son pied disent encore « L'app iPhone » et
  « Aussi sur iPhone » : à passer à « iPhone et iPad » le jour de la sortie.
- Preflight de la version, réponse 4.2 relue pour le grand écran : à faire
  avant la fusion.

## 15 octobre 2026 — l'app descend à iOS 16

### Ce qui a changé

- **Cible iOS 16.0**, au lieu de 18 (la décision 4 du plan « app solide » est
  revue). La 1.0.1 restait invisible sur l'App Store à qui n'avait qu'iOS 17.
  Le matériel admis va de l'iPhone 8, du X et du SE de deuxième génération à
  aujourd'hui. Une première PR (#37) visait 15.4, plancher du web embarqué
  (`.at()`, `findLastIndex`, `<dialog>`, `:has()`, `svh`) ; Alexis a tranché
  pour 16 le jour même, faute de pouvoir prouver iOS 15 (voir plus bas).
- Le CSS récent a son repli ou se dégrade seul : `color-mix` (16.2) a sa
  couleur pleine avant lui, `@property` (16.4) ne sert qu'au fondu de la barre
  de navigation sous `@supports (animation-timeline…)`, `light-dark()` n'est
  qu'en commentaire, `text-wrap` est cosmétique, les transitions d'Astro ont
  leur repli.
- **Le greffon `Ecran` retrouve son chemin d'avant iOS 18**
  (`basculerAvantIOS18`, sous `#available`) : cacher la barre sans
  `setTabBarHidden`, et retirer l'encart du bas qui garderait sa hauteur.
- **Garde-fou de build** : `elaguer-app.mjs` refuse un bundle qui appelle du
  JavaScript plus récent que Safari 16.0 (`groupBy`, méthodes de `Set`, regard
  arrière dans une regex, bloc `static`…), chaque motif avec sa version. Le CSS
  n'y est pas : il se dégrade, le JavaScript arrête l'écran.

### Ce qui a été vérifié

- Compilation à la cible 16.0, aucune API iOS 17 ou 18 hors `#available`.
- **Les 388 pages du bundle**, ouvertes une à une dans le Safari du simulateur
  (même WebKit que la webview), un capteur d'erreurs injecté : iOS 26.5, 17.5
  et 16.4, zéro erreur JavaScript, zéro promesse rejetée. Une seule alerte en
  17.5, le préchargement de la banque coupé par le passage à la page suivante.
- **Au simulateur, l'app elle-même** : iPhone 15 en 17.5, iPhone 8 en 16.4.
  Accueil, bascule vers l'onglet Examen, la barre qui se cache au départ de
  l'examen sans laisser de vide en bas, et qui revient à l'arrêt ; en 16.4, la
  recherche (`<dialog>`) et ses résultats.
- `JS Eval error` au lancement : présent aussi en 26.5, il ne vient pas de la
  cible.

### Ce qui reste

- **16.0 à 16.3 n'ont pas tourné**, 16.4 seul est installé. Ce qui les sépare
  de 16.4 (`@property`, `color-mix`, regard arrière) a son repli ou est gardé
  par `elaguer-app.mjs`.
- **Pourquoi pas iOS 15** : Xcode 26 ne propose ni 15.0 ni 15.4, et 15.2 comme
  15.5 s'arrêtent sur « Unable to connect to simulator ». Descendre à 15.4
  demanderait une preuve sur un vrai iPhone sous iOS 15.
- La version qui porte ce changement est la 1.0.3 : la 1.0.2 en revue garde la
  cible 18.

## 14 octobre 2026 — la boucle de retour (lot 3b)

### Ce qui a changé

- **Les badges sont branchés** (section « Les badges » plus bas). Gagnés au
  geste, gardés, annoncés une fois à l'écran qui les a fait gagner : fin de
  leçon, fin de série d'entraînement ou de `/revoir`, résultat d'examen. La
  Fiche les montre sous la jauge de chaque thème, avec le palier suivant dit
  comme un fait. Captures dans `docs/captures-app-3/`.
- **L'examen blanc garde son détail par thème** (`examenPasse(resultat,
  date)`), ce que `sur` relit. Les examens d'avant n'en ont pas et ne
  comptent pas pour ce palier.
- **Le premier examen part en deux touches depuis l'Accueil**, et plus rien
  entre « Commencer l'examen » et la première question : l'encart « commence
  plutôt par la première leçon » ne sort plus dans l'app (`examen.astro`
  ne lui passe plus `premiereLecon`). Mesuré en Chromium 390 px, état vierge :
  avant, l'écran de départ portait trois blocs, 103 mots et un lien qui
  déconseille l'examen ; après, deux blocs, 74 mots, aucun lien. Le bouton est
  dans l'écran sans défiler dans les deux cas.
- **« À revoir aujourd'hui » dit le nombre que `/revoir` joue** : borné au
  rythme de la série. Avant, 25 dues pour une série de 10 s'affichaient 25.
- **La série de jours se dit dès deux jours**, au texte neutre : la Fiche ne
  dit plus « Une question avant ce soir, et la série tient. »
- **Les boutons de l'Accueil disent un verbe et ce qu'ils ouvrent**, avec les
  mots de la Fiche : « Continuer le cours », « Faire ma série du jour »,
  « Faire un examen blanc ». Audit des cinq onglets :
  `docs/audit-ux-app-2026-10-14.md`.
- **`/examen` allégé de 11,9 Ko brotli** : le résultat lisait `rappel` et
  `pointFinal` dans `profil.ts`, qui tirait la fiche entière et la table des
  notions. Ils vivent dans `lib/raison.ts`. La référence du budget descend à
  86 194 octets (`docs/budgets.md`).

### Ce qui reste

- Au vrai iPhone : le son `lecon` de l'annonce, qui part 1,2 s après la
  cloche d'un examen reçu et 0,6 s après l'arpège de fin de série. Le délai
  se règle à l'oreille.
- L'écart des P2 de l'audit : un lien vers la racine d'un autre onglet
  s'ouvre dans l'onglet courant (Swift, `RouteurDuSite`), le jalon « Sept
  jours de suite », « Ton examen » sur l'Accueil.
- L'objectif Umami « premier examen », que le plan demande pour mesurer dans
  un mois, se pose dans la console d'Umami, pas dans le dépôt : non fait.

## 14 octobre 2026 — le geste de l'examen (lot 2)

### Ce qui a changé

- **Le chrono ne refait plus l'écran.** `quiz/Chrono.tsx` (`useChrono`)
  tient l'horloge dans l'en-tête : son intervalle, la relecture au retour
  (`visibilitychange` et `appStateChange`), les secondes lues sur
  `echeance`. La session n'a plus de `restant` ; le réducteur ne reçoit plus
  `tic` chaque seconde, mais `echu` une fois, quand l'échéance est passée
  (un `echu` en avance rend la même session, donc aucun rendu). Mesuré en
  test (`quiz/Chrono.test.tsx`) : 19 rendus de `Partie` sur 19 secondes
  avant, 0 après, et 1 au buzzer.
- **Répondre.** `.proposition:active` passe à `scale(0.97)` en 100 ms sur
  `--courbe` (une ease-out sans dépassement), dans la section du mouvement
  d'`app-jeu.css`. `:active` part au toucher grâce à l'écouteur `touchstart`
  de `Coquille.astro`. L'haptique `choix` reste en renfort.
- **Passer à la suite.** Plus d'entrée de question dans l'app : énoncé,
  visuel et propositions changent d'un coup, quarante fois par examen.
  La jauge d'avancement garde son `transform 1s linear`. Le site garde
  son entrée de 180 ms.
- **Le panneau de verdict** était déjà aux jetons : 220 ms, `transform` et
  `opacity`, `--courbe`, aucun rebond. « Continuer » marche pendant la
  montée ; un test le garde.
- **Le résultat.** Le score entre avec `app-entree` (et non plus son
  propre `app-score`). La vibration `reussi` / `echoue` part dans un
  `requestAnimationFrame` : l'effet tournait avant la peinture, la
  vibration devançait le verdict écrit.
- **Pire cas.** Une proposition de 90 signes sans espace poussait la page à
  791 px pour 390 : `.proposition__texte` se coupe (`overflow-wrap:
  anywhere`). Énoncé de 400 signes, visuel absent, « 0 erreur »,
  « 1 erreur », « 40 / 40 » tenaient déjà, et sont testés. Captures dans
  `docs/captures-app-2/`.

### Ce qui reste

- Au vrai iPhone : l'enfoncement à l'appui, la vibration du verdict sur la
  même frame, et l'absence de clignotement pendant le chrono. Le simulateur
  ne sait ni toucher ni vibrer.
- Fusionné avec le lot 1 : la règle `.proposition:active` de la section des
  propositions ne garde que l'effacement du bord ; l'enfoncement et sa durée
  vivent dans la section du mouvement.

## 14 octobre 2026 — l'app au doigt (lot 1 du plan « app solide »)

### Ce qui a changé

- **Le survol ne vaut qu'au pointeur fin.** Les 36 règles `:hover` du site
  passent sous `@media (hover: hover) and (pointer: fine)`, en place pour
  garder l'ordre de la cascade (`:active` après `:hover`). Au doigt, iOS posait
  le survol au premier appui et le laissait collé : un bouton touché restait
  plus clair, un choix du questionnaire prenait le bord foncé d'une case
  cochée. La neutralisation d'`app-jeu.css`, qui ramenait
  `.proposition:hover` au repos sous `html[data-app]`, est retirée : la garde
  suffit. Mesuré en Chromium headless sous `hover: none`, survol forcé par
  CDP : avant, `.bouton`, `.segmente__option` et `.choix__option` changeaient ;
  après, plus rien.
- **Chaque contrôle répond au premier appui** : `touch-action: manipulation`
  sur `a`, `button`, `[role=button]`, et dans la règle de `.bouton`,
  `.proposition`, `.jeu__actions`, `.segmente__option`, `.choix__option`,
  `.etape`, `.retour__lien`, `.chapitres__cellule`, `.cellules__ligne`.
  Jamais `none` : une liste touchée en son milieu doit défiler.
- **Les contrôles ne se sélectionnent plus** : `user-select: none` et
  `-webkit-touch-callout: none`, déjà posés sur les propositions, s'étendent
  aux boutons, aux cellules de liste, aux choix du questionnaire et au faux
  champ de recherche. Jamais sur `body` : le texte des leçons se copie.
- **Un champ ne fait plus zoomer.** `rem` suit Dynamic Type dans l'app
  (`-apple-system-body`) : au plus petit réglage (14 px), la recherche tombait
  à 14,7 px et les champs de la Fiche et du questionnaire à 14 px, sous le
  seuil de 16 px où WebKit zoome au focus. `app.css` pose un plancher,
  `max(16px, 1em)` sur `.champ`, `max(16px, 1.05rem)` sur la recherche :
  16 px au plus petit, 17 et 17,85 px au réglage par défaut, comme avant.
- **`scripts/verifier-css-mobile.mjs`**, en CI et dans `check.sh` après
  `build:app` : refuse un `:hover` hors garde et un contrôle connu sans
  `touch-action: manipulation` dans le CSS de `dist-app/` (feuilles et
  `<style>` des pages). Sur `main` d'avant, il relevait 47 défauts.

Le site change par les mêmes règles, et par elles seules (diff des règles
CSS de `dist/` contre `main`) : +0,1 Ko brotli de CSS sur les pages témoins.

### Ce qui a été vérifié sans changer

- **Clavier.** La coquille n'a pas `@capacitor/keyboard` : WebKit garde le
  champ focalisé visible, sans redimensionner la webview. La recherche des
  onglets Cours et Entraînement s'ouvre en fenêtre plein écran, le champ en
  haut : il reste au-dessus du clavier. Reste à voir sur iPhone si les derniers
  résultats restent cachés sous le clavier ; si oui, c'est le greffon
  Keyboard (`resize: native`) qu'il faudra, avec un `cap sync` au Mac.
- **`100vh`** : aucun. `app-jeu.css` est en `100svh` ; les autres `vh` sont
  des fractions, et dans une webview sans barre d'adresse `vh` vaut `svh`.

### Ce qui reste

- L'essai sur iPhone : survol collé, double toucher, zoom des champs, clavier.
  Ni Chromium ni le simulateur ne savent le toucher (captures
  `docs/captures-app-1/`, en Chromium à 390 px, et leurs mesures).

## 12 octobre 2026 — la CI garde l'app, et le code se lit en morceaux (lots 5 et 4)

### Ce qui a changé

- **Plus d'archive sans CI verte** (lot 5). `app-ios.yml` ne part plus sur
  le push : il attend la fin de `ci.yml` par `workflow_run` et ne retient
  qu'un passage vert, issu d'un push sur ce dépôt (une branche de fork peut
  s'appeler `main`). Le commit construit est `head_sha`, jamais
  `github.sha`. `schedule` et `workflow_dispatch` restent, derrière un garde
  qui cherche une CI verte sur la tête de `main` ; pas encore finie, l'app
  attend le `workflow_run` qui suivra. Comptez dix minutes de plus entre un
  push et TestFlight.
- **La documentation seule ne reconstruit pas l'app.** `paths-ignore` ne vaut
  pas pour `workflow_run` ; `commit_effectif()` de `app_store.py` le reprend :
  quand rien depuis le commit du dernier build ne touche l'app (hors
  `docs/`, `plans/`, `*.md`), la décision se prend pour le commit du build,
  ce qui soumet un build en attente au lieu de l'oublier. `preparer` extrait
  tout l'historique pour comparer.
- **`npm run verifier:app`** pose à la production les questions de l'app,
  avec l'origine `capacitor://localhost` : version annoncée par
  `banque/derniere.json` égale à `data/VERSION`, compte des questions,
  CORS sur le pointeur et la banque, fichier au bon numéro. La veille du
  matin le lance après `verifier:prod`.
- **`verifier-accessibilite.mjs`** relit en CI les 390 pages de
  `dist-app/` : nom de chaque bouton et lien, `alt`, étiquettes, aucun
  `tabindex` positif, références ARIA, identifiants uniques, langue. Zéro
  défaut à ce jour : le premier qui entre casse la CI.
- **Le code se lit en morceaux** (lot 4). `Quiz.tsx` : 1 394 lignes à 477,
  les écrans dans `src/components/quiz/`, les effets dans
  `quiz/effets.ts`. `ProfilCandidat.tsx` : 661 à 513, ses réglages dans
  `profil/Reglages.tsx`. Un seul `lib/stockage.ts`, un seul
  `lib/greffons.ts`, un seul accueil logique (`lib/accueil.ts`).
  `docs/budgets.md` écrit les bornes que `verifier-budgets.mjs` refuse de
  dépasser en CI.

### Ce qui reste

- **Le test UI iOS** (`AppUITests` : l'app se lance, cinq onglets, un `h1`
  par webview, la barre cachée au départ d'un examen), au simulateur en CI
  par `xcodebuild test`. Il demande une cible de test dans le projet Xcode :
  à écrire et à voir passer sur le Mac, pas depuis une session cloud.
- **Les builds de branche Cloudflare.** Un build de branche peut téléverser
  une version sans secrets dont hérite `main` : le réglage est au tableau de
  bord (Workers, `permis-cotier`, Builds), pas dans le dépôt.
- **Le poids n'est pas resté à zéro.** Contre `main` : `/examen` +0,8 Ko de
  JS (dans la marge du budget), l'accueil +0,6 Ko, cours et leçon +0,2 Ko.
  `stockage` est un morceau partagé de 148 octets, `lib/accueil` un de
  568 octets que l'accueil du site charge désormais.

## Architecture de la couche app

Où vit quoi, dans quel ordre un écran se charge, et ce que fait `app:onglet`.
Les règles de chaque écran sont dans `docs/app-da.md`.

### Où vit quoi

| Quoi | Où |
|---|---|
| Ce qui distingue la cible | `src/lib/cible.ts` : `POUR_APP`, lu au build depuis `CIBLE=app` |
| Le bundle | `npm run build:app` → `dist-app/`, élagué par `scripts/elaguer-app.mjs` |
| La coquille Swift | `ios/App/App/` : `BarreOnglets`, `EcranWeb` (une webview par onglet), `RouteurDuSite`, greffons `Ecran` et `Son` |
| Ce que la page ne porte que dans l'app | `src/components/Coquille.astro`, rendu par `Base.astro` sous `POUR_APP`, vidé hors cible par `siteSansApp()` d'`astro.config.mjs` |
| Les appels natifs | `src/lib/natif.ts`, chacun derrière un `import()` ; les greffons maison par `avecGreffon()` de `src/lib/greffons.ts` |
| Le stockage | `src/lib/stockage.ts` : `lire()`, `ecrire()`, préfixe `permis-cotier:` |
| La banque hors revue | `src/lib/banque-locale.ts` (IndexedDB), `src/lib/banque-distante.ts` (l'adresse par version) |
| L'écran de jeu | `src/components/Quiz.tsx` (la session) et `src/components/quiz/` (les écrans, les effets, le chrono dans `Chrono.tsx`) |
| Les budgets | `docs/budgets.md`, `scripts/verifier-budgets.mjs` |

Une branche d'app dans un composant se fait à la frontière : un composant
d'app, un composant de site, un parent qui choisit (`EnteteApp` /
`EnteteSite`, `ActionsApp` / `ActionsSite`). `POUR_APP` se lit au rendu,
jamais dans une constante de module : les tests le basculent par un
accesseur.

### Dans quel ordre un écran se charge

1. L'onglet touché montre sa webview, chargée une fois au premier affichage.
   `RouteurDuSite` sert le fichier de `dist-app/` du chemin demandé (le
   routeur de Capacitor rendait l'accueil pour tout chemin sans extension).
2. La page arrive avec `html[data-app]` ; `Coquille.astro` pose
   `<ClientRouter />` et ses écouteurs une seule fois pour la vie de
   l'onglet. Les navigations suivantes remplacent le corps sans recharger.
3. Les scripts de page se rattachent par `quandLaPageEstPrete()` de
   `src/lib/page.ts`, sur `astro:page-load`.
4. Un écran de jeu (`client:only`) montre sa silhouette, lit la banque
   embarquée, la compare à celle gardée en IndexedDB et joue la plus récente ;
   puis `chercherMiseAJour()` demande au site s'il y a mieux, pour la série
   suivante, sans rien afficher.

### Ce que fait `app:onglet`

Chaque fois qu'un onglet revient à l'écran, `EcranWeb.swift` émet
`app:onglet` sur `window`. `annoncerSiLaProgressionAChange()` (posé par
`Coquille.astro`) compare alors les clés `permis-cotier:` du stockage à la
photo prise au dernier rendu ; l'événement `storage` fait la même comparaison.
Si elles ont bougé et que l'écran est une racine d'onglet, `window` reçoit
`app:progression` et chaque îlot de la racine relit `localStorage` et se rend à
nouveau (`surProgressionChangee()`, `src/lib/vivant.ts`) : **la page ne se
recharge pas**. `/examen` est exclu, pour ne pas effacer un résultat. Une page
profonde (une leçon, une série) n'est jamais touchée : on y perdrait sa place.

### Les badges

Trois paliers par thème (`parcouru`, `retenu`, `sur`), décidés le 14 octobre
(plan « app solide », lot 3). La règle, côté écran : `docs/app-da.md`, « Les
badges ». La logique (lot 3a) est dans `src/lib/badges.ts`, pure et testée
(`badges.test.ts`) ; les écrans (lot 3b) l'appellent par
`src/lib/badges-geste.ts`.

- **État** : `Etat.badges` (`progression.ts`), le jour du gain par thème et
  par palier. Champ facultatif, sans changer `VERSION_STOCKAGE` ; `charger`
  n'en vérifie que la forme, `badgesLisibles` jette les entrées illisibles à
  l'usage (le script en ligne de l'accueil embarque `charger`, et son budget
  est de 9 000 octets). Un badge ne se retire jamais, sauf par `effacer()`.
- **Examens** : `ExamenPasse.parTheme`, facultatif. `examenPasse(resultat,
  date)` le recopie du `Resultat` de `calculerResultat`. Seuls les examens qui
  le portent comptent pour `sur` ; ceux d'avant non.
- **Les règles** : `parcouru`, toutes les leçons (notions) du thème suivies ;
  `retenu`, `Math.ceil(80 %)` des questions publiées du thème retenues
  (`estRetenue`) ; `sur`, sans faute sur le thème aux trois derniers examens
  où il est tombé (un examen sans question du thème ne casse ni ne compte).
  Un thème sans question publiée ne gagne rien, un thème sans leçon pas
  `parcouru`.
- **Les phrases** : `faitDuBadge(theme, palier, contexte)` dit le fait (« Les
  11 leçons des feux et marques suivies, le 12 octobre. ») ; passer un
  `BadgeNouveau` en contexte donne les nombres du jour du gain, l'état seul
  (la date) une phrase qui reste vraie. `prochainPalier` dit le fait qui mène
  au palier suivant. `annoncesDesBadges` met les nouveaux en phrases pour
  l'annonce.

**Le geste** : `gagnerAuGeste(banque)` charge `badges.ts` par `import()` (il
tire la table des notions, que ni le jeu ni la leçon ne chargent), relit
l'état, attribue, sauvegarde s'il y a du neuf et rend les annonces. Trois
appelants :

1. **Fin de leçon** (`finir()` de `src/components/lecon-site.ts`). La page
   passe `theme` et `banque`, les identifiants publiés du seul thème de la
   leçon (+0,1 Ko brotli de HTML par leçon). L'annonce remplit la région
   `status` de la fin ; pas de son de plus, la leçon finie sonne déjà.
2. **Chaque réponse écrite** (`useEcritureDeLaSerie`, `quiz/effets.ts`), pour
   `retenu`, en entraînement, `/revoir` et examen.
3. **Examen enregistré** (`useFinEtMesureDeLaSerie`) :
   `enregistrerExamen(charger(), examenPasse(r, aujourdhui()))`, puis le geste.

`Partie` (`Quiz.tsx`) range les annonces et les passe au résultat
(`quiz/AnnonceBadges.tsx`), qui les montre une fois, joue `vibrer('lecon')`
dans l'app après le son du verdict, et renvoie à la Fiche au-delà de trois.
`banque` est la banque entière, pas la part de la série : un geste compte pour
tous les thèmes. La Fiche lit sans attribuer (`profil/PaliersDuTheme.tsx`).
Un candidat qui remplit déjà un palier le gagne à son premier geste après la
mise à jour, daté de ce jour.

## 10 octobre 2026 — les rappels s'arment, lot 0 du plan « app solide »

### Ce qui a changé

- **Les rappels d'examen n'avaient jamais été armés depuis l'app.**
  `programmerRappels()` n'avait qu'un appelant, le script de la page `/` du
  site, que l'app ne sert pas ; la Fiche et le questionnaire de départ
  posaient la date sans rien programmer. Prouvé au simulateur avant la
  correction (date posée, aucune demande de permission :
  `docs/captures-app-0/avant-date-sans-permission.png`), puis après (la
  demande apparaît dès la date posée, `apres-date-permission-demandee.png`).
  Les écrans n'importent rien de natif : la Fiche, le questionnaire et
  l'accueil du site **annoncent** la date par `annoncerDateExamen()`
  (`progression.ts`, un `CustomEvent` sur `window`, `null` pour effacée), et
  c'est `Coquille.astro`, présent dans l'app seule, qui écoute par
  `armerLesRappelsSurLaDate()` de `natif.ts`. Première version essayée :
  importer `natif` depuis les deux îlots ; sur le site, le module devenait un
  morceau de 87 octets de fonctions vides, un aller-retour de plus avant
  l'hydratation de `/examen`. `rappels.test.tsx` garde l'annonce des trois
  écrans ; `natif.rappels.test.ts` prouve ce que la coquille en fait : quatre
  rappels à neuf heures, J-7, J-3, J-1, le jour J, jamais un passé, les
  précédents effacés d'abord, rien sans permission, et plus rien une fois
  débranchée.
- **Cible iOS 18** (décision 4 du plan) : `IPHONEOS_DEPLOYMENT_TARGET`
  passe de 15 à 18, et le greffon `Ecran` perd son chemin d'avant iOS 18,
  qui n'avait jamais tourné sur un vrai runtime. iOS 18 tourne sur le même
  matériel que 17 (XS/XR et après). `cap sync` écrit alors
  `.iOS(.v18)` dans `CapApp-SPM/Package.swift`, que `swift-tools-version
  5.9` ne connaît pas : `capacitor.config.json` demande `6.0` par
  `experimental.ios.spm.swiftToolsVersion`.
- **Plus de storyboard principal.** `Info.plist` déclarait `Main`, et UIKit
  instanciait une sixième `EcranWeb` avant que `SceneDelegate` ne pose la
  barre d'onglets, pour la jeter. Le storyboard est retiré du projet, les
  deux clés aussi ; le commentaire de `SceneDelegate` dit désormais le vrai.
  `LaunchScreen` reste l'écran de lancement.
- **`@capacitor/splash-screen` retiré** : aucun import JS, et la coquille ne
  l'appelait pas ; l'écran de lancement est le storyboard `LaunchScreen`,
  clair et sombre. Le greffon ne figure plus dans `packageClassList`.
- **Le survol : rien ne bouge, et le plan se trompait.** Le recensement du
  10 octobre lisait `app-jeu.css:107-114` comme une réapplication du survol
  sous `html[data-app]` ; ces règles sont sa neutralisation (elles ramènent
  `.proposition:hover` de `quiz.css` à l'état de repos). Retirées une heure,
  rendues par la revue avant la PR. Le lot 1 remplacera la neutralisation
  par la garde `@media (hover: hover)` sur les 55 `:hover` du site.
- **Le site ne paie rien** : `dist/` ne diffère de `main` que par les
  empreintes des morceaux touchés, même découpe, mêmes poids. (Le réglage
  Rollup `experimentalMinChunkSize`, essayé d'abord, refondait d'autres
  morceaux et gardait celui de `natif` : écarté.)

### Ce qui reste

- Voir les rappels **arriver** sur un vrai iPhone (la date au lendemain, le
  rappel J-1 à neuf heures) : le simulateur montre la permission et le
  greffon est prouvé par test, pas la livraison.
- La suite du plan `app-solide` : lot 1 (ressenti natif), lot 2 (le geste de
  l'examen), lot 5 (la CI de l'app garde), lot 4, lot 3, lot 6.

## 4 octobre 2026 — l'app suit main

### Ce qui a changé

- **Chaque push sur `main` construit l'app** (`.github/workflows/app-ios.yml`,
  hors `docs/`, `plans/` et `*.md`), plus un passage quotidien à 6 h 17 UTC
  et un lancement à la main. Trois jobs : `preparer` décide, `construire`
  archive sans signature sur `macos-26` puis exporte avec
  `ios/ExportOptions.plist`, signé dans le nuage et téléversé par la clé
  d'API, `soumettre` attend le traitement, écrit `main <sha court>` dans
  « À tester » de TestFlight et envoie en revue si c'est permis.
- **L'environnement GitHub `app-store`**, réservé à `main`, porte
  `ASC_KEY_ID`, `ASC_ISSUER_ID` et `ASC_KEY_P8`. `pyjwt[crypto]` vit dans
  `requirements-app.txt` : la CI du site ne bouge pas.
- **La règle**, dans `decider()` de `scripts/app_store.py`, testée : version
  la plus haute modifiable, on la vise ; en vente, on vise le patch suivant ;
  en revue, en attente de revue ou de sortie, patch suivant sur TestFlight
  seul. Un commit déjà dans la version la plus haute, ou déjà porté par le
  dernier build de la version visée, ne se reconstruit pas. Un binaire
  rejeté ne se resoumet jamais seul. Numéro de build : le plus haut connu + 1.
- **`ios/nouveautes.txt`** devient les « Nouveautés » fr-FR de chaque version
  soumise (sauf la 1.0) ; vide, la soumission échoue.
- **`ios/a-tester.txt`** devient le « À tester » de chaque build TestFlight,
  suivi d'une ligne « Référence : <sha> » que `commit_du_texte()` relit pour
  savoir quel commit porte quel build (l'ancien « main <sha> » se lit encore).
  Vide ou au-delà de 3 900 caractères, `preparer` échoue avant l'archive.
- **La branche `app-ios` n'a plus de raison d'être** : tout le code de l'app
  est sur `main`.

### Ce qui reste manuel

- Poser les trois secrets dans l'environnement `app-store`.
- Tenir `ios/nouveautes.txt` à jour avant un changement visible.
- Réécrire `ios/a-tester.txt` à chaque push qui touche l'app : ce qui change
  et quoi essayer, pour les testeurs, en tutoyant comme l'app.
- Une revue rejetée : la corriger, puis un nouveau commit la renvoie, ou la
  renvoyer depuis App Store Connect si seules les métadonnées étaient en cause.

## 25 septembre 2026 — la coquille tourne, et n'est plus une copie du site

### Ce qui a changé

- **La coquille a tourné pour la première fois**, au simulateur iPhone 17 Pro
  sous Xcode 26.6 et iOS 26. Pas besoin du compte Apple pour ça :
  `xcodebuild … -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO`, puis
  `xcrun simctl install booted` et `launch`. Tout ce que le 10 septembre
  décrivait « sur le papier » est maintenant vu à l'écran.
- **Cinq onglets** au lieu de quatre : Accueil `/accueil`, Cours, Examen,
  Entraînement, Fiche `/profil`. Teinte de l'onglet courant (`Accent.colorset`,
  l'encre de la page depuis la page calme : `#37352f` en clair, `#e6e5e3` en sombre). Retoucher l'onglet courant ramène à sa racine puis
  en haut. Portrait seul, `arm64`, région `fr`.
- **`/accueil`** est un écran construit pour l'app seule (`src/pages/[accueil].astro`,
  route dynamique dont `getStaticPaths` ne rend rien sur le site) : reprendre la
  leçon, questions à revoir, dernier examen, compte à rebours. `RouteurDuSite`
  y ramène aussi `/`. `index.astro`, la page d'accueil du site, n'a pas bougé.
- **Plus d'en-tête, plus de pied, plus de fil d'Ariane** dans l'app : un bouton
  « ‹ Retour » vers l'échelon du dessus, rien sur les racines d'onglet
  (`lienRetour()` dans `src/lib/page.ts`). Les chapôs SEO portent la classe
  `web-seulement`. Ce que le pied disait vit dans la section « L'app » de la
  fiche.
- **Navigation sans rechargement** : `<ClientRouter />` d'Astro, dans la
  coquille seulement (`src/components/Coquille.astro`), glissement sur `<main>`.
  Les scripts de page se rattachent par `quandLaPageEstPrete()`.
- **Plein écran pendant une série** : le greffon maison `Ecran`
  (`ios/App/App/EcranPlugin.swift`, `pleinEcran({ actif })`, appelé par
  `modeConcentration()` de `natif.ts`) cache la barre d'onglets ; l'inset bas
  passe de 83 à 34 pt. La coquille la rend d'elle-même à tout changement
  d'adresse de la webview, pour qu'une page quittée en pleine série ne la
  laisse jamais cachée.
- **Les écrans de jeu** : jauge d'avancement fine, chrono en grand, panneau de
  correction qui monte du bas avec le mot « Juste » ou « Faux », résultat au
  score géant, partage natif. **Le cours** est un parcours de chapitres avec
  disques d'état et jauges. **La fiche** ouvre sur l'indice en grand.
- **Liens externes** dans `SFSafariViewController` (`@capacitor/browser`,
  `ouvrirDehors()`), barre d'état accordée au thème (`@capacitor/status-bar`),
  fond de webview au thème (`Fond.colorset`), plus de blanc entre deux pages.
- **La CI construit la cible app** (`npm run build:app`) et vérifie qu'aucun
  greffon ne fuit dans le site. **`_headers` pose `Access-Control-Allow-Origin`**
  sur la banque et son pointeur : la mise à jour hors revue peut fonctionner,
  reste à le voir depuis un appareil une fois déployé.
- **Des sons d'interface**, coupables dans Fiche → Réglages : le greffon maison
  `Son` (`ios/App/App/SonPlugin.swift`) joue en session `.ambient` sept WAV du
  dossier `Sons/`, synthétisés par `scripts/sons_app.py` (`--verifier` en CI).
  `vibrer()` de `natif.ts` joue le son du même nom. Détail dans `docs/app-da.md`.

- **Le mouvement** : questions et propositions qui arrivent en fondu et montée,
  jauges qui se remplissent, retour qui glisse dans le bon sens, tout coupé
  sous `prefers-reduced-motion`. Deux bugs corrigés au passage : la confirmation
  d'arrêt qui se fermait au buzzer, et le focus repris chaque seconde par le
  chrono.
- **Une vérification adverse** au simulateur, app réinstallée à vide, a rendu
  quatre réfutations, toutes corrigées : accueil figé entre deux onglets,
  vocabulaire de site dans l'app, Dynamic Type sans effet, et le site qui
  avait changé (liens de question soulignés, CSS doublé, dix chunks morts dans
  le précache). Le site est de nouveau identique à `main` sur ses 935 pages,
  à la classe `web-seulement` près et au script de `/signaler`, de même
  comportement.

### Ce qui reste

- Les captures App Store sur iPhone 17 Pro Max, avec une progression posée.
- À l'oreille sur un vrai iPhone : le bouton silencieux et la musique qui
  continue (session `.ambient`), VoiceOver sur l'annonce du verdict.
- Cosmétique : en taille de texte XXXL le texte des propositions se cale à
  droite du disque. (L'écran de démarrage de Capacitor, clair en sombre, est
  parti avec le greffon le 10 octobre.)
- ~~Aucun runtime iOS 15 à 17 n'est installé~~ : la cible est iOS 18 depuis le
  10 octobre, et le chemin d'avant est supprimé. (Redescendue à 16 le
  15 octobre, chemin rendu : voir plus haut.)
- **Le compte développeur Apple** reste le seul verrou pour TestFlight et la
  soumission.
- [ ] H2, le son des signaux à l'oreille (lot H, avec la recette du lot D,
  Alexis présent, sur son iPhone et pas au simulateur) : bouton silencieux, le
  signal se tait ; musique en cours, elle continue ; VoiceOver lit « Écouter
  le signal, sept secondes, bouton ». Si la session audio passe en `.playback`,
  plan B natif (`docs/app-da.md`, « Le son des signaux »).

## 10 septembre 2026 — la coquille est parquée, et remise à niveau

### La décision

On ne termine pas l'app. **Le compte développeur Apple n'existe pas**, il coûte
99 $ par an, et rien ne se signe, ne se teste sur un appareil ni ne se soumet
sans lui. Tant que ce compte n'est pas ouvert, tout le travail restant est
invérifiable : on ne le fait pas à l'aveugle.

En revanche on ne laisse pas la branche pourrir. `main` avance vite ; une
branche qui diverge trois mois de plus ne se fusionne plus, elle se réécrit.
D'où la fusion de ce jour, et d'où ce fichier.

### Ce qui est fait

- **Le build « app ».** `npm run build:app` sort `dist-app/` : `CIBLE=app`
  passe le format en dossier (le serveur d'assets de Capacitor l'exige), coupe
  la PWA, le sitemap, la mesure et les pages `question/`, et masque la
  navigation web. Le détail et les raisons sont dans `src/lib/cible.ts`.
- **Les deux garde-fous.** `scripts/elaguer-app.mjs` retire du bundle ce qui
  n'a pas de lecteur (images de partage, `robots.txt`, `_headers`…) et
  **refuse le bundle** si un lien interne pointe hors de lui ou compte sur une
  redirection. `scripts/verifier-cible.mjs` relit `dist/` et refuse le site si
  un greffon Capacitor y a fui — c'est ce qui garantit que le web ne paie rien
  pour l'app. Les deux tournent dans les scripts npm correspondants.
- **La coquille Xcode**, dans `ios/` : projet Capacitor 8, barre d'onglets
  native à quatre entrées (`BarreOnglets.swift`), une webview par onglet
  (`EcranWeb.swift`), écran de démarrage clair et sombre, icône,
  `PrivacyInfo.xcprivacy` en « aucune donnée collectée ».
- **`RouteurDuSite.swift`**, qui remplace le routeur de Capacitor : celui-ci
  rend l'accueil pour tout chemin sans extension, donc `/examen` servait la
  page d'accueil sous le nom de l'examen. Sans ce fichier, l'app est cassée
  d'une façon qui ne se voit pas dans les traces.
- **Ce que le natif ajoute** (`src/lib/natif.ts`, chaque fonction derrière un
  `import()` dynamique) : retour haptique à la correction, partage du résultat
  d'examen, rappels J-7/J-3/J-1/jour J adossés à la date de la fiche, et
  recalage du chrono au retour au premier plan.
- **La banque sans passer par Apple** (`src/lib/banque-locale.ts`) : l'app
  embarque la banque du jour de sa publication, interroge
  `banque/derniere.json`, télécharge la version plus récente et la garde en
  IndexedDB. Une publication de questions atteint les téléphones en quelques
  heures ; seul un changement d'écran repasse par la revue.
- **Les zones sûres** (`src/styles/app.css`, `viewport-fit=cover`).

### Ce qui n'est pas fait

- **Rien n'a jamais tourné sur un iPhone.** Le projet Xcode n'a été ni ouvert,
  ni compilé, ni signé, ni lancé — même au simulateur. Tout ce qui précède est
  du code juste sur le papier. C'est le premier geste à faire le jour où le
  compte existe, avant d'ajouter quoi que ce soit.
- **La mise à jour de la banque n'a pas de CORS.** `banque-locale.ts` va
  chercher `https://lepermiscotier.fr/banque/…` depuis `capacitor://localhost`,
  donc en requête d'origine croisée, et `public/_headers` ne pose aucun
  `Access-Control-Allow-Origin`. En l'état, `chercherMiseAJour()` échoue en
  silence — par construction, elle n'affiche jamais rien — et l'app reste sur
  sa banque embarquée. Ce n'est pas visible sans un appareil : à vérifier et à
  corriger côté Worker, pas côté app.
- **La barre d'onglets ignore les écrans nés depuis.** Ses quatre entrées
  datent d'avant la page des erreurs (`/profil/erreurs`), l'entraînement par
  notion (`/entrainement/notion/<code>`) et les fiches maison (`/source/…`).
  Ces pages sont dans le bundle et s'atteignent par des liens, mais aucune n'a
  d'onglet. À rejouer quand le reste tiendra.
- **Aucune CI ne construit la cible app.** `.github/workflows/ci.yml` ne
  connaît que le site : `npm run build:app` ne casse personne quand il casse.
  À brancher le jour où la branche redevient active.
- **Rien de ce qu'Apple demande en plus** : compte, identifiants d'app, profils
  de signature, captures d'écran, fiche App Store, politique de
  confidentialité publiée, et la réponse à la ligne directrice 4.2 — « pas
  suffisamment différent d'une navigation dans Safari ». La barre d'onglets et
  les rappels locaux sont les deux pièces prévues pour cette réponse ; elles
  n'ont jamais été soumises.

### Ce que la fusion d'aujourd'hui a changé pour la coquille

`main` a apporté le mélange des propositions, le rappel espacé, le jour
parisien, les fiches maison, l'entraînement par notion, la page des erreurs, un
précache allégé et des contrastes corrigés. Tout cela est adopté tel quel : la
coquille sert exactement l'épreuve du site, pas une plus ancienne.

Quatre points ont demandé une adaptation de la coquille au nouveau code :

1. **Une seule adresse de banque.** `main` a introduit `cheminBanque()`, seule
   source de l'adresse, et déplacé le JSON sous `/banque/v/<version>.json`. La
   route qu'`app-ios` servait à `/banque/<version>.json` est supprimée — deux
   adresses pour un même fichier, c'était le doublon à ne pas garder. La
   fonction pure `cheminDeVersion()` vit dans `src/lib/banque-distante.ts`, le
   seul module que le build et le navigateur partagent ; `cheminBanque()` s'en
   sert pour le préchargement et les écrans, `banque-locale.ts` pour ce que
   l'app télécharge.
2. **Le chargement de la banque.** L'échéance de quinze secondes de `main` (un
   réseau muet ne rejette rien) et la banque gardée de la coquille cohabitent
   dans `Quiz`. L'échéance ne couvre que le réseau : un IndexedDB lent ne doit
   pas faire afficher une panne de connexion. `chargerBanqueServie()` rend la
   version en plus des questions, ce dont seule l'app a besoin.
3. **Le service worker n'entre pas dans la coquille.** `main` a ajouté à
   `Base.astro` l'enregistrement du service worker et le manifeste. Ils sont
   posés sous `!POUR_APP` : `CIBLE=app` coupe la PWA, donc ni `sw.js` ni le
   manifeste ne sont bâtis et les deux balises pointeraient sur des 404. Le
   préchargement de la banque, lui, vaut aussi dans l'app et est gardé (la
   police est celle du système depuis la page calme, rien à précharger).
4. **Les fiches maison liaient vers `question/`.** `/source/<ref>` liste les
   questions qui s'appuient sur la fiche ; ces pages ne sont pas construites
   pour l'app, et `elaguer-app.mjs` refusait le bundle. La page passe par
   `LienQuestion.astro`, le composant que la coquille avait déjà pour ça.

`data/VERSION` n'a pas bougé sur `app-ios` : la fusion prend 1.12.3 de `main`,
sans collision. C'est à revérifier à chaque fusion — deux branches qui
incrémentent prennent le même numéro et fusionnent sans bruit, et l'app cherche
sa banque **par version**.

Les quatre vérifications passent à cette date : `npm test` (1 282), `npx astro
check` (0 erreur), `npm run build`, `npm run build:app`.

## 30 octobre 2026 — la coquille Mac (lot 2)

**L'app Mac se construit, signée ou non, et tourne** : essai à l'écran le 30 au
matin, sur le créneau d'Alexis (voir « À l'écran »).

### Capacitor sur Mac

`capacitor-swift-pm` 8.5.1 ne distribue `Capacitor.xcframework` et
`Cordova.xcframework` que pour `ios-arm64` et `ios-arm64_x86_64-simulator` :
le build Catalyst tombait sur chaque paquet (« no library for this platform was
found »). Décidé le 30 par Alexis : les reconstruire à la volée, pour le build
Mac seul, sans binaire au dépôt.

`scripts/capacitor-catalyst.sh` :

1. lit la version dans `CapApp-SPM/Package.swift` (`exact: "8.5.1"`) et refuse
   si `node_modules/@capacitor/ios` en dit une autre (sync à refaire) ;
2. clone `ionic-team/capacitor` à ce tag, archive les schémas `Cordova` et
   `Capacitor` (espace `ios/Capacitor/Capacitor.xcworkspace`, Release,
   `BUILD_LIBRARY_FOR_DISTRIBUTION=YES`, `SKIP_INSTALL=NO`) pour iPhone,
   simulateur et Mac Catalyst, puis `-create-xcframework` : trois tranches
   chacun. Quatre minutes. `native-bridge.js` est au dépôt, rien à construire en npm ;
3. range le tout dans `ios/App/catalyst/<version>/capacitor-swift-pm/`, avec un
   `Package.swift` de même nom et mêmes produits, en `binaryTarget(path:)`.
   Un fichier `.complet` marque le cache : une version faite n'est pas refaite
   (`--refaire` force) ;
4. pose `ios/App/catalyst/App-Mac.xcworkspace` : `App.xcodeproj` plus ce
   paquet. **Un paquet local d'un espace de travail remplace le paquet distant
   de même identité**, pour `CapApp-SPM` comme pour les six greffons qui le
   demandent par URL. Rien n'est réécrit : `cap sync` peut refaire
   `Package.swift`, le build Mac suit.

Pourquoi pas la réécriture de `CapApp-SPM/Package.swift` après `cap sync` : un
fichier suivi par git qu'un script modifie puis que le sync écrase, dans un
sens ou dans l'autre, c'est une archive iOS qui part un jour avec un chemin
local. Pourquoi pas un miroir SwiftPM : il faudrait un dépôt git local avec son
tag, et la configuration vivrait dans `App.xcodeproj`, que l'iOS lit aussi.

`--build` compile en Debug sans signature (`catalyst/derived/`) ; `--signe`
compile signé, profil de développement Catalyst créé au besoin
(`-allowProvisioningUpdates`), dans `catalyst/derived-signe/`, à lancer par
`open`. Bac à sable, client réseau et `get-task-allow` lus dans la signature.

### Ce qui a changé

- `App.xcodeproj`, cible `App`, Debug et Release : `SUPPORTS_MACCATALYST = YES`,
  `TARGETED_DEVICE_FAMILY = "1,2,6"` (idiome « Optimisé pour Mac »),
  `DERIVE_MACCATALYST_PRODUCT_BUNDLE_IDENTIFIER = NO` (même identifiant que
  l'iOS), `"IPHONEOS_DEPLOYMENT_TARGET[sdk=macosx*]" = 18.0`, soit macOS 15 :
  la barre latérale `UITab` demande iOS 18. **`MACOSX_DEPLOYMENT_TARGET` ne
  joue pas pour Catalyst** : posé à 15.0, le binaire sortait en `minos 16.0`
  (macOS 13), lu par `vtool -show-build`. `CODE_SIGN_ENTITLEMENTS[sdk=macosx*] =
  App/App-Mac.entitlements`.
- `App-Mac.entitlements` : bac à sable et client réseau, rien d'autre. Branché
  pour le seul SDK macOS : l'archive iOS ne le voit pas.
- `SceneDelegate` (sous `#if targetEnvironment(macCatalyst)`) : taille minimale
  800 × 600, 1100 × 780 au premier lancement seulement (macOS restaure ensuite),
  titre visible, pas de `NSToolbar` (rien à y mettre avant le lot des menus).
- `EcranWeb.viewDidAppear` : le titre de la fenêtre suit l'onglet courant.
- `BarreOnglets` : l'idiome `.mac` prend la barre latérale comme l'iPad, et
  `ajusterALaLargeur` (classe compacte sous 1 000 points) ne s'y applique pas.
- `GreffonsMuets.swift` (Catalyst seul) : `Haptics` et `StatusBar` remplacés,
  dans `EcranWeb.capacitorDidLoad`, par deux greffons de même nom JavaScript
  qui répondent à chaque méthode sans rien faire. Toutes les méthodes des
  greffons d'origine sont reprises : une méthode absente laisse la promesse en
  suspens. Le web n'a pas changé (`natif.ts` et `apparence.ts` avalaient déjà
  les erreurs).
- `EcranPlugin` n'a pas changé : `isTabBarHidden` plus le repli de
  `sidebar.isHidden` valent pour le Mac, à vérifier à l'écran.

### Vérifié

- Build Catalyst Debug, sans signature puis signé : verts, aucun avertissement
  sur notre code. `vtool` : `MACCATALYST`, `minos 18.0`, Capacitor et Cordova
  embarqués en tranche Catalyst ; aucun paquet distant téléchargé
  (`SourcePackages/checkouts` vide).
- Archive iOS Release par `App.xcodeproj`, la commande de `app-ios.yml` :
  verte, `IOS`, `minos 16.0`, paquet officiel téléchargé.
- `npm run build:app` (donc `cap sync ios`) : aucun fichier suivi ne bouge, le
  build Mac repasse sur le cache.

### À l'écran (30 octobre, MacBook Air, macOS 26)

Lancée par `scripts/capacitor-catalyst.sh --signe` puis `open`, pilotée par
Peekaboo en clics d'arrière-plan, et AppleScript pour le clavier, l'app
vérifiée au premier plan avant chaque frappe. Captures dans le dossier du projet,
`docs/captures-mac-2026-10-30/`.

- **Idiome Mac** : contrôles Mac, barre latérale aux cinq entrées, titre de
  fenêtre qui suit l'onglet (« Accueil », « Examen », « Fiche »).
- **Examen** : la barre latérale se replie au départ et revient au résultat.
  B coche, Entrée valide en série. **Plus de zone vide du clavier virtuel**, ni
  en examen, ni dans un champ du signalement (focus et saisie), ni de barre
  d'accessoires : le défaut 1 du lot 0 est réglé. « Arrêter l'examen ? »
  montre ses deux boutons entiers.
- **Mode sombre** : suit le système en direct (bascule de dix secondes, rendue).
  `-AppleInterfaceStyle Dark` en argument ne prend pas en Catalyst.
- **Fenêtre** : rien sous 800 × 600. Agrandie, la mise en page tient.
- **Taille de départ : défaut trouvé et corrigé.** Demandée dans
  `willConnectTo`, puis à l'activation, la fenêtre sortait à 800 de large :
  AppKit repose derrière nous son cadre gardé (`NSWindow Frame
  MainSceneWindow`) ou sa taille par défaut. Posée une demi-seconde après la
  première activation, une seule fois (clé `fenetreMac.tailleDeDepartPosee`) :
  1100 × 780, centrée, vu après avoir retiré le cadre gardé. Un saut visible
  au tout premier lancement, une fois.
- **Signalement** : « Préparer le signalement » ouvre un brouillon Mail à
  `contact@`, objet et corps remplis ; le bac à sable laisse passer `mailto:`.
  Brouillon fermé sans enregistrement.
- **Vibration** : cocher puis valider en série passe par `Haptics` (muet), la
  correction s'affiche, rien n'attend. La trace de Capacitor n'a pas pu être
  lue (rien sur la sortie standard, rien dans `log show`).

**Pour le lot 3** :
- la barre de menus dit « App » : `CFBundleName` vaut `$(PRODUCT_NAME)`. À
  régler avec les menus (« Le Permis Côtier » a 16 caractères, au-dessus des
  15 conseillés) ;
- Échap ne fait rien en examen ;
- « Les sons suivent le mode silencieux de ton appareil » (Réglages) : un Mac
  n'en a pas ;
- une fenêtre de 500 × 500, hors écran et invisible, existe à côté de la
  fenêtre principale (vue par Peekaboo), sans effet visible ; à identifier.

**Pas essayé** : liens externes (`Browser`, ouvrirait le navigateur par
défaut), Partager, rappels, sons à l'oreille. **Traces** dans les données
partagées avec la 1.0.7 : un examen interrompu (1 question), une série du jour
entamée (une réponse fausse), le cadre de fenêtre gardé remplacé.

### Reste

1. Liens externes, Partager, rappels et sons à l'écran, au lot 3 avec les menus.
2. CI : rien ne construit le Mac en CI. À poser au lot 4, avec le workflow Mac.
