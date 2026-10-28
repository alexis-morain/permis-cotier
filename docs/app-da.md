# L'app iOS — direction artistique et parti pris

Ce fichier dit ce que l'app iPhone doit être, en quoi elle se distingue du site,
et les règles que chaque écran suit. Il vaut pour tous ceux qui touchent à la
coquille ou à la couche `html[data-app]`. L'état technique reste dans
`docs/app-ios.md`.

## Le constat du 25 septembre 2026

La coquille a tourné pour la première fois au simulateur (iPhone 17 Pro, iOS 26).
Elle fonctionne, et elle est une **copie conforme du site dans une fenêtre** :

- l'en-tête web (logo, loupe) reste au-dessus de chaque écran, y compris
  pendant l'examen ; le fil d'Ariane « Accueil › Cours » est un fil de site ;
- l'onglet « Progression » ouvre la **page d'accueil marketing** du site : un
  hero « Révise le permis côtier au format de l'épreuve », deux boutons, des
  liens de découverte. Rien n'y parle du candidat qui a déjà commencé ;
- le pied de page recopie la licence, la version de banque et le copyright sous
  chaque écran ;
- chaque page ouvre par un chapô de trois lignes qui explique ce qu'elle est.
  Sur le web, il sert le référencement ; dans l'app, il repousse le contenu
  sous la ligne de flottaison à chaque visite ;
- l'aide « Au clavier : A, B, C, D » s'affiche sur un téléphone ;
- la barre d'action de l'examen flotte 140 pt au-dessus de la barre d'onglets ;
- chaque navigation est un chargement de page complet, avec un flash ;
- la barre d'onglets est au bleu système, pas aux couleurs de la marque.

C'est précisément ce que la ligne directrice 4.2 d'Apple refuse : « pas
suffisamment différent d'une navigation dans Safari ».

## Le parti pris

**Une app d'apprentissage, pas un site en plein écran.** Les références sont
Duolingo, Brilliant et Memrise pour la structure, pas pour le ton : un écran
d'accueil qui dit *où on en est et quoi faire maintenant*, une leçon qu'on
enchaîne d'un pouce, un examen joué plein écran, un résultat qui donne le geste
suivant. Zéro texte d'explication de la page elle-même : l'app se comprend en
la regardant.

La page est calme : le blanc, l'encre gris chaud, la police du système et
un seul bouton coloré. On ne change pas ce que l'app dit, on change **ce que
l'écran montre**, **comment il bouge** et **combien il en montre** : voir « La
page calme » plus bas. Pas de beige, pas de serif, pas de dégradé, pas de
bordure colorée de côté, pas de marine ; d'ombre, une seule, pour ce qui flotte.

## La page calme (28 octobre 2026)

Remplace « La retenue » du 19 octobre, qui posait un fond gris-bleu, des cartes
blanches, un bouton à socle et Archivo large sur les titres. Le monde visuel est
celui de `DESIGN.md`, commun au site ; l'app n'en redéfinit aucun jeton. Ce qui
est propre au téléphone :

