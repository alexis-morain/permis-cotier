/**
 * Le décalage de mise en page (CLS) des écrans de jeu, mesuré sur le build.
 *
 * Les îlots du jeu sont en `client:only` : avant l'arrivée de leur JavaScript,
 * la page n'a que ce que le HTML y met. Si l'îlot, en se montant, change la
 * hauteur de la page, le pied de page saute : c'est le CLS de 0,40 que
 * l'audit du 21 novembre a vu une fois sur trois, et que la silhouette posée
 * au build (#96) a retiré. Ni les tests unitaires ni le build ne le voient.
 *
 * Le banc : Chromium en profil mobile (412 px de large), le build de `dist/`
 * servi en local, le bundle du renderer d'îlots (`client.*.js`) retenu
 * `DELAI` ms avant d'être servi. L'îlot se monte donc longtemps après la
 * première peinture, comme sur un téléphone lent : le pire cas, produit à
 * volonté plutôt qu'attendu du hasard. Un décalage au montage est compté à
 * chaque fois, pas une fois sur trois.
 *
 *   node scripts/verifier-cls.mjs [dossier]   # dist par défaut
 *
 * Navigateur : la variable `CHROME` (chemin d'un exécutable), sinon le Chrome
 * installé (celui de `ubuntu-latest` en CI). Sort en échec si une page dépasse
 * `SEUIL`. Un navigateur qui cale n'est pas un verdict : l'essai est refait.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));

/** Le seuil de Google pour un « bon » CLS est 0,1 ; la page n'a pas à s'en approcher. */
export const SEUIL = 0.05;
/** Le retard du JavaScript de l'îlot : bien plus long qu'un réseau correct. */
export const DELAI = 1500;
/** Les écrans de jeu : entraînement par thème, mélange, examen, revoir ses erreurs. */
export const ECRANS = ['/entrainement/feux-marques', '/entrainement/melange', '/examen', '/revoir'];
const ESSAIS = 3;
const LARGEUR = 412;

/**
 * Le CLS d'une série d'entrées `layout-shift` : la somme des décalages qui ne
 * suivent pas une action de la personne (un clic qui déplie un bloc n'en est
 * pas un). Somme simple plutôt que fenêtres de session : plus sévère, et sur
 * une page qui se monte en deux secondes, la même chose.
 */
export function cumulCls(entrees) {
  return entrees.reduce((somme, e) => (e.hadRecentInput ? somme : somme + e.value), 0);
}

/** Les écrans au-dessus du seuil, chacun une phrase. `mesures` : `{ chemin: cls }`. */
export function defauts(mesures, seuil = SEUIL) {
  return Object.entries(mesures)
    .filter(([, cls]) => cls > seuil)
    .map(([chemin, cls]) => `${chemin} : CLS ${cls.toFixed(4)} au-dessus de ${seuil}`);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

/** Sert `dist/` comme Cloudflare : `/a/b` rend `a/b.html`. Port libre, choisi par le système. */
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

/** Un écran, dans un contexte neuf (cache, stockage et service worker vides). */
async function mesurer(navigateur, origine, chemin) {
  const contexte = await navigateur.newContext({
    viewport: { width: LARGEUR, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  try {
    const page = await contexte.newPage();
    page.setDefaultTimeout(20_000);
    // Le renderer d'îlots : rien ne se monte avant lui.
    await page.route('**/_astro/client.*.js', async (route) => {
      await new Promise((ok) => setTimeout(ok, DELAI));
      await route.continue();
    });
    // Rien de tiers : le traceur n'est pas ce qu'on mesure.
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
    await page.addInitScript(() => {
      window.__layoutShifts = [];
      new PerformanceObserver((liste) => window.__layoutShifts.push(...liste.getEntries().map((e) => ({ value: e.value, hadRecentInput: e.hadRecentInput }))))
        .observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(origine + chemin, { waitUntil: 'load', timeout: 30_000 });
    // L'îlot est monté quand Astro retire son attribut `ssr`.
    await page.waitForSelector('astro-island:not([ssr])', { state: 'attached', timeout: 20_000 });
    // La banque arrive, la question se pose : on laisse finir ce que cela déplace.
    await page.waitForTimeout(1000);
    return cumulCls(await page.evaluate(() => window.__layoutShifts));
  } finally {
    await contexte.close();
  }
}

async function principal() {
  const dist = resolve(RACINE, process.argv[2] ?? 'dist');
  if (!existsSync(join(dist, 'examen.html'))) {
    console.error(`${dist} n’a pas de build : lancer \`npx astro build\` d’abord.`);
    process.exitCode = 1;
    return;
  }
  const { chromium } = await import('playwright-core');
  const serveur = servir(dist);
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
  const origine = `http://127.0.0.1:${serveur.address().port}`;
  const navigateur = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
  const mesures = {};
  try {
    for (const chemin of ECRANS) {
      let derniere;
      for (let essai = 1; essai <= ESSAIS; essai++) {
        try {
          mesures[chemin] = await mesurer(navigateur, origine, chemin);
          break;
        } catch (e) {
          derniere = e;
          console.error(`${chemin} : essai ${essai} sans mesure (${e.message.split('\n')[0]})`);
        }
      }
      if (mesures[chemin] === undefined) throw derniere;
      console.log(`${chemin.padEnd(30)} CLS ${mesures[chemin].toFixed(4)}`);
    }
  } finally {
    await navigateur.close();
    serveur.close();
  }
  const fautes = defauts(mesures);
  for (const f of fautes) console.log(`  DÉFAUT : ${f}`);
  if (!fautes.length) console.log(`Les ${ECRANS.length} écrans de jeu restent sous ${SEUIL}, JavaScript retardé de ${DELAI} ms.`);
  process.exitCode = fautes.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await principal();
}
