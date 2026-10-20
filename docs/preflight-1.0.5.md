# Preflight Apple — 1.0.5 (build 17, `2ac176e`)

Fait le 20 octobre 2026, **après coup** comme les précédents : le schedule de
11 h 39 d'`app-ios.yml` a envoyé la 1.0.5 en revue dès la fin de la revue de
la 1.0.4. Lecture locale du diff `aef90b8..2ac176e` (depuis la 1.0.2, dernier
preflight), sans console ni secret.

Ce qui sépare la 1.0.5 de la 1.0.2, côté Apple : la cible iOS 16 (PR #37-#38)
et les cinq chantiers d'après Bato (PR #46 : DA sobre, fluidité, séries de 10,
graphique des examens, fiches « à relire la veille »). Côté natif, **seul
`EcranPlugin.swift`** bouge : le chemin `basculerAvantIOS18` pour cacher la
barre d'onglets avant iOS 18 (`tabBar.isHidden`, `additionalSafeAreaInsets`),
API publiques d'UIKit, aucun code chargé à distance. `Package.swift` et le
`pbxproj` descendent à iOS 16. `Info.plist`, `PrivacyInfo.xcprivacy`,
entitlements, dépendances et `capacitor.config.json` **n'ont pas bougé**.

## Bloquants

**Aucun.**

## Avertissements

- **2.3.3 / 2.3.4, captures** : la DA a changé (cartes blanches, un seul bouton
  fort, police système). Les captures en ligne montrent l'ancienne allure. Ce
  n'est pas un motif de refus tant qu'elles montrent l'app en usage, mais il
  faut les refaire avant la prochaine version.
- **2.1, notes au relecteur** : la copie du dépôt
  (`docs/fiche-app-store/notes-revue.txt`) décrivait encore le signalement par
  Turnstile et notre Worker. Elle est corrigée ici : depuis la 1.0.2, l'app
  ouvre un courrier prérempli dans Mail. **Les notes en ligne datent de la
  1.0** et disent toujours l'ancien chemin : à recopier dans App Store Connect
  à la prochaine version (impossible tant que la 1.0.5 est en revue).
- **Compatibilité annoncée** : `nouveautes.txt` promet iOS 16 « dès un
  iPhone 8 ». C'est vérifié au simulateur en 16.4 et 17.5, mais pas sur un
  appareil.

## Passés

- **4.2 Fonctionnalité minimale** : séries de 10 avec récapitulatif, graphique
  local des examens, quatorze fiches-mémo hors ligne. L'app s'éloigne encore
  d'un site en webview.
- **5.1.1 / label « Données non collectées »** : aucun `fetch` ni domaine
  nouveau dans le diff. Le seul lien externe ajouté (App Store) vit dans
  `seo.ts`, côté site. `elaguer-app.mjs` refuse toujours `/api/` dans le bundle.
- **2.3.1 Fiche** : `verifier-fiche` affirme 658 questions, le vrai compte.

## Non vérifié

- Rien n'a tourné sur un vrai iPhone (`ios/a-tester.txt`), ni la nouvelle DA
  au simulateur.
- Ce qu'App Store Connect affiche en ligne.