- **Une page blanche** (`#191919` en sombre), des filets d'un pixel
  (`--filet`), l'encre `--texte`. Un groupe de lignes est ou bien des
  **rangées nues** séparées de filets (cours, leçons, thèmes, notes, récapitulatif,
  « Ensuite »), ou bien un **panneau blanc à filet**, coins de 10 px, pour un
  court groupe titré (Réglages, « L'app », le panneau de la prochaine action). Pas
  de carte dans une carte, aucune ombre.
- **Un seul bouton coloré : le jaune franc** `--jaune` (`#ffc72c`), texte
  `--sur-jaune`, 600, coins de 6 px, sans socle ni ombre. Appuyé, il descend d'un
  pixel et s'assombrit à peine ; désactivé, c'est un aplat gris. En sombre aussi.
  Le second bouton est un filet fort sur blanc, le troisième du texte souligné.
  Le jaune n'est nulle part ailleurs que sur ce bouton, au pavillon Q du reçu et
  à la marque.
- **Les propositions sont celles de `quiz.css`** : une rangée à filet, la lettre
  dans un carré. Cochée : fond `--teinte`, lettre pleine à l'encre
  (`--action`). Corrigée : vert ou rouge pâle, un ✓ ou un ✕ dans le carré. La
  couleur ne dit jamais seule juste ou faux. L'app n'ajoute que la hauteur de
  56 pt et l'appui qui enfonce à 0,97.
- **La correction est une feuille** (`.jeu__pied`) : après validation en
  entraînement, tout le bloc du bas (explication, source, « Continuer ») prend le
  fond `--vert-pale` ou `--rouge-pale`, un filet haut teinté, les coins du haut
  arrondis et `--ombre-flottante` : c'est ce qui flotte, avec l'alerte des
  Réglages. Elle monte du bas en 220 ms, transform et opacité, coupée sous
  `prefers-reduced-motion`.
- **Une police, celle du système**, partout : le titre d'écran et les grands
  chiffres sont la même police en 700, serrée de -0,02 em (`global.css`).
- **On n'anime que `transform` et `opacity`**, de 80 à 240 ms. Un fond qui change
  à l'appui change d'un coup.

## La structure : cinq onglets

| Onglet | Chemin | SF Symbol | Ce qu'il montre |
|---|---|---|---|
| Accueil | `/` | `house` | Le tableau de bord du candidat (nouvel écran, app seulement) |
| Cours | `/cours` | `text.book.closed` | Les quatorze chapitres comme un parcours, progression visible |
| Examen | `/examen` | `timer` | L'épreuve, et rien d'autre |
| Entraînement | `/entrainement` | `target` | Les thèmes, puis les notions, correction immédiate |
| Fiche | `/profil` | `person.crop.circle` | Indice de préparation, derniers examens, thèmes faibles (le bilan seulement) |

L'app ouvre sur **Accueil**. Retoucher l'onglet courant ramène à sa racine puis
en haut de page. La barre prend l'encre : `#37352f` sur clair, `#e6e5e3` sur
sombre, jamais le bleu système. Portrait seulement : un QCM à vingt secondes ne se joue pas en
paysage, et on ne teste pas ce qu'on ne livre pas.

## Ce que la couche app change, écran par écran

Tout ce qui suit vit sous `html[data-app]` (CSS) ou derrière `POUR_APP`
(Astro/TSX). Le site ne bouge pas d'un pixel.

### Base (tous les écrans)

- **Pas d'en-tête web.** Ni logo, ni loupe. Le titre `h1` de la page est le
  titre de l'écran. Le premier bloc de chaque page respecte
  `env(safe-area-inset-top)` plus une marge.
- **Le fil d'Ariane devient un bouton « Retour »** : un seul lien, vers
  l'avant-dernière miette, chevron `‹` devant, hauteur 44 pt. Sur les onglets
  racines, rien.
- **Pas de pied de page.** Version de banque, licences, crédits vivent dans
  l'écran Fiche (lien « À propos »). Un seul écran les porte.
- **Pas de chapô SEO.** Les paragraphes d'introduction de `/cours`,
  `/entrainement`, `/examen`, `/themes` et des pages de thème sont masqués dans
  l'app (classe `web-seulement` posée sur ces blocs, ou `!POUR_APP`). L'écran
  ouvre sur l'action.
- **Pas d'aide clavier**, pas de `<kbd>`, pas de raccourci `/` : le composant
  qui les rend les tait sous `POUR_APP`.
- **La recherche** reste : `OuvrirRecherche.astro`, un champ en haut de
  l'écran Cours et de l'écran Entraînement, pas dans un en-tête.
- **Chaque onglet est sa propre webview, chargée une fois.** Une leçon faite
  dans Cours ne se verrait pas dans Accueil : la coquille envoie `app:onglet`
  quand l'onglet revient, et `annoncerSiLaProgressionAChange()` compare les clés
  `permis-cotier:` de `localStorage` à la photo du dernier rendu. Si elles ont
  bougé (racines d'onglet seulement, `/examen` exclu pour ne pas effacer un
  résultat), `window` reçoit `app:progression` : les îlots de la racine
  (`AccueilApp`, `ProfilCandidat`, `monterCours`, la liste d'`EntrainementApp`)
  relisent le stockage et se rendent à nouveau, par `surProgressionChangee()`
  (`src/lib/vivant.ts`). **La page ne se recharge plus** : plus de flash, ni
  îlot relancé, ni défilement perdu. Un nouvel îlot qui lit la progression sur
  une racine d'onglet s'y rattache aussi.
- **La bande de la zone sûre haute** est un `body::before` fixe au fond du
  thème : le contenu ne défile jamais sous l'heure.
- **Ce qui ne vaut que pour l'app ne sort pas du site** : le greffon Vite
  `siteSansApp()` d'`astro.config.mjs` vide les feuilles `app*.css` et les
  composants d'app hors `CIBLE=app`, sinon Astro empaquette le CSS et les
  îlots de tout composant importé, rendu ou non. `LienQuestion.astro` n'est
  rendu que dans l'app : sur le site, le `<a>` garde l'attribut de portée de
  sa page.
- **Navigation sans rechargement** : `<ClientRouter />` d'Astro dans la coquille
  seulement. L'écran qui arrive monte en fondu de 140 ms (opacité seule, `fondu`
  dans `Base.astro`), l'ancien disparaît tout de suite, et `Coquille.astro` coupe
  le fondu enchaîné de 250 ms que les View Transitions natives ajoutent d'office.
  Le glissement `slide` d'avant coûtait plus d'une demi-seconde par tap sous
  Safari 16 et 17, où Astro joue l'ancien écran puis le nouveau
  (`docs/captures-fluidite/`). Le préchargement des liens part au toucher
  (`prefetch`, `astro.config.mjs`, app seulement). `prefers-reduced-motion` coupe
  tout.
  Les cinq scripts inline se rattachent via `astro:page-load` quand le routeur
  est là (helper `quandLaPageEstPrete()` dans `src/lib/page.ts`), en direct
  sinon. Le `<html>` et le `<body>` portent la couleur de fond du thème pour
  qu'aucun flash blanc ne subsiste.
- **Liens externes** (Légifrance, GitHub, Wikimedia, licences) : dans l'app ils
  s'ouvrent dans `SFSafariViewController` via `@capacitor/browser`, jamais dans
  la webview de l'onglet. `natif.ts` expose `ouvrirDehors(url)`, et un écouteur
  global sous `POUR_APP` intercepte les `<a>` dont l'hôte n'est pas le nôtre.
- **Cibles de 44 pt minimum** sur tout ce qui se touche. Marges latérales
  16 pt. Une liste est faite de rangées séparées d'un filet, nues ou dans un
  panneau à filet (voir « La page calme »).
- **Retour haptique** déjà présent à la correction ; on l'ajoute au passage
  d'une leçon à la suivante (léger) et au verdict d'examen (succès/erreur).

### Accueil (nouvel écran, `src/components/AccueilApp.tsx`)

Le tableau de bord : le titre « Accueil » (display, 2,125 rem) et la date du jour
en encre douce (« Mercredi 28 octobre, 4 jours de suite »), puis un **panneau**
pour la prochaine chose à faire, puis « Ensuite », une liste de rangées. Aucun
texte de présentation. Chaque rangée se touche entièrement : une icône dans un
carré lavis de 2 rem, un libellé et sa légende, une valeur à droite en 600, un
chevron `›` en `--filet-fort`.

**Le panneau est la prochaine chose à faire**, choisie par `prochaineAction`
(`src/lib/accueil.ts`) ; son bouton jaune est le seul de l'écran, et la chose ne
reparaît pas dans la liste :

1. épreuve posée à sept jours ou moins, et pas passée → **Examen blanc**,
   « Faire un examen blanc » (même avec des questions dues : à ce stade se
   mesurer compte plus que réviser) ;
2. sinon des questions dues → **À revoir aujourd'hui**, le nombre que `/revoir`
   jouera (borné au rythme, comme `serieDuJour`), « Faire ma série du jour » ;
3. sinon → **le cours** : le chapitre et le rang de la leçon dans une étiquette
   à la couleur du groupe de son thème (`groupeDuTheme`), son titre, un rail
   d'avancement et « 2 leçons sur 105 » en légende, « Continuer le cours »
   (« Commencer le cours » si rien n'est commencé). Cours terminé : « Revoir le
   plan du cours », lien sans bouton jaune.

« Ensuite » reprend, dans l'ordre cours, à revoir, examen, ce que le panneau n'a
pas pris, puis **Ton épreuve** (« Dans 23 jours » et la date à droite, ou « Pose
la date de ton épreuve » vers `/parametres`). Le dernier score de l'examen est une
étiquette `etiquette--juste` ou `--faux` (« 32 sur 40 »), avec « Réussi » ou
« Recalé » écrit dessous : la couleur ne dit pas seule. Pas d'encart « commence
plutôt par la leçon » du site.

Chaque libellé dit un verbe et ce qu'il ouvre, avec les mots de la Fiche pour
les mêmes destinations (audit du 14 octobre, `docs/audit-ux-app-2026-10-14.md`).
Le jour est parisien (`src/lib/jour.ts`). Tout se lit dans `localStorage`,
comme le reste du site.

### Cours

La liste des quatorze chapitres en **parcours vertical**, des rangées nues : un
numéro dans un disque, le titre, « n / m leçons », un rail fin. Chapitre
terminé : disque plein à l'encre de l'action avec le numéro. Chapitre en cours :
disque teinté au bord de l'encre. Une rangée par chapitre, 64 pt de haut minimum.
Le bloc « Reprendre » du haut reste (il existe, bouton jaune). Dans une leçon :
la barre « leçon n / m du chapitre » colle sous la zone sûre, le bouton « Leçon
suivante » colle en bas au-dessus de la barre d'onglets.

Le texte d'une leçon est en police système, au corps et à la graisse normaux ;
l'accroche, seule sur son premier écran, passe à 1,25 rem, toujours en système
(le titre d'écran seul est en 700). La barre sous « Leçon
n / m » compte l'écran où l'on est : un neuvième dès le premier, pleine à la fin.

### Examen et entraînement (`Quiz.tsx`, `quiz.css`)

- **La liste des thèmes** (`/entrainement`) montre où on en est, comme le Cours :
  sous un thème déjà ouvert, « 61 retenues sur 108 » et une jauge fine ; un thème
  jamais ouvert garde « 78 questions », sans jauge vide. « Retenue » est celle de
  la Fiche (`maitriseParTheme`). La liste se relit sur `app:progression`.

- **Plein écran pendant l'épreuve** : dès qu'une série commence, l'app cache la
  barre d'onglets (plugin natif `Ecran.pleinEcran({ actif })`, voir
  `natif.ts` → `modeConcentration`). Elle revient au résultat ou à l'arrêt.
  La barre d'action colle alors au bord bas, `env(safe-area-inset-bottom)`
  seulement.
- La barre du haut : la croix à gauche (« Arrêter » en examen, avec la
  confirmation ; « Quitter » vers le choix du thème en entraînement), « 2 / 10 »
  au centre, le chrono à droite en examen, et dessous une jauge fine pleine
  largeur. Pas de jauge de chrono dans l'app : le nombre dit tout et passe au
  rouge sur les cinq dernières secondes. Pas de titre « Question 12 ».
- L'ordre : le visuel, l'énoncé (police système, corps normal), les
  propositions. Un seul bouton en bas, pleine largeur. En entraînement
  et en révision, grisé tant que rien n'est coché. En examen blanc, jamais
  grisé : rien de coché, il dit « Passer » et saute la question, comptée sans
  réponse comme au buzzer ; une case cochée, il redevient « Valider et passer ».
- Propositions : celles du site (voir « La page calme »), 56 pt de haut
  minimum. Pas de socle ; l'appui est un enfoncement à 0,97. Le carnet de
  l'examen du site, à côté de la question, est masqué.
- Correction immédiate (entraînement) : le verdict monte du bas en **feuille**
  aux couleurs du verdict (voir « La page calme ») et laisse voir la question
  derrière. Le signe et le mot (« ✓ Juste », « ✕ Faux ») et l'explication se lisent
  sans défiler ; la source est un `<details>` « Source » en légende, à chevron vers
  le bas qui se retourne à l'ouverture (comme « Comment c'est compté » de la
  Fiche), le lien de la leçon est bleu, le signalement un lien discret, le bouton
  jaune « Continuer » reste dans la feuille. Elle anime `transform` et `opacity`,
  220 ms, easing sobre.
- Résultat : le score en très grand (display 700), l'étiquette « Reçu » ou
  « Recalé » avec sa phrase, puis **les actions sous le score, avant la liste**
  (sinon le bouton tombe sous le pli), puis les notes par thème en rangées nues
  avec leur rail, puis le récapitulatif. Un examen reçu hisse le pavillon Q jaune
  le long d'un mât d'encre. Examen recalé : « Revoir mes N erreurs » (jaune, vers
  `/revoir?examen=<ids>` : les ratées de l'examen, par identifiant, N exact ;
  l'écran s'y titre « Tes erreurs de l'examen », ignore une série ordinaire
  arrêtée et joue toutes les erreurs sans le plafond du rythme), « Refaire un
  examen » (bouton à filet), partage natif ; le récapitulatif est **réduit aux
  erreurs** (« Voir les 40 questions » les déplie). Examen reçu : même ordre,
  « Refaire un examen » en jaune et les 40 lignes.

### Fiche (`/profil`)

La Fiche de l'app ne garde que le bilan : l'indice de préparation, les derniers
examens blancs, « À reprendre en premier », l'objectif du jour (la série et les
quatorze cases sont repliées dans « Tes quatorze derniers jours »), puis les
trois thèmes les plus faibles avec leurs paliers et une cellule « Tous les
thèmes › » vers `/profil/themes` (liste complète, Retour vers la Fiche). Le
prénom, la raison, le rythme, la date d'examen, les sons et l'effacement sont
dans Réglages (`settings.md` : on règle à un seul endroit, et les réglages ne
traînent pas dans l'écran de contenu). Les jalons n'existent plus, ni dans l'app
ni sur le site. En bas, une section « L'app » : version de banque, « À propos »,
« Crédits et licences », « Réglages », « Signaler une erreur ». C'est le seul
écran qui porte ce que le pied de page web disait partout.

**Pas de réglage d'apparence** (`dark-mode.md`) : l'app suit le système partout.
Un « Clair » ou « Sombre » enregistré avant ne s'applique plus ; le site garde
son réglage.

### Réglages (`/parametres`)

Panneaux blancs de cellules à filet, sous un petit titre doux, comme l'app
Réglages d'iOS : « Ton épreuve » (date d'examen), « Ton rythme » (questions par
jour, contrôle segmenté), « Toi » (prénom, pourquoi tu passes le permis), « Sons »,
« Cette version », « Ce que l'app sait de toi », « Licences ». « Effacer ma
progression » tout en bas, en rouge, ouvre une alerte (`alerts.md`) : titre
« Effacer ta progression ? », ce qui partira, « Annuler » à gauche (focus initial,
Échap), « Effacer » à droite. Le bouton de confirmation n'est pas rouge : le
geste est délibéré.

