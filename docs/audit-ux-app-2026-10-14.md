# Audit `ux-heuristics` des cinq onglets de l'app, 14 octobre 2026

Plan « app solide », lot 3b. Lu sur `dist-app/` de la branche `app-solide-lot3b`
(partie de `signalement-app`, `d07305a`), en Chromium 390 × 844 avec
`html[data-app]`, et dans le code des écrans. La barre d'onglets native
(`ios/App/App/BarreOnglets.swift`) est lue dans le Swift : Chromium ne la
montre pas.

Quatre contrôles demandés par le plan : le Trunk Test (le titre de l'écran est
le libellé de l'onglet), un terme par concept (« examen » partout, jamais
« test » ni « quiz » visibles), des libellés verbe + nom, l'état « tu es ici ».
Puis les heuristiques de Nielsen sur ce qui s'est présenté en chemin.

## Sévérités

Échelle du skill (0 à 4), rangée en trois priorités :

- **P1** : sévérité 3 ou 4, ou une règle du plan enfreinte sur un chemin
  quotidien. Corrigé dans ce lot.
- **P2** : sévérité 2. Listé, avec une recommandation.
- **P3** : sévérité 1, cosmétique.

## Note

**Avant : 6/10.** Trois lignes du diagnostic rapide en échec : « le système
dit-il ce qui se passe » (le compte de « À revoir aujourd'hui » était faux),
« la navigation est-elle claire » (libellés de l'Accueil sans objet, autres mots
que la Fiche pour les mêmes destinations), « quelque chose fait-il dire
“hein ?” » (l'encart qui déconseille l'examen qu'on vient de demander).

**Après : 8/10.** Restent deux lignes en échec, de sévérité 2 : la navigation
entre onglets (P2-1) et deux systèmes de récompense sur la Fiche (P2-2). Pour
10/10 : les corriger, comme dit plus bas.

## Les quatre contrôles

### Trunk Test : titre de l'écran contre libellé de l'onglet

| Onglet | Libellé (Swift) | Titre `h1` | Verdict |
|---|---|---|---|
| Accueil | Accueil | « Accueil », caché à l'œil, lu par VoiceOver | Tenu (P3-1) |
| Cours | Cours | « Le cours » | Tenu |
| Examen | Examen | « Examen blanc » | Tenu : l'onglet abrège |
| Entraînement | Entraînement | « Entraînement » | Tenu |
| Fiche | Fiche | « Ta fiche » | Tenu |

### Un terme par concept

- **« test », « quiz »** : aucune occurrence sur un écran que l'app atteint.
  Relevé sur le texte de toutes les pages de `dist-app/` et les chaînes des
  composants. Trois pages en portent, aucune n'est atteignable ou en cause :
  `index.html` (l'accueil du site, que `RouteurDuSite` remplace par
  `/accueil`), `test-permis-cotier/` (page de référencement, sans lien
  entrant dans l'app, P3-3), et une leçon relue (P2-4).
- **La série du jour** : l'Accueil l'appelait « Revoir », la Fiche « Faire ma
  série du jour », la page « Ta série du jour ». **P1, corrigé.**
- **L'examen blanc** : l'Accueil disait « Nouvel examen blanc », la Fiche
  « Faire un examen blanc ». **P1, corrigé.**
- **L'examen réel et l'examen blanc** : l'Accueil met « Ton examen » (la date
  de l'épreuve) sous « Examen blanc », et l'onglet s'appelle « Examen ». P2-3.
- **Palier et jalon** : la Fiche a désormais des paliers par thème et, plus
  bas, des « jalons ». P2-2.

### Libellés verbe + nom

| Écran | Avant | Après |
|---|---|---|
| Accueil, bloc du cours | « Commencer », « Continuer » | « Commencer le cours », « Continuer le cours » (les mots de la Fiche) |
| Accueil, à revoir | « Revoir » | « Faire ma série du jour » (comme la Fiche) |
| Accueil, examen blanc | « Nouvel examen blanc » | « Faire un examen blanc » (comme la Fiche) |
| Examen, départ | « Commencer l'examen » | inchangé |
| Résultat | « Revoir mes erreurs », « Refaire un examen », « Partager » | inchangé ; « Partager » seul, P3-2 |
| Cours | « Commencer : Marques latérales », « Reprendre : … » | inchangé |
| Fiche | « Faire ma série du jour », « Faire un examen blanc », « Continuer le cours » | inchangé |

### « Tu es ici »

La barre native marque l'onglet courant (symbole plein, teinte de marque).
Dans Cours, le chapitre en cours a son disque jaune. Ce qui ne tient pas : un
lien qui mène à la racine d'un autre onglet s'ouvre dans l'onglet courant
(P2-1).

## P1, corrigés dans ce lot

1. **« À revoir aujourd'hui » disait un nombre que `/revoir` ne joue pas**
   (sévérité 3, visibilité de l'état du système). 25 questions dues pour une
   série de 10 : l'Accueil disait 25, la série en jouait 10, et le bloc ne
   tombait jamais à zéro en une séance. `aRevoir` (`src/lib/accueil.ts`) borne
   désormais au rythme de la série, comme `serieDuJour`. Mesuré au navigateur :
   avant « 25 questions à revoir » puis « 1 / 10 » ; après « 10 » et « 1 / 10 ».
   L'accueil du site, qui lit le même nombre, suit.
2. **Libellés de l'Accueil sans objet, et autres que ceux de la Fiche pour les
   mêmes destinations** (sévérité 2 ; P1 parce que c'est la règle du plan et le
   déclencheur quotidien de l'app). Voir le tableau ci-dessus.
   `AccueilApp.test.tsx` les tient.
3. **L'encart « Commence plutôt par la première leçon » devant le premier
   examen** (sévérité 2 ; P1 parce qu'il s'interpose entre le bouton et la
   première question, ce que le plan interdit). Retiré dans l'app : la
   première leçon est déjà le premier bloc de l'Accueil. Le site le garde,
   Umami le mesure (`examen-premiere-lecon`).
4. **La série de jours se disait dès un jour, et la Fiche poussait à la tenir**
   (« Une question avant ce soir, et la série tient. »). Décision 2 du plan :
   visible dès deux jours, texte neutre. Corrigé sur la Fiche et l'accueil du
   site ; l'Accueil de l'app le faisait déjà.

## P2, listés

1. **Un lien vers la racine d'un autre onglet s'ouvre dans l'onglet courant.**
   « Faire un examen blanc » depuis l'Accueil ou la Fiche joue l'examen sous
   l'onglet Accueil ou Fiche, pendant que l'onglet Examen garde son propre
   écran ; « Tes erreurs » depuis Entraînement ouvre `/profil/erreurs` dont le
   Retour mène à « Ta fiche », sous l'onglet Entraînement. Rien ne bloque (la
   barre ramène à la racine), mais la barre ne dit plus où l'on est.
   Recommandation : `RouteurDuSite` bascule d'onglet quand un lien vise
   `/examen`, `/cours`, `/entrainement` ou `/profil` à leur racine. C'est du
   Swift, à faire et à voir au simulateur ; c'est aussi un choix de modèle de
   navigation, à trancher par Alexis.
2. **Deux systèmes de récompense sur la Fiche** : les paliers par thème (ce
   lot) et les jalons, dont « Sept jours de suite », un jalon pour la seule
   présence, ce que la règle des badges exclut. Recommandation : retirer le
   jalon des sept jours, puis décider si les jalons restants (cours entier,
   premier examen reçu…) deviennent des paliers ou restent des jalons.
3. **« Ton examen » (la date de l'épreuve) sous « Examen blanc »**, et un onglet
   « Examen » qui ouvre l'examen blanc. Le contenu lève le doute (« Dans 12
   jours »). Recommandation : « Ton épreuve », le mot que les écrans de
   résultat emploient déjà pour l'examen réel.
4. **Une leçon relue dit « énoncé de test »** (`data/cours/titre-examen.yaml`,
   relue par Alexis le 6 septembre). Proposé : « énoncé de question ». Non
   retouché : la leçon est relue, la phrase revient à Alexis.

## P3, cosmétique

1. L'Accueil n'a pas de titre visible : seul VoiceOver lit « Accueil ». Voulu
   par `docs/app-da.md` (« aucun texte de présentation »).
2. « Partager », seul, sous le résultat d'examen : le bouton système d'iOS
   dit la même chose, le contexte suffit.
3. `test-permis-cotier/` et l'accueil du site restent dans le bundle sans
   lien entrant : `elaguer-app.mjs` pourrait les retirer.
