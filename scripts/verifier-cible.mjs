#!/usr/bin/env node
/**
 * Le site ne doit rien emporter de la coquille.
 *
 * `src/lib/natif.ts` teste `POUR_APP` — une constante figée par `vite.define` —
 * avant chaque `import()` de greffon Capacitor. Dans le build du site la
 * branche est morte, Rollup l'ôte, et rien n'entre. Ça tient tant que personne
 * n'écrit un `import` statique en tête de fichier : ce jour-là le site
 * emporterait les greffons sans qu'aucun test ne rougisse, et on ne le verrait
 * qu'au poids de la page.
 *
 * D'où ce contrôle, branché à la fin de `npm run build`. Il coûte une seconde.
 *
 * Usage : node scripts/verifier-cible.mjs [dossier]   (par défaut dist)
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const racine = process.argv[2] ?? 'dist';

if (!existsSync(racine)) {
  console.error(`${racine} n'existe pas. Construire d'abord.`);
  process.exit(1);
}

async function fichiers(dossier) {
  const sortie = [];
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) sortie.push(...(await fichiers(chemin)));
    else sortie.push(chemin);
  }
  return sortie;
}

const aExaminer = (await fichiers(racine)).filter(
  (f) => f.endsWith('.js') || f.endsWith('.html'),
);

const coupables = [];
for (const fichier of aExaminer) {
  const contenu = await readFile(fichier, 'utf-8');
  if (contenu.includes('@capacitor/') || contenu.includes('CapacitorPlugin')) {
    coupables.push(relative(racine, fichier));
  }
}

if (coupables.length > 0) {
  console.error(
    `\nDu code Capacitor est parti dans le build du site (${coupables.length} fichier(s)) :`,
  );
  for (const fichier of coupables.slice(0, 10)) console.error(`  · ${fichier}`);
  console.error(
    '\nUn greffon ne s’importe que par `import()` dynamique, derrière `POUR_APP`.' +
      '\nVoir src/lib/natif.ts.',
  );
  process.exit(1);
}

console.log(`${aExaminer.length} fichiers relus, aucun greffon Capacitor dans ${racine}.`);
