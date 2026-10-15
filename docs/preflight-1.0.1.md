# Preflight Apple — 1.0.1 (build 10, `6b37103`)

Fait le 14 octobre 2026, **après coup** : `app-ios.yml` a envoyé la 1.0.1 en
revue à midi, sans preflight. Lecture locale seulement, sans console ni
secret : skills `capacitor-apple-review-preflight` (checklist « all apps »,
règles design, entitlements, metadata, privacy), puis `app-store-review`
(required-reason API, labels de confidentialité, ATT). Ce qu'Apple voit en
ligne (captures, notes posées, label publié) n'a pas été relu : voir
« Non vérifié ».

Ce qui sépare la 1.0.1 de la 1.0 acceptée (build 3, `4de7218`), côté Apple :
les rappels d'examen armés depuis l'app (lot 0), la cible iOS 18, le
`Main.storyboard` retiré (la racine se pose dans `SceneDelegate.swift`),
`@capacitor/splash-screen` retiré, `Quiz.tsx` découpé sans changement visible.
`signaler.astro`, `Info.plist` (hors storyboard) et `PrivacyInfo.xcprivacy`
n'ont pas bougé.

## Bloquants

**Aucun.** Rien de ce qui se lit dans le dépôt ne fait rejeter la 1.0.1.

## Ménage

Par ordre d'urgence. Aucun ne ferme la 1.0.1 ; le premier est à vérifier avant
la 1.0.2.

1. **Le signalement dans l'app, à vérifier au simulateur** (2.1, 5.1.1).
   `src/pages/signaler.astro:96` pose le widget Turnstile et `:144` charge
   `challenges.cloudflare.com` dans le bundle de l'app (`dist-app/signaler/`) ;
   `:253` poste sur `/api/signaler`, un chemin relatif. Dans la coquille il
   vise `capacitor://localhost/api/signaler`, chemin inconnu que
   `RouteurDuSite.swift:63` rend par l'écran d'accueil, sans erreur. Deux issues possibles, que seul le
   simulateur départage : Turnstile refuse l'hôte `localhost`, pas de jeton,
   et le formulaire retombe sur le courrier (correct) ; ou Turnstile rend un
   jeton, le HTML de l'accueil revient sans erreur, `reponse.json()` échoue en
   silence et l'écran dit « C'est parti. Merci. » sans que rien ne parte.
   Les notes au relecteur (`docs/fiche-app-store/notes-revue.txt`, point 4)
   décrivent le chemin en ligne. Correction probable : dans l'app, poster sur
   `https://lepermiscotier.fr/api/signaler` avec l'hôte accepté par le Worker,
   ou n'y garder que le courrier.
2. **Le label « Données non collectées » est à défendre** (5.1.1, 5.1.2).
   Le formulaire envoie un texte libre (`signaler.astro:77`) qui devient une
   issue publique, et Turnstile (`:96`, `:144`) fait voir la connexion à
   Cloudflare. L'exemption « collecte facultative » d'Apple exige que le nom
   de la personne figure dans l'envoi ; ici il n'y figure pas, à dessein. Deux
   sorties propres : déclarer « Contenu utilisateur › Autre », non lié à
   l'identité, finalité « Fonctionnement de l'app » ; ou ne garder que le
   courrier dans l'app. La politique (`/a-propos`, « Elle ne collecte aucune
   donnée ») suit le choix. Inchangé depuis la 1.0 acceptée, d'où le ménage.
3. **La page de signalement parle d'une mesure d'audience absente de l'app**
   (2.3, exactitude). `signaler.astro:84` : « la vérification anti-robot
   ci-dessous et la mesure d'audience voient ta connexion ». Dans la coquille
   Umami est coupé (`verifier-cible.mjs`). Brancher la phrase sur `POUR_APP`.
   Hors de cette PR : `src/` appartient aux lots 1, 2 et 3.
4. **`PrivacyInfo.xcprivacy` justifie une API par un fait faux.**
   `ios/App/App/PrivacyInfo.xcprivacy:15-17` et `:31` disent que Capacitor
   écrit dans `UserDefaults`. Ni `node_modules/@capacitor/*/ios` ni
   `ios/App/App/*.swift` n'y touchent, et le manifeste de Capacitor
   (`node_modules/@capacitor/ios/Capacitor/Capacitor/PrivacyInfo.xcprivacy`)
   ne déclare aucune API. Déclarer `CA92.1` sans l'utiliser ne fait pas
   rejeter ; le commentaire, lui, ment. À retirer ou à justifier au prochain
   passage dans `ios/`.
