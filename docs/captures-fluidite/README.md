# Fluidité de l'app : mesure avant / après

## Méthode

Chromium headless piloté par CDP (`cdp.mjs`, `mesure.mjs`), 390×844, CPU ralenti ×4, `dist-app/` servi en local. « Avant » = `main` (`eef7d82`), « après » = cette branche. Médiane de 3 passes. `stable` = durée du tap jusqu'à l'écran stable. Deux modes : View Transitions natives (Safari 18) et sans (Safari 16-17).

```
node docs/captures-fluidite/mesure.mjs <port> 4 <étiquette> [safari17]
```

Trois parcours : examen blanc (accueil → examen → bilan), retour d'onglet après une leçon faite ailleurs, Cours (thème → leçons).

## Résultats


### Chromium, View Transitions natives (Safari 18)

| Étape | Stable avant → après (ms) | Mises en page | Recalculs de style | Chargements de page | CLS |
|---|---|---|---|---|---|
| chargement de l’Accueil | 123 → 138 | 4 → 4 | 38 → 37 | 1 → 1 | 0.000 → 0.000 |
| tap « Faire un examen blanc » | 304 → 208 | 26 → 13 | 27 → 20 | 0 → 0 | 0.000 → 0.000 |
| tap « Commencer l’examen » | 18 → 19 | 1 → 1 | 4 → 4 | 0 → 0 | 0.000 → 0.000 |
| dernière réponse → bilan | 10 → 10 | 1 → 1 | 26 → 26 | 0 → 0 | 0.113 → 0.113 |
| tap vers l’Accueil (même onglet) | 305 → 188 | 24 → 11 | 43 → 43 | 0 → 0 | 0.000 → 0.000 |
| retour d’onglet, une leçon faite ailleurs | 50 → 3 | 4 → 1 | 38 → 1 | 1 → 0 | 0.000 → 0.000 |
| chargement de Cours | 114 → 123 | 4 → 4 | 29 → 29 | 1 → 1 | 0.000 → 0.000 |
| tap sur un thème | 356 → 226 | 26 → 13 | 27 → 20 | 0 → 0 | 0.177 → 0.177 |
| tap sur la leçon 1 | 323 → 200 | 25 → 13 | 27 → 23 | 0 → 0 | 0.000 → 0.000 |
| tap sur la leçon 2 | 301 → 197 | 24 → 12 | 24 → 20 | 0 → 0 | 0.000 → 0.000 |

### Chromium sans View Transitions natives (Safari 16 et 17)

| Étape | Stable avant → après (ms) | Mises en page | Recalculs de style | Chargements de page | CLS |
|---|---|---|---|---|---|
| chargement de l’Accueil | 143 → 170 | 4 → 4 | 37 → 35 | 1 → 1 | 0.000 → 0.000 |
| tap « Faire un examen blanc » | 525 → 174 | 6 → 5 | 35 → 17 | 0 → 0 | 0.000 → 0.000 |
| tap « Commencer l’examen » | 22 → 33 | 2 → 1 | 4 → 4 | 0 → 0 | 0.000 → 0.000 |
| dernière réponse → bilan | 12 → 14 | 1 → 1 | 26 → 26 | 0 → 0 | 0.113 → 0.000 |
| tap vers l’Accueil (même onglet) | 504 → 174 | 8 → 4 | 55 → 41 | 0 → 0 | 0.000 → 0.000 |
| retour d’onglet, une leçon faite ailleurs | 54 → 4 | 4 → 1 | 38 → 1 | 1 → 0 | 0.000 → 0.000 |
| chargement de Cours | 102 → 118 | 4 → 4 | 29 → 29 | 1 → 1 | 0.000 → 0.000 |
| tap sur un thème | 538 → 193 | 9 → 6 | 35 → 16 | 0 → 0 | 0.000 → 0.000 |
| tap sur la leçon 1 | 525 → 181 | 12 → 7 | 37 → 21 | 0 → 0 | 0.000 → 0.000 |
| tap sur la leçon 2 | 527 → 184 | 11 → 6 | 35 → 19 | 0 → 0 | 0.000 → 0.000 |

## Constats

- Le `location.reload()` au retour d'onglet coûte peu de CPU (50 ms), mais il fait un chargement complet et un flash blanc que ces chiffres ne montrent pas. Il est remplacé par l'événement `app:progression` : 3 ms, aucun chargement.
- Le glissement coûtait cher sous Safari 16-17 (~520 ms stables, 3 fois plus qu'après). Le fondu de 140 ms, en opacité seule, l'amène à ~180 ms. Le fondu natif de 250 ms du navigateur est coupé.
- Le socle des boutons (hypothèse 4) a été mesuré : 0 à 2 mises en page à l'appui, transitions sur transform et peinture. Rien à changer.
- Prefetch `tap` activé dans l'app seulement.

## Reporté (CLS préexistant, relève du chantier DA)

- CLS 0,177 au tap vers un thème de Cours (natif) : `.parcours` est reconstruit par script après le HTML serveur.
- CLS ~0,11 intermittent au bilan de série (`jeu__actions--collant`).
- CLS ~0,19 à l'entrée d'une série (`UL.propositions`, silhouette du `client:only`), en natif seulement.

## Limites

Mesure en Chromium sur CPU ralenti, pas sur iPhone. Elle ne remplace pas un enregistrement Timelines Safari. Captures `avant-*.png` / `apres-*.png` : états finaux des parcours.
