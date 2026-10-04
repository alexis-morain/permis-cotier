---
target: examen
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/alex-pack/Developer/permis-cotier-impeccable/src/components/Quiz.tsx"
target_fingerprint: "sha256:ecdee3803f99d4231148c2df174e8696c8f65417f9cf07a159e7aabcb29ddeee"
target_path: /Users/alex-pack/Developer/permis-cotier-impeccable/src/components/Quiz.tsx
timestamp: 2026-10-04T01-39-59Z
slug: src-components-quiz-tsx
---
# Critique impeccable, 3 octobre 2026 : L’examen blanc de bout en bout

Method: dual-agent (A: builder, revue de design · B: routine, détecteur). Skill impeccable 4.5.0,
détecteur 4.0.0, worktree `permis-cotier-impeccable` sur `main` `df4e7ef`, serveur de dev
local, 1280×800 et 390×844, clair et sombre. Cible : `src/components/Quiz.tsx`.

## Scan déterministe (Assessment B)

Statique : zéro constat sur `src/components/Quiz.tsx`. Navigateur, `/examen` à 1280×800 et 390×844 : zéro constat (écran de départ ; les états en cours d’examen et le résultat ne se scannent pas par URL). La revue a trouvé seule l’opacité 0,7 des propositions désactivées et le sur-titre « Examen blanc terminé » : deux entorses à DESIGN.md hors de portée du détecteur.

Hors cible, aux mêmes passes : `cramped-padding` sur `/cours/balisage/balisage-cardinal`
(4 px à côté d’un texte de 14,4 px) et `script-error` Turnstile 110200 sur `/signaler`,
attendue sur `localhost`. Avisé : dix tirets cadratins dans le corps de `/notion/balisage-cardinal`.

## Revue de design (Assessment A)

# Assessment A : revue de design, examen blanc de bout en bout

Surface : `/examen` (îlot `src/components/Quiz.tsx`, `quiz.css`), worktree `permis-cotier-impeccable`, serveur http://localhost:4360/. Vu à 1280×800 clair, puis 390×844 clair et sombre. Mode : la surface opère, toutes les heuristiques notées.

## 1. Verdict de spécificité

**Écran de question : écrit pour ce produit.** Le marine et le jaune cardinal, Archivo en largeur 125 % sur le compteur et le chrono, les cartes à bord plein qui s'enfoncent, la jauge jaune qui vire au rouge, le feu de mât dessiné sur fond de nuit (cardinale Sud, chalutier) : rien de cela ne passe tel quel sur une autre appli de quiz. Les libellés aussi sont du métier : « Valider et passer », « l'épreuve en admet 5 », « passées au buzzer », la règle des deux réponses expliquée avant de partir, la note sur l'arrêté de 2007.

**Écran de résultat : la partie la plus interchangeable.** On y trouve un sur-titre gris (« Examen blanc terminé »), un gros nombre, une ligne de verdict, puis une liste de onze thèmes avec une barre verte chacun et trois boutons en bas. C'est le gabarit de n'importe quel résultat de quiz. Le seul élément propre au produit, le rappel de la raison, est collé dans un encadré jaune entre deux blocs génériques. Sur ce produit, le moment de vérité devrait être le plus construit. Ici, il l'est le moins.

## 2. Heuristiques de Nielsen

