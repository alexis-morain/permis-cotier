# permis-cotier : pilote du dépôt

Ce fichier tient la technique : le gate, les règles de fusion, l'architecture,
les pièges de code, les commandes. Il ne contient ni le cap, ni les plans, ni
l'infrastructure (domaine, courrier, secrets, comptes Apple et Umami) : tout ça
vit hors du dépôt, dans le dossier de gestion d'Alexis. Une session cloud n'a
que ce dépôt ; ce qui n'est pas écrit ici, elle ne le sait pas.

Site open source de révision au permis plaisance option côtière, en ligne sur
https://lepermiscotier.fr, et sa coquille iOS (Capacitor 8). Examens blancs au
format 2022 (40 questions, 5 erreurs admises), entraînement par thème, chaque
question citant sa source. Le fichier `.claude/skills/permis-cotier/SKILL.md`
est un résumé généré automatiquement le 4 septembre ; en cas d'écart, ce
fichier-ci prévaut.

## Le gate

```bash
scripts/check.sh            # tout ce que fait la CI, dans le même ordre ; 0 = vert
scripts/check.sh --rapide   # banque et tests seulement, sans types ni builds
```

Il s'équipe seul (`npm ci`, `.venv` et `requirements.txt`) et tourne sur un
clone nu en deux à trois minutes. Il rejoue `.github/workflows/ci.yml` étape
par étape : toute étape ajoutée à la CI s'ajoute à `check.sh` au même rang.
**Aucun saut légitime aujourd'hui** : s'il annonce un saut hors `--rapide`,
c'est un défaut à signaler, pas un vert.

**Un push sur `main` publie.** Cloudflare construit et déploie le site, et
`app-ios.yml` part vers TestFlight dès que `ci.yml` est vert sur ce commit
(`workflow_run`). Fusionner, c'est mettre en ligne.

## Le trou

Le gate dit si la banque est bien formée, si les visuels correspondent à leur
description et si le site se construit. Il ne dit pas :

1. **si une question est vraie** contre son texte source (`data/questions/`,
   `data/sources/`). Le validateur vérifie la forme et la citation, pas le droit ;
2. **si la coquille iOS marche** (`ios/`) : Swift ne se construit que sur un Mac,
   et la CI de l'app ne tourne qu'après fusion ;
3. **si le rendu est juste** : mise en page, gestes, animations, sons. Les tests
   ne voient pas l'écran.

**La règle qui en découle.** Une PR qui touche `data/questions/`,
`data/sources/`, `ios/`, ou qui change ce qu'on voit ou entend (`src/components/`,
`src/pages/`, les styles, `public/`), commence son titre par **`[à relire]`** et
dit dans sa description ce qui est à relire et comment. Une question écrite ou
retouchée par une session reste en `relu_par: claude` : seul Alexis la passe en
relue.

## Les deux régimes de fusion

- **Vert suffit** : `scripts/`, `tests/`, la logique de `src/lib/` couverte par
  ses tests, la documentation. La CI verte, puis la fusion.
- **Relu par Alexis** : tout ce que nomme la règle ci-dessus. Depuis le
  téléphone, Alexis met en file et lit ; la fusion se fait au Mac, après
  relecture contre la source, au navigateur ou au simulateur.

Une session cloud **ne fusionne jamais elle-même** : elle ouvre la PR et
s'arrête. `gh pr merge --auto` fusionne sur-le-champ, la protection de `main`
n'exige aucune vérification : attendre la CI.

## La passation

`docs/prompts/en-cours.md` porte un seul prompt et l'un de trois états :
`aucun`, `à exécuter`, `consommé le AAAA-MM-JJ par #<PR>`. Une session qui le
prend le passe à `consommé` **dans la PR qu'elle ouvre**, jamais avant. Un
prompt consommé ne se rejoue pas sans relecture d'Alexis.

À ne pas confondre avec `prompts/question.md`, le gabarit de génération des
questions de la banque.

## État

