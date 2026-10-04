---
target: accueil
total_score: 24
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 3
target_identity: "file:/Users/alex-pack/Developer/permis-cotier-impeccable/src/pages/index.astro"
target_fingerprint: "sha256:f24fc6519333c07dfe904194a013eedc9a7879d96b7973afd8cb6a0fd8ddb40e"
target_path: /Users/alex-pack/Developer/permis-cotier-impeccable/src/pages/index.astro
timestamp: 2026-10-04T01-39-59Z
slug: src-pages-index-astro
---
# Critique impeccable, 3 octobre 2026 : L’accueil

Method: dual-agent (A: builder, revue de design · B: routine, détecteur). Skill impeccable 4.5.0,
détecteur 4.0.0, worktree `permis-cotier-impeccable` sur `main` `df4e7ef`, serveur de dev
local, 1280×800 et 390×844, clair et sombre. Cible : `src/pages/index.astro`.

## Scan déterministe (Assessment B)

Statique : zéro constat sur `src/pages/index.astro`. Navigateur, `/` à 1280×800 et 390×844 : un seul constat, `side-tab` `border-bottom: 6px`, la ligne de flottaison, faux positif accepté et documenté dans `.impeccable/config.json`. Le détecteur et la revue se recoupent sur rien d’autre : les constats de la revue (geste premier, deux noms pour un jeu, retour ignoré) sont des constats d’usage que le détecteur ne mesure pas.

Hors cible, aux mêmes passes : `cramped-padding` sur `/cours/balisage/balisage-cardinal`
(4 px à côté d’un texte de 14,4 px) et `script-error` Turnstile 110200 sur `/signaler`,
attendue sur `localhost`. Avisé : dix tirets cadratins dans le corps de `/notion/balisage-cardinal`.

## Revue de design (Assessment A)

# Assessment A, revue de design : l'accueil (`src/pages/index.astro`)

Inspecté sur http://localhost:4361/ dans un onglet à moi : 1280×800 clair sans progression, 390×844 clair puis sombre, puis avec progression (un examen blanc complet joué au clavier, 11/40 recalé, puis le questionnaire de départ rempli avec « Emmener ma famille ou mes amis en mer »), à 1280 et 390. Sources lues : `index.astro`, `accueil-site.ts`, `profil.ts` (`rappel`, `PALIERS`). `src/lib/accueil.ts` ne sert que l'app : rien de ce module n'est rendu sur le site.

## 1. Verdict de spécificité

**Le contenu est écrit pour ce produit ; le squelette ne l'est qu'à moitié.**

Ce qui ne pourrait appartenir à personne d'autre : la question montrée en preuve (le visuel des deux étraves, la règle 14 a), l'étiquette « Source » sous l'explication), la phrase « la durée n'est pas dans l'arrêté, elle vient des opérateurs agréés », la bande marine et sa ligne de flottaison jaune, les boutons à bord plein. La voix tient : tutoiement, phrases courtes, aucun superlatif.

Ce qui est interchangeable : la composition du premier écran est le gabarit SaaS par défaut, texte à gauche, deux boutons côte à côte, panneau de deux grands chiffres à droite (« 622 », « 105 »). Changez les mots et c'est une page d'outil de comptabilité. Juste dessous, « Le cours apprend, l'entraînement corrige, l'examen blanc mesure » est la rangée de trois fonctionnalités (titre, pastille, paragraphe, trois fois) que DESIGN.md refuse sous le nom de grille de cartes identiques ; retirer le cadre ne change pas le motif. L'objet le plus fort du site, une vraie question avec sa source, est relégué en troisième section, à 1 900 px du haut sur mobile, et il est **figé** : la bonne réponse est déjà donnée, le candidat ne peut pas jouer.

## 2. Les dix heuristiques