La jauge de l'indice est faite de trois encres de plus en plus pleines (vu,
examens, retenu : `profil.css`), en clair comme en sombre, sans jaune : le jaune
reste au bouton.

## Les règles de la coquille (Swift)

- Cinq onglets, teinte d'encre par un jeu de couleurs `Accent` dans
  `Assets.xcassets` (clair `#37352f`, sombre `#e6e5e3`).
- `Ecran` : un plugin Capacitor maison, une méthode `pleinEcran({actif})`, qui
  cache ou montre la barre d'onglets avec animation. iOS 18 et plus :
  `setTabBarHidden(_:animated:)` ; avant : `tabBar.isHidden` plus
  `additionalSafeAreaInsets` remis à zéro, pour que la webview reçoive le bon
  `safe-area-inset-bottom` dans les deux cas.
- Retoucher l'onglet courant : retour à la racine de la pile **puis** défilement
  en haut.
- Style de barre d'état suivant le thème de la page (plugin `StatusBar`,
  appelé par `apparence.ts` sous `POUR_APP`).
- `Info.plist` : portrait seul, `UIRequiredDeviceCapabilities` en `arm64`,
  `CFBundleDevelopmentRegion` en `fr`, `CFBundleLocalizations` `fr`.
- Aucun `print` de debug, aucune vue vide possible : une adresse inconnue rend
  l'accueil (déjà fait par `RouteurDuSite`).