| # | Heuristique | Note | Constat clé |
|---|---|---|---|
| 1 | Visibilité de l'état | 2 | Compteur, chrono et deux jauges bien lisibles en jeu. Mais la confirmation d'arrêt fait défiler la page : le chrono sort de l'écran et **continue de tourner**. La question 14 est passée sans réponse sous le panneau, et rien ne l'a dit. Le troisième choix au clavier est refusé sans bruit. Le résultat disparaît au rechargement. |
| 2 | Correspondance avec le monde réel | 3 | Tutoiement, phrases courtes, vocabulaire de l'épreuve. Ce qui fuit : « buzzer » (jeu télé), « SMDSM » dans les noms de thèmes, « Recommencer » qui ne dit pas quoi. |
| 3 | Contrôle et liberté | 2 | « Arrêter » est confirmé, et l'examen se reprend après un rechargement : c'est bien. Mais « Continuer l'examen » laisse le focus sur `body` et la page à mi-hauteur. L'écran de reprise ne gèle pas le temps (repris à 11 s). Le résultat et la revue ne survivent pas à un rechargement. |
| 4 | Cohérence et standards | 3 | Le système visuel tient. Écarts : les propositions désactivées passent à `opacity: 0.7`, alors que DESIGN.md dit « Jamais d'opacité ». Le sur-titre « Examen blanc terminé » est le motif que DESIGN.md refuse. Site et app n'ont pas les mêmes libellés (« Revoir les questions » / « Revoir mes erreurs »). |
| 5 | Prévention des erreurs | 2 | Le plafond de deux cases est bien fait. Mais la confirmation d'arrêt fabrique l'erreur qu'elle devait prévenir : hésiter coûte des questions sans le dire. |
| 6 | Reconnaître plutôt que se souvenir | 2 | La revue n'affiche pas ce que le candidat a coché quand c'était une des bonnes réponses. Sur une question double à moitié juste, il voit deux cartes vertes « bonne réponse », le mot « ratée », et doit se rappeler ce qu'il avait fait dix minutes plus tôt. |
| 7 | Souplesse et efficacité | 3 | A à D et Entrée, focus remis sur l'énoncé à chaque question, reprise. Il manque un filtre « mes erreurs seulement » dans la revue du site (l'app l'a) : la revue de quarante questions fait 33 000 px. |
| 8 | Esthétique et minimalisme | 3 | Écran de question net. Le départ empile cinq règles, deux notes, un lien et le bouton. Le résultat empile verdict, temps, rappel et onze lignes avant la moindre action. |
| 9 | Diagnostic et sortie d'erreur | 2 | Le verdict dit « Recalé » et trie les thèmes du plus faible au plus fort, mais aucun thème n'est un lien et aucun bouton ne mène à l'entraînement. Dans la revue, « La leçon qui l'explique » est bien là, mais seulement si on déplie quarante questions. |
| 10 | Aide et documentation | 3 | Départ complet et honnête (format, origine des règles, raccourcis). Une fois en jeu, rien ne rappelle qu'une question peut avoir deux réponses, sauf le message qui s'affiche à la deuxième case cochée. |
| **Total** | | **25/40** | **Acceptable** (bas de bande) |

## 3. Charge cognitive

| Case | Résultat | Constat |
|---|---|---|
| Une seule tâche | Réussie (question) | L'énoncé et les propositions dominent. Mais l'en-tête du site (logo, recherche, six liens de navigation) reste en place pendant les treize minutes de l'épreuve. |
| Découpage (≤4 par groupe) | **Échoue** | Onze lignes de thèmes sur le résultat, cinq règles au départ. |
| Regroupement | Réussie | Règles en carte, verdict en encadré, jauges groupées. |
| Hiérarchie visuelle | **Échoue (résultat)** | Le score est clair. La suite ne l'est pas : le bloc le plus fort après le score est la citation du rappel, et l'action principale est à 1 390 px sur 390×844. |
| Une chose à la fois | Réussie, avec réserve | La confirmation d'arrêt demande de décider pendant qu'un chrono invisible tourne. |
| Peu de choix (≤4) | Réussie | 3 ou 4 propositions, 3 actions au résultat. |
| Mémoire de travail | **Échoue** | La revue oblige à se rappeler sa propre réponse (voir heuristique 6). Sur mobile, l'écran de reprise affiche « Reprendre à la question 11 » sans l'explication, rejetée sous la barre collante (encart à y = 892 px, barre à 707 px). |
| Révélation progressive | Réussie | La revue est repliée derrière un bouton. |

**Trois échecs : charge modérée, à traiter bientôt.**

