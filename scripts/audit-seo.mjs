/**
 * Ce que le site montre aux moteurs, vérifié sur le build.
 *
 * Les défauts visés ici ne cassent aucun test et ne se voient pas à l'écran :
 * un titre coupé dans la liste de résultats, deux pages qui portent la même
 * description, une adresse canonique qui désigne une autre page que celle par
 * laquelle Google est arrivé. Ils se voient dans `dist/`, et seulement là.
 *
 * Sort en échec si une règle dure est violée, ce qui permet de l'appeler en
 * intégration continue. `--laxe` n'affiche que le rapport.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const TITRE_MAX = 65;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 158;
const laxe = process.argv.includes('--laxe');

function pagesHtml(racine) {
  const trouvees = [];
  for (const nom of readdirSync(racine)) {
    const chemin = join(racine, nom);
    if (statSync(chemin).isDirectory()) trouvees.push(...pagesHtml(chemin));
    else if (nom.endsWith('.html')) trouvees.push(chemin);
  }
  return trouvees;
}

const extrais = (html, motif) => motif.exec(html)?.[1];

function lire(chemin) {
  const html = readFileSync(chemin, 'utf-8');
  return {
    fichier: relative(DIST, chemin),
    titre: extrais(html, /<title>(.*?)<\/title>/s),
    description: extrais(html, /name="description" content="([^"]*)"/),
    canonique: extrais(html, /rel="canonical" href="([^"]*)"/),
    robots: extrais(html, /name="robots" content="([^"]*)"/),
    h1: [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)].map((m) => m[1].replace(/<[^>]*>/g, '').trim()),
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => m[1]),
    ogImage: extrais(html, /property="og:image" content="([^"]*)"/),
  };
}

if (!existsSync(DIST)) {
  console.error('dist/ absent : lance `npm run build` d’abord.');
  process.exit(1);
}

const pages = pagesHtml(DIST).map(lire);
const indexables = pages.filter((p) => !p.robots?.includes('noindex'));
const durs = [];
const doux = [];

/**
 * Les pages question portent l'énoncé entier en titre, et c'est voulu : il est
 * ce qui les rend uniques. Leur longueur n'est donc pas un défaut, alors qu'un
 * titre trop long sur une page dont on écrit le titre en est un.
 */
const titreEcritALaMain = (fichier) => !fichier.startsWith('question/');

for (const p of indexables) {
  if (!p.titre) durs.push(`${p.fichier} : pas de <title>`);
  else if (p.titre.length > TITRE_MAX && titreEcritALaMain(p.fichier))
    doux.push(`${p.fichier} : titre de ${p.titre.length} car., coupé dans les résultats`);
  if (!p.description) durs.push(`${p.fichier} : pas de méta description`);
  else if (p.description.length > DESCRIPTION_MAX) durs.push(`${p.fichier} : description de ${p.description.length} car.`);
  else if (p.description.length < DESCRIPTION_MIN) doux.push(`${p.fichier} : description de ${p.description.length} car., Google la réécrira`);
  if (!p.canonique) durs.push(`${p.fichier} : pas de canonique`);
  else if (p.canonique.endsWith('.html')) durs.push(`${p.fichier} : canonique en .html, adresse non servie`);
  if (p.h1.length !== 1) durs.push(`${p.fichier} : ${p.h1.length} <h1>`);
  if (!p.ogImage) doux.push(`${p.fichier} : pas d’image de partage`);
  for (const bloc of p.jsonLd) {
    try {
      JSON.parse(bloc);
    } catch (e) {
      durs.push(`${p.fichier} : JSON-LD illisible (${e.message})`);
    }
  }
}

/** Deux pages qui portent le même titre se font concurrence sur la même requête. */
function doublons(champ) {
  const par = new Map();
  for (const p of indexables) {
    const v = p[champ];
    if (!v) continue;
    par.set(v, [...(par.get(v) ?? []), p.fichier]);
  }
  return [...par.entries()].filter(([, f]) => f.length > 1);
}

for (const [valeur, fichiers] of doublons('titre')) {
  durs.push(`titre en double sur ${fichiers.length} pages (${fichiers.slice(0, 3).join(', ')}…) : « ${valeur.slice(0, 60)} »`);
}
for (const [valeur, fichiers] of doublons('description')) {
  doux.push(`description en double sur ${fichiers.length} pages (${fichiers.slice(0, 3).join(', ')}…) : « ${valeur.slice(0, 50)} »`);
}
for (const [valeur, fichiers] of doublons('canonique')) {
  durs.push(`canonique en double sur ${fichiers.length} pages (${fichiers.slice(0, 3).join(', ')}…) : ${valeur}`);
}

const parType = new Map();
for (const p of indexables) {
  const t = p.fichier.includes('/') ? p.fichier.split('/')[0] : 'racine';
  parType.set(t, (parType.get(t) ?? 0) + 1);
}

console.log(`${pages.length} pages construites, ${indexables.length} indexables\n`);
console.log([...parType.entries()].map(([t, n]) => `  ${t} : ${n}`).join('\n'));
console.log();

if (doux.length) {
  console.log(`À surveiller (${doux.length}) :`);
  for (const m of doux.slice(0, 15)) console.log(`  · ${m}`);
  if (doux.length > 15) console.log(`  · … et ${doux.length - 15} autres`);
  console.log();
}

if (durs.length) {
  console.log(`Bloquant (${durs.length}) :`);
  for (const m of durs.slice(0, 20)) console.log(`  ✗ ${m}`);
  if (durs.length > 20) console.log(`  ✗ … et ${durs.length - 20} autres`);
  if (!laxe) process.exit(1);
} else {
  console.log('Aucun défaut bloquant.');
}