| # | Heuristique | Note | Constat clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 2 | Après un examen blanc recalé 11/40, le premier écran est identique au pixel près. Le score n'apparaît nulle part sur l'accueil ; l'état (« indice de préparation 14 sur 100… 29 questions à revoir ») est à 2 435 px sur desktop, 3 816 px sur mobile, sous un titre qui parle de vie privée. |
| 2 | Langage du monde réel | 3 | Langue simple, tutoiement. Mais « test gratuit » et « examen blanc » nomment la même chose comme deux offres ; « indice de préparation », « série du jour » arrivent sans définition ; la dernière section aligne RIPAM, division 240. |
| 3 | Contrôle et liberté | 3 | Rien n'enferme : questionnaire facultatif, date effaçable, « tout se relit ou s'efface depuis ta fiche ». La phrase de date passée renvoie aux « réglages » alors que le champ est sous les yeux. |
| 4 | Cohérence et standards | 2 | « Ma fiche » dans l'en-tête, « ta fiche » et « Ta fiche » dans la page. « Passer un examen blanc » et « Fais le test gratuit » mènent au même jeu par deux chemins. Apostrophes droites dans la question montrée (« L'autre navire ») contre apostrophes courbes partout ailleurs. |
| 5 | Prévention des erreurs | 3 | Peu de saisie, champ date natif. Une promesse fausse : « le bouton de signalement est juste dessous » ; aucun bouton dessous sur l'accueil. |
| 6 | Reconnaissance plutôt que rappel | 3 | Toutes les entrées sont visibles et nommées. Le candidat qui revient doit se souvenir de son score : l'accueil ne le lui redit pas. |
| 7 | Flexibilité et efficacité | n/a | Surface de persuasion : un seul passage, pas d'usage expert à accélérer (le raccourci « / » de la recherche existe, hors périmètre). |
| 8 | Esthétique et minimalisme | 2 | Six issues dans la bande d'ouverture, dix sections, 5 500 px sur desktop. La rangée des trois modes redit le paragraphe d'ouverture presque mot pour mot ; la liste des quatorze cours et les cinq questions du guide sont des pages entières posées sur l'accueil. |
| 9 | Diagnostic et récupération | 3 | La seule erreur possible (date passée) est dite en clair avec la marche à suivre ; la marche indique le mauvais endroit (voir 3). |
| 10 | Aide et documentation | 3 | Le guide, « Comment ces questions sont écrites », « Ce que ce site est, et ce qu'il n'est pas » répondent aux vraies questions d'avant l'inscription, avec l'article. Rien de contextuel sur « indice de préparation ». |
| **Total** | | **24/36** | **Acceptable (67 %)** |

## 3. Charge cognitive

| Case | Résultat |
|---|---|
| Focalisation unique | **Échec.** Deux boutons plus trois liens dans la bande d'ouverture, sans dire lequel prendre quand on ne sait rien. |
| Découpage (≤ 4 par groupe) | Passe, de justesse : le paragraphe d'ouverture enchaîne trois modes, quarante, cinq, gratuit, sans compte, article en 75 mots. |
| Regroupement | Passe. |
| Hiérarchie visuelle | Passe : le titre et le bouton jaune dominent. Mais le jaune désigne le cours, pas l'examen. |
| Une chose à la fois | **Échec.** L'ouverture demande de choisir entre cours, examen, test, entraînement et plan avant d'avoir rien vu. |
| Choix minimaux (≤ 4) | **Échec.** Six options dans la bande (voir ci-dessous). |
| Mémoire de travail | Passe pour le nouveau venu ; échoue pour qui revient d'un examen recalé (le résultat n'est pas redit). |
| Divulgation progressive | **Échec.** Les quatorze cours, les cinq réponses du guide, la nuance juridique des vingt secondes sont tous dépliés sur l'accueil. |

**Quatre échecs : charge élevée.**

