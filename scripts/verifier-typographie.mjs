#!/usr/bin/env node
/**
 * La typographie française du build, relue sur le build.
 *
 * `scripts/typographie.mjs` pose les espaces insécables à la construction. Un
 * défaut ici ne casse aucun test et ne se voit qu'en lisant `dist/` : une page
 * produite après le hook, un écran de jeu dont la chaîne a échappé au greffon,
 * une banque empaquetée sans passer par `versAffichable`. Ce contrôle relit les
 * pages et échoue s'il reste, dans un nœud texte ou dans les données JSON d'une
 * page, une espace ordinaire :
 *
 * - avant `; : ! ?` ou `»` ;
 * - après `«` ;
 * - entre un nombre et `%`, `€` ou `°` ;
 * - dans un nombre à milliers (`12 000`).
 *
 * Il lit les mêmes nœuds que le build (jamais `script`, `style`, `code`, `pre`,
 * attributs ni URL), mais ses motifs sont les siens : il ne rappelle pas la
 * fonction qu'il contrôle. Les exceptions sont celles de la règle : `14:30`,
 * `?a=1`, `!important` et les smileys n'ont pas d'espace avant leur signe.
 *
 * Il relit aussi la banque servie (`banque/v/*.json`).
 *
 * Usage : node scripts/verifier-typographie.mjs [dossier]   (par défaut dist)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { surLeJsonDeDonnees, surLesNoeudsTexte } from '../src/lib/insecables.ts';

const racine = process.argv[2] ?? 'dist';

// Un signe de ponctuation précédé d'une espace ordinaire, sauf smiley, URL, CSS.
const REGLES = [
  ['espace ordinaire avant ; : ! ?', / [;:](?![\p{L}\p{N}()/\\|[\]])|(?<=\S) [!?](?![\p{L}\p{N}_-])/u],
  ['espace ordinaire avant »', /(?<=\S) »/u],
  ['espace ordinaire après «', /« /u],
  ['espace ordinaire entre un nombre et son symbole', /(?<![\p{L}\p{N}.,/-])\d+(?:[.,]\d+)? [%‰€°$£]/u],
  ['espace ordinaire dans un nombre à milliers', /(?<![\p{L}\p{N}.,/-])\d{1,3}(?: \d{3})+(?!\d)/u],
];

function fichiers(dossier, extension) {
  const trouves = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) trouves.push(...fichiers(chemin, extension));
    else if (nom.endsWith(extension)) trouves.push(chemin);
  }
  return trouves;
}

/** Les défauts d'un morceau de texte, avec un peu de contexte. */
function defauts(texte) {
  const trouves = [];
  for (const [nom, motif] of REGLES) {
    const g = new RegExp(motif.source, 'gu');
    for (const m of texte.matchAll(g)) {
      const debut = Math.max(0, m.index - 25);
      trouves.push(`${nom} : …${texte.slice(debut, m.index + m[0].length + 15).replace(/\s+/g, ' ')}…`);
    }
  }
  return trouves;
}

/** Les chaînes d'une valeur JSON, clés exclues. */
function chaines(valeur, sortie = []) {
  if (typeof valeur === 'string') sortie.push(valeur);
  else if (Array.isArray(valeur)) valeur.forEach((v) => chaines(v, sortie));
  else if (valeur && typeof valeur === 'object') Object.values(valeur).forEach((v) => chaines(v, sortie));
  return sortie;
}

let dossierAbsent = false;
try {
  statSync(racine);
} catch {
  dossierAbsent = true;
}
if (dossierAbsent) {
  console.error(`${racine}/ absent : construis le site d'abord.`);
  process.exit(1);
}

const problemes = [];
let pages = 0;

for (const page of fichiers(racine, '.html')) {
  pages++;
  const html = readFileSync(page, 'utf-8');
  const vus = [];
  surLesNoeudsTexte(html, (texte) => {
    vus.push(...defauts(texte));
    return texte;
  });
  surLeJsonDeDonnees(html, (texte) => {
    vus.push(...defauts(texte));
    return texte;
  });
  for (const d of vus) problemes.push(`${relative(racine, page)} : ${d}`);
}

for (const fichier of fichiers(racine, '.json').filter((f) => f.includes(`${'banque'}/v/`))) {
  const banque = JSON.parse(readFileSync(fichier, 'utf-8'));
  for (const q of banque.questions ?? []) {
    const textes = [q.enonce, q.explication, ...q.propositions.map((p) => p.texte), ...q.sources.map((s) => s.texte)];
    for (const d of textes.flatMap(defauts)) problemes.push(`${relative(racine, fichier)} ${q.id} : ${d}`);
  }
}

if (problemes.length > 0) {
  console.error(`Typographie : ${problemes.length} défaut(s) dans ${racine}/ (${pages} pages relues).`);
  for (const p of problemes.slice(0, 40)) console.error(`  ${p}`);
  if (problemes.length > 40) console.error(`  … et ${problemes.length - 40} autres.`);
  process.exit(1);
}
console.log(`Typographie : ${pages} pages relues dans ${racine}/, aucune espace ordinaire à corriger.`);