Points de décision à plus de quatre options :
- **Écran de question** : 3 ou 4 propositions, plus Valider, Arrêter, logo, recherche et six liens de navigation, soit 13 cibles actives pendant une tâche chronométrée. Sur le site, rien ne retient le candidat qui clique sur « Cours » en pleine épreuve.
- **Résultat** : onze thèmes, trois boutons et la navigation. Les thèmes ne sont pas cliquables, ce qui allège les choix mais ferme la seule porte utile.
- **Départ (avec reprise)** : deux boutons, « Retour à l'accueil », le lien de la première leçon et la navigation.

## 4. Parcours émotionnel

1. **Lancement.** Ton sérieux et honnête. L'encart « Tu n'as encore rien révisé. Au premier essai, on tourne autour de 20 sur 40, et il en faut 35. » est le meilleur moment de réassurance du parcours : il prépare à l'échec avant qu'il arrive. Mais à 1280×800, « Commencer l'examen » est à y = 1 101 px, sous la ligne de flottaison, après « Retour à l'accueil ». Le premier geste visible est un lien de sortie.
2. **Question avec visuel.** Tension juste : jauge jaune, chrono en display, feu de nuit très lisible. Sur 390×844, le visuel du chalutier pousse C et D sous la barre collante. Il faut défiler sous le chrono pour lire toutes les réponses, et c'est un creux de stress inutile.
3. **Deux réponses.** Le plafond (C et D grisés, « Deux réponses au maximum ») évite la troisième case. Mais trois des quatre questions doubles tirées ne le disent pas dans l'énoncé. C'est fidèle au format, et ça laisse le candidat dans le doute. Aucune aide n'est prévue pour ce doute en jeu.
4. **Arrêt.** C'est le pic d'anxiété mal tenu. Le panneau rouge remplace la barre, la page défile, le chrono disparaît, et la question change dessous (« Il te reste 27 » devient « Il te reste 26 ») sans un mot. Au moment à enjeu, aucune réassurance : c'est le contraire.
5. **Recalé.** C'est le creux, et c'est aussi la fin de l'expérience, donc la note que le candidat retient (pic-fin). Il lit : verdict rouge, « 2 questions passées au buzzer », puis le rappel, puis dix lignes rouges sur onze, puis « Recommencer » en jaune. Ça finit sur une liste d'échecs et une invitation à refaire la même chose.
6. **Reçu.** Le pic est écrasé. « Reçu. 2 erreurs sur les 5 admises. » s'affiche en vert dans la même mise en page que l'échec. Les thèmes à 5/6 et 6/7 restent peints en rouge, et l'avertissement sur le buzzer s'affiche au-dessus. DESIGN.md promet « un seul moment écrit : le verdict » : celui de la question l'a, celui de l'examen n'a qu'un fondu de 260 ms.

## 5. Forces