## Ce qu'Apple regarde, et ce qu'on répond

| Ligne directrice | Ce qui la satisfait |
|---|---|
| 4.2 Fonctionnalités minimales | Barre d'onglets native, plein écran d'examen natif, rappels locaux armés depuis la Fiche, haptique, sons en session `.ambient`, feuille de partage, Safari intégré, hors ligne complet. Relu au preflight de chaque version (`docs/preflight-<version>.md`) |
| 4.0 Design (HIG) | Zones sûres, 44 pt, Dynamic Type suivi par `font: -apple-system-body` sur `html[data-app]` (les `rem` suivent ; `rem` seul ne suit pas dans WKWebView), sombre suivant le système, portrait |
| 5.1.1 Confidentialité | Aucune donnée collectée, `PrivacyInfo.xcprivacy`, URL de politique `/a-propos`, aucun compte |
| 5.1.2 Suivi | Aucun traceur dans le bundle, `verifier-cible.mjs` le refuse |
| 2.1 Complétude | Aucun lien mort (`elaguer-app.mjs`), aucun « bêta », pas de placeholder |
| 2.3 Métadonnées | La fiche dit le vrai nombre de questions (`app_store.py verifier-fiche`, en CI) ; captures prises dans l'app réelle |
| 2.5.1 API | Que des API publiques, pas de code chargé à distance : la banque téléchargée est du **JSON de contenu**, pas du code |
| 1.5 Assistance | URL d'assistance qui répond, formulaire de signalement dans l'app |

