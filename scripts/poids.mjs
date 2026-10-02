#!/usr/bin/env node
/**
 * Ce que coûte une page, en brotli, actifs compris.
 *
 * Le vert des tests ne dit rien du poids : un îlot React de trois lignes tire
 * le runtime entier, un composant importé et jamais rendu laisse sa feuille
 * dans le CSS global, une police se charge en entier pour douze lettres. Ce
 * script lit `dist/` comme un navigateur lirait la page : le HTML, puis tout
 * ce qu'il charge (feuilles, scripts, préchargements, îlots et leur runtime),
 * puis ce que chaque script importe à son tour. Chaque fichier est compressé
 * en brotli, comme Cloudflare le sert, et compté une fois.
 *
 * Trois pages témoins : l'accueil, un cours, une leçon. Avec `--reference`,
 * le tableau met un autre `dist/` en face — celui d'un build de `main` — et
 * dit l'écart cellule par cellule. C'est la mesure du lot E, et de tout
 * chantier qui touche au poids : le diff de `dist/` dit ce qui bouge, ce
 * tableau dit ce que ça coûte.
 *
 * Usage :
 *   node scripts/poids.mjs [dist] [--reference <autre dist>] [--detail]
 *   npm run poids
 *
 * Une référence se fabrique dans un worktree :
 *   git worktree add /tmp/pc-main main && (cd /tmp/pc-main && npm ci && npm run build)
 *   npm run poids -- --reference /tmp/pc-main/dist
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';

/** Les pages témoins, relatives à `dist/`. */
export const PAGES = [
  { nom: 'Accueil', fichier: 'index.html' },
  { nom: 'Cours', fichier: 'cours/balisage.html' },
  { nom: 'Leçon', fichier: 'cours/balisage/balisage-lateral.html' },
];

const GENRES = ['html', 'css', 'js', 'police', 'autre'];

/** La colonne d'un fichier, à son extension. */
export function genre(chemin) {
  const extension = /\.([a-z0-9]+)$/i.exec(chemin)?.[1]?.toLowerCase();
  if (extension === 'html') return 'html';
  if (extension === 'css') return 'css';
  if (extension === 'js' || extension === 'mjs') return 'js';
  if (extension === 'woff2' || extension === 'woff' || extension === 'ttf') return 'police';
  return 'autre';
}

/** Un chemin du site, ou `null` s'il est tiers ou vide. */
function local(href) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return null;
  return href.replace(/[?#].*$/, '');
}

/**
 * Les actifs qu'une page charge d'elle-même : feuilles, scripts, polices et
 * modules préchargés, et pour chaque îlot son composant et son runtime. Les
 * tiers (le traceur) ne sont pas servis par ce site, ils ne comptent pas.
 */
export function actifsDuHtml(html) {
  const trouves = new Set();
  const balises = html.match(/<(?:link|script|astro-island)\b[^>]*>/g) ?? [];
  for (const balise of balises) {
    const attribut = (nom) => new RegExp(`\\s${nom}=["']([^"']*)["']`).exec(balise)?.[1];
    if (balise.startsWith('<link')) {
      const rel = attribut('rel') ?? '';
      if (/\b(stylesheet|preload|modulepreload)\b/.test(rel)) {
        const chemin = local(attribut('href'));
        if (chemin) trouves.add(chemin);
      }
    } else if (balise.startsWith('<script')) {
      const chemin = local(attribut('src'));
      if (chemin) trouves.add(chemin);
    } else {
      for (const nom of ['component-url', 'renderer-url']) {
        const chemin = local(attribut(nom));
        if (chemin) trouves.add(chemin);
      }
    }
  }
  return [...trouves];
}

/**
 * Ce qu'un script importe au chargement : `import "…"` et `from "…"`, résolus
 * depuis son propre chemin. Un `import("…")` est différé, il ne compte pas
 * tant que personne ne l'appelle.
 */
export function importsDuScript(code, chemin) {
  const trouves = [];
  const motif = /\b(?:import|from)\s*["']([^"']+)["']/g;
  for (const [, cible] of code.matchAll(motif)) {
    const resolu = cible.startsWith('/') ? cible : posix.join(posix.dirname(chemin), cible);
    if (!trouves.includes(resolu)) trouves.push(resolu);
  }
  return trouves;
}

function brotli(contenu) {
  return brotliCompressSync(contenu, {
    params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY },
  }).length;
}

/**
 * La fermeture d'une page : elle-même, ce qu'elle charge, ce que ses scripts
 * importent, chaque fichier une fois. Un fichier annoncé mais absent de
 * `dist/` est signalé, pas compté pour zéro.
 */
