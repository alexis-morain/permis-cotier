---
target: fiche
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/alex-pack/Developer/permis-cotier-impeccable/src/components/ProfilCandidat.tsx"
target_fingerprint: "sha256:ba910d0b27f04b2d7101b25ebce3347056f12bf70bf63263b782006d385e04e2"
target_path: /Users/alex-pack/Developer/permis-cotier-impeccable/src/components/ProfilCandidat.tsx
timestamp: 2026-10-04T01-39-59Z
slug: src-components-profilcandidat-tsx
---
# Critique impeccable, 3 octobre 2026 : La fiche du candidat

Method: dual-agent (A: builder, revue de design · B: routine, détecteur). Skill impeccable 4.5.0,
détecteur 4.0.0, worktree `permis-cotier-impeccable` sur `main` `df4e7ef`, serveur de dev
local, 1280×800 et 390×844, clair et sombre. Cible : `src/components/ProfilCandidat.tsx`.

## Scan déterministe (Assessment B)

Statique : zéro constat sur `src/components/ProfilCandidat.tsx`. Navigateur, `/profil`, `/profil/depart`, `/profil/erreurs`, `/revoir`, `/recherche` à 1280×800 et 390×844 : zéro constat. La revue a trouvé seule le sur-titre « Tu passes ce permis pour » et la rangée de stats : deux motifs que DESIGN.md refuse et que le détecteur ne voit pas.

Hors cible, aux mêmes passes : `cramped-padding` sur `/cours/balisage/balisage-cardinal`
(4 px à côté d’un texte de 14,4 px) et `script-error` Turnstile 110200 sur `/signaler`,
attendue sur `localhost`. Avisé : dix tirets cadratins dans le corps de `/notion/balisage-cardinal`.

## Revue de design (Assessment A)

# Assessment A : revue de design de la fiche du candidat (`/profil`)

Worktree `/Users/alex-pack/Developer/permis-cotier-impeccable`, serveur `http://[::1]:4360/`, onglet propre, `localStorage` vidé avant chaque parcours. Vu à 1280×800 clair, puis états 1, 3 et 4 à 390×844 clair et sombre. Parcours joué : fiche vide, `/profil/erreurs` vide, `/revoir` vide, `/recherche` « xyzzy », questionnaire rempli (pêche + bateau cochés, phrase « Emmener mes enfants voir les dauphins au large de Belle-Île », « J'ai déjà navigué », 20/jour, examen le 24 octobre, prénom Camille), examen blanc de quarante questions à `a` + Entrée (18/40, recalé), fiche, `/profil/erreurs` (22 dues), puis « Effacer » confirmé. L'examen interrompu n'a pas été rejoué : sa trace est lue dans `src/components/Quiz.tsx`, effet qui appelle `enregistrerExamen` sous `if (!session.interrompu)` (absent de l'historique des examens, compté dans les questions vues, l'objectif du jour et la série, aucun rappel de la raison).

Note de méthode : la page du questionnaire s'est rechargée seule deux fois (navigation de type `reload`, sans doute le rechargement du serveur de dev pendant qu'un autre agent écrivait). Le questionnaire est revenu à « 1 sur 6 », réponses gardées. Ce n'est pas un défaut du produit, mais ça révèle un vrai comportement : l'étape n'est pas persistée.

---

## 1. Verdict de spécificité

**La peau est à ce produit, la composition ne l'est pas.** Marine et jaune cardinal, Archivo étendue à 125 %, bord plein sous les boutons, la barre des examens avec son trait jaune à 35 sur 40 : ça se reconnaît. Mais l'ordre et la forme des blocs sont ceux de n'importe quel tableau de bord d'application d'apprentissage, au point qu'on pourrait remplacer « permis côtier » par « espagnol » sans toucher la mise en page :

- **Rangée de stats, deux fois.** « Aujourd'hui » pose deux grands chiffres côte à côte (« 20 sur 20 questions » / « 1 jour de suite »), et la légende de l'indice en aligne trois de plus (« Vu 1 sur 20 · Retenu 0 sur 35 · Examens 20 sur 45 »). DESIGN.md et la charte refusent la rangée de stats ; la charte dit « deux gros intégrés à un récit ». Ici, on a cinq nombres en vitrine, sans récit.
- **Grille d'éléments identiques.** Les huit jalons, en deux colonnes à 1280 px : cercle, titre gras, ligne grise, huit fois. Pas de carte, mais le même motif répété à l'identique. Les quatorze lignes « Thème par thème » suivent le même gabarit (nom, compte, jauge).
- **Sur-titre au-dessus d'un titre.** « Tu passes ce permis pour », petit, gris, au-dessus de la phrase du candidat composée en display gras dans un encadré jaune pâle. C'est exactement le label au-dessus que DESIGN.md refuse (« ni trait de côté, ni label au-dessus »). Même motif sur `/profil/erreurs` : « Balisage · ratée une fois » au-dessus de chaque énoncé en `h3`.
- **Bordure colorée de côté** : aucune. **Ombre douce** : aucune. **Emoji** : aucun. Ces refus-là sont tenus.
- **Ce qui est vraiment d'ici** : la barre d'examen avec le trait à 35, la case du jour cerclée de jaune dans les quatorze jours, la phrase du candidat. Le reste vient du gabarit Duolingo (objectif, série, jalons), sans être plié au fait que ce candidat passe **une** épreuve, à **une** date, avec **une** barre (35 sur 40).