## Les badges

Décidés le 10 octobre (décision 1 du plan `app-solide`, contre la première
version de ce fichier, qui disait « pas de badges »), tranchés le 14. La règle :

- **Trois paliers par thème**, et rien d'autre : **Parcouru** (toutes les
  leçons du thème suivies), **Retenu** (quatre questions publiées du thème sur
  cinq retenues, au supérieur), **Sûr à l'examen** (le thème sans faute sur
  trois examens blancs complets de suite).
- **Un fait daté, jamais une promesse.** La récompense dit « maintenant que »
  (« Les 9 leçons des feux et marques suivies, le 12 octobre. »), jamais « si…
  alors ». Le palier suivant se lit comme un fait sur la Fiche (« 61 retenues
  sur 108 ; à 87, le palier Retenu. »), jamais en compte à rebours.
- **Conservés.** Une faute plus tard, une question retirée de la banque ne les
  reprennent pas ; seul « Effacer ma progression » les retire.
- **Rien pour la présence** : ni série, ni jours, ni ouvertures de l'app.
  Aucun badge transversal, aucun total de badges, aucun score qui monte seul.
- **Annoncés une fois, à l'écran qui les a fait gagner** (fin de leçon, fin de
  série, résultat d'examen) : un bloc sous le résultat, « Palier gagné » en étiquette
  teintée, puis le palier, le thème et le fait. Le texte d'abord ; dans l'app,
  le son `lecon` en renfort, après celui du verdict. Rien de modal : la suite
  reste à un doigt. Plusieurs d'un coup : trois lignes au plus, puis « Les
  autres sont sur ta fiche. », sans cascade d'animations. Une entrée de 200 ms
  en `opacity` et `transform`, coupée sous `prefers-reduced-motion`.
