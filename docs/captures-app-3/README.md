# Captures du lot 3b — la boucle de retour

Chromium headless (`chrome-headless-shell`, CDP) à 390 × 844, `dist-app/`
servi depuis le disque par interception des requêtes, `html[data-app]` venu du
build. Chaque état est posé dans `localStorage` par le script de capture, hors
du dépôt : rien ne bascule dans le code. `avant-` : `signalement-app` à
`d07305a` ; `apres-` : la branche `app-solide-lot3b`. La barre d'onglets
native n'existe pas dans Chromium.

- `*-accueil-vierge`, `*-examen-depart`, `*-examen-premiere-question` : le
  premier examen depuis un état vierge.
- `*-resultat-examen` : deux examens d'avant sans faute sur les feux et
  marques, puis un troisième joué juste. Après : « Sûr à l'examen ».
- `*-resultat-serie` : les écluses, toutes retenues sauf une réussie la veille,
  puis une série jouée juste. Après : « Retenu ».
- `*-fin-lecon` : toutes les leçons des écluses suivies sauf une, puis
  celle-là. Après : « Parcouru ».
- `*-fiche-themes` : badges posés sur deux thèmes. Après : les paliers gagnés
  et le suivant, sous chaque thème ouvert.
- `*-fiche-jour` : un seul jour d'activité. Avant : « 1 jour de suite » et
  « Une question avant ce soir, et la série tient. » ; après : rien.
- `*-accueil-revoir` : 25 questions dues, rythme de 10, deux jours d'activité.

## Le premier examen, depuis l'icône

L'app ouvre sur l'Accueil. Compté du premier affichage de l'Accueil à la
première question de l'examen blanc.

| | Avant | Après |
|---|---|---|
| Touches | 2 (« Nouvel examen blanc », « Commencer l'examen ») | 2 (« Faire un examen blanc », « Commencer l'examen ») |
| Par l'onglet Examen | 2 (l'onglet, « Commencer l'examen ») | 2 |
| Bouton de l'Accueil dans l'écran sans défiler | oui, à 469 px | oui, à 469 px |
| Écran de départ | titre, encart « Tu n'as encore rien révisé… Commence plutôt par la première leçon », cinq règles | titre, cinq règles |
| Mots sur l'écran de départ | 103 | 74 |
| Liens qui détournent de l'examen | 1 | 0 |
| Bouton « Commencer l'examen » dans l'écran sans défiler | oui (collé en bas) | oui |
| Machine, du chargement de l'Accueil à la question | 1,3 s | 1,3 s |

Aucune permission, aucun questionnaire ne s'interpose : la demande de
notifications ne part qu'à la pose d'une date. Le temps d'une personne (lire,
viser deux boutons) reste à chronométrer au téléphone ; deux touches et 74 mots
le tiennent loin sous trente secondes.

## « À revoir aujourd'hui » contre `/revoir`

| | Avant | Après |
|---|---|---|
| L'Accueil dit | 25 questions à revoir | 10 questions à revoir |
| `/revoir` joue | 10 (« 1 / 10 ») | 10 |
| Le bouton | « Revoir » | « Faire ma série du jour » |