Points de décision à plus de quatre options :
- La bande d'ouverture : « Commencer le cours », « Passer un examen blanc », « Fais le test gratuit du permis côtier », « Entraîne-toi thème par thème », « regarde le plan du cours », plus « Comment ces questions sont écrites » dans le panneau. Six.
- L'en-tête : Rechercher, Cours, Entraînement, Examen blanc, Programme, Guide, Ma fiche. Sept, dont trois hors écran à 390 px.
- « Les quatorze cours » : quatorze liens (liste de navigation, acceptable si elle quitte l'accueil).

## 4. Parcours émotionnel

- **Entrée** : la promesse est sérieuse et calme, sans accroche. Rassurant pour un adulte qui prépare un titre. Mais le « Gratuit, sans compte » qui lève la première inquiétude est à la huitième ligne du paragraphe à 390 px, dans la même couleur adoucie que le reste.
- **Pic** : la question montrée avec sa source. C'est le seul moment où l'accueil prouve au lieu d'affirmer. Il est passif : la bonne réponse est déjà en vert, l'occasion de faire sentir le jeu est perdue.
- **Creux** : le retour après un examen recalé. 11/40, vingt-neuf erreurs, et l'accueil dit « Commencer le cours » comme si de rien n'était. Le rappel de la raison (« Tu passes ce permis pour « Emmener les tiens en mer… » ») existe, mais à cinq écrans de défilement, collé à une ligne de statistiques qui commence par une minuscule.
- **Réassurance aux moments à enjeu** : bonne sur la vie privée (section dédiée, note sous la date). Absente au moment de l'échec.
- **Fin** : « Ce que ce site est, et ce qu'il n'est pas », honnête et juste ; elle se termine sur une promesse qui ne se vérifie pas sur la page (le bouton « juste dessous »).

## 5. Forces

1. **La question montrée en preuve.** Une vraie question de la banque, son visuel dessiné, la bonne réponse dite en toutes lettres (« bonne réponse », pas seulement la couleur), l'explication, puis « Source RIPAM, règle 14 a) ». C'est le positionnement du produit rendu visible, sans adjectif.
2. **La voix et l'honnêteté.** « La durée n'est pas dans l'arrêté, elle vient des opérateurs agréés » ; « Il n'est ni officiel, ni agréé » ; « Gardée dans ce navigateur, rien n'est envoyé ». Aucun site concurrent ne dit ce qu'il ne sait pas ; celui-ci le fait sur sa page la plus vue.
3. **La bande d'ouverture tient en sombre comme en clair**, et la ligne de flottaison jaune est un vrai signe propre, employé une seule fois comme DESIGN.md le prévoit. Les boutons à bord plein se lisent comme des boutons du premier coup d'œil.

## 6. Problèmes prioritaires

**[P1] L'examen blanc n'est pas le geste premier, et « sans compte » n'est pas visible.**
- *Quoi* : le bouton jaune dit « Commencer le cours » ; « Passer un examen blanc » est le bouton blanc secondaire. Le titre « Révise le permis côtier au format de l'épreuve. » ne nomme ni l'examen blanc ni la gratuité. « Gratuit, sans compte » est enfoui à la fin d'un paragraphe de 75 mots.
- *Pourquoi* : le candidat qui arrive d'une recherche « test permis côtier » (le titre de la page lui-même dit « test gratuit ») veut se mesurer maintenant. On lui propose d'abord 105 leçons. Sur la page `/examen`, un nouveau venu lit ensuite « Commence plutôt par la première leçon » : le site le renvoie deux fois au cours.
- *Correctif* : décider l'ordre et l'assumer. Si l'examen est la porte : bouton jaune « Passer un examen blanc », dessous en une ligne « 40 questions, 20 secondes chacune. Gratuit, sans compte. » en graisse 600, le cours en bouton secondaire. Ramener le paragraphe d'ouverture à deux phrases.
- *Commande* : `/impeccable clarify` puis `/impeccable distill`.

**[P1] Deux noms pour un seul jeu : « Passer un examen blanc » et « Fais le test gratuit du permis côtier ».**
- *Quoi* : la question « Tu veux simplement te situer ? » présente le test comme une autre offre, plus légère. Le lien mène à `/test-permis-cotier`, page qui décrit le même examen de quarante questions puis renvoie à `/examen`.
- *Pourquoi* : Jordan lit au pied de la lettre. Il croit qu'il existe un test court distinct de l'examen blanc, le choisit, et tombe sur une page intermédiaire qui lui redemande de cliquer pour obtenir exactement ce que le bouton blanc lui offrait. Un clic et une hésitation de plus sur le parcours principal.
- *Correctif* : supprimer la ligne « Tu veux simplement te situer ? » de l'accueil. Garder `/test-permis-cotier` pour le référencement, sans le présenter comme un choix.
- *Commande* : `/impeccable distill`.

**[P1] L'accueil ignore le candidat qui revient.**
- *Quoi* : après un examen blanc recalé 11/40, la bande d'ouverture ne change pas. L'état du candidat est rendu dans `[data-reprise]`, sous « Sans compte, et rien qui sorte de ton navigateur », à 2 435 px (desktop) et 3 816 px (390 px), en corps 0,95 rem. Le dernier examen n'y figure pas du tout ; seules les 29 questions à revoir apparaissent, au milieu d'une phrase.
- *Pourquoi* : c'est la deuxième visite qui fait un utilisateur. Un candidat qui vient de rater doit voir en arrivant ce qu'il a fait et quoi faire maintenant (« Revoir tes 29 erreurs »), pas une page de vente qu'il a déjà lue.
- *Correctif* : quand `etat.examens` ou `etat.questions` n'est pas vide, remplacer les liens secondaires de la bande par une ligne d'état et un geste : « Dernier examen blanc : 11 sur 40, hier. » puis le bouton jaune « Revoir tes 29 erreurs » (vers `/revoir`), l'examen en secondaire. Le bloc du bas peut rester pour la date.
- *Commande* : `/impeccable onboard` (états de retour), puis `/impeccable layout`.

**[P2] La ligne d'état commence par une minuscule, et le rappel de la raison flotte hors de son moment.**
- *Quoi* : sans prénom, `monterReprise` rend « indice de préparation 14 sur 100, tu démarres. » (minuscule en tête de phrase). Le rappel « Tu passes ce permis pour « Emmener les tiens en mer, avec toi à la barre. » » s'affiche en gras à chaque visite dès que le questionnaire est rempli, que le dernier examen soit reçu, recalé ou absent, alors que PRODUCT.md le destine au moment où un examen est recalé.
- *Pourquoi* : affiché tout le temps, sous un titre de vie privée, le rappel devient du décor et perd la force qu'il aura le jour où il faudra. La minuscule fait cassé.
- *Correctif* : capitaliser la ligne quand il n'y a pas de prénom (« Indice de préparation… »). N'afficher le rappel sur l'accueil que si `etat.examens[0]` est recalé, et alors dans la bande d'ouverture, à côté du score : « 11 sur 40. Tu passes ce permis pour emmener les tiens en mer. Revois tes 29 erreurs. »
- *Commande* : `/impeccable clarify`.

**[P2] Une rangée de trois fonctionnalités qui répète l'ouverture, et une preuve figée trop bas.**
- *Quoi* : la section « Le cours apprend, l'entraînement corrige, l'examen blanc mesure » (trois colonnes titre, pastille, paragraphe) reprend le paragraphe d'ouverture, puis son chapo dit « Rien n'oblige à les prendre dans cet ordre » juste après un titre qui pose un ordre. La question montrée vient après, avec sa bonne réponse déjà en vert.
- *Pourquoi* : c'est le motif refusé par DESIGN.md (grille identique), et il retarde de 900 px l'objet qui convainc. Une question qu'on ne peut pas tenter ne fait pas sentir le format.
- *Correctif* : supprimer la rangée ; remonter la question juste sous la bande ; la rendre jouable (quatre propositions cliquables, la correction, la source qui apparaît au verdict) avec en dessous « Il y en a 39 autres comme celle-ci : passer un examen blanc ».
- *Commande* : `/impeccable layout` puis `/impeccable delight`.

## 7. Personas

**Jordan, premier venu**
- Lit « Révise le permis côtier au format de l'épreuve. » : ne sait pas ce qu'est « le format de l'épreuve ».
- Voit deux boutons, le jaune dit « Commencer le cours ». Comme il prend le plus visible au pied de la lettre, il part dans une leçon de trois minutes alors qu'il voulait savoir où il en est.
- S'il hésite, « Tu veux simplement te situer ? Fais le test gratuit » lui laisse croire à un troisième produit ; il tombe sur `/test-permis-cotier`, une page de plus avant le jeu.
- Arrivé sur `/examen`, il lit « Tu n'as encore rien révisé… Commence plutôt par la première leçon » : il doute d'avoir le droit de passer l'examen.
- « Première fois ici ? Dis en trente secondes pourquoi tu passes le permis : le site se règle à ta main » : il ne sait pas ce qui se règle. En réalité, seul le rappel change.

**Casey, mobile distrait (390×844)**
- Premier écran : en-tête de deux lignes (130 px), titre, paragraphe de neuf lignes, puis les deux boutons à 522 et 587 px. Ils sont dans la zone du pouce, c'est bien. Le panneau « 622 / 105 » n'arrive qu'à 819 px, hors écran : sans effet.
- La navigation défile horizontalement sans indice : « Programme » est coupé, « Guide » et « Ma fiche » invisibles. Casey qui revient ne trouve pas sa fiche.
- Interrompu puis de retour : l'accueil ne lui dit rien de ce qu'il faisait. Son état est à 3 816 px, quatre écrans et demi de défilement.
- Dans la question montrée, l'étiquette « bonne réponse » écrase le texte des propositions A et B sur quatre lignes à 390 px (« L'autre navire / vient sur / tribord de son / côté. »).

