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

La DA du site reste la nôtre, elle est déjà celle d'une app : deux couleurs,
Archivo sur deux largeurs, un rayon et un seul, le bord plein sous les boutons.
On ne change pas la marque, on change **ce que l'écran montre** et **comment il
bouge**. Pas de beige, pas de serif, pas de dégradé, pas de bordure colorée de
côté, pas d'ombre douce.

## La structure : cinq onglets

| Onglet | Chemin | SF Symbol | Ce qu'il montre |
|---|---|---|---|
| Accueil | `/` | `house` | Le tableau de bord du candidat (nouvel écran, app seulement) |
| Cours | `/cours` | `text.book.closed` | Les quatorze chapitres comme un parcours, progression visible |
| Examen | `/examen` | `timer` | L'épreuve, et rien d'autre |
| Entraînement | `/entrainement` | `target` | Les thèmes, puis les notions, correction immédiate |
| Fiche | `/profil` | `person.crop.circle` | Indice de préparation, erreurs, date d'examen, réglages |

L'app ouvre sur **Accueil**. Retoucher l'onglet courant ramène à sa racine puis
en haut de page. La barre prend la teinte de la marque : marine sur clair, jaune
sur sombre. Portrait seulement : un QCM à vingt secondes ne se joue pas en
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
- **La recherche** reste : un champ en haut de l'écran Cours et de l'écran
  Entraînement, pas dans un en-tête.
- **Navigation sans rechargement** : `<ClientRouter />` d'Astro dans la coquille
  seulement, animation `slide` sur `<main>`, `prefers-reduced-motion` respecté.
  Les cinq scripts inline se rattachent via `astro:page-load` quand le routeur
  est là (helper `quandLaPageEstPrete()` dans `src/lib/page.ts`), en direct
  sinon. Le `<html>` et le `<body>` portent la couleur de fond du thème pour
  qu'aucun flash blanc ne subsiste.
- **Liens externes** (Légifrance, GitHub, Wikimedia, licences) : dans l'app ils
  s'ouvrent dans `SFSafariViewController` via `@capacitor/browser`, jamais dans
  la webview de l'onglet. `natif.ts` expose `ouvrirDehors(url)`, et un écouteur
  global sous `POUR_APP` intercepte les `<a>` dont l'hôte n'est pas le nôtre.
- **Cibles de 44 pt minimum** sur tout ce qui se touche. Marges latérales
  16 pt. Listes en cellules pleine largeur, séparées par un filet, pas en cartes
  empilées avec marge tout autour.
- **Retour haptique** déjà présent à la correction ; on l'ajoute au passage
  d'une leçon à la suivante (léger) et au verdict d'examen (succès/erreur).

### Accueil (nouvel écran, `src/components/AccueilApp.tsx`)

Le tableau de bord, quatre blocs de haut en bas, aucun texte de présentation :

1. **Reprendre** — grand bloc marine, le titre de la prochaine leçon, le
   chapitre, une jauge de progression du cours (leçons faites / 105), un bouton
   jaune « Continuer ». Si rien n'est commencé : « Commencer : Marques
   latérales », première leçon. Réutilise la logique de `ReprendreCours.tsx`.
2. **À revoir aujourd'hui** — le nombre de questions dues au rappel espacé, et
   « Revoir » vers `/revoir`. Zéro question due : le bloc dit « Rien à revoir
   aujourd'hui » sans bouton. Réutilise `Reprise.tsx` / `progression.ts`.
3. **Examen blanc** — le dernier score (x/40, réussi ou non, il y a n jours) et
   un bouton « Nouvel examen blanc ». Jamais passé : le bouton seul.
4. **Ton examen** — le compte à rebours vers la date posée (« dans 12 jours »),
   ou « Pose la date de ton examen » vers `/profil`. Réutilise `DateExamen`.

Deux gros chiffres au plus sur l'écran (leçons faites, jours restants), pas de
rangée de statistiques. Le jour est parisien (`src/lib/jour.ts`). Tout se lit
dans `localStorage`, comme le reste du site.

### Cours