- **Gardés sur la Fiche**, sous la jauge de chaque thème ouvert : les paliers
  gagnés avec leur fait daté, puis le prochain.

Le pourquoi, les seuils et les phrases : `plans/2026-10-10-app-solide.md` du
dossier de gestion, lot 3 (« Les badges, tranchés le 14 octobre ») ; le code :
`src/lib/badges.ts` et `docs/app-ios.md`, section « Les badges ».

## Ce qu'on ne fait pas

- Pas de compte, pas de synchronisation, pas d'achat intégré. La fiche dit
  « gratuit », et la 3.1 ne s'applique pas.
- Pas de gamification qui ment : pas d'XP, pas de ligue, pas de classement,
  pas de score global qui monte seul. Les badges sont des faits par thème,
  bornés par la section ci-dessus ; rien d'autre ne se gagne.
- La série de jours (`serieDeJours`) se montre dès deux jours, au texte neutre
  (« 3 jours de suite »), sans rien qui pousse à la tenir, et aucune
  notification ne la sert. Les seuls envois restent les rappels J-7, J-3, J-1
  et le jour J de l'examen (décision 2 du plan).

## Le son

Décidé le 25 septembre 2026, contre la première version de ce brief : l'app a
des bruitages, comme les apps d'apprentissage dont elle prend la grammaire. Un
son court dit le résultat d'un geste. Il ne décore rien.

