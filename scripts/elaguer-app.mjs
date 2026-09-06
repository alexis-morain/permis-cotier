#!/usr/bin/env node
/**
 * Ce que la coquille iOS n'embarque pas.
 *
 * Le site porte deux métiers : réviser, et être trouvé par Google. Le second
 * n'a rien à faire dans un bundle qu'on télécharge sur un téléphone. Les 483
 * pages `question/` ne sont déjà pas construites — `getStaticPaths` les coupe
 * à la source quand `CIBLE=app` — et le sitemap comme la PWA sont désactivés
 * dans `astro.config.mjs`. Reste ce qu'Astro copie tel quel depuis `public/`,
 * plus les quelques fichiers que les intégrations laissent derrière elles.
 *
 * Deux d'entre eux ne sont pas seulement inutiles, ils nuisent :
 *
 * - `sw.js` et ce qui l'accompagne : un service worker par-dessus des fichiers
 *   déjà locaux, ce sont deux couches de cache dont une périmée.
 * - `_redirects` n'a aucun effet dans un bundle. Les 301 des anciennes adresses
 *   de cours n'y sont pas appliquées : le contrôle ci-dessous vérifie donc
 *   qu'aucun lien interne ne pointe encore vers une adresse redirigée, faute de
 *   quoi le lien serait mort dans l'app sans l'être sur le site.
 *
 * Le second contrôle est plus général et vaut pour tout ce qu'on élague : un
 * lien vers une page qui n'est pas dans le bundle. Les 483 pages `question/`
 * ne sont pas construites, et l'accueil pointait vers l'une d'elles. Sur le
 * site le lien marche, dans la coquille il ouvre l'accueil sans rien dire.
 *
 * Usage : node scripts/elaguer-app.mjs [dossier]   (par défaut dist-app)
 */
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const racine = process.argv[2] ?? 'dist-app';

/** Ce qui sort du bundle, et la raison de chacun. */
const A_RETIRER = [
  ['question', 'les 483 pages de référencement, une par question'],
  ['partage', 'les images de partage social'],
  ['sitemap-index.xml', 'sitemap'],
  ['sitemap-0.xml', 'sitemap'],
  ['robots.txt', 'consigne aux robots'],
  ['llms.txt', 'consigne aux modèles'],
  ['_headers', 'en-têtes Cloudflare'],
  ['_redirects', 'redirections Cloudflare, sans effet dans un bundle'],
  ['sw.js', 'service worker : doublerait le cache local'],
  ['sw.js.map', 'service worker'],
  ['registerSW.js', 'service worker'],
  ['manifest.webmanifest', 'manifeste PWA'],
];

/** Les `workbox-*.js` portent un condensat dans leur nom. */
const MOTIFS = [/^workbox-[a-z0-9]+\.js(\.map)?$/];

async function tailleDe(chemin) {
  const infos = await stat(chemin);
  if (!infos.isDirectory()) return infos.size;
  let total = 0;
  for (const entree of await readdir(chemin, { withFileTypes: true })) {
    total += await tailleDe(join(chemin, entree.name));
  }
  return total;
}

/** Tous les fichiers du bundle, chemins relatifs à la racine. */
async function fichiers(dossier) {
  const sortie = [];
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) sortie.push(...(await fichiers(chemin)));
    else sortie.push(chemin);
  }
  return sortie;
}

/**
 * Les liens internes qui comptaient sur une redirection. Ils marchent sur le
 * site et seraient morts dans l'app : `_redirects` n'y est pas lu.
 */
async function liensRedirigés(pages) {
  const source = 'public/_redirects';
  if (!existsSync(source)) return [];
  const anciennes = (await readFile(source, 'utf-8'))
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne && !ligne.startsWith('#'))
    .map((ligne) => ligne.split(/\s+/)[0])
    .filter(Boolean);

  const trouvés = [];
  for (const page of pages) {
    const html = await readFile(page, 'utf-8');
    for (const ancienne of anciennes) {
      // `href="/cours/x"` exactement, pas `/cours/x/y` ni `/cours/xyz`.
      if (new RegExp(`href="${ancienne}(?=["#?])`).test(html)) {
        trouvés.push(`${relative(racine, page)} → ${ancienne}`);
      }
    }
  }
  return trouvés;
}

