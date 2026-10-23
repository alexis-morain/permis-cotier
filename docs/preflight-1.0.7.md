# Preflight Apple — 1.0.7 (build 19, `07dd194`)

Fait le 23 octobre 2026, **avant la fusion**, sous le nom de « 1.0.6 » :
entre-temps le passage planifié avait mis `404ed72` en vente comme 1.0.6, et
`app-ios.yml` a donc envoyé ce chantier en revue comme **1.0.7 (19)**. Fait comme le veut `docs/app-ios.md`
(« Avant chaque version »). Lecture locale de la version telle qu'elle sortira des
quatre PR du chantier UX, fusionnées dans cet ordre au-dessus de `main`
(`404ed72`) : #48 leçon et entraînement (`7e09591`), #50 après l'examen
(`696ad85`), #49 accueil (`6b0cd3d`), #51 fiche et réglages (`94bb53e`).
Chaque PR a eu son checker : #48 et #49 CONFIRMED, #50 CONFIRMED au second
passage ; #51 REFUTED au second passage pour des débordements de carte à gros
corps, corrigés ensuite par le pilote (`94bb53e`) et mesurés au navigateur,
sans troisième checker. Le diff de
référence part de la 1.0.5 (build 17, `2ac176e`) et comprend donc aussi la PR
#47 (typographie française). Sans console ni secret.

Ce qui sépare cette version de la 1.0.5, côté Apple : **rien de natif**. Aucun
fichier de `ios/` ne bouge hors `a-tester.txt` et `nouveautes.txt` ;
`Info.plist`, `PrivacyInfo.xcprivacy`, entitlements, `Package.swift`, `pbxproj`,
`capacitor.config.json`, `package.json` et le verrou sont ceux de la 1.0.5. Le
reste est du web embarqué : l'accueil choisit la prochaine chose à faire, un
bouton « Passer » en examen blanc, « Revoir mes erreurs » après un examen
recalé, la fiche allégée et les réglages sur leur écran, plus de réglage
d'apparence dans l'app, la progression par thème à l'entraînement, les leçons
en police système.

Sources relues le 23 octobre : App Review Guidelines, et
https://developer.apple.com/news/upcoming-requirements/ (Xcode 26 et SDK
iOS 26 exigés depuis le 28 avril 2026 ; cible iOS 13 au moins depuis le
9 septembre 2026).

## Bloquants

**Aucun.**

## Avertissements

- **2.3.3 / 2.3.4, captures** : déjà signalé à la 1.0.5, plus vrai encore ici.
  Les captures en ligne montrent l'ancienne DA, et l'accueil, le résultat
  d'examen, la fiche et les réglages ont changé de forme. Pas un motif de
  refus tant qu'elles montrent l'app en usage, mais elles sont à refaire **avec
  cette version**, avant de la soumettre.
- **2.1, notes au relecteur** : la copie du dépôt
  (`docs/fiche-app-store/notes-revue.txt`) est juste (signalement par Mail).
  Les notes en ligne datent de la 1.0 et décrivent l'ancien chemin : à
  recopier dans App Store Connect avec cette version. Elles nomment cinq
  onglets, Home, Course, Exam, Practice, Profile : toujours vrai, Réglages
  est un écran poussé depuis la fiche.
- **2.3.12, nouveautés** : `ios/nouveautes.txt` décrit ce qui change à
  l'écran, sans promesse. « Revoir mes erreurs te fait rejouer tes erreurs de
  l'examen » est vrai par construction : la PR #50 passe les questions de
  l'examen dans le lien (`/revoir?examen=…`).
- **Grand texte** : la PR #51 faisait déborder Réglages en largeur au-delà de
  22 px de corps. Corrigé avant fusion et mesuré à 390 px de 17 à 28 px ;
  le vrai Dynamic Type reste à voir sur iPhone.

## Passés

- **2.5.1 / plancher SDK** : `app-ios.yml` archive sur `macos-26` avec le
  dernier Xcode 26 non bêta ; cible iOS 16.0, au-dessus du minimum iOS 13.
  Aucune API privée, aucun code téléchargé : la banque arrive en JSON.
- **4.2 Fonctionnalité minimale** : l'app gagne un parcours qu'un site n'a
  pas (accueil qui suit l'état du candidat, révision ciblée des erreurs d'un
  examen). Rien n'est retiré, hors les jalons de la fiche, qui doublaient les
  paliers par thème.
- **5.1.1(i), confidentialité** : « À propos et confidentialité » reste sur la
  fiche de l'app (`/a-propos`), à un tap de l'onglet.
- **5.1.1 / label « Données non collectées »** : aucun `fetch`, aucun domaine,
  aucune API de capteur ajoutés au diff ; les seuls liens nouveaux sont les
  licences MIT et CC BY-SA dans Réglages. `elaguer-app.mjs` refuse toujours
  `/api/` dans le bundle. « Effacer ma progression » vide le stockage local,
  rien ne quitte l'appareil.
- **Required-reason API** : seule `UserDefaults` est déclarée, par Capacitor ;
  le diff n'ajoute aucun code natif. Rien à déclarer de plus.
- **5.1.2 / ATT** : aucun traçage, aucune invite ATT, ce qui est correct.
- **Apparence** : l'app suit le réglage du système (`dark-mode.md` : pas de
  réglage propre à l'app). Un choix enregistré par une version antérieure est
  ignoré, sans flash au lancement (vérifié par le checker de la PR #51).
- **2.3.1 fiche** : `verifier-fiche` affirme 658 questions publiées, le vrai
  compte, et relit `nouveautes.txt` et `a-tester.txt`.

## Ménage

- Budgets : `POUR_APP` à 40 sur 40 après la PR #50, la prochaine mention fait
  échouer le gate ; la référence de `/examen` relevée de 46 octets
  (`docs/budgets.md`, raison écrite).
- Les jalons de la fiche sont retirés **aussi sur le site** (PR #51), validé
  par Alexis à la fusion.

- La meta description de `/parametres` parlait encore de l'apparence dans
  l'app (invisible) : corrigée dans la PR #51.
- Retour de `/profil/depart` vers la fiche même quand on venait de Réglages :
  corrigé dans la PR #51 (`?retour=/parametres`, liste fermée de `retour.ts`).

## Non vérifié

- Rien n'a tourné sur un vrai iPhone ni au simulateur : ni la nouvelle
  navigation, ni VoiceOver sur « Passer », ni le clavier dans Réglages, ni le
  vrai Dynamic Type. C'est `ios/a-tester.txt`.
- Ce qu'App Store Connect affiche en ligne.