1. **Le focus suit l'épreuve.** À chaque nouvelle question, le focus se pose sur le `h2` de l'énoncé, qui commence par un « Question 2 sur 40. » caché aux yeux. Je l'ai vérifié au clavier : Entrée lance l'examen, Tab mène à A avec un anneau marine de 3 px, Espace coche, Maj+Tab puis Entrée sur « Valider et passer » pose le focus sur l'énoncé suivant. Les propositions sont des boutons bascule (`aria-pressed`) avec `aria-keyshortcuts`. Pour un examen chronométré, c'est rare et c'est juste.
2. **L'honnêteté sur le format.** La note sur l'arrêté (« Les vingt secondes et la règle des une ou deux bonnes réponses n'y sont pas »), la précision sur la reprise (« Le commencer à neuf tire quarante autres questions et abandonne celui-là ») et l'examen interrompu qui refuse de juger (« Une note sur un examen entier demande d'aller au bout ») appliquent le principe 4 du produit à la lettre.
3. **Les visuels de feux.** Fond de nuit, halo, mât, alt descriptif (« Deux feux superposés visibles sur tout l'horizon, le supérieur blanc, l'inférieur rouge. »). C'est l'objet appris, dessiné comme on le voit en mer. On est loin d'une illustration de manuel.

## 6. Problèmes prioritaires

**[P1] Le résultat recalé ne dit pas quoi faire ensuite.**
- *Quoi* : trois actions, en bas de page : « Revoir les questions » (secondaire, premier dans le DOM), « Recommencer » (jaune, principal) et « Accueil ». « Recommencer » relance un examen de 40 questions. Les onze thèmes, triés du plus faible au plus fort, ne sont pas des liens. La phrase « elles reviennent en entraînement » ne mène nulle part. Sur 390×844, les boutons commencent à y = 1 390 px, à deux écrans du score.
- *Pourquoi* : à 15/40, refaire un examen ne fait que remesurer le même trou. Le produit promet que le candidat saura « où sont ses trous » : il les voit, et il ne peut pas y aller.
- *Correctif* : sous le verdict, un bouton principal qui mène au travail : « Reprendre Navigation et sécurité (0 sur 3) » vers `/entrainement/<thème le plus faible>`, ou « Revoir mes 25 erreurs » qui déplie la revue filtrée. En secondaire, « Refaire un examen ». Faire de chaque ligne de thème un lien vers son entraînement. Remonter les actions au-dessus de la liste des thèmes.
- *Commande* : `/impeccable clarify`, puis `/impeccable layout`.

**[P1] La revue cache la réponse du candidat quand elle était bonne.**
- *Quoi* : dans `Quiz.tsx`, le badge affiche `bonne ? 'bonne réponse' : 'ta réponse'`. Une case cochée et juste ne porte donc que « bonne réponse ». Exemple vu : Question 1, règle 19 b), A coché, A et D attendus. A et D sont verts, tous les deux « bonne réponse », sous le titre « — ratée ». Rien ne dit que D manquait.
- *Pourquoi* : la règle la plus piégeuse de l'épreuve (« une bonne case seule ne suffit pas ») est justement celle que la revue ne montre pas. Le candidat ne comprend pas son erreur et peut croire à un bug.
- *Correctif* : deux marques indépendantes, « ta réponse » et « bonne réponse », qui peuvent s'afficher ensemble. Sur une bonne case non cochée, « oubliée ». Une ligne sous l'énoncé de chaque question double ratée : « Il fallait deux réponses, tu en as coché une. »
- *Commande* : `/impeccable clarify`.

**[P1] Une question ne tient pas dans un écran de téléphone (principe 3 rompu).**
- *Quoi* : à 390×844, sur la question 14 (feux du chalutier), l'énoncé occupe 221 à 299 px, le visuel 293 à 580 et les propositions 600 à 880. La barre collante commence à 767 : C est coupée, D est invisible. Même sans visuel (question 12), D est coupée. L'en-tête du site prend 110 px. À 1280×800, « Valider et passer » descend à 898 px dès qu'il y a un visuel, et la barre n'est collante que sous 53 rem de large.
- *Pourquoi* : défiler sous un chrono de 20 s coûte des points. Le commentaire du CSS le dit lui-même.
- *Correctif* : pendant `en-cours`, réduire l'en-tête du site à la marque (cacher la rangée de navigation, comme l'app cache ses onglets). Plafonner `.jeu__visuel` à environ 26vh sur téléphone. Resserrer les écarts de `.jeu` à 0,9 rem. Rendre la barre collante aussi quand le bas des propositions dépasse la fenêtre, quelle que soit la largeur.
- *Commande* : `/impeccable adapt`.

**[P1] La confirmation d'arrêt coûte des questions sans le dire, et perd le focus.**
- *Quoi* : à l'ouverture, la page défile à `scrollY` 599 et le chrono sort de l'écran. J'ai attendu 12 s : la question est passée de 14 à 15 sous le panneau, et seule la phrase « Il te reste 26 » a changé. Après « Continuer l'examen », `document.activeElement` est `BODY`, la page reste à `scrollY` 388 et l'énoncé n'est plus visible.
- *Pourquoi* : le moment où le candidat hésite est celui où il perd une question en silence. Pour un utilisateur de lecteur d'écran, « Continuer » le renvoie au début du document.
- *Correctif* : mettre le temps restant dans le panneau (« Le chrono tourne : 9 s sur cette question »). Au retour, poser le focus sur l'énoncé et le faire défiler en vue. Si la question change pendant la confirmation, l'écrire dans le panneau (« La question 14 est passée sans réponse »). Garder le choix de ne pas mettre en pause : il est juste.
- *Commande* : `/impeccable harden`.

