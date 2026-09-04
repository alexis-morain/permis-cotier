# Product

<!-- impeccable:product-schema 1 -->

Fiche produit écrite depuis le CLAUDE.md du projet et le dépôt, sans entretien :
les faits marqués « inféré » attendent confirmation d'Alexis.

## Platform

web

## Users

Candidats au permis plaisance option côtière, en France, qui révisent l'épreuve
théorique seuls, souvent sur téléphone, entre deux autres choses. Ils veulent
savoir s'ils sont prêts, et comprendre pourquoi une réponse est juste. Inféré :
tous âges adultes, beaucoup révisent dans les jours qui précèdent l'examen.

## Product Purpose

Faire passer des examens blancs au format 2022 de l'épreuve (quarante questions,
une ou deux bonnes réponses, cinq erreurs admises, vingt secondes par question)
et s'entraîner thème par thème. Le succès, c'est un candidat qui arrive à
l'épreuve en sachant à quoi elle ressemble et où sont ses trous.

## Positioning

Chaque question part d'un texte réglementaire et le cite, article compris, sous
l'explication. Gratuit, sans compte, sans cookie, code et banque ouverts. Aucun
concurrent ne trace ses questions à l'article.

## Operating Context

Session courte, un écran de jeu à la fois, souvent sur un téléphone de 375 px de
large. L'examen blanc est chronométré, l'entraînement corrige après chaque
réponse. La progression reste dans le navigateur. Le site fonctionne hors ligne
une fois visité (PWA).

## Capabilities and Constraints

- Astro 5 statique, îlot React pour l'écran de jeu, déploiement Cloudflare Workers.
- Banque en YAML, un fichier par question, 14 thèmes, visuels SVG dessinés par
  le code (feux, balisage, écluses, carte, rythmes animés, situations).
- Aucun visuel dont dépend une réponse n'est produit par un générateur d'images.
- Le format de l'épreuve n'est pas entièrement dans l'arrêté du 28 septembre
  2007 : les vingt secondes et la règle des deux réponses viennent des opérateurs
  agréés, et se citent comme tel.
- Domaine non choisi, indexation fermée tant que l'hôte finit par `.workers.dev`.

## Brand Commitments

- Nom : « Permis côtier », sous-titre « révision ».
- Voix : tutoiement, phrases courtes, aucun jargon, aucune accroche marketing
  (voir le style d'écriture d'Alexis).
- Auteur nommé, Alexis Morain, page « à propos » et compte de relecture calculé
  au build dans le pied de page.
- Contrainte visuelle posée par Alexis le 2026-09-05 : direction reconnaissable
  et intuitive, inspirée des applications d'apprentissage (Duolingo, Anki,
  Babbel), sans beige, sans les tics des interfaces générées.

## Evidence on Hand

- 264 questions publiées, 55 visuels (`public/visuels/`), 14 thèmes.
- Sources réglementaires extraites dans `data/sources/`.
- Aucun témoignage, aucun chiffre de réussite : ne pas en inventer.

## Product Principles

1. Le format de l'épreuve d'abord : tout ce qui est affiché en jeu sert à
   répondre ou à savoir où on en est.
2. La source est visible, jamais cachée derrière un clic de plus.
3. Un écran de téléphone suffit : question, visuel et propositions tiennent dans
   une hauteur d'écran.
4. Le site dit ce qu'il sait et ce qu'il ne sait pas (relecture, format,
   pondération).

## Accessibility & Inclusion

Contraste corps 4,5:1, clavier complet sur l'écran de jeu (A à D, Entrée),
`prefers-reduced-motion` respecté, cibles tactiles de 44 px.