export async function mesurerPage(dist, fichier, nom = fichier) {
  const fichiers = [];
  const manquants = [];
  const vus = new Set();
  const aLire = [`/${fichier}`];

  while (aLire.length > 0) {
    const chemin = aLire.shift();
    if (vus.has(chemin)) continue;
    vus.add(chemin);
    const absolu = join(dist, chemin);
    if (!existsSync(absolu)) {
      manquants.push(chemin);
      continue;
    }
    const contenu = await readFile(absolu);
    const g = genre(chemin);
    fichiers.push({ chemin, genre: g, brut: contenu.length, brotli: brotli(contenu) });
    if (g === 'html') aLire.push(...actifsDuHtml(contenu.toString('utf-8')));
    else if (g === 'js') aLire.push(...importsDuScript(contenu.toString('utf-8'), chemin));
  }

  const parGenre = Object.fromEntries(GENRES.map((g) => [g, 0]));
  for (const f of fichiers) parGenre[f.genre] += f.brotli;
  const total = fichiers.reduce((s, f) => s + f.brotli, 0);
  return { nom, fichier, fichiers, manquants, parGenre, total };
}

/** 90104 → « 90,1 » : des kilooctets de mille, une décimale, virgule française. */
export function enKo(octets) {
  return (octets / 1000).toFixed(1).replace('.', ',');
}

function cellule(apres, avant) {
  if (avant === undefined) return enKo(apres);
  const ecart = apres - avant;
  const signe = ecart < 0 ? '−' : ecart > 0 ? '+' : '±';
  return `${enKo(avant)} → ${enKo(apres)} (${signe}${enKo(Math.abs(ecart))})`;
}

/**
 * Le tableau, une ligne par page, une colonne par genre, en kilooctets
 * brotli. Avec une référence, chaque cellule dit avant, après, et l'écart.
 */
export function tableau(mesures, reference) {
  const colonnes = ['Page', 'HTML', 'CSS', 'JS', 'Police', 'Autre', 'Total'];
  const lignes = mesures.map((m) => {
    const r = reference?.find((x) => x.fichier === m.fichier);
    return [
      m.nom,
      ...GENRES.map((g) => cellule(m.parGenre[g], r?.parGenre[g])),
      cellule(m.total, r?.total),
    ];
  });
  const largeurs = colonnes.map((c, i) => Math.max(c.length, ...lignes.map((l) => l[i].length)));
  const rendre = (l) => `| ${l.map((v, i) => (i === 0 ? v.padEnd(largeurs[i]) : v.padStart(largeurs[i]))).join(' | ')} |`;
  const separateur = `|${largeurs.map((w, i) => (i === 0 ? '-'.repeat(w + 2) : '-'.repeat(w + 1) + ':')).join('|')}|`;
  return [rendre(colonnes), separateur, ...lignes.map(rendre)].join('\n');
}

async function principal() {
  const args = process.argv.slice(2);
  const detail = args.includes('--detail');
  const indexRef = args.indexOf('--reference');
  const reference = indexRef >= 0 ? args[indexRef + 1] : null;
  const dist = args.find((a, i) => !a.startsWith('--') && i !== indexRef + 1) ?? 'dist';

  for (const dossier of [dist, reference].filter(Boolean)) {
    if (!existsSync(dossier)) {
      console.error(`${dossier} n'existe pas. Construire d'abord.`);
      process.exit(1);
    }
  }

  const mesures = await Promise.all(PAGES.map((p) => mesurerPage(dist, p.fichier, p.nom)));
  const avant = reference ? await Promise.all(PAGES.map((p) => mesurerPage(reference, p.fichier, p.nom))) : undefined;

  console.log(`Kilooctets brotli, actifs compris, lus dans ${dist}${reference ? ` contre ${reference}` : ''}.\n`);
  console.log(tableau(mesures, avant));

  for (const m of mesures) {
    if (m.manquants.length > 0) {
      console.log(`\n${m.nom} annonce des fichiers absents de ${dist} :`);
      for (const f of m.manquants) console.log(`  · ${f}`);
    }
  }

  if (detail) {
    for (const m of mesures) {
      const r = avant?.find((x) => x.fichier === m.fichier);
      console.log(`\n${m.nom} (${m.fichier})`);
      const chemins = new Set([...m.fichiers.map((f) => f.chemin), ...(r?.fichiers.map((f) => f.chemin) ?? [])]);
      for (const chemin of [...chemins].sort()) {
        const a = m.fichiers.find((f) => f.chemin === chemin);
        const b = r?.fichiers.find((f) => f.chemin === chemin);
        const taille = a ? enKo(a.brotli) : 'retiré';
        const ecart = r ? (b ? (a ? ` (était ${enKo(b.brotli)})` : '') : ' (nouveau)') : '';
        console.log(`  ${taille.padStart(7)}  ${chemin}${ecart}`);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