**Riley, testeur**
- « Le bouton de signalement est juste dessous » (section « Ce que ce site est ») : aucun bouton dessous sur l'accueil ; le pied de page dit lui-même « sur chaque question ».
- Sans prénom, la ligne d'état commence par une minuscule.
- Après l'examen, « Aujourd'hui 20 questions sur 20 » : 40 questions jouées, l'objectif est plafonné sans le dire et sans rien célébrer.
- Le panneau annonce « 622 questions publiées » ; le pied de page précise que 110 ne sont relues que par le modèle. Les deux sont vrais, mais seul le second est honnête sur la nature des 622.
- Le questionnaire de départ n'est proposé sur l'accueil que si rien n'a été fait (`rien && !profilRempli`). Un candidat qui commence par un examen ne verra jamais l'invitation ; le rappel ne pourra donc jamais lui servir.
- Date passée : « Tu peux effacer la date dans les réglages », alors que le champ est juste au-dessus et s'efface en place.

## 8. Observations mineures

- L'étiquette « SOURCE » en capitales espacées est le seul label en capitales de la page ; la charte maison les proscrit. Graisse 800 sans capitales suffirait.
- Apostrophes droites dans les propositions et l'explication de la question montrée (texte du YAML), courbes partout ailleurs.
- Les deux grands chiffres du panneau forment une rangée de stats déguisée ; « 105 leçons écrites depuis les textes, pas depuis un manuel » est la seule phrase qui leur donne un sens.
- « Les quatorze cours » et « Ce qu'on se demande avant de s'inscrire » sont des listes complètes déjà servies par `/cours` et `/guide` : elles pèsent sur l'accueil pour le référencement plus que pour le candidat.
- La ligne d'état n'a ni titre ni repère : un lecteur d'écran la rencontre sous « Sans compte, et rien qui sorte de ton navigateur », titre sans rapport.
- `.reprise` en 0,95 rem sur desktop, à côté d'un encadré de date en corps normal : la phrase qui compte le plus pour qui revient est la plus petite du bloc.
- En sombre, la bande et le fond de page sont proches ; la ligne jaune fait seule la séparation. Ça tient.

