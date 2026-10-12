/**
 * Les budgets du code, relus dans `docs/budgets.md` et vérifiés.
 *
 * Trois bornes : la taille d'un fichier de `src/components/`, le nombre de
 * mentions de `POUR_APP` dans les composants, et le poids du code de
 * `/examen` en brotli. Les chiffres vivent dans le bloc JSON du document, une
 * seule fois ; ce script ne fait que les lire et compter.
 *
 *   node scripts/verifier-budgets.mjs [dist]   # dist/ par défaut, après `npm run build`
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mesurerPage } from './poids.mjs';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const COMPOSANTS = join(RACINE, 'src/components');

/** Le bloc ```json du document des budgets. */
export function lireBudgets(markdown) {
  const bloc = /```json\n([\s\S]*?)\n```/.exec(markdown);
  if (!bloc) throw new Error('docs/budgets.md n’a pas de bloc ```json');
  return JSON.parse(bloc[1]);
}

export const estUnTest = (chemin) => /\.test\.[jt]sx?$/.test(chemin);

/** Les mentions de `POUR_APP` d'un fichier, hors lignes d'`import`. */
export function mentionsPourApp(source) {
  return source
    .split('\n')
    .filter((ligne) => !/^\s*import\b/.test(ligne))
    .reduce((n, ligne) => n + (ligne.match(/\bPOUR_APP\b/g)?.length ?? 0), 0);
}

export const lignes = (source) => source.split('\n').length - (source.endsWith('\n') ? 1 : 0);

/** Le code d'une page, sans la police ni la banque : HTML, CSS, JavaScript. */
export const poidsDuCode = (mesure) => mesure.parGenre.html + mesure.parGenre.css + mesure.parGenre.js;

/** Les dépassements, chacun une phrase. Fonction pure. */
export function controler(budgets, fichiers, poidsExamen) {
  const defauts = [];
  for (const f of fichiers) {
    if (f.lignes > budgets.lignesParFichier) {
      defauts.push(`${f.chemin} fait ${f.lignes} lignes, le budget est de ${budgets.lignesParFichier}`);
    }
  }
  const mentions = fichiers.reduce((n, f) => n + f.pourApp, 0);
  if (mentions > budgets.pourAppDansLesComposants) {
    const pires = [...fichiers].sort((a, b) => b.pourApp - a.pourApp).slice(0, 3).map((f) => `${f.chemin} ${f.pourApp}`);
    defauts.push(`${mentions} mentions de POUR_APP dans src/components, le budget est de ${budgets.pourAppDansLesComposants} (${pires.join(', ')})`);
  }
  if (poidsExamen !== null) {
    const plafond = budgets.examen.reference + budgets.examen.marge;
    if (poidsExamen > plafond) {
      defauts.push(`le code de /examen pèse ${poidsExamen} octets brotli, le plafond est de ${plafond} (${budgets.examen.reference} + ${budgets.examen.marge})`);
    }
  }
  return defauts;
}

async function fichiersDesComposants(dossier = COMPOSANTS) {
  const trouves = [];
  for (const e of await readdir(dossier, { withFileTypes: true, recursive: true })) {
    if (!e.isFile() || !/\.(tsx?|astro)$/.test(e.name)) continue;
    const absolu = join(e.parentPath ?? e.path, e.name);
    const chemin = relative(RACINE, absolu);
    if (estUnTest(chemin)) continue;
    const source = await readFile(absolu, 'utf-8');
    trouves.push({ chemin, lignes: lignes(source), pourApp: mentionsPourApp(source) });
  }
  return trouves.sort((a, b) => a.chemin.localeCompare(b.chemin));
}

async function principal() {
  const budgets = lireBudgets(await readFile(join(RACINE, 'docs/budgets.md'), 'utf-8'));
  const fichiers = await fichiersDesComposants();
  const dist = resolve(RACINE, process.argv[2] ?? 'dist');
  const mesure = await mesurerPage(dist, 'examen.html', 'Examen');
  if (mesure.manquants.includes('/examen.html')) {
    console.error(`${relative(RACINE, dist)}/examen.html manque : lancer \`npm run build\` d’abord.`);
    process.exitCode = 1;
    return;
  }
  const poids = poidsDuCode(mesure);
  const defauts = controler(budgets, fichiers, poids);

  const plusLong = [...fichiers].sort((a, b) => b.lignes - a.lignes)[0];
  const mentions = fichiers.reduce((n, f) => n + f.pourApp, 0);
  console.log(`Fichier le plus long : ${plusLong.chemin}, ${plusLong.lignes} lignes sur ${budgets.lignesParFichier}.`);
  console.log(`POUR_APP dans src/components : ${mentions} sur ${budgets.pourAppDansLesComposants}.`);
  console.log(`Code de /examen : ${poids} octets brotli, référence ${budgets.examen.reference}, écart ${poids - budgets.examen.reference}.`);
  for (const d of defauts) console.log(`  HORS BUDGET : ${d}`);
  process.exitCode = defauts.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await principal();
}