**[P2] Le rappel de la raison casse la phrase et prend la place de l'action.**
- *Quoi* : l'amorce fixe « Tu passes ce permis pour » est suivie d'une citation qui commence par une capitale et finit par un point : « Tu passes ce permis pour « Ton bateau à toi, et la mer devant. » ». Avec six motivations sur neuf, la phrase ne se tient plus : « pour « Ce permis, c'est ton travail qui l'attend. » », « pour « Le hauturier vient après. Celui-ci d'abord. » », « pour « Tu t'es lancé ce défi. Il tient toujours. » ». En display 125 % graisse 800, c'est l'élément le plus fort de l'écran après le score.
- *Pourquoi* : c'est le moment le plus fragile du parcours, et la phrase qui doit relever le candidat se lit comme un gabarit mal rempli. La phrase utile qui suit n'a pas de lien.
- *Correctif* : réécrire les neuf rappels pour qu'ils complètent « pour » (« emmener les tiens en mer, toi à la barre »), ou supprimer l'amorce et garder la phrase seule. Lier la consigne à l'action (« Tes 25 erreurs t'attendent dans la série du jour » vers `/revoir`). Réduire le corps à 600 en largeur 100 %, pour que le bouton redevienne l'élément le plus fort.
- *Commande* : `/impeccable clarify`, puis `/impeccable quieter`.

## 7. Personas

**Jordan (premier venu)**
- Départ à 1280×800 : il voit le titre, l'encart novice et quatre règles. Le bouton « Commencer l'examen » est à y = 1 101 px, sous « Retour à l'accueil ». Jordan lit tout et descend jusqu'au lien de sortie avant de trouver le bouton.
- En jeu, rien ne lui dit qu'une question peut avoir deux réponses. Sur `securite-0024` (« quels navires la division 240 dispense-t-elle… »), le pluriel est le seul indice. La règle n'apparaît que sur l'écran de départ, qu'il a déjà oublié.
- Au résultat, « 2 questions passées au buzzer » parle le langage d'un jeu télé, et « VHF et SMDSM » n'est jamais expliqué. Le bouton jaune « Recommencer » le renvoie à 40 questions. Il recommence, refait 15, et abandonne.
- Dans la revue, il voit sa question « ratée » avec deux cartes vertes et ne comprend pas pourquoi.

