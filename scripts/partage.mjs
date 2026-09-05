#!/usr/bin/env node
/**
 * Dessine l'image de partage du site.
 *
 *     node scripts/partage.mjs            # écrit public/partage/
 *     node scripts/partage.mjs --verifier # échoue si le fichier livré a dérivé
 *
 * C'est la seule image que voient ceux qui n'ont pas encore ouvert le site :
 * une carte posée sur la table, terre en haut, eau en bas, filet gradué comme
 * une neatline. La palette est celle de `src/styles/global.css`, à la valeur
 * près, pour qu'un lien partagé ressemble à la page qu'il ouvre.
 *
 * Le nombre de questions est lu dans `data/questions/` à l'exécution : écrit en
 * dur, il aurait vieilli au premier lot.
 *
 * Une réserve à connaître avant de toucher au dessin : la rastérisation ne voit
 * pas les polices du site, qui ne sont livrées qu'en woff2. Le titre est donc
 * composé dans la pile de sérifs du système, celle-là même que `--serif` cite
 * en repli. Toute mesure de texte est faite à l'œil sur le PNG produit, pas par
 * le code : rallonger une phrase demande de rouvrir l'image.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));
const QUESTIONS = join(RACINE, 'data', 'questions');
const SORTIE = join(RACINE, 'public', 'partage');
const FICHIER = join(SORTIE, 'le-permis-cotier.png');

const LARGEUR = 1200;
const HAUTEUR = 630;

// Reprises telles quelles de `:root` dans src/styles/global.css.
const PAPIER = '#f2ecdd';
const EAU = '#cddfe2';
const EAU_PROFONDE = '#a8c4c9';
const ENCRE = '#16231f';
const ENCRE_DOUCE = '#4a5a54';
const MAGENTA = '#b0005c';
const FILET = '#b9ae95';

/** La pile de sérifs de `--serif`, sans la variable, qui n'existe pas ici. */
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
/** Celle de `--sans`. Archivo n'est pas installée, Helvetica prend le relais.
 */
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/**
 * Compte les questions publiées. On lit le statut à la ligne plutôt que de
 * parser le YAML : un `statut:` en début de ligne ne peut être que celui du
 * document, les champs imbriqués étant tous indentés.
 */
function questionsPubliees() {
  let total = 0;
  for (const theme of readdirSync(QUESTIONS, { withFileTypes: true })) {
    // `_inbox` est un brouillon hors git : il n'est pas publié.
    if (!theme.isDirectory() || theme.name.startsWith('_')) continue;
    for (const fichier of readdirSync(join(QUESTIONS, theme.name))) {
      if (!fichier.endsWith('.yaml')) continue;
      const texte = readFileSync(join(QUESTIONS, theme.name, fichier), 'utf-8');
      if (/^statut:\s*publie\s*$/m.test(texte)) total += 1;
    }
  }
  return total;
}

function versionBanque() {
  return readFileSync(join(RACINE, 'data', 'VERSION'), 'utf-8').trim();
}

/**
 * La graduation d'une carte marine : des segments alternés, noirs et blancs,
 * le long du cadre. C'est ce qui fait reconnaître une carte avant même d'avoir
 * lu quoi que ce soit.
 */
function graduation(x, y, longueur, pas, horizontale) {
  const traits = [];
  for (let i = 0; i * pas < longueur; i += 1) {
    if (i % 2 === 1) continue;
    const debut = i * pas;
    const fin = Math.min(debut + pas, longueur);
    traits.push(
      horizontale
        ? `<rect x="${x + debut}" y="${y}" width="${fin - debut}" height="4" fill="${ENCRE}"/>`
        : `<rect x="${x}" y="${y + debut}" width="4" height="${fin - debut}" fill="${ENCRE}"/>`,
    );
  }
  return traits.join('');
}

