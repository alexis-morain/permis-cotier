# Preflight Apple — 1.0.2 (build 12, `aef90b8`)

Fait le 15 octobre 2026, **après coup** comme celui de la 1.0.1 : la 1.0.1
est passée en vente, et `app-ios.yml` a envoyé la 1.0.2 en revue à 11 h 32.
Lecture locale du diff `6b37103..aef90b8`, sans console ni secret.

Ce qui sépare la 1.0.2 de la 1.0.1, côté Apple : les lots 1, 2, 3 et 6 du
plan « app solide » (CSS tactile, geste de l'examen, badges par thème), le
signalement de l'app passé par Mail (PR #35), et la bascule d'onglet (P2-1
de l'audit du 14). Côté natif, **une seule méthode Swift** ajoutée au greffon
maison `Ecran` (`onglet({ chemin })`, `EcranPlugin.swift`) : une API publique
d'UIKit (`selectedIndex`), aucun code chargé à distance.
`Info.plist`, `PrivacyInfo.xcprivacy`, entitlements, dépendances Capacitor et
`capacitor.config.json` **n'ont pas bougé**.

## Bloquants

**Aucun.**

## Ce qui s'améliore pour la revue

- **5.1.1 / label « Données non collectées »** : le point le plus faible du
  preflight 1.0.1 tombe. L'app ne charge plus Turnstile et n'envoie plus rien
  à notre Worker ; un signalement est un courrier que le candidat envoie
  lui-même depuis Mail. `elaguer-app.mjs` refuse tout `/api/` dans le bundle.
- **2.1 Complétude** : l'app ne dit plus « C'est parti » sur un envoi qui ne
  partait pas.
- **4.2** : la barre d'onglets pilote désormais aussi les liens internes vers
  un autre onglet ; les badges ajoutent une boucle d'apprentissage locale.
  Les badges vivent dans `localStorage`, comme le reste de la progression :
  rien de collecté.

## Ménage, reporté du preflight 1.0.1

- `PrivacyInfo.xcprivacy` dit à tort que Capacitor écrit dans `UserDefaults` :
  la déclaration `CA92.1` est superflue. **Gardée** : une déclaration en trop
  ne coûte rien, en retirer une qui servirait déclenche un avertissement à
  l'envoi.
- Les notes au relecteur en ligne datent de la 1.0 ; la copie du dépôt est
  dans `docs/fiche-app-store/`.

## Non vérifié

- Le geste de la bascule d'onglet et l'annonce des badges sur un vrai iPhone
  (`ios/a-tester.txt`). Le Swift compile pour le simulateur (`xcodebuild`,
  BUILD SUCCEEDED, 14 octobre) et l'app s'y lance ; le toucher n'a pas pu être
  joué faute d'accès d'aide pour piloter le simulateur.
- Ce qu'App Store Connect affiche en ligne (captures, label publié).