Banque 1.20.1, 658 questions, 149 en `relu_par: claude` à relire par Alexis.
Plan « app solide » : lot 0 fusionné (rappels d'examen). Lots 5 et 4 faits
depuis une session cloud, hors le test UI Xcode du lot 5 (Mac seulement) :
l'app attend une CI verte, `dist-app/` est relu pour l'accessibilité, et
`docs/budgets.md` borne la taille des composants, les `POUR_APP` et le poids
d'`/examen`. Restent les lots 1, 2, 3 et 6, qui exigent le simulateur.
L'architecture de la couche app est dans `docs/app-ios.md`.

## Comment on travaille

Une branche par session, jamais de travail sur `main`. Sur le Mac, un worktree
par session, `npm ci` dedans (un `node_modules` en lien symbolique construit
faux), et `git branch --show-current` avant tout commit : deux sessions sur un
même checkout se basculent la branche. Pas de Prettier au dépôt. TDD sur ce qui
a un test possible.

Tout changement visible dans l'app réécrit `ios/a-tester.txt` et, s'il se voit,
`ios/nouveautes.txt`. Ce qui ne vaut que pour l'app passe par le greffon
`siteSansApp()` d'`astro.config.mjs`, et se mesure au diff de `dist/` contre
`main` et à `npm run poids`.

**Historique réécrit le 3 octobre** : tout clone, stash ou branche plus ancien
porte des adresses personnelles. Ne jamais le fusionner ni le pousser. Git signe
en noreply.

## La banque

**Les familles.** Deux membres d'une même famille ne tombent jamais dans le même
examen blanc. Une famille réunit ce qui **se renseigne** (énoncé identique, même
bonne réponse, réponse de l'une en distracteur de l'autre) ; une tournure
partagée ne suffit pas. `npm run doublons` rend les candidates, la CI refuse le
reste.

**La profondeur.** `couverture.py --profondeur` dit combien d'examens blancs un
thème tient avant de tout resservir : c'est ce qui décide où écrire. Écrire fait
monter la médiane : viser l'écart, pas le zéro. `vhf` est épuisé dans ses
sources.

- **Un doublon se cherche par règle citée, jamais par notion** : comparer à la
  banque sur l'énoncé **et** sur le texte de la bonne réponse ; « 2 milles » et
  « 1 mille » se ressemblent pour rien.
- `verifier_conversion.py` connaît **cinq gestes** (conversion, relecture en
  bloc, resourcement, rééquilibrage, illustration) et refuse de les mêler ; hors
  relecture, une question touchée redescend en `relu_par: claude`. **Une
  retouche d'explication n'en est aucun** : il la signale, par construction.
  L'illustration ne bouge que `enonce`, `visuel`, `famille` et `meta` ; retirer
  un visuel n'est aucun geste.
- Deux branches qui bumpent `data/VERSION` prennent le même numéro et fusionnent
  sans bruit : vérifier après tout merge. L'app cherche la banque **par
  version**, et `/banque/v/` est en cache long : tout texte publié qui change
  bumpe la version.
- Une **fiche maison** se reconnaît à sa section « Nature de cette fiche »,
  jamais à son en-tête. Il y en a sept : `aism-mbs`, météo, carte, carburant,
  VHF, conduite d'urgence, ski nautique. Le balisage a sa source officielle.
- La division 219 exclut la plaisance (art. 219-01) : mauvais droit. La VHF se
  source sur l'arrêté du 18 mai 2005 art. 1er, la division 240 art. 240-2.04 à
  -2.06, -2.20 et -3.03, et l'annexe IV du RIPAM. Une leçon du modèle affirme
  au-delà de ses sources : relire par sources.
- Un visuel dont dépend la réponse se vérifie contre le texte : article d'abord.
  Pondération par thème non publiée : part entière à chaque thème, reste au sort.
- Un `alt` dans un YAML : pas de « : » suivi d'une espace, guillemets doubles
  sur une ligne, et **il décrit ce qu'on voit, jamais la règle** (sinon c'est la
  réponse).
