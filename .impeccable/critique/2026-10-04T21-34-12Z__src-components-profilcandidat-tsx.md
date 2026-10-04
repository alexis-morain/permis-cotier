---
target: fiche du candidat (remesure après fusion)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/alex-pack/Developer/permis-cotier-accueil/src/components/ProfilCandidat.tsx"
target_fingerprint: "sha256:d44187f8e2e3c0fb829094d0410d30d5f4262bca0835580434b627ee9981aea2"
target_path: /Users/alex-pack/Developer/permis-cotier-accueil/src/components/ProfilCandidat.tsx
timestamp: 2026-10-04T21-34-12Z
slug: src-components-profilcandidat-tsx
---
# Critique impeccable, 4 octobre 2026 (remesure après fusion) : la fiche du candidat

Method: dual-agent (A: builder, revue de design · B: routine, détecteur). Worktree `permis-cotier-accueil` sur `main` `32660ae`, `astro preview` du build sur `localhost:4341/profil`, service worker désinscrit, 1280×800 et 390×844, clair et sombre. Cible : `src/components/ProfilCandidat.tsx`. Run précédent : 23/40, trois P1.

**Réserve de méthode.** Même origine, même `localStorage` pour les quatre évaluateurs (voir la critique de l’accueil du même jour) ; les états de A ont été relus après rechargement.

## Synthèse

**25/40**, contre 23/40. Les trois P1 du 4 octobre sont levés (le lendemain ne montre plus zéro en rouge ; le geste principal est sous le titre, seul ; le rappel ne sort plus qu’au recalé). Trois P1 neufs, qui touchent tous au **calcul et à la lecture de l’indice** et des objectifs : l’indice contredit l’examen (« 36/100, tu démarres » au lendemain d’un 31/40) ; au lendemain d’un recalé, le score n’est qu’au quatrième écran ; deux objectifs du jour se contredisent et le bouton de revue annonce le stock dû, pas la série jouée.

Détecteur : zéro constat, statique et navigateur, dans tous les états. Son silence ne valide rien de ce que la revue relève.

## Scan déterministe (Assessment B)

# B - fiche du candidat (/profil), detecteur + navigateur

Statique (impeccable detect --json, code 0 partout, sortie `[]`) : 0 constat sur
src/components/ProfilCandidat.tsx, src/pages/profil.astro, src/pages/profil/depart.astro,
src/pages/profil/erreurs.astro. (Pas de profil*.astro autre.)

Navigateur (onglet tab-2 propre, SW desinscrit, mutation title/script OK) : detect.js via live-server
(lance par moi, port 8400, arrete). Console "[impeccable]" : "No anti-patterns found" a chaque passe.
- /profil 1280 vide : 0 constat. 390 vide : 0. 390 remplie : 0. 1280 remplie : 0.
- /profil/depart 1280 : 0. 390 : 0 (profil rempli en localStorage, pas teste a vide).
Etat rempli : 48 questions (dont 16 a revoir), 8 jours d'activite, 2 examens (36/40 recu, 30/40 recale),
profil Camille complet ; rendu verifie (texte "Camille, voilà où tu en es", indice 65/100).
Faux positifs : aucun constat, donc rien a ecarter. Limite : detect.js ne voit pas contraste/hierarchie
subtils ni les etats non rendus (examen en cours, erreurs).
Sautes/rates : /profil/erreurs non teste en navigateur (statique seulement) ; /profil/depart pas en etat vide.
Notes : le tampon console s'est arrete a 4 lignes (depart peut n'etre compte que partiellement), mais
chaque injection a ete lue juste apres. Nettoyage : live-server arrete (le stop dit config_missing pour le
retrait de balise, sans effet), localStorage vide, resize desktop, onglet ferme, aucun fichier du depot modifie.

## Revue de design (Assessment A)

# Assessment A : revue de design, fiche du candidat (`/profil`)

Cible : `src/components/ProfilCandidat.tsx`, `src/lib/profil.ts`, `src/components/profil.css`, `src/pages/profil.astro`, questionnaire `/profil/depart`. Build servi sur http://localhost:4341. Détecteur non exécuté (consigne d'isolement).