5. **Les notes au relecteur datent de la 1.0** (2.1). Le champ en ligne porte
   la réponse 2.1 du 4 octobre (« build 1.0 (1) », vidéo jointe) : copiée dans
   `docs/fiche-app-store/notes-revue.txt`. Pour la 1.0.2, dire la version et
   ce qui a changé (rappels armés depuis l'onglet Fiche, iOS 18).
6. **Le dossier de gestion était faux à deux endroits**, corrigé le 14 hors
   dépôt : « Notes au relecteur » disait « all 622 questions » (658 publiées),
   et la fiche « iOS 15 et plus » et `IPHONEOS_DEPLOYMENT_TARGET = 15.0`
   (`project.pbxproj:254`, 18.0). Ces notes-là ne sont plus en ligne depuis
   le 4 octobre.

## Ce qui passe

- **4.2, fonctionnalités minimales.** La réponse de `docs/app-da.md:201` tient
  toujours, chaque point lu dans le code : barre d'onglets native
  (`BarreOnglets.swift`, racine posée par `SceneDelegate.swift:16`), plein écran
  d'examen natif (`EcranPlugin.swift`, `setTabBarHidden`), rappels locaux armés
  depuis l'app (`natif.ts:90-156`, appelés par `profil/Reglages.tsx:109` et
  `Questionnaire.tsx:223`, permission demandée au moment où l'on pose la date),
  haptique (`natif.ts:42-49`), feuille de partage (`natif.ts:61`), Safari intégré
  (`natif.ts:232`), banque embarquée et hors ligne (`banque-locale.ts`). Le son
  (`SonPlugin.swift`, session `.ambient`) manquait à la ligne : ajouté.
- **2.3, métadonnées.** La description (`docs/fiche-app-store/description.txt`)
  ne cite aucun nombre de questions ; « quatorze chapitres » et « 105 leçons »
  sont vrais (`COURS` de `parcours.ts`, 105 fichiers dans `data/cours/`) ;
  « des rappels avant la date de ton examen », faux dans la 1.0, est vrai dans
  la 1.0.1. Les nouveautés (`ios/nouveautes.txt`) disent le changement réel.
  `app_store.py verifier-fiche` tient le compte désormais (658).
  Aucun terme concurrent ni marque Apple détournée.
- **5.1.1, politique.** `/a-propos` est dans le bundle et atteint depuis
  l'onglet Fiche (« À propos et confidentialité »), aucun compte, aucune donnée
  obligatoire.
- **5.1.2, ATT.** Aucun suivi : pas de `NSUserTrackingUsageDescription`,
  `NSPrivacyTracking` faux, aucun domaine de suivi, aucun SDK tiers dans
  `package.json` hors Capacitor. Pas d'invite ATT, c'est ce qu'Apple attend.
- **Manifeste et required-reason API.** `PrivacyInfo.xcprivacy` est dans les
  ressources de la cible (`project.pbxproj:167`), `plutil -lint` OK. Aucune
  API à motif dans `ios/App/App/*.swift` (`UserDefaults`, horodatages de
  fichiers, `systemUptime`, `mach_absolute_time`, espace disque).
- **Entitlements.** Aucun fichier `.entitlements`, aucune capacité : les
  rappels sont des notifications locales, sans `aps-environment`.
- **Info.plist.** `ITSAppUsesNonExemptEncryption` faux (`:29`), iPhone seul,
  portrait (`:56`), `arm64` (`:52`), français (`:17`), aucune clé d'usage
  inutile, aucun mode d'arrière-plan.
- **SDK.** Archive sous Xcode 26 (`app-ios.yml`, « Choisir Xcode 26 »), build
  traité et rattaché par Apple.
- **3.1, 4.8.** Ni achat, ni connexion tierce.

## Non vérifié

- Les captures en ligne (prises le 26 septembre) face à l'app d'aujourd'hui.
- Le label de confidentialité publié et la classification d'âge.
- Le texte exact du champ Notes : la copie suit le dossier de gestion ;
  la resoumission du 9 octobre a pu y ajouter une ligne.
- Le build 10 lancé sur un appareil : aucune trace locale d'un essai
  TestFlight de ce build.