- Les noms des SVG de `/visuels/navires/` disent la réponse, comme
  `feux/chalut.svg`. Le test de `navires.py` exige chaque situation du YAML dans
  ses tables attendues : une situation ajoutée sans sa ligne de test est rouge.
- Les rythmes de feux **abrègent la pause entre groupes**, et les sons taisent
  l'intervalle : le nombre d'éclats est exact, la période non. Aucune question
  de durée ne part d'une image.
- Le son prolongé isolé est le signal du coude (34 e) **et** du navire ayant de
  l'erre (35 a) : une question sans contexte est fausse.
- Rose des vents de `carte.py` : écart vrai/magnétique **ouvert à quinze
  degrés**.

## Pièges de code

- **L'écran de jeu est en morceaux** : `Quiz.tsx` tient la session,
  `src/components/quiz/` les écrans, `quiz/effets.ts` les effets, appelés
  dans l'ordre d'origine (React lance les effets dans l'ordre de leur
  déclaration). Recopier un texte de composant à la main perd ses espaces
  insécables : `Quiz.test.tsx` les attend avant « : ».
- **La couleur ne suffit jamais à dire une bonne réponse** : `/question/[id]`
  l'écrit sous un titre « Réponse », l'accueil la nomme. Un cadre vert seul viole
  WCAG 1.4.1.
- **La lettre affichée n'est pas l'identifiant du YAML** : `melange.ts` mélange
  par session, le clavier suit la lettre affichée, et `/question/[id]` garde
  l'ordre du fichier puisqu'il montre déjà la réponse.
- **Le jour est parisien**, `src/lib/jour.ts` : aucune date ne se lit ailleurs
  que par ce module (`toISOString()` rendait la veille entre minuit et 1 h).
- Le chrono est une horloge murale (`echeance` en ms) : l'intervalle d'un onglet
  caché est étranglé, celui d'une app suspendue gèle. Il bat dans l'en-tête
  (`quiz/Chrono.tsx`) et n'envoie `echu` qu'à l'échéance : un `tic` par
  seconde au réducteur refaisait tout l'écran. Deux onglets partagent un
  `enCours`, et **un examen laissé ouvert avance tout seul** : 20 s par question.
- **Astro empaquette CSS et îlots de tout composant importé, rendu ou non** :
  d'où `siteSansApp()`. `astro preview` sert l'ancien build par son service
  worker, le désinscrire. Un `{POUR_APP ? … : …}` en milieu de phrase mange une
  espace à la compression : brancher des paragraphes.
- **Un module Astro est différé, il part après la peinture** : ce qui doit
  changer avant passe par un script en ligne empaqueté au build
  (`virtual:bande-avant-rendu`, esbuild). CLS et images se mesurent en Chromium
  headless par CDP.
- Le site est en format `file` (la coquille en `directory`) : avec
  `trailingSlash: never`, un dossier ferait rediriger /examen à chaque
  navigation. D'où `cheminServi()` dans `seo.ts` : une canonique qui désigne
  ailleurs perd l'indexation.
- Chaque page de guide porte son propre `FAQPage`, l'accueil non ; `audit:seo`
  ne le voit pas.
- **Cloudflare additionne les valeurs de `_headers`** qui matchent, la première
  gagne : les motifs porteurs de durée ne se recouvrent jamais (d'où
  `/banque/v/`), et **`/_astro/*` porte sa propre règle**. Se mesure au
  `curl -sI`, jamais en lisant le fichier.
- Le Worker de `src/worker.ts` passe **derrière** les actifs, sans
  `run_worker_first` : un fichier à `dist/api/signaler` masquerait l'endpoint
  sans bruit. Il ne traite que `POST /api/signaler`. `functions/api/` est inerte.
  `workers_dev = false`, sinon `deploy` rouvre la préversion. Après tout
  déploiement, `POST {}` doit rendre 400.
