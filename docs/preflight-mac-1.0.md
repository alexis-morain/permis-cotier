# Preflight Apple — Mac 1.0 (Mac Catalyst, branche `app-mac-publication`)

Fait le 31 octobre 2026, **avant toute soumission**, sur le build envoyé à
TestFlight : Mac **1.0 (23)**, commit `ff05e30`, archive Catalyst Release
signée ad hoc puis exportée et signée pour l'App Store (`Mac Catalyst Team Store
Provisioning Profile`). Installé par TestFlight sur le MacBook Air d'Alexis
(macOS 26.5), lancé, vérifié. Lecture locale, sans console App Store Connect.

Ce que la version Mac ajoute à l'app iOS, côté Apple : la cible Catalyst (lot 2),
la barre de menus et les greffons Mac (lot 3), le bac à sable et la catégorie
(ce lot). Même identifiant `fr.lepermiscotier.app`, donc même fiche, achat
universel, mêmes avis. App Store Connect n'avait **aucune version macOS** : le
build est entré sans qu'il faille ajouter la plateforme à la main.

## Bloquants

**Aucun.**

## Vérifié

- **2.4.5 (i), bac à sable** : droits lus dans l'app installée par TestFlight
  (`codesign -d --entitlements`) : `app-sandbox`, `network.client`, et ce
  qu'Apple ajoute (`application-identifier`, `team-identifier`,
  `beta-reports-active`), `get-task-allow` à faux. Rien d'autre :
  `App-Mac.entitlements` n'a que les deux clés.
- **2.4.5 (ii) à (vii)** : envoyé par `xcodebuild -exportArchive` ; ni
  lancement à l'ouverture de session, ni élément de connexion, ni droits
  root, ni clé de licence. L'app télécharge la banque en JSON (des données,
  pas du code exécutable) ; le JavaScript est celui du paquet.
- **Refus du bac à sable au lancement** (`/usr/bin/log show`) : deux, tous deux
  de WebKit (`com.apple.cmio.registerassistantservice.system-extensions`,
  `com.apple.Safari.SafeBrowsing.Service`), sans effet visible. C'est le lot
  ordinaire d'une `WKWebView` en bac à sable ; aucun droit à ajouter.
- **Réseau sortant** : « Le site lepermiscotier.fr » (menu Aide) ouvre le
  navigateur par défaut. Mail (`mailto:`) vu au lot 2, rappels et sons au lot 3,
  tous déjà sous bac à sable avec les mêmes droits.
- **Info.plist** : `LSApplicationCategoryType` = `public.app-category.education`
  (exigée par le Mac App Store, catégorie principale de la fiche : Éducation),
  `ITSAppUsesNonExemptEncryption` à faux, `LSMinimumSystemVersion` 15.0,
  `CFBundleName` « Permis Côtier ».
- **Binaire universel** : `x86_64 arm64`, `MACCATALYST`, `minos 18.0`
  (macOS 15). Les Mac Intel sous macOS 15 sont servis.
- **Confidentialité** : `PrivacyInfo.xcprivacy` embarqué, `UserDefaults` déclaré
  (CA92.1) ; le Mac s'en sert pour la taille du texte et la taille de départ de
  la fenêtre, même raison. Rien de collecté, rien de suivi.
- **Icône** : `AppIcon.icns` tiré de l'icône iOS ; TestFlight l'affiche en carré
  arrondi, bouée jaune sur marine.
- **Captures** : cinq, 2880 × 1800, RGB sans alpha, dans le dossier de gestion
  (`docs/captures-app-store/mac/`) : accueil, cours, examen, correction,
  résultat. Fenêtre de 1280 × 800 points posée sur `--bleu`.
- **Fiche** : `docs/fiche-app-store/mac/` (description, mots-clés, notes au
  relecteur), relue par `verifier-fiche` ; « plus de 600 questions » n'y
  figure pas, aucun compte à tenir.

## Avertissements

- **4.2, fonctionnalité minimale** : l'app reste une coquille web. La réponse
  de `docs/app-da.md` (« Ce qu'Apple regarde ») vaut, et le Mac y ajoute ce
  qu'un site n'a pas : barre de menus native, raccourcis, barre latérale, sons,
  rappels locaux, hors ligne. Les notes au relecteur Mac le disent.
- **Lancement par TestFlight** : juste après l'installation, un processus de
  l'app est resté à l'état « T » (arrêté), sans fenêtre. Tué puis relancé par
  `open`, l'app a démarré normalement. Vu une fois, pas reproduit ; à
  surveiller au prochain build.
- **La 1.0.7 « Conçue pour iPhone »** (case « Apps iPhone et iPad sur Mac »
  laissée cochée le 29) est remplacée sur le Mac App Store dès que la version
  Catalyst sort. Rien à décocher.
- **Symboles** : l'export signale l'absence de dSYM pour Capacitor et Cordova,
  reconstruits sans symboles par `capacitor-catalyst.sh`. Sans effet sur la
  revue ; les rapports de plantage de ces deux cadres seront moins lisibles.

## À faire à la main dans App Store Connect (Alexis)

1. Ajouter la version macOS 1.0 si l'écran ne la propose pas déjà, y rattacher
   le build 23.
2. Coller description, mots-clés et notes de `docs/fiche-app-store/mac/` ;
   téléverser les cinq captures Mac.
3. Envoyer en revue, ou lancer `App Mac` avec la case « revue » une fois la PR
   fusionnée (le workflow refait un build depuis `main`).