Méthode navigateur : un onglet neuf, service worker désinscrit. 1280×800 et 390×844, en clair et en sombre. États semés par `localStorage`, avec la forme exacte d'`Etat`, sans jouer de vraie partie :
1. fiche vide ;
2. jour J d'un premier examen recalé (30/40), questionnaire rempli ;
3. lendemain d'un premier examen recalé (31/40), rien fait aujourd'hui, au téléphone ;
4. douze jours d'activité, quatre examens (deux reçus, deux recalés), 260 questions vues, beaucoup de questions dues.

J'ai aussi parcouru le questionnaire en entier, et la confirmation d'effacement jusqu'au bout. `localStorage` est vidé et le viewport remis en `desktop`.

## Verdict de spécificité

**La voix est celle du produit, la structure est celle de n'importe quelle appli.** La copie est propre au produit et rarement interchangeable :
- « Examen demain. Deux examens blancs ce soir, puis dors. » ;
- « Bon vent. » ;
- le rappel de la raison le jour d'un recalé ;
- « Le trait marque 35 sur 40, la barre d'admission ».

Le système visuel est tenu : Archivo large à 800 pour les titres et les grands nombres, le marine, le jaune réservé à l'action, le bord plein sous le bouton principal. La liste des examens, avec son trait jaune à 35/40, est le seul élément de composition qui n'existe que pour ce produit.

Le reste est la grammaire générique du tableau de bord d'apprentissage, dans l'ordre attendu :
1. un grand nombre sur 100 avec un palier ;
2. une bande de quatorze jours en pastilles ;
3. une liste de barres de progression par catégorie ;
4. des jalons à cercle coché ;
5. des réglages.

Une appli de langue ou de fitness pourrait reprendre ce squelette tel quel en changeant les libellés. Le produit a une unité naturelle, « X sur 40, il en faut 35 », mais la fiche la relègue sous un indice sur 100 inventé. L'univers maritime (pavillon, livret, carnet de bord) n'apparaît que dans les mots.

## Les dix heuristiques