La liste des quatorze chapitres en **parcours vertical** : un numéro dans un
disque, le titre, « n / m leçons », une jauge fine. Chapitre terminé : disque
plein marine avec coche. Chapitre en cours : disque jaune. Une cellule par
chapitre, pleine largeur, 64 pt de haut minimum. Le bloc « Reprendre » du haut
reste (il existe). Dans une leçon : la barre « leçon n / m du chapitre » colle
sous la zone sûre, le bouton « Leçon suivante » colle en bas au-dessus de la
barre d'onglets.

### Examen et entraînement (`Quiz.tsx`, `quiz.css`)

- **Plein écran pendant l'épreuve** : dès qu'une série commence, l'app cache la
  barre d'onglets (plugin natif `Ecran.pleinEcran({ actif })`, voir
  `natif.ts` → `modeConcentration`). Elle revient au résultat ou à l'arrêt.
  La barre d'action colle alors au bord bas, `env(safe-area-inset-bottom)`
  seulement.
- La ligne d'avancement en haut : jauge fine pleine largeur sous la zone sûre,
  le compteur « 12 / 40 » à droite en petit, le chrono en grand chiffre
  tabulaire. Pas de titre « Question 12 ».
- Propositions : 56 pt de haut minimum, la lettre dans un disque, le bord plein
  qui s'enfonce au toucher. Une proposition cochée : fond jaune pâle, bord
  marine.
- Correction immédiate (entraînement) : le verdict monte du bas en panneau
  (vert pâle ou rouge pâle, texte en `--vert-texte` / `--rouge-texte`, jamais
  la couleur seule : le mot « Juste » ou « Faux » est écrit), avec
  l'explication, la source, et le bouton « Continuer » dans le panneau. Le
  panneau anime `transform` et `opacity`, 220 ms, easing sobre.
- Résultat : le score en très grand, le verdict écrit, la jauge par thème, puis
  deux boutons : « Revoir mes erreurs » (jaune) et « Refaire un examen »
  (discret). Partage natif en dessous.

### Fiche (`/profil`)

L'écran existe. Dans l'app il gagne en tête l'indice de préparation en grand
et, en bas, une section « L'app » : version de banque, « À propos », « Crédits
et licences », « Réglages » (apparence), « Signaler une erreur ». C'est le seul
écran qui porte ce que le pied de page web disait partout.

## Les règles de la coquille (Swift)

- Cinq onglets, teinte de marque par un jeu de couleurs `Accent` dans
  `Assets.xcassets` (clair `#0b1d3a`, sombre `#ffc72c`).
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
| 4.2 Fonctionnalités minimales | Barre d'onglets native, plein écran d'examen natif, rappels locaux, haptique, feuille de partage, Safari intégré, hors ligne complet |
| 4.0 Design (HIG) | Zones sûres, 44 pt, Dynamic Type respecté (`rem` partout, pas de `px` sur le texte), sombre suivant le système, portrait |
| 5.1.1 Confidentialité | Aucune donnée collectée, `PrivacyInfo.xcprivacy`, URL de politique `/a-propos`, aucun compte |
| 5.1.2 Suivi | Aucun traceur dans le bundle, `verifier-cible.mjs` le refuse |
| 2.1 Complétude | Aucun lien mort (`elaguer-app.mjs`), aucun « bêta », pas de placeholder |
| 2.3 Métadonnées | La fiche dit le vrai nombre de questions ; captures prises dans l'app réelle |
| 2.5.1 API | Que des API publiques, pas de code chargé à distance : la banque téléchargée est du **JSON de contenu**, pas du code |
| 1.5 Assistance | URL d'assistance qui répond, formulaire de signalement dans l'app |

## Ce qu'on ne fait pas

- Pas de compte, pas de synchronisation, pas d'achat intégré. La fiche dit
  « gratuit », et la 3.1 ne s'applique pas.
- Pas de gamification qui ment : pas de streak inventé, pas de badges. Un
  compte de jours de suite existe déjà (`jour.ts`) ; on le montre s'il est
  supérieur à un, on n'insiste pas.
- Pas de son.
