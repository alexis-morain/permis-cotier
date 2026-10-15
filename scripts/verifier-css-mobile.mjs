/**
 * Ce qu'un doigt trouvera dans l'app, relu dans le CSS de `dist-app/`.
 *
 * Deux défauts qui ne se voient qu'au toucher, et jamais au vert des tests :
 *
 * - un `:hover` hors de `@media (hover: hover)`. Au doigt, iOS pose le survol
 *   au premier appui et le laisse collé sur la dernière cible touchée : une
 *   proposition touchée prend l'air d'une case cochée ;
 * - un contrôle sans `touch-action: manipulation`. Sans elle, WebKit peut
 *   attendre un second appui (le double-tap qui zoome) avant de répondre.
 *
 * Il lit toutes les feuilles du dossier et les `<style>` des pages (Astro en
 * met en ligne). Ce n'est pas un test : le défaut se voit dans le bundle, à
 * la sortie du build, pas dans le code qui l'a produit.
 *
 *   node scripts/verifier-css-mobile.mjs [dossier]   # dist-app par défaut
 *
 * Sort en échec sur le premier défaut de chaque sorte, avec le fichier et le
 * sélecteur.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));

/** Les contrôles qui doivent répondre au premier appui, s'ils sont dans le bundle. */
export const CONTROLES = [
  '.bouton',
  '.proposition',
  '.retour__lien',
  '.jeu__actions',
  '.segmente__option',
  '.choix__option',
  '.chapitres__cellule',
  '.cellules__ligne',
  '.etape',
];

/**
 * Les règles d'une feuille, chacune avec ses blocs `@` englobants, du plus
 * extérieur au plus proche. Lecteur minimal : commentaires et chaînes sautés,
 * accolades comptées ; assez pour le CSS que produit le build.
 */
export function regles(css) {
  const trouvees = [];
  const pile = [];
  let tampon = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const fin = css.indexOf('*/', i + 2);
      i = fin === -1 ? css.length : fin + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      tampon += css.slice(i, j + 1);
      i = j;
      continue;
    }
    if (c === '{') {
      const entete = tampon.trim();
      tampon = '';
      if (entete.startsWith('@')) {
        pile.push({ arobase: entete });
      } else {
        pile.push({ selecteur: entete, debut: i + 1 });
      }
      continue;
    }
    if (c === '}') {
      const bloc = pile.pop();
      if (bloc?.selecteur !== undefined) {
        trouvees.push({
          selecteur: bloc.selecteur,
          declarations: css.slice(bloc.debut, i).trim(),
          contexte: pile.filter((b) => b.arobase).map((b) => b.arobase),
        });
      }
      tampon = '';
      continue;
    }
    if (c === ';') {
      tampon = '';
      continue;
    }
    tampon += c;
  }
  return trouvees;
}

const SURVOL = /:hover(?![\w-])/;
const GARDE = /\(\s*hover\s*:\s*hover\s*\)/;
const MANIPULATION = /(^|[;{\s])touch-action\s*:\s*manipulation/;

const nomme = (selecteur, controle) => new RegExp(`${controle.replace('.', '\\.')}(?![\\w-])`).test(selecteur);

/** Les défauts du bundle, chacun une phrase. `feuilles` : `{ fichier, css }`. Fonction pure. */
export function controler(feuilles, controles = CONTROLES) {
  const defauts = [];
  const dejaDits = new Set();
  const selecteurs = [];
  const touches = [];
  for (const { fichier, css } of feuilles) {
    for (const r of regles(css)) {
      selecteurs.push(r.selecteur);
      if (MANIPULATION.test(r.declarations)) touches.push(r.selecteur);
      if (!SURVOL.test(r.selecteur) || r.contexte.some((a) => a.startsWith('@media') && GARDE.test(a))) continue;
      if (dejaDits.has(r.selecteur)) continue;
      dejaDits.add(r.selecteur);
      defauts.push(`${fichier} : ${r.selecteur} survole hors de @media (hover: hover)`);
    }
  }
  for (const controle of controles) {
    if (!selecteurs.some((s) => nomme(s, controle))) continue;
    if (!touches.some((s) => s.split(',').some((partie) => nomme(partie, controle)))) {
      defauts.push(`${controle} n’a pas de touch-action: manipulation dans le bundle`);
    }
  }
  return defauts;
}

/** Le contenu des `<style>` d'une page, bout à bout. */
export function stylesEnLigne(html) {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
}

async function principal() {
  const dossier = resolve(RACINE, process.argv[2] ?? 'dist-app');
  const feuilles = [];
  let pages = 0;
  for (const e of await readdir(dossier, { withFileTypes: true, recursive: true })) {
    if (!e.isFile() || !/\.(css|html)$/.test(e.name)) continue;
    const absolu = join(e.parentPath ?? e.path, e.name);
    const texte = await readFile(absolu, 'utf-8');
    const css = e.name.endsWith('.css') ? texte : stylesEnLigne(texte);
    if (e.name.endsWith('.html')) pages++;
    if (css) feuilles.push({ fichier: relative(dossier, absolu), css });
  }
  if (!pages) {
    console.error(`${relative(RACINE, dossier)} n’a aucune page : lancer \`npm run build:app\` d’abord.`);
    process.exitCode = 1;
    return;
  }
  const defauts = controler(feuilles);
  const nbRegles = feuilles.reduce((n, f) => n + regles(f.css).length, 0);
  console.log(`${feuilles.length} feuilles et styles de page relus, ${nbRegles} règles.`);
  for (const d of defauts) console.log(`  DÉFAUT : ${d}`);
  if (!defauts.length) console.log('Aucun survol hors garde, chaque contrôle répond au premier appui.');
  process.exitCode = defauts.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await principal();
}