| # | Heuristique | Note | Constat clé |
|---|---|---|---|
| 1 | Visibilité de l'état du système | 3 | L'état est riche : indice, objectif du jour, série, compte à rebours, examens. Mais la nav ne marque pas « Ta fiche » comme page courante sur `/profil` (aucun `aria-current`, alors que `/profil/depart` l'a). « Fiche effacée. » s'affiche en bas de page pendant que la page remonte. |
| 2 | Correspondance avec le monde réel | 2 | 36/100 « Tu démarres » au lendemain d'un 31/40. La légende « Vu 1 sur 20 » n'a pas d'unité (des points, pas des questions). Des guillemets prêtent au candidat des mots qu'il n'a pas écrits (« louer un bateau cet été, sans demander à personne », affiché en octobre). « Un examen blanc dit en dix minutes » : 40 × 20 s font 13 min 20. |
| 3 | Contrôle et liberté | 3 | Les réglages se modifient sur place. L'effacement est confirmé avec « Annuler ». Le questionnaire a « Retour » et « Plus tard ». Aucune annulation après effacement, et le focus tombe sur `body` à l'ouverture de la confirmation. |
| 4 | Cohérence et standards | 2 | `.jeu__actions` n'a aucune règle sur le site (même défaut que `.signaler` avant correctif), d'où deux boutons collés. Guillemets « » espacés dans le rappel mais «collés» dans les réglages. Le rappel est en jaune pâle, l'état « cochée » des propositions. Les cases du questionnaire à choix multiple ont l'air rondes. Deux objectifs quotidiens coexistent (20 contre 28/42/46). |
| 5 | Prévention des erreurs | 2 | « Annuler » et « Oui, tout effacer » sont à 0 px l'un de l'autre, sur un écran tactile. Le CTA « Revoir mes 216 questions du jour » face à un objectif de 20. Bon point : la confirmation dit ce qui part (« 40 questions, 1 examen blanc, ta raison et ta date. »), sans le prénom. |
| 6 | Reconnaissance plutôt que rappel | 3 | Une phrase discrète sous chaque section, et « Comment c'est compté » est sur place. Mais l'ordre « Les plus fragiles d'abord » dépend des ratées, que la ligne ne montre plus dès qu'une question est retenue : « Autonomie en carburant, 1 retenue sur 3 vues » arrive en tête sans raison visible. |
| 7 | Souplesse et efficacité | 2 | Une ligne de thème ou de notion mène directement à sa série. Pourtant la page fait 5 734 px au téléphone, soit 6,8 écrans, sans aucun raccourci de section. Les examens commencent à 3 127 px. |
| 8 | Esthétique et minimalisme | 2 | Chaque bloc est propre, mais leur somme est lourde : 14 lignes de thèmes, 8 jalons, 7 réglages, « en banque » répété quatorze fois. Dans la jauge, la plus grosse part (examens, 45 points) a la couleur des filets et des rails vides. |
| 9 | Diagnostic et rattrapage des erreurs | 3 | « La date d'examen est passée. Tu peux la changer plus bas. » nomme le problème et le remède. Le repli sans stockage est silencieux mais sans casse. |
| 10 | Aide et documentation | 3 | « Comment c'est compté » est clair, honnête et sur place. Le paragraphe changement de comptage est daté et s'éteint seul. Rien ne dit en revanche ce que joue « Revoir ». |
| **Total** | | **25/40** | **Acceptable** |

## Charge cognitive

Checklist : **3 échecs, charge modérée.**

| Critère | Verdict | Détail |
|---|---|---|
| Une seule priorité | Réussi | Un seul bouton jaune, juste sous le titre. |
| Morceaux de 4 au plus | **Échoué** | 14 thèmes d'un bloc, 8 jalons, 7 réglages. |
| Regroupement | Réussi | Filets horizontaux, sections titrées. |
| Hiérarchie visuelle | Réussi de justesse | Au téléphone, le « 36 » (jusqu'à 6,5 rem) est l'élément le plus lourd de l'écran et dispute l'attention au CTA placé juste au-dessus. |
| Une chose à la fois | Réussi | |
| Choix réduits | **Échoué** | « À reprendre en premier » propose 6 liens (3 × « La leçon » / « Ses questions »). « Thème par thème » ajoute 14 liens juste dessous, et « Relire ce que j'ai raté » est un troisième geste concurrent, caché dans une phrase grise. |
| Mémoire de travail | **Échoué** | Pour lire « Vu 1 sur 20 / Retenu 0 sur 35 / Examens 35 sur 45 », il faut savoir que ce sont des points pondérés, ce qui n'est dit que dans le `<details>` replié. Pour comprendre l'ordre des thèmes, il faut connaître une clé (retenues − ratées) jamais affichée. |
| Dévoilement progressif | Réussi en partie | Le `<details>` est bien utilisé, et la fiche vide ne montre aucun zéro. Le reste est tout déplié en permanence. |

## Parcours émotionnel

**Fiche vide.** Calme et honnête : « Rien encore sur ta fiche. », une phrase, un bouton. L'invitation au questionnaire dit à quoi il servira. Bon départ.

**Jour J d'un recalé.** Le pic est réussi : le prénom, puis « Tu passes ce permis pour « emmener les tiens en mer, toi à la barre ». », puis une seule action. Le creux vient aussitôt : « 35 / 100 — Tu démarres » et « L'indice part de ce que tu as vu et retenu », alors que 34 de ces 35 points viennent de l'examen qu'il vient de rater. Le 30/40 en rouge n'arrive qu'après 14 lignes de thèmes.

**Lendemain d'un recalé, au téléphone.** Même ouverture. Puis « Revoir mes 40 questions du jour » : les 32 réussies la veille sont dues le lendemain, ce qui se lit comme « refais tout l'examen ». Ensuite « 0 sur 40 questions. Rien encore aujourd'hui. » Rien ne relie la raison rappelée au chemin pour passer de 31 à 35.

**Plusieurs jours, mélange.** L'ensemble rassure : série, jalons, « Le dernier fait 3 de plus que l'avant-dernier ». Le jalon non atteint « Trois examens reçus d'affilée » porte pour détail « Les trois derniers, tous reçus. », ce qui se lit comme une victoire sur un cercle vide.

**La fin.** Dans tous les états, la page se termine sur « Effacer ma progression et ma fiche ». Le dernier souvenir de la fiche est un bouton de destruction, pas un pas en avant.

## Points forts

1. **Une seule action, calculée et bien écrite.** Ce qui est dû passe d'abord, puis le cours si on part de zéro, sinon un examen. Le libellé s'accorde (« Revoir ma question du jour » contre « Revoir mes 10 questions du jour ») et se place sous le titre, avant tout chiffre. C'est la bonne réponse à « pourquoi j'ouvre cette page ».
2. **L'honnêteté du calcul.**
   - « Comment c'est compté » dit les poids, la règle des deux jours et la raison (« la correction était encore à l'écran »).
   - Le rouge est réservé aux ratées, jamais à « pas encore retenu ».
   - La fiche vide ne montre aucun zéro.
   - Le paragraphe sur le changement de comptage s'éteint de lui-même le 10 octobre.
   - Tout est conforme au principe produit « le site dit ce qu'il sait ».
3. **L'historique d'examens et le rappel.**
   - Une barre par examen, le trait jaune à 35/40, et le verdict écrit en mots (« reçu », « recalé ») en plus de la couleur, ce qui respecte WCAG 1.4.1.
   - Le rappel de la raison n'apparaît que le jour où ça coince.
   - Le sombre est travaillé : texte discret à 9,7:1, part « vu » éteinte à `#9f8433` pour garder 3,2:1 contre le retenu.

## Problèmes prioritaires

### [P1] L'indice contredit l'examen et se contredit lui-même

**Quoi.** Au lendemain d'un 31/40, la fiche affiche « 36 / 100 », puis « Tu démarres », puis « L'indice part de ce que tu as vu et retenu. Une leçon ou une série de questions, et il bouge. » La phrase du palier `demarre` est fixe dans `PALIERS` : elle ignore que 35 des 36 points viennent des examens. Dans la jauge, cette part de 45 points est peinte en `--filet-fort`, la couleur des filets et des rails vides. La plus grosse contribution se lit donc comme du vide, et la légende « Vu 1 sur 20 » se lit comme « 1 question sur 20 ».

**Pourquoi ça compte.** C'est l'écran que le candidat ouvre pour savoir s'il est prêt. Un 78 % à l'épreuve qui devient « tu démarres » démoralise et fait douter du calcul, au moment même où le rappel tente de le remotiver.

**Correctif.**
- Écrire la phrase du palier à partir de la part qui manque le plus, et non du seul palier (par exemple « Ton examen tient déjà 35 points. Ce qui manque : retenir, c'est-à-dire revoir demain ce que tu as réussi aujourd'hui. »).
- Renommer le palier quand un examen existe déjà.
- Peindre la part examens en marine plein, et le retenu dans une autre teinte de la gamme.
- Écrire « points » dans la légende (« Vu : 1 point sur 20 »).

**Commande suggérée :** `/impeccable clarify`

### [P1] Au lendemain d'un recalé, la fiche rappelle la raison mais pas l'examen

**Quoi.** En tête au téléphone : le titre, l'encart « Tu passes ce permis pour… », le bouton, l'indice. Le 31/40 et ce qu'il manquait ne sont qu'à 3 127 px, sous « À reprendre en premier » et les 14 lignes de « Thème par thème ». Le rappel n'a aucun lien avec un plan pour passer de 31 à 35.

**Pourquoi ça compte.** C'est le moment le plus sensible du parcours, celui que le produit dit vouloir traiter. Il arrive avec un rappel affectif et aucun chemin concret : la règle pic-fin est ratée.

**Correctif.**
- Tant que le dernier examen est recalé, placer sous le rappel une ligne factuelle : « Hier, 31 sur 40 : quatre bonnes réponses de trop peu. »
- Placer juste dessous les trois notions qui ont coûté.
- Remonter « Examens blancs » au-dessus de « Thème par thème ».

**Commande suggérée :** `/impeccable layout`

### [P1] Deux objectifs du jour qui se contredisent, et un bouton qui promet trop

**Quoi.**
- Jour J : « Objectif du jour fait, et 20 de plus. », puis deux lignes plus bas « environ 28 par jour pour toutes les voir ».
- Plusieurs jours : « Encore 12 pour l'objectif. » contre « environ 46 par jour », et un bouton « Revoir mes 216 questions du jour ».
- Le grand chiffre est plafonné (« 20 sur 20 questions » avec 40 faites).

**Pourquoi ça compte.** Le candidat ne sait plus s'il a fini sa journée. Un compte de 216 en face d'un objectif de 20 fait peur et invite à fermer la page.

**Correctif.**
- Un seul nombre par jour. Quand la date exige plus que le rythme choisi, le dire dans le bloc objectif, avec le geste (« Ton examen est dans 8 jours : à 20 par jour, tu ne verras pas tout. Passer à 40 »).
- Libeller le bouton d'après la taille réelle de la série et non le stock (« Revoir 20 questions dues, 196 attendront demain »). À vérifier : ce que `/revoir` joue réellement.

**Commande suggérée :** `/impeccable clarify`

### [P2] Bouton destructif collé à « Annuler », focus perdu

**Quoi.** Dans la confirmation d'effacement, « Annuler » et « Oui, tout effacer » sont séparés de 0 px. `.jeu__actions` n'a de règle que dans `app.css` (sous `html[data-app]`) : sur le site, la boîte n'est pas stylée. C'est le même défaut que celui documenté pour `.signaler` dans `profil.css`. De plus, le bouton « Effacer ma progression et ma fiche » disparaît au clic et le focus retombe sur `body`.

**Pourquoi ça compte.** Sur un téléphone, à une main, le mauvais pouce efface douze jours de révision sans retour possible. Au clavier, on perd sa place.

**Correctif.**
- Ajouter dans `profil.css` : `.fiche .jeu__actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }`.
- Donner le focus à « Annuler » à l'ouverture de la confirmation.
- Envisager « Oui, tout effacer » en second à gauche ou sur sa propre ligne.

**Commande suggérée :** `/impeccable harden`

### [P2] Des mots mis entre guillemets dans la bouche du candidat

**Quoi.** Le candidat coche « Louer un bateau en vacances ». La fiche, l'accueil et le résultat écrivent ensuite « Tu passes ce permis pour « louer un bateau cet été, sans demander à personne » ». Les guillemets attribuent la phrase au candidat. « Cet été » est affiché un 4 octobre. Les réglages reprennent la même paraphrase entre guillemets sous « Pourquoi tu passes le permis », comme si c'était sa réponse.

**Pourquoi ça compte.** Le rappel tire sa force du fait d'être les mots du candidat. Une paraphrase datée et lyrique sonne faux, et « sans demander à personne » prête une intention. C'est précisément le ton marketing que la marque refuse.

**Correctif.**
- Guillemets seulement pour la phrase tapée (`profil.phrase`). Pour une case, pas de guillemets.
- Retirer des `rappel` de `MOTIVATIONS` tout repère de saison (« cet été ») et toute intention ajoutée.
- Dans les réglages, afficher le libellé de la case cochée, pas le rappel.

**Commande suggérée :** `/impeccable clarify`

## Signaux d'alerte par persona

### Camille, candidat qui révise au téléphone, revenu le lendemain d'un examen recalé (persona projet)

- Dans la nav à 390 px, « Guide » et « Ta fiche » sont hors champ : la barre défile sur 578 px et s'efface en dégradé. Même en faisant défiler, « Ta fiche » n'est pas soulignée, faute d'`aria-current`.
- Le premier écran est juste : prénom, raison, un bouton.
- « Revoir mes 40 questions du jour » se lit comme « recommence l'examen ».
- 36/100 « Tu démarres » contredit son 31/40.
- Son 31/40 n'apparaît qu'au quatrième écran défilé.
- « Une question avant ce soir, et la série tient. » est bien vu.
- « Relire ce que j'ai raté », le geste le plus utile ce jour-là, est un lien inline de 16 px de haut dans une phrase grise.

### Sam, accessibilité

- Le focus est perdu à l'ouverture de la confirmation d'effacement (`document.activeElement` est `body`).
- La bande des quatorze jours annonce quatorze éléments « 21 septembre : 0 réponse » à la suite. Une phrase de synthèse suffirait.
- Les noms accessibles des lignes de thèmes collent nom et compte (« Titre de conduite1 ratée sur 2 vues, 25 en banque »).
- Bons points :
  - la jauge a un `role="img"` étiqueté, et sa légende est en `aria-hidden` ;
  - le statut « atteint » / « à atteindre » des jalons est porté par un texte masqué ;
  - après effacement, le focus va sur le `h1`.

### Jordan, premier passage

- La fiche vide est claire.
- « un examen blanc dit en dix minutes » est faux : 13 min 20.
- Une fois des données présentes, « Vu 1 sur 20 », « Retenu 0 sur 35 » et « 0 retenue sur 1 vue » pour une question réussie demandent d'ouvrir « Comment c'est compté ».
- Jalon non atteint : « Trois examens reçus d'affilée — Les trois derniers, tous reçus. » se lit comme acquis.

## Observations mineures

- **[P2] Nav sans page courante.** `Base.astro` l. 93 calcule `courant()` sur `Astro.url.pathname`, qui vaut `/profil.html` en format `file`. Résultat : aucun `aria-current` sur `/profil` (ni sur `/examen`), alors que `/profil/depart` et `/cours` l'ont. Le correctif est `cheminServi()` de `seo.ts`.
- **Tri des thèmes illisible.** L'ordre « Les plus fragiles d'abord » repose sur retenues − ratées, mais la ligne ne montre les ratées que si rien n'est retenu. Montrer les deux comptes, ou les ratées en rouge partout.
- **Guillemets.** Le rappel a `quotes: '« ' ' »'`, alors que le `<q>` des réglages garde les guillemets du navigateur, sans espaces (« «louer… personne» »).
- **Encart du rappel.** Son fond jaune pâle est la couleur de la proposition cochée. `DESIGN.md` dit qu'un chapeau ne se distingue « par la largeur 125 % et la graisse 600, rien d'autre ».
- **Cases du questionnaire.** À l'étape 1 (choix multiple), les cases ont un rayon de 0,625 rem sur 1,35 rem et paraissent rondes, donc se lisent comme des boutons radio.
- **Compteur du questionnaire.** « 1 sur 6 » pour sept écrans (« C'est noté » en plus) : sans gravité. « C'est la seule réponse qu'on te relira », alors que prénom, rythme et date sont réutilisés : à nuancer.
- **Confirmation d'effacement.** Elle oublie le prénom dans la liste de « ce qui part ».
- **Chiffre de l'objectif plafonné.** « 20 sur 20 questions » avec 40 faites, puis « et 20 de plus ». Afficher 40.
- **Bande des quatorze jours.** À 390 px, le contour jaune du jour courant déborde de 3 px la colonne (370 → 373).
- **Statut d'effacement.** « Fiche effacée. » est en bas de page pendant que la page remonte en défilement doux. Le nouveau `h1` suffit, mais le statut est perdu.
- **Fin de page.** La page se termine sur la zone de danger. Les réglages pourraient vivre sur leur propre écran, ou au moins venir après un dernier geste utile.
- **« Modifier mes réponses ».** Cible de 19 px de haut dans les réglages.

## Questions provocantes

- Et si, le jour d'un recalé, la fiche n'était pas la fiche ? Juste : « Hier, 31 sur 40, il en fallait 35 », ta raison, les trois notions, un bouton.
- L'indice sur 100 sert-il le candidat, ou l'épreuve a-t-elle déjà la seule échelle qui compte, « X sur 40, il en faut 35 » ?
- À quoi servent 14 lignes de thèmes quand « À reprendre en premier » a déjà trié ? Une ligne repliable « les 14 thèmes » suffirait-elle ?
- Pourquoi les réglages et le bouton d'effacement vivent-ils au bout de la page de motivation ?
- À quoi ressemblerait une fiche qui emprunte au livret du candidat ou au carnet de bord, plutôt qu'au tableau de bord d'une appli de langue ?
