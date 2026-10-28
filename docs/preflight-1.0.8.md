# Preflight Apple — 1.0.8 (la page calme, branche `da-page-calme`)

Fait le 28 octobre 2026, **avant la fusion**, comme le veut `docs/app-ios.md`
(« Avant chaque version »), en lecture locale. La 1.0.7 (19) est en revue chez
Apple ; cette branche ne fusionne pas tant qu'elle n'est pas sortie, sinon
`app-ios.yml` enverrait la page calme par-dessus. Le diff de référence part de
`main` (`bc7c068`, la 1.0.7). Sans console ni secret.

Ce qui sépare cette version de la 1.0.7, côté Apple : **la forme seulement**.
Les écrans, le parcours, les textes et la banque (1.20.1, 658 questions) sont
ceux de la 1.0.7. Côté natif, quatre fichiers d'actifs et deux commentaires :

- `Accent.colorset` : l'onglet courant passe du marine/jaune à l'encre
  (`#37352f` clair, `#e6e5e3` sombre) ;
- `Fond.colorset` : le fond de la webview passe à `#ffffff` / `#191919` ;
- `Splash.imageset` : l'écran de démarrage garde sa bouée, sur ces fonds
  (`scripts/icones-ios.mjs --verifier` vert) ;
- `BarreOnglets.swift`, `EcranWeb.swift` : commentaires seulement.

`Info.plist`, `PrivacyInfo.xcprivacy`, entitlements, `Package.swift`,
`pbxproj`, `capacitor.config.json` sont ceux de la 1.0.7. `package.json` perd
`@fontsource-variable/archivo`, qui ne servait qu'au web : plus aucune police
n'est embarquée.

## Bloquants

**Aucun.**

## Avertissements

- **2.3.3 / 2.3.4, captures** : celles d'App Store Connect et celles de la
  vitrine du site (`public/vitrine/*.webp`) montrent l'ancienne DA (marine,
  Archivo). Ce n'est pas un motif de refus tant qu'elles montrent l'app en
  usage, mais l'écart est maintenant visible au premier coup d'œil : à refaire
  avec cette version, avant de la soumettre.
- **2.3.12, nouveautés** : `ios/nouveautes.txt` décrit ce qui change à
  l'écran, sans nom de chantier ni promesse.
- **Icône** : l'icône garde sa bouée jaune sur marine, alors que le site et le
  favicon prennent la marque noire à deux cônes. Pas un motif de refus ;
  aligner l'icône est une décision à part (`DESIGN.md`, « Formes »).
- **Grand texte** : à 28 px de corps, la feuille de correction de
  l'entraînement couvre les propositions ; elle défile, mais la proposition
  corrigée sort de l'écran. À voir sur iPhone avec le vrai Dynamic Type.

## Passés

- **2.5.1 / plancher SDK** : inchangé, `app-ios.yml` archive sur `macos-26`,
  cible iOS 16.0. Le CSS nouveau reste dans Safari 16 : `:has()` (15.4),
  `mask` (15.4) ; `text-wrap: pretty` est ignoré sans dommage avant
  Safari 26. `elaguer-app.mjs` vert dans `build:app`.
- **4.2 Fonctionnalité minimale** : rien n'est retiré. La réponse 4.2 de
  `docs/app-da.md` reste vraie (accueil qui suit l'état du candidat, révision
  des erreurs d'un examen, rappels, sons, haptique).
- **5.1.1 / label « Données non collectées »** : le diff n'ajoute aucun
  `fetch`, aucun domaine, aucun accès au stockage nouveau (relu par
  `git diff main -- src`, seuls ajouts d'URL : deux masques SVG en `data:`).
- **Required-reason API** : aucun code natif ajouté. Rien à déclarer de plus.
- **5.1.2 / ATT** : aucun traçage, aucune invite.
- **Accessibilité** : `verifier-accessibilite.mjs dist-app` vert ; chaque paire
  de couleurs tenue par `src/styles/contraste.test.ts` en clair et en sombre
  (4,5:1 texte, 3:1 bords), le verdict toujours dit par un mot ou un signe.
- **2.3.1 fiche** : `verifier-fiche` vert (658 questions publiées).

## Ménage

- Budget d'`/examen` relevé de 86 240 à 88 169 octets (`docs/budgets.md`,
  raison écrite) ; `POUR_APP` à 38 sur 40.
- Les images de partage (`scripts/partage.mjs`) et les visuels générés de la
  banque gardent l'encre marine : hors de ce chantier, sans incidence Apple.

## Simulateur

Build Debug `xcodebuild … -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO` vert
(après `npx cap sync ios`), installé sur l'iPhone 17 Pro, iOS 26.5. L'app
démarre sur l'Accueil sans aplat de couleur entre l'écran de démarrage et la
page ; la barre d'onglets (verre d'iOS 26) prend l'encre sur l'onglet courant ;
le passage du système en sombre bascule la page et la barre en direct, sans
flash. Captures : `docs/captures-da-page-calme/apres/simulateur-*.png`.

## Non vérifié

- Les gestes au simulateur (correction en feuille, examen, résultat) : vus en
  Chromium à 390 × 844 seulement (`docs/captures-da-page-calme/apres/`).
- Le vrai Dynamic Type, VoiceOver, le retour haptique et les sons : c'est
  `ios/a-tester.txt`.
- Safari 16 (iPhone 8) : aucun simulateur iOS 16 n'a tourné.