L'occasion manquée : la fiche connaît la date d'examen, la barre d'admission, et le dernier examen thème par thème. Une fiche écrite pour ce produit s'organiserait autour de « 20 jours, 18 sur 40, il en faut 35, voilà les thèmes qui ont coûté les 17 points ». Elle s'organise au contraire autour d'un indice abstrait sur 100 et de mécaniques de rétention.

---

## 2. Heuristiques de Nielsen

| # | Heuristique | Note | Constat clé |
|---|---|---|---|
| 1 | Visibilité de l'état du système | 2 | L'indice, l'objectif et la série sont là, mais le palier dit faux après un examen (« Tu démarres. Tout reste à voir. » après quarante questions). « Oui, tout effacer » ne confirme rien : la section devient « Rien à effacer pour l'instant. », la page reste en bas, le focus tombe sur `body`. |
| 2 | Correspondance avec le monde réel | 3 | Langue simple, tutoiement tenu. Mais la légende « Vu 1 sur 20 » se lit « une question vue sur vingt » quand ce sont des points, après quarante questions vues. Cinq des neuf rappels de motivation ne prolongent pas « Tu passes ce permis pour ». |
| 3 | Contrôle et liberté | 3 | « Plus tard », « Retour », « modifier », effacement confirmé. Pas d'annulation après l'effacement ; un rechargement du questionnaire renvoie à l'étape 1. |
| 4 | Cohérence et standards | 2 | La même destination porte trois noms (« Revoir mes 22 questions du jour », « Jouer ma série du jour », « Ta série du jour »). Le questionnaire conseille « Fais un examen blanc tout de suite » et `/examen` répond « Commence plutôt par la première leçon ». Les cases à cocher multiples sont aussi rondes que les boutons radio (`border-radius` 10 px sur 21,6 px). Le rythme vaut 20 par défaut sur la fiche, rien dans le questionnaire. |
| 5 | Prévention des erreurs | 2 | L'effacement demande une confirmation, mais « Oui, tout effacer » prend le jaune, la seule couleur d'action du site, et rien ne dit ce qui part (quarante questions, un examen, la raison, la date). |
| 6 | Reconnaître plutôt que se souvenir | 3 | Tout est visible et étiqueté. Échec partiel : le résultat de l'examen thème par thème, vu deux minutes plus tôt, n'est pas repris sur la fiche ; le candidat doit s'en souvenir. |
| 7 | Flexibilité et efficacité | 2 | Les liens « Ses questions » par notion sont de bons raccourcis. Aucun raccourci sur la fiche ; le questionnaire de six écrans ne se saute qu'en entier. |
| 8 | Esthétique et minimalisme | 1 | 4 808 px de haut à 1280, 5 911 px à 390. Trente-sept éléments interactifs (27 liens, 8 boutons, 2 champs). Vide, la page aligne zéros, quatorze « jamais ouvert » et huit cercles vides sur cinq écrans. |
| 9 | Diagnostiquer et réparer les erreurs | 2 | Le message de banque non chargée de `/profil/erreurs` est bon. La recherche sans résultat propose quatre mots qui ne se cliquent pas. L'effacement n'a pas de retour arrière. |
| 10 | Aide et documentation | 3 | « Comment c'est compté » explique l'indice au bon endroit, sans quitter la page. Mais trois paragraphes expliquent l'algorithme (1, 3, 7, 21 jours) là où le candidat attend une consigne. |
| **Total** | | **23/40** | **Acceptable** (bande 20-27) |

---

## 3. Charge cognitive

