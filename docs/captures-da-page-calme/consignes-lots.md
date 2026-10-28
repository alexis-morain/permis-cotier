# Consignes communes aux lots du chantier « page calme »

Chantier de direction artistique de permis-cotier (site https://lepermiscotier.fr
et coquille iOS Capacitor), décidé par Alexis le 28 octobre 2026. **Seule la
forme change** : les écrans, le parcours, les textes et la logique de la 1.0.7
restent. Tu ne changes pas un mot de copie sauf si une consigne de lot le dit.

## À lire d'abord, dans cet ordre

1. `DESIGN.md` à la racine de ton worktree : le nouveau système, la référence.
2. La maquette validée :
   `/Users/alex-pack/Documents/08_IA/02_Outputs/permis-cotier/maquettes/2026-10-28-da-quiet/apres.html`
   (ouvre-la aussi en image : `apres-planche.png`, `apres-site-accueil.png`,
   `apres-site-examen.png`, `apres-app.png` dans le même dossier ; `avant-*.png` = l'état actuel).
3. `CLAUDE.md` du dépôt : les pièges de code (typographie posée au build,
   `siteSansApp()`, `POUR_APP`, `:hover` sous garde, etc.).
4. `src/styles/global.css` : les jetons et les classes communes déjà posées
   (`.bouton`, `.bouton--principal`, `.bouton--discret`, `.encadre`, `.etiquette`
   et `.etiquette--bleu|rose|sable|orange|juste|faux`, `.pastille`, `.segmente`,
   `.champ`, `.rappel`, `.discret`). `src/lib/groupes.ts` : `groupeDuTheme(code)`
   rend `{ couleur, nom }` pour l'étiquette d'un thème.

## Les jetons

Existants (valeurs neuves) : `--fond`, `--fond-carte` (blanc), `--fond-2` (lavis
`#f7f7f5`), `--filet` (`#e9e9e7`), `--filet-fort` (bord de champ, 3:1), `--texte`
(`#37352f`), `--texte-doux`, `--jaune` (`#ffc72c`), `--vert`, `--vert-texte`,
`--vert-pale`, `--rouge`, `--rouge-texte`, `--rouge-pale`, `--voile`, `--mesure`
(40rem), `--rayon` (10px, panneaux), `--rayon-petit` (6px, contrôles),
`--transition`.
Nouveaux : `--action` (`#191918`), `--action-survol`, `--sur-action`, `--teinte`
(fond de ce qui est choisi), `--lien`, `--anneau`, `--sur-verdict` (signe posé
sur `--vert`/`--rouge` plein), `--sur-jaune`, `--rayon-etiquette` (4px),
`--ombre-flottante`, et pour les groupes `--bleu|--rose|--sable|--orange` avec
`-texte` et `-trait`.

**Retirés, à faire disparaître de tes fichiers** : `--marine`, `--marine-2`,
`--brume`, `--brume-2`, `--blanc`, `--jaune-vif`, `--jaune-sombre`,
`--jaune-pale`, `--accent`, `--jauge`, `--bande`, `--bande-texte`,
`--bande-doux`, `--marque-fond`, `--marque-cone`, `--panneau`,
`--panneau-filet`, `--fenetre-filet`, `--large`, `--bord`. Le test
`src/styles/jetons.test.ts` liste chaque `var()` orphelin : **aucun ne doit
rester dans les fichiers de ton lot** (les autres lots s'occupent des leurs ;
le test entier ne passera qu'à la fusion).

## Les règles de forme (résumé de DESIGN.md, la maquette fait foi)

- Page blanche, plus aucune bande pleine largeur colorée (marine ou autre).
- Police du système partout : supprime tout `font-stretch`, toute graisse 800
  (passe à 700 pour display et grands chiffres, 600 ailleurs), tout `letter-spacing`
  positif.
- Bordures **1 px** partout (plus de 2 px sauf anneau de focus, soulignement de
  l'onglet courant, lien survolé). Coins : 4 px marques, 6 px contrôles, 10 px panneaux.
- **Aucune ombre** hors ce qui flotte (`--ombre-flottante` : fenêtre de recherche,
  feuille de correction de l'app). Supprime tous les « bords pleins »
  `box-shadow: 0 var(--bord) 0 …` et leurs `:active` qui les effacent.
- Le **jaune** n'existe plus que pour : le bouton principal de l'app, le glyphe de
  la marque, le pavillon Q du reçu, les dessins de marques cardinales. Tous les
  soulignements jaunes, traits jaunes, jauges jaunes, fonds jaune pâle passent :
  soulignement en `--lien` ou `currentColor`, jauge en `--texte`, fond pâle en
  `--fond-2` ou `--teinte`.
- Vert et rouge : le verdict seul, toujours avec un mot ou un signe.
- Le marine disparaît : texte en `--texte`, fonds en `--fond`/`--fond-2`, actions
  en `--action`.
- Liens : couleur `--lien` dans le texte (déjà posé par `a` dans global.css). Dans
  une navigation, une liste de liens, un titre-lien : `color: inherit;
  text-decoration: none`, souligné au survol.
- Les étiquettes de groupe (`.etiquette--{couleur}` avec `groupeDuTheme`) là où un
  thème est nommé dans une liste ou un en-tête de question, comme la maquette.
- Mouvement : transform et opacité seulement, 120 à 200 ms, tout coupé sous
  `prefers-reduced-motion` (`src/styles/mouvement.test.ts` le vérifie sur
  global, quiz, profil, lecon, recherche). Tu ne crées aucun nouveau moment animé.
- Accessibilité : 4,5:1 texte, 3:1 bords de contrôle, texte fonctionnel ≥ 11 px
  (0,6875 rem), cibles 44 px dans l'app. Toute nouvelle paire de couleurs
  (texte sur fond) que tu crées hors des jetons doit être ajoutée à
  `src/styles/contraste.test.ts`, mais **préfère les jetons**.

## Les limites dures

- Ne touche **pas** `src/styles/global.css`, `DESIGN.md`, `src/lib/groupes.ts`,
  ni les fichiers d'un autre lot (liste dans ton lot). Si une classe commune te
  manque, définis-la dans un fichier de ton lot, ou dis-le dans ton rapport.
- `POUR_APP` est à 40 sur 40 dans `src/components/` (`docs/budgets.md`) :
  **aucune nouvelle mention**. Ce qui ne vaut que pour l'app passe par une règle
  CSS sous `html[data-app]` dans `src/styles/app*.css` (lot app seulement) ou
  par le composant qui existe déjà.
- Budget d'`/examen` (`docs/budgets.md`, `node scripts/verifier-budgets.mjs`
  après `npm run build`) : reste dans la marge. Si c'est impossible, dis
  combien et pourquoi dans ton rapport, ne change pas le chiffre toi-même.
- Pas de changement de `data/`, ni des SVG de `public/visuels/`.
- Pas de Prettier, pas de reformatage hors de tes lignes.
- Ne recopie pas d'espace insécable à la main ; la typographie est posée au build.
- Commente comme le code autour : commentaires en français qui disent le
  *pourquoi*. Réécris les commentaires qui décrivaient l'ancien parti (marine,
  Archivo, bord plein, jaune) au lieu de les laisser mentir.

## Travailler

Ton worktree est déjà créé sur sa propre branche. Dedans :

```bash
npm ci --no-audit --no-fund          # une fois ; jamais de node_modules en lien
git branch --show-current            # avant chaque commit
npx vitest run <tes tests>           # tests ciblés
npx astro build                      # dist/ du site ; CIBLE=app : npm run build:app → dist-app/
```

**Regarde tes rendus**, c'est le cœur du travail : les tests ne voient pas
l'écran. L'outil de capture :

```bash
node docs/captures-da-page-calme/capture.mjs dist /tmp/<lot>-captures plan.json
```

Le plan est une liste JSON de prises (`nom`, `chemin`, `largeur`, `hauteur`,
`sombre`, `pleine`, `app`, `stockage` pour semer `localStorage`, `script` pour
cliquer). Le site se capture en 1280 et en 390 px, clair et sombre ; l'app sur
`dist-app` avec `"app": true` (390 × 844). Lis les PNG produits avec ton outil de
lecture d'image et compare-les à la maquette. La progression est dans
`localStorage['permis-cotier:progression']` (format dans `src/lib/progression.ts`,
`src/lib/profil.ts`), la date d'examen dans `permis-cotier:date-examen` :
sème des états réalistes (candidat qui revient, examens passés, reçu et recalé).
Les builds de `main` (l'avant) sont dans
`/Users/alex-pack/.local/share/opencode/worktree/5425edc8f602428458e65e5a650f6da6ddffdecd/da-avant-main/`
(`dist-site/` et `dist-app/`), utiles pour comparer.

Tests qui ne doivent pas rougir à cause de toi : `npm test` entier hors
`jetons.test.ts` (qui doit être vert pour tes fichiers), `npx astro check
--minimumSeverity error`, `node scripts/verifier-css-mobile.mjs dist-app`,
`node scripts/verifier-typographie.mjs dist`, `node scripts/verifier-budgets.mjs`.
Si un test existant vérifie une classe ou un texte que tu changes, adapte le test
seulement si le changement est de forme (classe CSS), jamais pour masquer une
régression de comportement.

## Livrer

Commits en français, sujet court, corps qui dit le pourquoi ; git signe déjà en
noreply, ne touche pas à la config. Ne pousse rien, n'ouvre pas de PR, ne fusionne
rien. Ton rapport final : ce que tu as changé par écran, les captures finales
(chemins des PNG, 1280 et 390, clair et sombre), ce que tu n'as pas pu faire ou
dont tu doutes, l'état des tests ci-dessus, et le SHA de ton dernier commit.
