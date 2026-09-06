#!/usr/bin/env node
/**
 * Dessine l'image de partage du site.
 *
 *     node scripts/partage.mjs            # écrit public/partage/
 *     node scripts/partage.mjs --verifier # échoue si le fichier livré a dérivé
 *
 * C'est la seule image que voient ceux qui n'ont pas encore ouvert le site.
 * Elle montre donc la page qu'elle ouvre : la bande marine de l'accueil, sa
 * ligne de flottaison jaune, le panneau blanc et ses deux grands nombres, et
 * un bouton à bord plein. Palette et formes sont celles de `global.css` et de
 * DESIGN.md, à la valeur près.
 *
 * Le nombre de questions et celui des leçons sont lus sur le disque à
 * l'exécution : écrits en dur, ils auraient vieilli au premier lot.
 *
 * Deux réserves à connaître avant de toucher au dessin.
 *
 * La rastérisation ne voit pas Archivo, qui n'est livrée qu'en woff2 : le
 * texte est composé dans la pile de replis de `--sans`, donc en Helvetica
 * Neue. Elle n'a pas d'axe de largeur, et librsvg ignore `textLength` ; la
 * largeur 125 % du display est donc rendue par une mise à l'échelle
 * horizontale, `LARGE` ci-dessous, appliquée aux seuls titres et grands
 * nombres, comme `font-stretch` sur le site. Helvetica n'ayant pas de graisse
 * au-delà du gras, 800 y rend comme 700.
 *
 * Aucune mesure de texte n'est faite par le code : les retours à la ligne
 * sont écrits à la main et jugés sur le PNG produit. Rallonger une phrase
 * demande de rouvrir l'image.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));
const QUESTIONS = join(RACINE, 'data', 'questions');
const COURS = join(RACINE, 'data', 'cours');
const SORTIE = join(RACINE, 'public', 'partage');
const FICHIER = join(SORTIE, 'le-permis-cotier.png');

const LARGEUR = 1200;
const HAUTEUR = 630;

// Reprises telles quelles de `:root` dans src/styles/global.css.
const MARINE = '#0b1d3a';
const BLANC = '#ffffff';
const JAUNE = '#ffc72c';
const JAUNE_SOMBRE = '#c99a00';
const BANDE_DOUX = '#bcc9df';
const TEXTE_DOUX = '#4c5c78';
const FILET = '#cfd8e6';

/** La pile de replis de `--sans` : Archivo n'est pas installée. */
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
/** Ce que `--large`, la largeur 125 % d'Archivo, devient ici. */
const LARGE = 1.08;
/** `--rayon` et `--bord`, en pixels. */
const RAYON = 16;
const BORD = 3;
/** La ligne de flottaison sous la bande d'accueil : 6 px de jaune. */
const FLOTTAISON = 6;

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

/** Les leçons écrites : un fichier par notion, comme le veut `lecons.ts`. */
function leconsEcrites() {
  return readdirSync(COURS).filter((f) => f.endsWith('.yaml')).length;
}

function versionBanque() {
  return readFileSync(join(RACINE, 'data', 'VERSION'), 'utf-8').trim();
}

/**
 * Le display : Archivo étendue et très grasse sur le site, ici Helvetica
 * grasse élargie à la main. L'échelle porte sur le texte seul, jamais sur la
 * géométrie autour, qui garderait sinon des épaisseurs fausses.
 */
function display(x, y, taille, contenu, remplissage) {
  return `<text transform="translate(${x} ${y}) scale(${LARGE} 1)" x="0" y="0"
        font-family="${SANS}" font-size="${taille}" font-weight="700"
        letter-spacing="${(-0.01 * taille).toFixed(2)}" fill="${remplissage}">${contenu}</text>`;
}

/** Le corps : largeur normale, comme sur le site. */
function corps(x, y, taille, contenu, remplissage, graisse = 400) {
  return `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${taille}"
        font-weight="${graisse}" fill="${remplissage}">${contenu}</text>`;
}

/**
 * Le glyphe de la marque, repris de `Base.astro` : le cône d'une cardinale
 * sur sa tourelle. Sur la bande marine il s'inverse, exactement comme le
 * fait le site en apparence sombre.
 */
function marque(x, y, cote) {
  return `<g transform="translate(${x} ${y}) scale(${cote / 32})">
    <rect width="32" height="32" rx="8" fill="${JAUNE}"/>
    <path d="M16 6.5 L25.5 21.5 H6.5 Z" fill="${MARINE}"/>
    <rect x="10.5" y="23.5" width="11" height="3" rx="1.5" fill="${MARINE}"/>
  </g>`;
}