| Case | Verdict | Pourquoi |
|---|---|---|
| Un seul objet d'attention | **Échoue** | Le premier écran montre le rappel, l'indice, la jauge à trois couleurs et sa légende ; l'action arrive à 870 px (1280×800) et à 1 120 px (390×844), sous la ligne de flottaison dans les deux cas. |
| Découpage (≤ 4 par groupe) | **Échoue** | Quatorze thèmes d'un bloc, huit jalons, quatorze cases de jours, neuf motivations dans le questionnaire. |
| Regroupement | Passe | Les sections sont nettes, filets horizontaux cohérents. |
| Hiérarchie visuelle | **Échoue** | Le plus gros objet de la page est « 22 / 100 », un chiffre qui ne dit pas quoi faire ; le bouton principal est le quatrième objet dans l'ordre de lecture. |
| Une décision à la fois | **Échoue** | Le bloc « Aujourd'hui » propose quatre gestes, et « À reprendre en premier » six liens juste dessous. |
| Choix réduits (≤ 4) | **Échoue** | Voir les points de décision ci-dessous. |
| Mémoire de travail | **Échoue** | Le résultat par thème de l'examen (Titre de conduite 0/2, Règles de barre 1/6…) disparaît entre l'écran de résultat et la fiche. |
| Divulgation progressive | **Échoue** | La fiche vide affiche toutes les sections, vides ; « Comment c'est compté » est le seul repli. |

**Sept échecs sur huit : charge élevée, correctif critique.**

Points de décision à plus de quatre options :
- **Bloc « Aujourd'hui »** : « Revoir mes 22 questions du jour », « Examen blanc », « Le cours », « Relire ce que j'ai raté » : quatre, plus « modifier » au-dessus et les six liens de « À reprendre en premier » juste dessous, soit dix gestes dans le même écran mobile.
- **« Thème par thème »** : quatorze liens d'entraînement.
- **Réglages** : prénom, raison (lien), trois rythmes, date, « effacer la date », trois apparences, lien « réglages du site », effacement : douze commandes.
- **Questionnaire, écran 1** : neuf cases, et « Continuer » à 1 038 px sur un écran de 844, invisible sans défiler.
- **Fiche entière** : trente-sept éléments interactifs.

---

## 4. Parcours émotionnel : Camille, recalé à 18 sur 40, arrive sur sa fiche

1. **« Camille, voilà où tu en es. »** Neutre, presque chaleureux. Le prénom porte.
2. **Encadré jaune : « Tu passes ce permis pour « Emmener mes enfants voir les dauphins au large de Belle-Île » »**. Troisième fois en deux minutes (fin du questionnaire, écran de résultat, fiche). La première fois, ça touche ; la troisième, c'est du papier peint. Et c'est lui qui occupe la place de l'action.
3. **« 22 / 100 · Tu démarres · Tout reste à voir. Une leçon ou une série de questions, et l'indice bouge. »** Premier creux. Camille vient de répondre à quarante questions ; la fiche lui dit que tout reste à voir. L'effort est nié.
4. **« Vu 1 sur 20 · Retenu 0 sur 35 · Examens 20 sur 45 »**. Incompréhension : « 1 sur 20 » après quarante questions ?
5. **« 20 sur 20 questions · Objectif du jour fait, et 20 de plus. · 1 jour de suite · La série tient. »** Remontée, mais à contretemps : on la félicite le jour où elle est recalée, pour un objectif qu'elle a rempli sans le savoir.
6. **« Examen dans 20 jours… environ 30 par jour pour toutes les voir. »** Pression, et contradiction avec l'objectif de 20 qu'on vient de dire « fait ».
7. **« Revoir mes 22 questions du jour »**. Enfin une consigne claire. Elle arrive au deuxième écran.
8. **« À reprendre en premier » : Marques cardinales, Le balisage de nuit, Balisage des plages, « 0 retenue sur 2 vues »**. Elle ne sait pas que ce classement n'a aucun sens le premier jour (tout est à zéro, l'ordre est celui du programme).
9. **« Thème par thème » : treize lignes « 0 retenues sur N vues », treize zéros rouges**. Le creux le plus profond : la page dit qu'elle n'a rien retenu nulle part, alors qu'elle a eu 18 bonnes réponses. C'est faux, et c'est rouge.
10. **« 4 octobre · 18 / 40 · recalé »** en rouge. Juste, sobre.
11. **Jalons : 2 sur 8.** Petite remontée.
12. **Fin de page : « Effacer ma progression et ma fiche »**, bouton bordé de rouge.

