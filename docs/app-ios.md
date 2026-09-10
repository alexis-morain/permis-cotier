# L'app iOS — état des lieux

Ce fichier vit sur la branche `app-ios` seulement. Il dit où en est la coquille
iPhone, ce qui la bloque, et ce qu'il resterait à faire pour la livrer. Il
existe pour qu'on puisse reprendre le chantier sans relire les commits.

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
   préchargement de la police et celui de la banque, eux, valent aussi dans
   l'app et sont gardés.
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