## 9. Questions provocantes

1. Si la porte d'entrée était une seule question jouable, dans la bande, au lieu de deux boutons et trois liens, combien de candidats iraient jusqu'à la quarantième ?
2. L'accueil doit-il rester une page de vente pour qui a déjà joué quarante questions, ou devenir son tableau de bord dès la deuxième visite ?
3. Le cours d'abord, c'est l'ordre pédagogique d'Alexis ; est-ce l'ordre du candidat qui a cherché « test permis côtier » ?

## 10. Annexe pour les lots suivants

### (a) Chaînes à réécrire

| Où | Texte actuel | Pourquoi |
|---|---|---|
| Bouton principal de la bande | « Commencer le cours » | Désigne le cours comme geste premier ; à revoir selon l'ordre décidé (examen d'abord). |
| H1 | « Révise le permis côtier au format de l'épreuve. » | « Format de l'épreuve » est abstrait pour un nouveau venu ; ne dit ni examen blanc ni gratuit. |
| Paragraphe d'ouverture | « Le cours d'abord, 105 leçons de trois minutes. L'entraînement ensuite, […] Gratuit, sans compte, et chaque réponse cite l'article dont elle sort. » | 75 mots, trois modes, « sans compte » en huitième ligne à 390 px. Deux phrases suffisent. |
| Lien de la bande | « Tu veux simplement te situer ? Fais le test gratuit du permis côtier. » | Même jeu que « Passer un examen blanc » sous un autre nom. À supprimer. |
| Lien de la bande | « Déjà en bateau-école ? Entraîne-toi thème par thème, sans chrono, ou regarde le plan du cours. » | Deux issues de plus dans un point de décision déjà à six. |
| Panneau | « questions publiées, et les quatorze thèmes du programme couverts » | Long sous un grand chiffre ; « publiées » ne dit pas « relues ». |
| H2 | « Le cours apprend, l'entraînement corrige, l'examen blanc mesure » | Section redondante avec l'ouverture ; son chapo contredit l'ordre que le titre pose. |
| Chapo de la preuve | « C'est la seule chose que ce site fait et que les autres ne font pas. » | Affirmation comparative invérifiable par le candidat ; la source montrée suffit. |
| Étiquette | « SOURCE » (capitales via CSS) | Label en capitales espacées, proscrit par la charte. |
| H2 | « Sans compte, et rien qui sorte de ton navigateur » | Titre sur la vie privée qui coiffe l'état de progression et la date ; le contenu n'y répond pas. |
| Invitation (état vide) | « Première fois ici ? Dis en trente secondes pourquoi tu passes le permis : le site se règle à ta main, et te le rappelle quand ça coince. » | « Se règle à ta main » promet plus que ce qui change ; « quand ça coince » est vague. Proposition : « Dis en trente secondes pourquoi tu passes le permis : on te le rappellera le jour où un examen blanc est raté. » |
| Ligne d'état | « indice de préparation 14 sur 100, tu démarres. » | Minuscule en tête quand il n'y a pas de prénom ; « indice de préparation » sans définition. |
| Ligne d'état | « Aujourd'hui 20 questions sur 20 » | Plafonné sans le dire, objectif atteint sans le dire. « Objectif du jour atteint (20 questions). » |
| Ligne d'état | « Ta fiche. » | Lien orphelin en fin de phrase, et « Ma fiche » dans l'en-tête. Unifier. |
| Rappel | « Tu passes ce permis pour « Emmener les tiens en mer, avec toi à la barre. » » | Majuscule au milieu de la phrase (la motivation commence par une capitale) ; affiché hors du moment de l'échec. |
| Date passée | « C'est passé. Tu peux effacer la date dans les réglages. » | Le champ est sous les yeux. « C'est passé. Efface la date ci-dessus, ou pose la prochaine. » |
| Section finale | « Si une question te paraît fausse, le bouton de signalement est juste dessous » | Faux sur l'accueil. « …le bouton de signalement est sous chaque question. » |
| Lien de la preuve | « parcourir les 622 autres » | 622 est le total : « les 621 autres ». |
| aria-label en-tête | « Permis côtier, accueil » ; « Rechercher » | Corrects, rien à changer. |

