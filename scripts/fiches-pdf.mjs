#!/usr/bin/env node
/**
 * Imprime en PDF les fiches de révision, depuis le site construit.
 *
 *     npm run build && npm run fiches            # écrit public/fiches-revision/<cours>.pdf
 *     node scripts/fiches-pdf.mjs balisage       # une seule fiche
 *     node scripts/fiches-pdf.mjs --verifier     # échoue si un PDF manque ou est périmé
 *
 * Les PDF sont commités : le build de Cloudflare n'a pas de Chrome, et n'en a
 * pas besoin. Chrome se lance ici en headless sur la page `/fiches-revision/
 * <cours>` servie depuis `dist/`, et imprime avec la feuille `@media print`
 * de `revision.css`. Il se trouve à son emplacement d'application sur le Mac,
 * ou par la variable `CHROME`.
 *
 * Un PDF ne se compare pas octet à octet : Chrome y écrit la date. Le script
 * garde donc, dans `empreintes.json`, l'empreinte de tout ce dont la fiche est
 * faite (son YAML, les leçons qu'elle résume, ses dessins, la page et sa
 * feuille de style). `--verifier` recalcule ces empreintes sans Chrome : c'est
 * ce que fait la CI.
 */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir, tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const racine = fileURLToPath(new URL('..', import.meta.url));
const dossierFiches = join(racine, 'data', 'revision');
const sortie = join(racine, 'public', 'fiches-revision');
const fichierEmpreintes = join(sortie, 'empreintes.json');

/** Ce qui fait le rendu de toutes les fiches à la fois. */
const COMMUNS = [
  'src/pages/fiches-revision/[cours].astro',
  'src/components/BlocRevision.astro',
  'src/components/revision.css',
];

function codesDesFiches() {
  return readdirSync(dossierFiches)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace(/\.yaml$/, ''))
    .sort();
}

/** Les fichiers dont une fiche est faite, chemins relatifs à la racine, triés. */
export function entreesDe(code) {
  const yaml = `data/revision/${code}.yaml`;
  const fiche = parse(readFileSync(join(racine, yaml), 'utf-8'));
  const entrees = new Set([yaml, ...COMMUNS]);
  for (const section of fiche.sections ?? []) {
    for (const notion of section.notions ?? []) entrees.add(`data/cours/${notion}.yaml`);
    for (const bloc of section.blocs ?? []) {
      if (bloc.schema) entrees.add(`public/fiches-revision/schemas/${bloc.schema.fichier}`);
      for (const g of bloc.galerie ?? []) entrees.add(`public/visuels/${g.visuel}`);
      for (const ligne of bloc.tableau?.lignes ?? []) {
        for (const c of ligne) if (c && typeof c === 'object') entrees.add(`public/visuels/${c.visuel}`);
      }
    }
  }
  return [...entrees].sort();
}

export function empreinteDe(code) {
  const h = createHash('sha256');
  for (const chemin of entreesDe(code)) {
    h.update(chemin);
    h.update('\0');
    h.update(existsSync(join(racine, chemin)) ? readFileSync(join(racine, chemin)) : 'absent');
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

function lireEmpreintes() {
  return existsSync(fichierEmpreintes) ? JSON.parse(readFileSync(fichierEmpreintes, 'utf-8')) : {};
}

function verifier() {
  const gardees = lireEmpreintes();
  const fautes = [];
  for (const code of codesDesFiches()) {
    if (!existsSync(join(sortie, `${code}.pdf`))) fautes.push(`${code} : pas de PDF`);
    else if (gardees[code] !== empreinteDe(code)) fautes.push(`${code} : PDF périmé`);
  }
  for (const code of Object.keys(gardees)) {
    if (!codesDesFiches().includes(code)) fautes.push(`${code} : PDF sans fiche`);
  }
  for (const f of fautes) console.error(`${f}, lance \`npm run build && npm run fiches\``);
  if (fautes.length) return 1;
  console.log(`${codesDesFiches().length} fiche(s) de révision en PDF à jour.`);
  return 0;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };

/** Sert `dist/` comme Cloudflare : `/a/b` rend `a/b.html`. */
function servir(dist) {
  return createServer((req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const candidats = [chemin, `${chemin}.html`, join(chemin, 'index.html')].map((c) => join(dist, c));
    const fichier = candidats.find((c) => c.startsWith(dist) && existsSync(c) && statSync(c).isFile());
    if (!fichier) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
    res.end(readFileSync(fichier));
  });
}

/**
 * Le navigateur qui imprime. `chrome-headless-shell`, celui que Playwright
 * range dans son cache, d'abord : Chrome complet, lancé alors qu'une session
 * est ouverte sur le Mac, ne rend pas la main.
 */
function chrome() {
  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  const coquilles = existsSync(cache)
    ? readdirSync(cache)
        .filter((d) => d.startsWith('chromium_headless_shell-'))
        .sort()
        .reverse()
        .flatMap((d) => readdirSync(join(cache, d)).map((s) => join(cache, d, s, 'chrome-headless-shell')))
    : [];
  const candidats = [process.env.CHROME, ...coquilles, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const trouve = candidats.find((c) => existsSync(c));
  if (!trouve) throw new Error('Chrome introuvable : pose la variable CHROME');
  return trouve;
}

/**
 * Une fiche, dans un profil neuf. Chrome headless cale parfois sans raison
 * visible : passé une minute, on le tue et on recommence une fois.
 */
async function imprimerUne(code, port) {
  for (let essai = 1; ; essai++) {
    const profil = mkdtempSync(join(tmpdir(), 'fiches-pdf-'));
    try {
      // Asynchrone : un appel synchrone bloquerait le serveur, qui ne répondrait plus à Chrome.
      await promisify(execFile)(
        chrome(),
        [
          '--headless=new',
          '--no-first-run',
          `--user-data-dir=${profil}`,
          '--no-pdf-header-footer',
          // Rien d'autre que le serveur local : la page charge la mesure
          // Umami, et un serveur de mesure muet faisait attendre Chrome sans fin.
          '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
          '--virtual-time-budget=4000',
          `--print-to-pdf=${join(sortie, `${code}.pdf`)}`,
          `http://127.0.0.1:${port}/fiches-revision/${code}`,
        ],
        { timeout: 60_000 },
      );
      return;
    } catch (erreur) {
      if (essai >= 2) throw erreur;
      console.error(`${code} : Chrome n'a pas rendu la main, nouvel essai`);
    } finally {
      rmSync(profil, { recursive: true, force: true });
    }
  }
}

async function imprimer(codes) {
  const dist = join(racine, 'dist');
  for (const code of codes) {
    if (!existsSync(join(dist, 'fiches-revision', `${code}.html`))) {
      throw new Error(`dist/fiches-revision/${code}.html manque : lance \`npm run build\` d'abord`);
    }
  }
  const serveur = servir(dist);
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
  const { port } = serveur.address();
  const empreintes = lireEmpreintes();
  try {
    for (const code of codes) {
      await imprimerUne(code, port);
      empreintes[code] = empreinteDe(code);
      console.log(`écrit public/fiches-revision/${code}.pdf`);
    }
  } finally {
    serveur.close();
  }
  const triees = Object.fromEntries(Object.entries(empreintes).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(fichierEmpreintes, `${JSON.stringify(triees, null, 2)}\n`);
}

const args = process.argv.slice(2);
if (args.includes('--verifier')) {
  process.exit(verifier());
} else {
  const demandes = args.filter((a) => !a.startsWith('--'));
  await imprimer(demandes.length ? demandes : codesDesFiches());
}