if (!existsSync(racine)) {
  console.error(`${racine} n'existe pas. Construire d'abord : npm run build:app`);
  process.exit(1);
}

const avant = await tailleDe(racine);
const retirés = [];

for (const [nom, raison] of A_RETIRER) {
  const chemin = join(racine, nom);
  if (!existsSync(chemin)) continue;
  const taille = await tailleDe(chemin);
  await rm(chemin, { recursive: true, force: true });
  retirés.push([nom, raison, taille]);
}

for (const entrée of await readdir(racine, { withFileTypes: true })) {
  if (!entrée.isFile() || !MOTIFS.some((m) => m.test(entrée.name))) continue;
  const chemin = join(racine, entrée.name);
  const taille = await tailleDe(chemin);
  await rm(chemin, { force: true });
  retirés.push([entrée.name, 'service worker', taille]);
}

const après = await tailleDe(racine);
const mo = (octets) => `${(octets / 1024 / 1024).toFixed(2)} Mo`;
const ko = (octets) => `${Math.round(octets / 1024)} Ko`;

console.log(`Élagage de ${racine}\n`);
for (const [nom, raison, taille] of retirés) {
  console.log(`  − ${nom.padEnd(24)} ${ko(taille).padStart(8)}   ${raison}`);
}
if (retirés.length === 0) console.log('  (rien à retirer)');
console.log(`\n  ${mo(avant)} → ${mo(après)}`);

const tousLesFichiers = await fichiers(racine);
const pages = tousLesFichiers.filter((f) => f.endsWith('.html'));
console.log(`  ${pages.length} pages embarquées`);

/**
 * Résout une adresse comme le fait `ios/App/App/RouteurDuSite.swift` : une
 * extension, le fichier tel quel ; sinon `<chemin>/index.html` puis
 * `<chemin>.html`. Rend `null` quand rien ne répond.
 */
function resout(adresse) {
  const chemin = adresse.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  if (chemin === '/') return join(racine, 'index.html');
  if (/\.[a-z0-9]+$/i.test(chemin)) {
    const direct = join(racine, chemin);
    return existsSync(direct) ? direct : null;
  }
  for (const candidat of [`${chemin}/index.html`, `${chemin}.html`]) {
    const essai = join(racine, candidat);
    if (existsSync(essai)) return essai;
  }
  return null;
}

/** Les liens internes qui n'ouvrent rien : la coquille rendrait l'accueil. */
async function liensMorts(pages) {
  const trouves = new Map();
  for (const page of pages) {
    const html = await readFile(page, 'utf-8');
    for (const [, adresse] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
      if (resout(adresse) !== null) continue;
      if (!trouves.has(adresse)) trouves.set(adresse, relative(racine, page));
    }
  }
  return trouves;
}

const morts = await liensRedirigés(pages);
if (morts.length > 0) {
  console.error(
    `\nLiens internes qui comptaient sur une redirection (${morts.length}).` +
      ` Sans « _redirects », ils sont morts dans la coquille :`,
  );
  for (const lien of morts.slice(0, 20)) console.error(`  · ${lien}`);
  process.exit(1);
}
console.log('  Aucun lien interne ne compte sur une redirection.');

const inconnus = await liensMorts(pages);
if (inconnus.size > 0) {
  console.error(`\nLiens vers une adresse absente du bundle (${inconnus.size}) :`);
  for (const [adresse, page] of [...inconnus].slice(0, 20)) {
    console.error(`  · ${adresse}   (dans ${page})`);
  }
  console.error(
    '\nDans la coquille, ils ouvrent l’accueil sans rien dire. Les masquer' +
      '\nderrière `POUR_APP`, ou construire la page.',
  );
  process.exit(1);
}
console.log('  Aucun lien interne ne pointe hors du bundle.');
