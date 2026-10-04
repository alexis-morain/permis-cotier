/**
 * Le script en ligne de la bande d'ouverture de l'accueil, empaqueté depuis
 * `src/lib/bande-avant-rendu.ts`.
 *
 * Il doit tourner avant la première peinture, donc dans la page même : un
 * module Astro est différé et part après, et la bande du nouveau venu se
 * verrait le temps qu'il arrive. Plutôt que de récrire à la main en
 * JavaScript la lecture de la progression, le choix de l'état et le jour
 * parisien, on empaquette les modules testés : `charger`, `choisirBande`,
 * `aujourdhui` sont les mêmes que partout ailleurs.
 *
 * Utilisé par le greffon Vite d'`astro.config.mjs` (module virtuel
 * `virtual:bande-avant-rendu`) et par `bande-script.test.ts`.
 */
import { buildSync } from 'esbuild';
import { fileURLToPath } from 'node:url';

export const ENTREE = fileURLToPath(new URL('../src/lib/bande-avant-rendu.ts', import.meta.url));

/** Le code du script et les fichiers dont il dépend (pour la surveillance du dev). */
export function construireScriptBande() {
  const resultat = buildSync({
    entryPoints: [ENTREE],
    bundle: true,
    format: 'iife',
    minify: true,
    target: 'es2020',
    charset: 'utf8',
    legalComments: 'none',
    write: false,
    metafile: true,
  });
  const code = resultat.outputFiles[0].text.trim();
  const entrees = Object.keys(resultat.metafile.inputs).map((f) => fileURLToPath(new URL(f, new URL('../', import.meta.url))));
  return { code, entrees };
}

// Lancé seul, il écrit le script sur la sortie standard. Le test s'en sert :
// esbuild ne tourne pas sous l'environnement jsdom de Vitest.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(construireScriptBande().code);
}
