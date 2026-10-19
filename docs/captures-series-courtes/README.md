# Captures : séries de 10 par thème

Chromium headless (`chrome-headless-shell`, CDP) à 390 × 844, deux fois
(clair, sombre), profil neuf, `dist-app/` servi par `capturer.mjs` lui-même.
`avant-` : `eef7d82`, base de `main`. `apres-` : la branche `app-series-courtes`.
Thème des écluses (18 questions), première proposition cochée, sauf une question
sur quatre où c'est la deuxième : un mélange de justes et de faux.

- `*-question` : la première question. « 1 / 18 » devient « 1 / 10 ».
- `*-fin-serie` : l'écran de fin, en haut. Avant : « 10 / 18 », la note du thème,
  « Revoir mes erreurs » ; après : « 5 sur 10 », la liste des réponses.
- `*-fin-serie-complet` : la page entière. Après : les dix lignes, « Encore 10 »
  en bouton principal, « Changer de thème » en lien.
- `apres-fin-serie-ligne-ouverte-*` : une ligne « Faux » ouverte (réponse
  cochée, bonne réponse, explication, source).

Rejouer : `npm run build:app`, puis
`node docs/captures-series-courtes/capturer.mjs apres 4362 <sortie> dist-app`.