**Sam (lecteur d'écran, clavier seul)**
- *Ce qui marche* : Entrée lance l'examen. Le focus se pose sur l'énoncé, annoncé « Question 1 sur 40. … ». Tab mène à A, avec un anneau de 3 px visible. Espace bascule (`aria-pressed`). Maj+Tab puis Entrée sur « Valider et passer » pose le focus sur l'énoncé suivant. A à D cochent la lettre affichée.
- *Lettre muette* : `.proposition__lettre` est `aria-hidden`. Sam entend le texte de la proposition, jamais « A », alors que l'écran de départ lui apprend à taper A à D. Seul `aria-keyshortcuts` fait le lien, et peu de lecteurs l'annoncent.
- *Chrono muet* : `.jeu__chrono` a `aria-live="off"`. Aucune alerte à 5 s, aucune annonce « temps écoulé ». La question change, le focus saute sur l'énoncé suivant, et Sam ne sait pas si sa réponse a été prise. Pour une épreuve qui doit rester minutée, une seule annonce polie à 5 s suffirait.
- *Troisième case* : après deux cases, C et D deviennent `disabled`. Elles sortent de l'ordre de tabulation, et le message « Deux réponses au maximum. Décoche pour en changer. » n'est pas une région live. Sam ne peut plus atteindre C au Tab, et n'entend pas pourquoi.
- *Arrêt* : le focus va bien sur « Continuer l'examen », dans un groupe nommé « Arrêter l'examen ». Mais après « Continuer », il tombe sur `body`.
- *Résultat* : le focus reste sur `body`. Le verdict « Recalé. … » n'est ni un titre ni un `role="status"`, et le seul `h1` est caché (« Examen blanc, résultat »). Sam doit chercher son score. Le seul `role="status"` de la page est celui de la recherche du site, vide.
- *Revue* : sur le site, le bouton « Revoir les questions » n'a pas d'`aria-expanded`, contrairement à l'app. Une fois dépliée, la revue empile 40 `h2` à la suite.

**Casey (mobile, distrait)**
- *Question* : sur 390×844, C et D sont sous la barre collante dès qu'il y a un visuel. Casey valide sans avoir vu D.
- *Pouce* : « Valider et passer » et « Arrêter » sont dans la zone du pouce, c'est bien. Mais « Arrêter » est un lien de 0,85 rem collé au bouton jaune, et un pouce qui vise trop à droite ouvre le panneau rouge.
- *Interruption* : quand Casey quitte l'onglet, l'examen avance seul de 20 s par question. Au retour (j'ai rechargé), l'écran de reprise dit « arrêté à la question 11 », mais le temps a continué pendant cet écran : la question reprend à 11 s. Rien ne dit combien de questions sont passées en son absence.
- *Résultat* : un rechargement, une rotation ou un onglet tué renvoie sur l'écran de départ. Le score et la revue sont perdus. Seul l'historique en garde la note.
- *Visibilité* : sur le résultat, le bouton jaune est à deux écrans et demi du score.

## 8. Observations mineures

- Propositions désactivées à `opacity: 0.7` (`quiz.css`, règle `.proposition:disabled:not(...)`), contre la règle de DESIGN.md.
- Ponctuation orpheline à 390 px : « Arrêter l'examen maintenant » puis « ? » seul à la ligne, et « l'épreuve en admet » puis « 5. » seul. Il faut une espace fine insécable (U+202F) avant « ? » et une insécable avant le nombre.
- Tiret cadratin dans la revue : « Question 1 sur 40, Navigation et sécurité — ratée ». La charte n'en veut aucun.
- « Examen blanc terminé » au-dessus du score est un sur-titre, motif que DESIGN.md refuse.
- L'aide clavier (« Au clavier : A, B, C, D… ») s'affiche sur le site mobile, où elle ne sert à rien. Il suffirait de la conditionner à `@media (hover: hover) and (pointer: fine)`.
- Sur le résultat d'un examen réussi, 5/6 et 6/7 sont peints en `--rouge-texte` (`parTheme__note--faible` dès la première erreur). Un reçu se lit en rouge.
- Pour l'examen interrompu, le score « 1 / 3 » s'affiche à 6 rem, juste au-dessus de la phrase « Une note sur un examen entier demande d'aller au bout ». Le gros chiffre contredit la phrase.
- « Ton examen d'avant : 14 sur 40. 1 de plus aujourd'hui. » : les deux examens datent du même jour. Écrire « que la dernière fois ».
- La revue du site déplie les 40 questions sans filtre (33 000 px de page). L'app ne montre que les erreurs.
- Contenu : `balisage-0024` (« Ce feu blanc est celui d'une marque cardinale Sud. Quelles sont les deux caractéristiques de son rythme ? ») se résout en comptant les éclats sur l'image. Son alt donne aussi la réponse : « six scintillements groupés, suivis d'un éclat long ». La question mesure la lecture de l'image, pas la règle.
- Hors périmètre : le panneau de recherche fermé reste exposé dans l'arbre d'accessibilité (combobox, listbox, « Par où commencer ») sur chaque écran de jeu.
- Mon script de réussite a fait 38/40 avec une seule question au buzzer, donc une autre erreur. Je ne l'ai pas cherchée : correspondance de texte ou question à part, à vérifier si quelqu'un réutilise la recette.

## 9. Questions provocantes

1. Si un recalé à 15 sur 40 n'a rien à gagner à refaire quarante questions demain, pourquoi « Recommencer » est-il le seul bouton jaune de l'écran ?
2. L'app cache sa barre d'onglets pendant l'épreuve. Pourquoi le site garde-t-il logo, recherche et six liens pendant treize minutes chronométrées, au prix de C et D sur un téléphone ?
3. Et si le résultat ouvrait sur le plan plutôt que sur le score (« Trois thèmes à reprendre, dans cet ordre »), le nombre venant en second ?

## 10. Annexe pour les lots suivants

### (a) Chaînes à réécrire

| Écran | Texte actuel exact | Pourquoi |
|---|---|---|
| Départ | Ordre : « Retour à l'accueil » avant « Commencer l'examen » | Le lien de sortie passe avant l'action sur desktop, où le bouton n'est pas collant. |
| Départ (mobile) | « Au clavier : A, B, C, D pour cocher, Entrée pour valider et passer. » | Inutile sur un écran tactile. |
| Reprise | « Tu avais un examen en cours, arrêté à la question 11 sur 40. » | Ne dit pas que le chrono a tourné, ni que la question reprend avec le temps restant. Sur mobile, l'encart est caché sous les boutons. |
| Question | « Deux réponses au maximum. Décoche pour en changer. » | Bon texte, mais pas annoncé (`role="status"` manquant). |
| Question | « Arrêter » | Seul mot d'un bouton qui ouvre une confirmation. « Arrêter l'examen » se lit mieux hors contexte, au lecteur d'écran par exemple. |
| Arrêt | « Arrêter l'examen maintenant ? » | Espace insécable avant « ? » : la ponctuation tombe seule à 390 px. |
| Arrêt | « Il te reste 27 questions. Ton résultat portera sur les 13 que tu as jouées, pas sur 40. » | Ajouter que le chrono continue, et le temps restant. |
| Résultat | `h1` caché « Examen blanc, résultat » | Le vrai titre devrait être visible et porter le verdict (« Recalé, 15 sur 40 »). |
| Résultat | « Examen blanc terminé » | C'est un sur-titre. À supprimer, ou à fondre dans le titre. |
| Résultat | « Recalé. 25 erreurs, l'épreuve en admet 5. » | Insécable avant « 5 ». Peut devenir `h1`. |
| Résultat | « 2 questions passées au buzzer, sans réponse dans les vingt secondes. » | « Buzzer » est un mot de jeu télé. Proposition : « 2 questions sans réponse : le temps est passé avant toi. » |
| Résultat | « Le chrono compte autant que la réponse. » | Sonne comme une maxime. Mieux vaut une consigne : « Entraîne-toi à répondre en moins de quinze secondes. » |
| Résultat | « Tu passes ce permis pour » + « « Ton bateau à toi, et la mer devant. » » | La phrase composée est bancale pour 6 motivations sur 9 (voir P2). |
| Résultat | « Les questions ratées sont dans la revue, et elles reviennent en entraînement jusqu'à ce que tu les tiennes. » | Une promesse sans lien. Il faut l'action et sa destination. |
| Résultat | « Ton examen d'avant : 14 sur 40. 1 de plus aujourd'hui. » | « aujourd'hui » est faux quand les deux examens sont du même jour. |
| Résultat | « Revoir les questions » / « Masquer la revue » | Pas d'`aria-expanded` sur le site. L'app dit « Revoir mes erreurs », qui est meilleur : il nomme le contenu. |
| Résultat | « Recommencer » | Ne dit pas quoi. « Refaire un examen » (le libellé de l'app), et pas en principal sur un recalé. |
| Résultat | Thèmes « Navigation et sécurité 0 / 3 » … | Ce sont des éléments de liste et non des liens. « VHF et SMDSM » garde un sigle non expliqué. |
| Interrompu | « 1 / 3 » à 6 rem | Contredit « Une note sur un examen entier demande d'aller au bout. » |
| Revue | « Question 1 sur 40, Navigation et sécurité — ratée » | Tiret cadratin. |
| Revue | Badge « bonne réponse » seul sur une case cochée et juste | Il manque « ta réponse » (voir P1). |
| Reçu | « Reçu. 2 erreurs sur les 5 admises. » | Juste, mais posé dans la même mise en page que l'échec, sans moment. |

### (b) Réponses aux deux questions

**1. Qu'est-ce qui dit au recalé quoi faire ensuite, et le fait-il ?** Trois actions, tout en bas, après onze lignes de thèmes (à y = 1 390 px sur 390×844) : « Revoir les questions » (secondaire, premier dans le DOM), « Recommencer » (jaune, principal) et « Accueil ». Le bouton principal relance un examen de quarante questions, ce qui ne convient pas à un recalé : rien ne mène au thème le plus faible ni à la série du jour, et la seule consigne de travail (« elles reviennent en entraînement ») est une phrase sans lien.

**2. Le rappel de la raison aide-t-il, ou est-il déjà du bruit ?** Il est placé après le verdict et la note sur le buzzer, avant les thèmes, dans un encadré jaune en display gras : c'est la deuxième chose lue après le score, et la plus forte. Sa forme, « Tu passes ce permis pour « Ton bateau à toi, et la mer devant. » », donne une phrase bancale pour la plupart des motivations. Il aide une fois, au premier recalé. Comme un premier essai tourne autour de 20 sur 40, il reviendra à chaque examen pendant des semaines, et sans action liée il devient du bruit dès la deuxième fois : à espacer (une fois par semaine, ou quand le score baisse) et à accrocher à un bouton.

### (c) Comment atteindre chaque état

- **Préparation** : `/profil/depart`, `localStorage.clear()`, cocher « Avoir mon propre bateau », puis « Continuer » jusqu'à « Terminer », champs laissés vides. Le rappel affiché est alors « Ton bateau à toi, et la mer devant. ». Attention : un `computer type` après un `focus()` JS est parti dans le champ de recherche du site. Pour saisir une phrase à soi, cliquer le champ par `find`/`ref`.
- **1. Lancement** : `/examen`. L'encart novice s'affiche tant qu'aucune question n'a de réponse (`rienRevise`). Il disparaît dès qu'un examen est en cours, puisque l'encart de reprise prend sa place.
- **2. Question avec visuel** : lire le tirage dans `localStorage['permis-cotier:progression'].enCours.ids`, croisé avec `/banque/v/1.19.0.json` (champs `visuel` et `reponses.length > 1`), pour savoir à quel rang tombe un visuel. Avancer avec `computer key "a Return"` et `repeat`. Ne pas mesurer longtemps : le chrono tourne pendant les inspections.
- **3. Deux réponses** : même méthode, touches `a b c`, puis lecture de `aria-pressed` et `disabled` par JS.
- **4. Arrêt** : clic sur le bouton « Arrêter » (texte exact), puis attendre 12 s par JS pour voir passer la question. Ensuite « Continuer l'examen », et lire `document.activeElement`.
- **5. Recalé** : en JS, `document.dispatchEvent(new KeyboardEvent('keydown',{key}))`. Envoyer `Enter` pour démarrer, puis 40 fois `a` et `Enter` à 60 et 120 ms d'intervalle. Toute la boucle tient en un appel. Le rechargement de la page, déclenché ici par un changement de viewport, perd le résultat.
- **Interrompu** : trois fois `b` puis `Enter`, ensuite « Arrêter », puis « Arrêter et voir le résultat ». Le rappel ne s'affiche pas.
- **6. Reçu** : pour chaque énoncé (sans le préfixe « Question N sur 40. »), chercher la question par énoncé normalisé dans le JSON, cliquer les `.proposition` dont le dernier `span` correspond au texte d'une bonne réponse, puis cliquer « Valider et passer », avec 200 ms entre deux questions. Résultat obtenu : 38/40. La question 1 était passée au buzzer, parce que j'attendais l'état urgent, et une autre a été ratée sans que j'en cherche la cause.
- **Urgent** : démarrer, attendre 16,3 s par JS, puis capturer. La jauge et le chiffre passent au rouge.
- **Clavier (Sam)** : Entrée sur le départ, puis Tab, puis Espace, puis Maj+Tab et Entrée, et lire `document.activeElement` après chaque geste.