### La palette

Sept sons, tous en la majeur pour que deux sons qui se suivent ne jurent pas.
Synthétisés par `scripts/sons_app.py`, écrits en WAV 44,1 kHz mono 16 bits
dans `ios/App/App/Sons/`, vérifiés octet à octet en CI. Aucun fichier ni motif
repris d'une autre app.

| Son | Quand | Ce qu'on entend | Durée | Crête |
|---|---|---|---|---|
| `choix` | cocher une proposition | un mi aigu (1 319 Hz) qui s'éteint | 45 ms | -20 dBFS |
| `juste` | correction juste : entraînement, révision, question de leçon | la 880 Hz puis mi 1 319 Hz, une quinte qui monte | 260 ms | -12 dBFS |
| `faux` | correction fausse | ré 294 Hz et son octave, qui s'affaisse d'un demi-ton | 200 ms | -14 dBFS |
| `lecon` | leçon terminée | la, do dièse, mi, en montant | 500 ms | -12 dBFS |
| `fin-serie` | série d'entraînement menée au bout | arpège serré mi, la, do dièse, mi | 500 ms | -12 dBFS |
| `reussi` | examen blanc reçu | cloche de bord (la 440 Hz, partiels à 2, 2,76 et 5,4) puis l'accord qui monte | 1,15 s | -9 dBFS |
| `echoue` | examen blanc recalé | mi puis do dièse, une tierce qui descend, sinus pur | 500 ms | -14 dBFS |

La cloche est la signature : elle ne sonne qu'au moment fort, l'examen reçu.
Le reste est en sinus ou en triangle adouci. Pas de sirène, pas de corne de
brume, pas de buzzer : `faux` et `echoue` sont graves et doux, jamais punitifs.

### Les règles

- **Session audio `.ambient`** (greffon `Son`, `ios/App/App/SonPlugin.swift`) :
  le bouton silencieux tait les sons, la musique ou le podcast continuent
  dessous. C'est la règle de l'HIG pour des sons d'interface. Pas de
  `UIBackgroundModes audio`, rien ne joue en arrière-plan.
- **Aucun son sans geste.** Chaque son répond à un toucher. Rien au
  lancement, rien au chrono.
- **En examen, pas de verdict question par question** : l'épreuve ne dit pas
  si on a juste avant la fin, le son non plus. Seuls `choix`, puis `reussi` ou
  `echoue` au résultat. Un examen arrêté en route ne sonne pas.
- **Volume bas**, fixé dans le fichier : crête entre -20 et -9 dBFS, jamais
  plus fort qu'une notification. Attaque de 5 ms, fin à zéro : pas de clic.
- **Un seul appel par écran** : `vibrer(nom)` de `natif.ts` donne la vibration
  et le son du même nom. Les écrans n'appellent jamais le greffon eux-mêmes.
- Les fichiers sont dans le bundle, rien ne se télécharge.

### Le réglage

