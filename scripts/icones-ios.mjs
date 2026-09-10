#!/usr/bin/env node
/**
 * Dessine l'icône et l'écran de démarrage de l'app iOS.
 *
 *     node scripts/icones-ios.mjs            # écrit dans ios/App/App/Assets.xcassets/
 *     node scripts/icones-ios.mjs --verifier # échoue si les fichiers livrés ont dérivé
 *
 * Le dessin est celui de `public/favicon.svg`, à la géométrie près : la même
 * bouée conique jaune sur marine que porte le wordmark du site. Une app dont
 * l'icône ne ressemble pas au site qu'elle prolonge se cherche deux fois.
 *
 * Deux règles d'Apple valent d'être dites, parce qu'elles refusent un envoi :
 *
 * - l'icône de l'App Store est un carré plein de 1024 pixels, **sans
 *   transparence et sans coins arrondis**. Le masque, c'est iOS qui l'applique ;
 *   des coins dessinés donnent un liseré. Le `rx` du favicon saute donc ici.
 * - l'écran de démarrage n'a pas de mode sombre par défaut. Sans variante, un
 *   téléphone en sombre ouvre sur un aplat clair puis bascule : ce clignement
 *   est la première chose qu'on voit de l'app. D'où deux fichiers et un
 *   `appearances` dans le catalogue.
 *
 * Les couleurs sont reprises de `src/styles/global.css`, à la valeur près.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));
const CATALOGUE = join(RACINE, 'ios', 'App', 'App', 'Assets.xcassets');

// Reprises telles quelles de `:root` dans src/styles/global.css.
const MARINE = '#0b1d3a';
const JAUNE = '#ffc72c';
const BRUME = '#f3f6fb';
// `--fond` en sombre, la même valeur que la balise `theme-color` de Base.astro.
const MARINE_SOMBRE = '#0a1730';

/**
 * La bouée, dans un carré de 32 comme le favicon. `fond` à `null` laisse le
 * carré transparent : c'est ce qu'on veut pour la poser sur un écran de
 * démarrage, jamais pour l'icône.
 */
function bouee({ fond, rayon = 0 }) {
  const socle = fond ? `<rect width="32" height="32" rx="${rayon}" fill="${fond}"/>` : '';
  return `${socle}
  <path d="M16 6.5 L25.5 21.5 H6.5 Z" fill="${JAUNE}"/>
  <rect x="10.5" y="23.5" width="11" height="3" rx="1.5" fill="${JAUNE}"/>`;
}

/** L'icône de l'App Store : carré plein, aucune transparence, aucun arrondi. */
function icone(cote) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}" viewBox="0 0 32 32">
  ${bouee({ fond: MARINE, rayon: 0 })}
</svg>`;
}

/**
 * L'écran de démarrage : un aplat, la bouée dans son badge arrondi au centre.
 * Carré de 2732 pour couvrir toutes les tailles d'écran en `scaleAspectFill`,
 * le badge à un huitième du côté, comme le wordmark en tête du site.
 */
function demarrage(cote, fond) {
  const badge = Math.round(cote / 8);
  const marge = Math.round((cote - badge) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}" viewBox="0 0 ${cote} ${cote}">
  <rect width="${cote}" height="${cote}" fill="${fond}"/>
  <svg x="${marge}" y="${marge}" width="${badge}" height="${badge}" viewBox="0 0 32 32">
    ${bouee({ fond: fond === BRUME ? MARINE : JAUNE, rayon: 8 })}
  </svg>
</svg>`;
}

/**
 * En sombre, le badge s'inverse comme `.marque` dans Base.astro : fond jaune,
 * cône marine. Le dessin ci-dessus ne sait pas le faire seul, on le refait.
 */
function demarrageSombre(cote) {
  const badge = Math.round(cote / 8);
  const marge = Math.round((cote - badge) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}" viewBox="0 0 ${cote} ${cote}">
  <rect width="${cote}" height="${cote}" fill="${MARINE_SOMBRE}"/>
  <svg x="${marge}" y="${marge}" width="${badge}" height="${badge}" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="${JAUNE}"/>
    <path d="M16 6.5 L25.5 21.5 H6.5 Z" fill="${MARINE}"/>
    <rect x="10.5" y="23.5" width="11" height="3" rx="1.5" fill="${MARINE}"/>
  </svg>
</svg>`;
}

/** Le PNG d'un SVG, sans canal alpha : l'App Store refuse la transparence. */
async function rendre(svg, fondPlat) {
  return sharp(Buffer.from(svg))
    .flatten({ background: fondPlat })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const COTE_DEMARRAGE = 2732;

const aEcrire = [
  {
    chemin: join(CATALOGUE, 'AppIcon.appiconset', 'AppIcon-512@2x.png'),
    png: await rendre(icone(1024), MARINE),
  },
  {
    chemin: join(CATALOGUE, 'Splash.imageset', 'demarrage-clair.png'),
    png: await rendre(demarrage(COTE_DEMARRAGE, BRUME), BRUME),
  },
  {
    chemin: join(CATALOGUE, 'Splash.imageset', 'demarrage-sombre.png'),
    png: await rendre(demarrageSombre(COTE_DEMARRAGE), MARINE_SOMBRE),
  },
];

/**
 * Le catalogue de l'écran de démarrage. Une entrée par apparence : sans la
 * seconde, un téléphone en sombre ouvre sur un aplat clair.
 */
const catalogueDemarrage = {
  images: [
    { idiom: 'universal', filename: 'demarrage-clair.png', scale: '1x' },
    {
      idiom: 'universal',
      filename: 'demarrage-sombre.png',
      scale: '1x',
      appearances: [{ appearance: 'luminosity', value: 'dark' }],
    },
  ],
  info: { version: 1, author: 'xcode' },
};

aEcrire.push({
  chemin: join(CATALOGUE, 'Splash.imageset', 'Contents.json'),
  png: Buffer.from(`${JSON.stringify(catalogueDemarrage, null, 2)}\n`),
});

// Les trois PNG que Capacitor pose par défaut n'ont plus de référence dans le
// catalogue : les laisser gonflerait le bundle de six mégaoctets pour rien.
const AVIRER = [
  'splash-2732x2732.png',
  'splash-2732x2732-1.png',
  'splash-2732x2732-2.png',
].map((nom) => join(CATALOGUE, 'Splash.imageset', nom));

const verifier = process.argv.includes('--verifier');
let derive = false;

for (const { chemin, png } of aEcrire) {
  const court = relative(RACINE, chemin);
  if (verifier) {
    if (!existsSync(chemin) || !readFileSync(chemin).equals(png)) {
      console.error(`  ✗ ${court} a dérivé du dessin`);
      derive = true;
    } else {
      console.log(`  ✓ ${court}`);
    }
    continue;
  }
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, png);
  console.log(`  → ${court} (${(png.length / 1024).toFixed(0)} Ko)`);
}

if (verifier) {
  const restants = AVIRER.filter((c) => existsSync(c)).map((c) => relative(RACINE, c));
  if (restants.length > 0) {
    console.error(`  ✗ écrans de démarrage de Capacitor non retirés : ${restants.join(', ')}`);
    derive = true;
  }
  if (derive) {
    console.error('\nRelancer : node scripts/icones-ios.mjs');
    process.exit(1);
  }
  console.log('\nIcône et écran de démarrage conformes au dessin.');
} else {
  const { rmSync } = await import('node:fs');
  for (const chemin of AVIRER) {
    if (!existsSync(chemin)) continue;
    rmSync(chemin);
    console.log(`  − ${relative(RACINE, chemin)} (écran de démarrage de Capacitor)`);
  }
}