**Pic-fin** : le pic négatif est le mur de zéros rouges, la fin est un bouton d'effacement. Aucun moment ne rassure en face de l'enjeu (« 18 sur 40 au premier essai, c'est la moyenne, voilà comment on passe à 35 »). L'écran d'examen le sait pourtant (« Au premier essai, on tourne autour de 20 sur 40 ») ; la fiche ne le reprend pas.

---

## 5. Forces

1. **« Comment c'est compté »** : l'indice se justifie sur place, en phrases, avec les comptes du candidat (« 40 questions sur 622 », « aucun pour l'instant »), et dit honnêtement pourquoi « Prêt » exige deux examens reçus. C'est le principe 4 du produit appliqué : le site dit ce qu'il sait.
2. **La barre d'examen avec son trait jaune à 35 sur 40** : le seul graphique de la page qui parle la langue de l'épreuve. On voit d'un coup d'œil la distance à l'admission. Il mériterait d'être en tête.
3. **`/profil/erreurs` à plat** : énoncé, visuel, bonne réponse, explication, lien vers la leçon, sans rejouer. Le vide est bien écrit (« Rien à revoir, rien de raté. Réponds à quelques questions, et ce que tu rates se range ici. ») avec un seul geste. Et le message « Les relire d'abord ne les fait pas disparaître : il faut les réussir deux jours différents » prévient une vraie confusion.

---

## 6. Problèmes prioritaires

**[P1] Le lendemain n'existe pas encore : après un premier examen, la fiche affiche zéro partout et en rouge.**
- **Quoi** : « Retenu » exige deux réussites à deux jours différents, donc le jour d'un premier examen, chaque thème touché affiche « 0 retenues sur N vues » avec le 0 en rouge (`maitrise__faible`, car 0 < vues), treize fois. « À reprendre en premier » trie par retenues sur vues : tout vaut 0, l'égalité se tranche par l'ordre du programme, et la fiche désigne les trois premières notions de balisage vues, y compris celles où le candidat a répondu juste.
- **Pourquoi** : c'est faux et décourageant au moment le plus fragile. Le candidat a 18 bonnes réponses ; la fiche dit qu'il ne tient rien, et lui recommande des notions au hasard sous le titre « ce qui tient le moins ».
- **Correctif** : tant qu'aucune question n'a pu être retenue (rien vu avant aujourd'hui), trier les notions et les thèmes par **ratées** (le champ existe, `etat.questions[id].ratees`) et afficher « 3 ratées sur 5 » au lieu de « 0 retenues sur 5 vues » ; ne colorer en rouge qu'une faute, jamais un « pas encore retenu ». Reprendre sur la fiche le dernier examen thème par thème, que l'écran de résultat a déjà.
- **Commande** : `/impeccable clarify` puis `/impeccable harden`.

**[P1] Le prochain geste est au deuxième écran et noyé.**
- **Quoi** : « Revoir mes 22 questions du jour » est à 870 px sur 800 de haut et à 1 120 px sur 844. Au-dessus : le rappel et l'indice. À côté : « Examen blanc », « Le cours » (déjà dans la barre de navigation), « Relire ce que j'ai raté ». Dessous : six liens de notions et quatorze de thèmes.
- **Pourquoi** : la fiche « opère », et sa seule question utile est « que faire maintenant ». Le candidat recalé lit trois blocs de chiffres avant de la voir posée.
- **Correctif** : un seul geste principal, dans le premier écran, juste sous le titre ou sous l'indice, nommé d'après son origine (« Revoir les 22 questions ratées à l'examen »). Retirer « Le cours » et « Examen blanc » de ce bloc (la navigation les porte). Garder « Relire ce que j'ai raté » en lien de texte, mais seulement s'il y a quelque chose à relire.
- **Commande** : `/impeccable layout` puis `/impeccable distill`.

**[P1] Le rappel de la raison est au mauvais endroit, en double, et mal accordé.**
- **Quoi** : l'encadré « Tu passes ce permis pour » ouvre la fiche à chaque visite, recalé ou non, et se répète dans les réglages (« Pourquoi tu passes le permis »), sur la même page. Le commentaire de `Quiz.tsx` (l. 666 au moment de la lecture) dit pourtant « C'est là qu'on rappelle la raison dite au départ, pas ailleurs », et PRODUCT.md parle d'un rappel « quand un examen blanc est recalé ». Cinq des neuf rappels de `MOTIVATIONS` ne prolongent pas « pour » : « Ce permis, c'est ton travail qui l'attend. », « Tu t'es lancé ce défi. Il tient toujours. », « Le hauturier vient après. Celui-ci d'abord. », « Tracter, glisser, piloter : ça commence par ce permis. », « Ton bateau à toi, et la mer devant. » (et « lancé » est au masculin).
- **Pourquoi** : un rappel permanent cesse d'être un rappel ; il prend la place de l'action dans le premier écran ; et la grammaire cassée sonne comme un gabarit, l'inverse de l'effet cherché.
- **Correctif** : retirer l'encadré de la tête de fiche, garder la ligne des réglages. Si on tient à le montrer sur la fiche, seulement le jour d'un examen recalé, en une ligne sous le geste principal, sans sur-titre. Réécrire les neuf rappels pour qu'ils complètent « Tu passes ce permis pour… » à l'infinitif (« emmener les tiens en mer, toi à la barre »), ou supprimer l'amorce.
- **Commande** : `/impeccable quieter` puis `/impeccable clarify`.

**[P2] La fiche vide est une page de zéros de 4 000 px avec deux boutons jaunes.**
- **Quoi** : vide, la fiche montre 0/100, 0 sur 20, 0 jour de suite, quatorze « jamais ouvert », « Aucun examen blanc terminé », huit jalons vides (« 0 question sur 10. », « Ta plus longue série : 0 jour. », « 0 leçon sur 105. »), puis douze réglages. Deux gestes jaunes se suivent (« Répondre » puis « Faire un examen blanc ») ; « Relire ce que j'ai raté » mène à une page vide. Et la meilleure phrase du palier (« Une leçon ou une série de questions, et l'indice bouge. ») est remplacée, précisément dans ce cas, par « Rien d'enregistré dans ce navigateur pour l'instant. ».
- **Pourquoi** : l'état vide doit dire ce qui le remplira et offrir un geste. Il offre seize gestes et cinq écrans de rien.
- **Correctif** : si `rien`, rendre le titre, une phrase (« Rien encore. Un examen blanc dit en dix minutes où sont tes trous. »), un seul bouton, et le lien vers le questionnaire en texte. Masquer thèmes, examens et jalons jusqu'à la première réponse.
- **Commande** : `/impeccable onboard` puis `/impeccable distill`.

**[P2] L'effacement est habillé comme une invitation et ne dit rien après.**
- **Quoi** : la confirmation montre « Oui, tout effacer » en `bouton--principal` jaune bordé de rouge, et « Annuler » prend aussi la bordure rouge (règle `.reglage--danger .bouton`). Rien ne dit ce qui part. Après, la section dit « Rien à effacer pour l'instant. », la page reste en bas (scrollY 3 974 sur mobile), le focus tombe sur `body` (vérifié), aucune annonce.
- **Pourquoi** : le jaune est la seule couleur d'action du site, il pousse au clic irréversible ; « Annuler » en rouge se lit comme le danger. Un lecteur d'écran perd sa place deux fois.
- **Correctif** : destructif en rouge, « Annuler » neutre et en premier ; une ligne qui compte ce qui part (« 40 questions, 1 examen blanc, ta raison et ta date ») ; après, un message « Fiche effacée. » en `role="status"`, focus déplacé sur le titre de la fiche, retour en haut.
- **Commande** : `/impeccable harden`.

---

## 7. Personas

**Jordan, premier venu**
- Fiche vide : « Voilà où tu en es. » au-dessus de rien. Deux boutons jaunes ; il ne sait pas lequel est le bon.
- Légende de l'indice : « Vu 1 sur 20 » après quarante questions ; il croit que le site a perdu ses réponses. Rien n'écrit « points ».
- « Retenu », « retenues sur vues, en banque » : définis dans un paragraphe gris qu'il ne lit pas ; il voit treize zéros rouges.
- Questionnaire, écran 1 : neuf options, « Continuer » invisible à 390×844 sans défiler. Les cases sont rondes comme des boutons radio : il coche une seule raison.
- Écran 3 « J'ai déjà navigué » → fin du questionnaire : « Fais un examen blanc tout de suite ». Il clique, et `/examen` lui répond « Tu n'as encore rien révisé… Commence plutôt par la première leçon ». Deux conseils contraires en dix secondes.
- Écran 5 : « Sers à compter les jours » ; la faute se voit.

**Sam, lecteur d'écran**
- « Effacer ma progression et ma fiche » : le bouton disparaît au clic, le focus tombe sur `body`. « Oui, tout effacer » : même chose, et aucune annonce. Sam ne sait pas si c'est fait.
- Légende de l'indice en `aria-hidden` : la jauge porte bien un `aria-label`, mais les trois maxima (20, 35, 45) ne sont jamais dits ; « 1 point pour ce qui est vu » sans savoir sur combien.
- Quatorze jours : `aria-label` posé sur des `li` sans rôle ; selon le lecteur, il est ignoré et Sam entend « L, M, M, J… ».
- Questionnaire : les choix uniques (« Tu pars d'où ? », le rythme) sont des boutons `aria-pressed`, pas des radios ; changer de choix ne dit pas que l'ancien s'est éteint. L'étape « 2 sur 6 » n'est pas annoncée (le focus sur le `h1` sauve l'essentiel).
- `/profil/erreurs` : « Balisage · ratée une fois » est avant le `h3` ; en naviguant par titres, Sam saute le thème et le nombre d'échecs. Deux bonnes réponses sont jointes par « — », lu « tiret ».
- `/recherche` : la région vivante dit « Aucun résultat. » alors que l'écran propose quatre mots ; Sam ne les entend pas.

**Riley, testeur**
- Recharger le questionnaire en cours (après l'écran 2) : retour à « 1 sur 6 », réponses gardées (observé).
- Cocher « Aller pêcher au large » puis « Avoir mon propre bateau » : le rappel prend la première cochée dans l'ordre des clics, pas dans l'ordre affiché. Décocher puis recocher change le rappel en silence.
- Choisir « J'en ai besoin pour mon travail » seul : le rappel devient « Tu passes ce permis pour « Ce permis, c'est ton travail qui l'attend. » ».
- Arrêter un examen après dix questions : la fiche dit « Aucun examen blanc terminé » et le jalon reste vide, mais l'objectif du jour et la série comptent les dix (lu dans `Quiz.tsx`).
- Faire un examen complet : « Objectif du jour fait, et 20 de plus. » et, deux lignes plus bas, « environ 30 par jour pour toutes les voir ». Les deux nombres ne se parlent pas.
- Une question vue une fois : « 0 retenues sur 1 vues » (pluriel faux, `ProfilCandidat.tsx` l. 354, « retenues sur {t.vues} vues »).
- `/revoir` à vide : pas d'état vide. La page « Ta série du jour » (décrite comme « Les questions dues aujourd'hui ») sert vingt questions jamais vues sans le dire ; « Rien à revoir aujourd'hui. » n'apparaît que si la banque est épuisée.
- Effacer : aucun retour arrière, aucun message, la page reste en bas.

---

## 8. Observations mineures

- « » » orphelin en début de ligne à 390 px dans « « feux et marques » ne dit pas… » : il faut une espace insécable avant le guillemet fermant (et après l'ouvrant).
- Tirets cadratins dans l'interface, que la charte proscrit : la jonction des bonnes réponses (`Erreurs.tsx`, `join(' — ')`, qui donne « Le groupe compte six scintillements — Un éclat long termine le groupe », majuscule comprise) et le chapeau de `/recherche` (« Tape un mot du programme — cardinale, … — et tombe… »).
- En sombre, l'encadré du rappel passe à un kaki brun (jaune pâle assombri) qui frôle le beige refusé.
- La jauge de l'indice peint la plus grosse part (examens, 45 points) dans le gris-bleu des filets (`--filet-fort`) : la part qui compte le plus est la plus éteinte.
- « modifier » en minuscule dans l'encadré, « Modifier mes réponses » dans les réglages, « effacer la date » en minuscule : trois casses pour la même famille de liens.
- Le questionnaire ne présélectionne aucun rythme alors que la fiche affiche 20 comme choisi par défaut.
- L'étiquette d'étape devient « C'est noté » sur l'écran de fin, puis le `h1` redit « C'est noté, Camille. ».
- « Changer d'appareil ou vider le cache efface la fiche » : c'est l'effacement des données du site, pas du cache, qui efface.
- Mélange de tailles dans une même phrase : « **Examen dans 20 jours**, le 24 octobre. » en corps puis « Il te reste 582… » en petit gris.
- Le chapeau de « À reprendre en premier » explique au candidat le raisonnement du concepteur (« Quatorze thèmes, cent cinq notions : « feux et marques » ne dit pas si le trou… ») ; c'est un commentaire de code.

---

## 9. Questions provocantes

1. Et si la fiche ne répondait qu'à « est-ce que je l'aurai le 24 octobre ? » : un compte à rebours, le dernier score contre la barre des 35, les thèmes qui ont coûté les points, un bouton ? Que perdrait-on vraiment en retirant l'indice sur 100 ?
2. La série de jours et les huit jalons servent-ils quelqu'un qui passe une épreuve unique dans trois semaines, ou sont-ils venus avec la grammaire Duolingo sans qu'on leur demande leur place ?
3. Pourquoi la fiche ignore-t-elle le seul résultat que le candidat vient de produire, son examen thème par thème, pour lui montrer à la place une mesure (« retenu ») qui ne peut pas bouger avant demain ?

---

## 10. Annexe pour les lots suivants

### (a) Chaînes à réécrire

| Où | Texte actuel exact | Pourquoi |
|---|---|---|
| Fiche, `h1` vide | « Voilà où tu en es. » | Faux quand il n'y a rien : il n'y a pas de « où ». |
| Fiche, palier `demarre` | « Tu démarres » / « Tout reste à voir. Une leçon ou une série de questions, et l'indice bouge. » | Faux après un examen de quarante questions ; le palier dépend du score seul (< 40). |
| Fiche vide, sous le palier | « Rien d'enregistré dans ce navigateur pour l'instant. » | Remplace la seule phrase qui dit quoi faire, justement dans le cas où elle sert. |
| Légende de l'indice | « Vu 1 sur 20 », « Retenu 0 sur 35 », « Examens 20 sur 45 » | Se lit en questions, pas en points. Écrire « points ». |
| Aujourd'hui | « Objectif du jour fait, et 20 de plus. » | Dit un jour d'examen recalé, compte l'examen sans le dire. |
| Aujourd'hui | « Il te reste 582 questions jamais vues : environ 30 par jour pour toutes les voir. » | Contredit l'objectif de 20 affiché au-dessus ; ne propose pas d'ajuster. |
| Bouton principal | « Revoir mes 22 questions du jour » | Même cible que « Jouer ma série du jour » (erreurs) et « Ta série du jour » (titre de `/revoir`) : choisir un nom. Dire d'où elles viennent. |
| Aujourd'hui | « Examen blanc », « Le cours » | Doublent la navigation. |
| Aujourd'hui | « Relire ce que j'ai raté, la bonne réponse et l'explication en face, sans rejouer. » | Affiché sur la fiche vide, mène à une page vide. |
| À reprendre en premier | « Quatorze thèmes, cent cinq notions : « feux et marques » ne dit pas si le trou est le remorquage ou la portée des feux. Ces trois-là sont ce qui tient le moins. » | Raisonnement de concepteur ; faux le premier jour ; guillemet orphelin à 390 px. |
| Notions faibles | « 0 retenue sur 2 vues, 10 en banque. » | Le premier jour, toujours 0 : dire les ratées. |
| Thème par thème | « 0 retenues sur 1 vues, 8 en banque » | Pluriel faux au singulier. |
| Thème par thème | « Les plus faibles d'abord. Retenu, c'est réussi deux jours différents : une question revient un jour plus tard, puis trois, puis sept, puis vingt et un. Une faute la ramène tout de suite et remet le compteur à zéro. » | Trois phrases d'algorithme avant la liste ; à replier dans « Comment c'est compté ». |
| Examens blancs, vide | « Aucun examen blanc terminé. Quarante questions, vingt secondes chacune : c'est ce qui pèse le plus dans l'indice. » | Dit ce qui remplit, n'offre pas le geste. |
| Jalons, vides | « 0 question sur 10. », « Ta plus longue série : 0 jour. », « 0 leçon sur 105. », « 0 sur 8. Un jalon atteint reste atteint. » | Huit zéros d'affilée sur la fiche vide. |
| Rappel | « Tu passes ce permis pour » (amorce) | Sur-titre refusé par DESIGN.md ; casse la grammaire avec cinq rappels. |
| `MOTIVATIONS.rappel` | « Ce permis, c'est ton travail qui l'attend. », « Tu t'es lancé ce défi. Il tient toujours. », « Le hauturier vient après. Celui-ci d'abord. », « Tracter, glisser, piloter : ça commence par ce permis. », « Ton bateau à toi, et la mer devant. » | Ne complètent pas « pour » ; « lancé » au masculin. |
| Rappel | « modifier » | Minuscule ; « Modifier mes réponses » ailleurs. |
| Invitation | « Trente secondes pour dire pourquoi tu passes le permis. On te le rappellera le jour où un examen blanc est recalé, et la fiche se règle à ta main. » | Six écrans, pas trente secondes ; promet un rappel au recalé, mais l'affiche en permanence ; « se règle à ta main » est vague. |
| Réglages | « Changer d'appareil ou vider le cache efface la fiche. » | Ce sont les données du site, pas le cache. |
| Réglages | « effacer la date » | Minuscule. |
| Effacer | « Effacer ma progression et ma fiche » / « Oui, tout effacer » / « Annuler » | Ne dit pas ce qui part ; aucun message après. |
| Questionnaire, en-tête | « 1 sur 6 · rien n'est obligatoire, rien n'est envoyé » | Correct ; mais « C'est noté » remplace l'étape sur l'écran de fin et double le `h1`. |
| Questionnaire, écran 1 | « Coche ce qui te ressemble. On te le rappellera le jour où ça coince. » | Ne dit pas qu'une seule case sera reprise (la première cochée) ni que la phrase la remplace. |
| Questionnaire, écran 2 | « Une phrase, la tienne. C'est elle qu'on affichera quand un examen blanc sera recalé, avant la case cochée. » | « avant » veut dire « à la place de » ; ne dit pas qu'elle s'affiche aussi en tête de fiche. |
| Questionnaire, écran 5 | « Sers à compter les jours et à répartir ce qui reste à voir. » | Faute : « Ça sert à ». |
| Questionnaire, fin | « À 20 questions par jour, tu en verras 400 d'ici là. La banque en compte 622. » | Constate l'écart sans dire quoi faire (32 par jour). |
| Questionnaire, fin | « Fais un examen blanc tout de suite : il dira où sont tes trous. » | Contredit `/examen` : « Commence plutôt par la première leçon : Marques latérales. » |
| `/profil/erreurs` | « Ce que tu as raté » (`h1`) / « Tes erreurs » (fil) | Deux noms pour la page. |
| `/profil/erreurs` | « Jouer ma série du jour » | Troisième nom de `/revoir`. |
| `/profil/erreurs` | « Balisage · ratée une fois » au-dessus de l'énoncé | Sur-titre ; précède le `h3`. |
| `/profil/erreurs` | « La bonne réponse : Le groupe compte six scintillements — Un éclat long termine le groupe » | Tiret cadratin, majuscule après jonction. |
| `/revoir` vide | « Ta série du jour » puis « Question 1 sur 20 » | Ne dit pas que rien n'est dû et que ce sont des questions neuves. |
| `/recherche` | « Tape un mot du programme — cardinale, feu vert, VHF, marée — et tombe sur la leçon, la fiche ou la question qui en parle. » | Tirets cadratins. |
| `/recherche`, sans résultat | « Rien sous ce mot-là. Essaie un mot du programme : cardinale, feu vert, VHF, marée. » | Les mots ne se cliquent pas ; le lecteur d'écran entend « Aucun résultat. ». |

### (b) Les états vides

| État | Phrase actuelle | Geste actuel | Verdict |
|---|---|---|---|
| `/profil` vide | « Voilà où tu en es. » puis « 0 / 100 · Tu démarres · Rien d'enregistré dans ce navigateur pour l'instant. » | « Répondre » (questionnaire, jaune), puis « Faire un examen blanc » (jaune), « Le cours », « Relire ce que j'ai raté », 14 thèmes : 16+ gestes | **Échoue** : ne dit pas ce qui le remplira (la phrase utile est masquée), plusieurs gestes principaux. |
| Section « Examens blancs » vide | « Aucun examen blanc terminé. Quarante questions, vingt secondes chacune : c'est ce qui pèse le plus dans l'indice. » | Aucun | **À moitié** : dit ce qui remplit, n'offre pas le geste. |
| Section « Jalons » vide | « 0 sur 8. Un jalon atteint reste atteint. » + huit détails à zéro | Aucun | **Échoue** : bruit pur à vide. |
| Section « Effacer » vide | « Rien à effacer pour l'instant. » | Aucun (voulu) | **Passe**. |
| `/profil/erreurs` vide | « Rien à revoir, rien de raté. » / « Réponds à quelques questions, et ce que tu rates se range ici. » | « S'entraîner par thème » (lien de texte) | **Passe** : dit ce qui remplit, un geste. Le geste pourrait être un bouton. |
| `/revoir` sans question due | Aucune : la page sert « Question 1 sur 20 » de questions neuves | Le jeu démarre | **Échoue** : pas d'état vide ; « Rien à revoir aujourd'hui. » existe mais n'est atteint que si la banque est épuisée. |
| `/recherche` sans résultat | « Rien sous ce mot-là. Essaie un mot du programme : cardinale, feu vert, VHF, marée. » | Aucun (mots non cliquables, raccourcis « Par où commencer » masqués pendant la saisie) | **À moitié** : dit quoi taper, n'offre pas de geste. |

### (c) Réponses aux trois questions

1. **Le rappel de la raison sur la fiche est déjà du bruit.** Il ouvre la page à chaque visite, sous le `h1` et avant l'indice, dans un encadré jaune pâle coiffé du sur-titre « Tu passes ce permis pour », et il se répète dans les réglages de la même page. Après un recalé, le candidat le lit pour la troisième fois en deux minutes (fin du questionnaire, résultat, fiche) ; il devrait vivre sur l'écran de résultat seul, comme le veut le commentaire de `Quiz.tsx` (« C'est là qu'on rappelle la raison dite au départ, pas ailleurs. », l. 666 au moment de la lecture), et cinq rappels sur neuf ne prolongent même pas l'amorce.
2. **C'est « Revoir mes 22 questions du jour », et il le fait, mais tard et entouré.** Le bouton est juste (les 22 ratées sont dues), mais il arrive au deuxième écran (870 px sur 800, 1 120 px sur 844), après un palier qui conseille autre chose (« Une leçon ou une série de questions »), à côté de trois autres gestes, et suivi d'une liste « À reprendre en premier » qui, le premier jour, désigne trois notions dans l'ordre du programme.
3. **Non, pas tous.** `/profil/erreurs` passe (une phrase qui dit ce qui remplit, un geste) ; la fiche vide échoue (phrase utile masquée, deux boutons jaunes, seize gestes), `/revoir` n'a pas d'état vide du tout, et `/recherche` dit quoi taper sans offrir de geste.