Écran Réglages (Fiche → L'app → Réglages), section « Sons » : un interrupteur
« Jouer les sons », activé par défaut, avec la ligne « Les sons suivent le
bouton silencieux de ton iPhone. » Le rallumer joue `juste` une fois, pour
qu'on entende ce qu'on vient d'activer. Le choix se garde sous la clé
`permis-cotier:son` (`src/lib/son.ts`) ; couper tait aussi un son qui résonne
encore. Les vibrations ne dépendent pas de ce réglage : elles suivent celui du
système.

## Le son des signaux

Décidé le 3 octobre 2026 (lot H du plan final), tranché au grill le 4 : les
seize signaux au sifflet et à la cloche de `public/visuels/sons/` s'entendent,
sur le site comme dans l'app. Ce ne sont pas des bruitages : c'est la matière
de la question, et ils ne suivent pas les règles de la palette ci-dessus.

### D'où vient le son

Aucun fichier audio. `scripts/sons.py` dessine les frises et écrit
`src/lib/sons-motifs.json`, la même table ; `src/lib/signal-sonore.ts` la joue
en Web Audio. Le son ne peut donc pas se désaccorder du dessin, et il ne pèse
rien au précache.

| | Valeur | Source |
|---|---|---|
| Bref, prolongé | 1 s, 5 s | règle 32 b) et c) |
| Sifflet, navire 1 | 440 Hz, fondamentale et deux harmoniques | annexe III, § 1 b) : 250 à 700 Hz sous 75 m |
| Sifflet, navire 2 | 660 Hz, une quinte au-dessus | même bande ; pour un motif à deux navires, aucun aujourd'hui |
| Cloche | la 440 Hz, partiels à 2, 2,76 et 5,4 | la recette de `sons_app.py`, une seule dans le dépôt |
| Volée | 17 coups en 5 s, un par hachure du dessin | règle 35 g), « sonnée rapidement » |
| Crête | -12 dBFS, volée à -15 | convention : jamais plus fort qu'une notification |
| Enveloppe | 50 ms d'attaque et de chute au sifflet, 5 ms de frappe à la cloche | convention : pas de clic |

Les intervalles entre sons sont la convention écrite en tête de `sons.py`. La
période de répétition n'est ni dessinée ni jouée.

### Le bouton

« Écouter le signal, 7 s » sous la frise, partout où elle s'affiche : écran de
jeu (examen blanc compris), revue, vérification de leçon, `/question/[id]`.
La durée écrite dit le prix : en examen blanc, écouter consomme les vingt
secondes de la question, comme regarder la frise, et le chrono n'en sait rien.
Pendant la lecture il devient « Arrêter », même largeur. VoiceOver lit
« Écouter le signal, sept secondes, bouton ».

Quand le son part, la frise repart du début, une seule passe, et s'arrête avec
lui sur sa dernière image. Le curseur passe sous chaque barre au moment où elle
sonne. Un écouteur Bluetooth ajoute sa latence : l'œil et l'oreille restent
ensemble à la seconde, pas mieux.

### Les règles

- Aucun son sans geste : le contexte audio s'ouvre dans l'appui, seul moment
  où WebKit l'autorise. Rien à l'affichage, rien au chrono.
- Un seul signal à la fois dans la page ; changer de question coupe le son.
- Le réglage « Jouer les sons » ne gouverne que les bruitages : un signal
  demandé du doigt se joue. Il suit le bouton silencieux, à vérifier sur
  l'iPhone (H2).
- Le poids : le bouton et la table n'arrivent en `import()` que sous une
  frise sonore, le moteur au premier appui. Mesuré le 4 octobre : accueil à
  zéro, `/examen` +0,9 Kio brotli.
- Événement `signal-ecoute` dans la mesure, nom du signal seulement.

### Dans l'app, à prouver sur l'iPhone

WebKit peut passer la session audio en `.playback` au premier son Web Audio :
le bouton silencieux serait ignoré et la musique coupée, l'inverse des règles
du greffon `Son`. Aujourd'hui `SonPlugin` ne pose `.ambient` qu'une fois, au
premier bruitage, et rien ne la repose après un signal. Deux réponses selon ce
que montre l'iPhone : reposer la session à chaque signal, ou le plan B, le
greffon reçoit `signal({ motif })` et rend le son en natif depuis le même JSON.
Ça se vérifie à la recette du lot D (H2), pas au simulateur.