function composer({ questions, themes }) {
  // Le cadre : une réserve claire, un filet gradué, une marge intérieure.
  const M = 34; // marge du cadre
  const cadre = { x: M, y: M, l: LARGEUR - 2 * M, h: HAUTEUR - 2 * M };
  // Le trait de côte : au-dessus la terre en papier, au-dessous l'eau.
  const cote = 430;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}" viewBox="0 0 ${LARGEUR} ${HAUTEUR}">
  <rect width="${LARGEUR}" height="${HAUTEUR}" fill="${PAPIER}"/>

  <!-- L'eau, et deux lignes de sonde qui s'en éloignent. -->
  <rect x="0" y="${cote}" width="${LARGEUR}" height="${HAUTEUR - cote}" fill="${EAU}"/>
  <path d="M0 ${cote + 52} C 220 ${cote + 26}, 430 ${cote + 78}, 700 ${cote + 44} S 1050 ${cote + 20}, ${LARGEUR} ${cote + 58}"
        fill="none" stroke="${EAU_PROFONDE}" stroke-width="2"/>
  <path d="M0 ${cote + 118} C 260 ${cote + 96}, 470 ${cote + 142}, 760 ${cote + 108} S 1080 ${cote + 88}, ${LARGEUR} ${cote + 124}"
        fill="none" stroke="${EAU_PROFONDE}" stroke-width="2" stroke-dasharray="10 8"/>
  <line x1="0" y1="${cote}" x2="${LARGEUR}" y2="${cote}" stroke="${ENCRE}" stroke-width="2"/>

  <!-- Le cadre gradué. -->
  <rect x="${cadre.x}" y="${cadre.y}" width="${cadre.l}" height="${cadre.h}"
        fill="none" stroke="${FILET}" stroke-width="1"/>
  <rect x="${cadre.x - 10}" y="${cadre.y - 10}" width="${cadre.l + 20}" height="${cadre.h + 20}"
        fill="none" stroke="${FILET}" stroke-width="1"/>
  ${graduation(cadre.x, cadre.y - 8, cadre.l, 40, true)}
  ${graduation(cadre.x, cadre.y + cadre.h + 4, cadre.l, 40, true)}
  ${graduation(cadre.x - 8, cadre.y, cadre.h, 40, false)}
  ${graduation(cadre.x + cadre.l + 4, cadre.y, cadre.h, 40, false)}

  <!-- Terre : le nom, la promesse. -->
  <text x="86" y="150" font-family="${SANS}" font-size="21" letter-spacing="4.5"
        fill="${ENCRE_DOUCE}">RÉVISION DU PERMIS PLAISANCE, OPTION CÔTIÈRE</text>
  <line x1="86" y1="178" x2="330" y2="178" stroke="${MAGENTA}" stroke-width="3"/>

  <text x="82" y="286" font-family="${SERIF}" font-size="104" fill="${ENCRE}">Le Permis Côtier</text>

  <text x="86" y="356" font-family="${SANS}" font-size="30" fill="${ENCRE_DOUCE}">Examens blancs au format de l’épreuve, et entraînement par thème.</text>

  <!-- Eau : ce que la banque contient, et sa marque de correction. -->
  <circle cx="98" cy="${cote + 76}" r="9" fill="${MAGENTA}"/>
  <text x="126" y="${cote + 87}" font-family="${SANS}" font-size="32" font-weight="600" fill="${ENCRE}">${questions} questions publiées, sur les ${themes} thèmes du programme.</text>
  <text x="126" y="${cote + 140}" font-family="${SANS}" font-size="25" fill="${ENCRE_DOUCE}">Chacune cite le texte réglementaire dont elle est tirée. Gratuit, sans inscription.</text>
</svg>`;
}

const questions = questionsPubliees();
// Les quatorze thèmes de l'arrêté : la table vit dans src/lib/themes.ts, qui
// est du TypeScript ; on y compte les entrées plutôt que d'écrire le nombre.
const themes = (
  readFileSync(join(RACINE, 'src', 'lib', 'themes.ts'), 'utf-8').match(/^ {4}code: '/gm) ?? []
).length;

const svg = composer({ questions, themes });
// Rendu au double, puis réduit : le texte y gagne, la rastérisation ne
// disposant d'aucun hinting. `density` 144 vaut deux fois les 72 ppp que
// librsvg prend par défaut pour un pixel d'SVG.
const png = await sharp(Buffer.from(svg), { density: 144 })
  .resize(LARGEUR, HAUTEUR)
  .png({ compressionLevel: 9 })
  .toBuffer();

if (process.argv.includes('--verifier')) {
  if (!existsSync(FICHIER) || !readFileSync(FICHIER).equals(png)) {
    console.error('partage : l’image livrée ne correspond plus au script. Lancer `npm run partage`.');
    process.exit(1);
  }
  console.log('partage : l’image livrée est à jour.');
} else {
  mkdirSync(SORTIE, { recursive: true });
  writeFileSync(FICHIER, png);
  console.log(
    `partage : ${FICHIER.replace(RACINE + '/', '')} — ${LARGEUR}×${HAUTEUR}, ` +
      `${questions} questions, ${themes} thèmes, banque ${versionBanque()}.`,
  );
}