- **Les 108 SVG de `/visuels/` restent au précache** : les en sortir rendrait
  `/examen` injouable hors ligne.
- `@vitejs/plugin-react` figé en v4, la v5 casse le dev d'Astro 5. `affichable.ts`
  et son test croisent leurs clés avec le schéma, qui importe `astro/zod`.
- Le détecteur impeccable lève un `useState of null` fantôme sur le serveur de
  dev : le lancer sur `astro preview` du build.

## La coquille iOS (Mac seulement)

- **Chaque onglet Capacitor est sa propre webview, chargée une fois** : sur
  `app:onglet`, si `localStorage` a bougé, la racine reçoit `app:progression` et
  ses îlots se relisent (`surProgressionChangee`, `vivant.ts`) ; **plus de
  `location.reload()`**. Tout îlot de racine d'onglet qui lit la progression doit
  s'y rattacher. L'écran qui arrive monte en fondu de 140 ms, sans glissement :
  sous Safari 16-17 Astro joue l'ancien écran puis le nouveau, l'un après l'autre.
  La mesure se refait par `docs/captures-fluidite/mesure.mjs`. Un greffon rendu par
  une fonction `async` est pris pour une promesse et attend sans fin. `rem` ne
  suit pas Dynamic Type : `font: -apple-system-body`.
- **Un îlot qui importe `natif`** fait naître sur le site un morceau de fonctions
  vides : les écrans annoncent (`annoncerDateExamen`, `progression.ts`),
  `Coquille.astro` écoute.
- **Cible iOS 16.0** (iPhone 8 et après) : rien au-dessus de Safari 16.0 sans
  repli, `elaguer-app.mjs` refuse le JavaScript plus récent. Le
  greffon `Ecran` garde un chemin d'avant iOS 18 (`basculerAvantIOS18`).
- Rappels au simulateur : la preuve est
  `data/Library/UserNotifications/<uuid>/PendingNotifications.plist` (`plutil -p`),
  `log show` ne garde rien.
- Version rejetée par Apple = TestFlight seul, resoumettre à la main. État de
  l'app : `docs/app-ios.md`.

## Commandes

```bash
npm run dev | build | test       # dev ; valide puis construit ; Vitest
npm run build:app                # dist-app/ pour la coquille, puis npx cap sync ios
npm run audit:seo | poids        # relit dist/ ; poids -- --reference <dist de main>
npm run valider                  # YAML publiés, --inbox pour les brouillons
npm run doublons                 # redites candidates ; --verifier en CI
npm run credits | partage | feux | balisage | navires | ecluses | carte   # --verifier en CI
.venv/bin/python -m pytest tests -q          # validateur et générateurs
.venv/bin/python scripts/couverture.py       # notions ; --profondeur dit où écrire
python3 scripts/convertir.py <f> --retirer c,d   # ou --lot <fichier de lot>
python3 scripts/verifier_conversion.py --ref main   # garde-fou des conversions
```

`npm run verifier:prod` interroge le site en ligne : utile, mais hors gate.

## Architecture

Le README tient l'arborescence. Ce qui ne s'y lit pas :

```
data/sources/decret-77-733/   les 38 règles du RIPAM, tirées du PDF de _brut/
data/sources/                 19 dossiers ; les `fiche-*` sont écrites à la main
data/visuels/navires.yaml     les situations que dessine scripts/navires.py
src/lib/                      seo, guide, affichable (la banque servie en JSON),
                              cible et natif pour la coquille, jour, melange
src/pages/banque/v/           la banque par version, `<version>.json` seul
src/pages/source/             les sept fiches maison publiées, et leur sommaire
src/worker.ts                 le Worker : POST /api/signaler, le reste aux actifs
ios/App/App/                  coquille : BarreOnglets, EcranWeb, RouteurDuSite,
                              greffons Ecran et Son ; Sons/ en WAV
prompts/question.md           gabarit de génération des questions
docs/prompts/en-cours.md      la passation aux sessions cloud
```