### (b) L'état vide, exactement

Sans aucune progression, la bande d'ouverture rend ce que le serveur sert : le bouton jaune « Commencer le cours » (vers la première leçon, « Marques latérales ») et le bouton blanc « Passer un examen blanc », puis deux lignes de liens (« Tu veux simplement te situer ? Fais le test gratuit du permis côtier. » ; « Déjà en bateau-école ? Entraîne-toi thème par thème, sans chrono, ou regarde le plan du cours. »). Aucune différence visible avec un candidat qui a déjà joué.

Le bloc d'état proprement dit, `[data-reprise]`, est à la sixième section (environ 2 400 px sur desktop, 3 800 px à 390 px), sous « Sans compte, et rien qui sorte de ton navigateur ». Il dit : « Première fois ici ? Dis en trente secondes pourquoi tu passes le permis : le site se règle à ta main, et te le rappelle quand ça coince. » Le lien porte sur « Dis en trente secondes pourquoi tu passes le permis » et mène à `/profil/depart` (six écrans, tous facultatifs). À côté, un encadré « Ton examen est quand ? » avec un champ date et « Gardée dans ce navigateur, rien n'est envoyé. »

Gestes offerts : deux, à poids comparable, et l'encadré de la date pèse visuellement plus que le lien du questionnaire. Dans la bande, cinq gestes dont deux boutons de même taille. Il n'y a pas d'état vide conçu comme tel : l'accueil est une page de vente, et l'état vide n'est qu'une phrase en bas de page.

### (c) Les trois questions

1. **Examen blanc tout de suite, sans compte, en trois secondes ?** Non. À 390 px, le bouton « Passer un examen blanc » est visible sans défiler (587 px) mais il est le second, en blanc, sous « Commencer le cours » en jaune, et le titre ne nomme pas l'examen. « Sans compte » est vrai et dit, mais à la huitième ligne du paragraphe, pas au premier regard.
2. **L'état vide** : il dit « Première fois ici ? Dis en trente secondes pourquoi tu passes le permis… » à côté d'un champ « Ton examen est quand ? », au cinquième écran. Il offre deux gestes à poids égal, plus les cinq de la bande qui ne changent jamais : aucun geste unique.
3. **Le rappel de la raison** : oui, il apparaît, mais seulement si le questionnaire a été rempli, en gras sous la ligne d'état, à chaque visite et quel que soit le dernier résultat, à 3 800 px sur mobile. Ainsi placé c'est du bruit ; il aiderait s'il n'apparaissait qu'après un examen recalé, dans la bande, à côté du score et du bouton « Revoir tes erreurs ».