/**
 * Le bouton d'action, et la seule profondeur de la charte : un bord plein de
 * 3 px sous la forme, pas une ombre portée. Il s'obtient en posant la même
 * forme trois pixels plus bas, dans le jaune sombre.
 */
function bouton(x, y, l, h, libelle) {
  return `<rect x="${x}" y="${y + BORD}" width="${l}" height="${h}" rx="${RAYON}" fill="${JAUNE_SOMBRE}"/>
  <rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${RAYON}" fill="${JAUNE}"/>
  <!-- Le libellé se centre à l'œil : la moitié de la hauteur, plus la
       demi-hauteur d'x. -->
  <text x="${x + l / 2}" y="${y + h / 2 + 8}" text-anchor="middle" font-family="${SANS}"
        font-size="22" font-weight="700" fill="${MARINE}">${libelle}</text>`;
}

function composer({ questions, themes, lecons }) {
  const MG = 76; // la marge de la colonne de gauche
  // Le panneau blanc, posé à droite comme sur l'accueil : aligné sur le haut
  // du titre, et fermé à la même ligne que le bouton.
  const p = { x: 752, y: 162, l: 372, h: 393 };
  const px = p.x + 30; // sa marge intérieure

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}" viewBox="0 0 ${LARGEUR} ${HAUTEUR}">
  <rect width="${LARGEUR}" height="${HAUTEUR}" fill="${MARINE}"/>

  <!-- L'en-tête du site : le glyphe et le nom. -->
  ${marque(MG, 56, 46)}
  ${display(MG + 62, 88, 27, 'Permis côtier', BLANC)}

  <!-- Le titre de l'accueil, coupé à seize signes comme la page le fait. -->
  ${display(MG, 214, 62, 'Révise le permis', BLANC)}
  ${display(MG, 282, 62, 'côtier au format', BLANC)}
  ${display(MG, 350, 62, 'de l’épreuve.', BLANC)}

  <!-- La promesse, dans le bleu pâle que la bande réserve au secondaire. -->
  ${corps(MG, 412, 23, 'Le cours, l’entraînement par thème, et l’examen blanc', BANDE_DOUX)}
  ${corps(MG, 446, 23, 'chronométré, comme le jour J. Gratuit, sans compte.', BANDE_DOUX)}

  ${bouton(MG, 494, 322, 58, 'Passer un examen blanc')}

  <!-- Le panneau blanc, ses deux grands nombres et la traçabilité. -->
  <rect x="${p.x}" y="${p.y}" width="${p.l}" height="${p.h}" rx="${RAYON}" fill="${BLANC}"/>
  ${display(px, p.y + 80, 58, questions, MARINE)}
  ${corps(px, p.y + 114, 17, 'questions publiées, sur les', MARINE, 600)}
  ${corps(px, p.y + 136, 17, `${themes} thèmes du programme`, MARINE, 600)}
  ${display(px, p.y + 214, 58, lecons, MARINE)}
  ${corps(px, p.y + 248, 17, 'leçons écrites depuis les textes,', MARINE, 600)}
  ${corps(px, p.y + 270, 17, 'pas depuis un manuel', MARINE, 600)}
  <line x1="${px}" y1="${p.y + 300}" x2="${p.x + p.l - 30}" y2="${p.y + 300}" stroke="${FILET}" stroke-width="2"/>
  ${corps(px, p.y + 334, 16, 'Sous chaque réponse, l’article', TEXTE_DOUX)}
  ${corps(px, p.y + 356, 16, 'dont elle sort et son numéro.', TEXTE_DOUX)}

  <!-- La ligne de flottaison, qui ferme la bande. -->
  <rect x="0" y="${HAUTEUR - FLOTTAISON}" width="${LARGEUR}" height="${FLOTTAISON}" fill="${JAUNE}"/>
</svg>`;
}

const questions = questionsPubliees();
const lecons = leconsEcrites();
// Les quatorze thèmes de l'arrêté : la table vit dans src/lib/themes.ts, qui
// est du TypeScript ; on y compte les entrées plutôt que d'écrire le nombre.
const themes = (
  readFileSync(join(RACINE, 'src', 'lib', 'themes.ts'), 'utf-8').match(/^ {4}code: '/gm) ?? []
).length;

const svg = composer({ questions, themes, lecons });
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
      `${questions} questions, ${lecons} leçons, ${themes} thèmes, banque ${versionBanque()}.`,
  );
}
