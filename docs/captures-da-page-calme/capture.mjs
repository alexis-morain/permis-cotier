// Captures du chantier « page calme » : sert un build (`dist/` du site, en
// format `file`, ou `dist-app/` de la coquille, en `directory`) et le photographie
// dans le Chromium headless du cache de Playwright, par CDP. Hors du gate : un
// outil de relecture.
//
//   node docs/captures-da-page-calme/capture.mjs <build> <sortie> <plan.json>
//
// Le plan est une liste de prises :
//   { "nom": "accueil-1280", "chemin": "/", "largeur": 1280, "hauteur": 900,
//     "sombre": false, "pleine": true, "app": false,
//     "stockage": { "clé": "valeur JSON en chaîne" },
//     "script": "expression évaluée après chargement (clics…), peut être async",
//     "attente": 400 }
// `app: true` émule un téléphone tactile (390 px par défaut) et pose
// `env(safe-area-inset-*)` à zéro, comme Chromium le fait de toute façon.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const [build, sortie, planFichier] = process.argv.slice(2);
if (!build || !sortie || !planFichier) {
  console.error('usage : capture.mjs <build> <sortie> <plan.json>');
  process.exit(2);
}
const RACINE = resolve(build);
const plan = JSON.parse(readFileSync(planFichier, 'utf-8'));
mkdirSync(sortie, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };

function trouver(chemin) {
  const base = join(RACINE, chemin);
  for (const f of [base, `${base}.html`, join(base, 'index.html')]) {
    if (existsSync(f) && statSync(f).isFile()) return f;
  }
  return null;
}

const serveur = createServer((req, rep) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // Pas de service worker : il servirait un build précédent.
  if (chemin === '/sw.js' || chemin === '/registerSW.js') {
    rep.writeHead(404);
    return rep.end();
  }
  const fichier = trouver(chemin);
  if (!fichier) {
    rep.writeHead(404);
    return rep.end('404');
  }
  rep.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
  rep.end(readFileSync(fichier));
});
await new Promise((ok) => serveur.listen(0, ok));
const port = serveur.address().port;

const dossier = join(homedir(), 'Library/Caches/ms-playwright');
const bin = ['chromium_headless_shell-1243', 'chromium_headless_shell-1228']
  .map((p) => join(dossier, p, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'))
  .find(existsSync);
if (!bin) throw new Error('Chromium headless introuvable dans ~/Library/Caches/ms-playwright');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function prise(p) {
  const debogage = 9800 + Math.floor(Math.random() * 150);
  const profil = mkdtempSync(join(tmpdir(), 'calme-'));
  const proc = spawn(bin, [`--remote-debugging-port=${debogage}`, `--user-data-dir=${profil}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  try {
    let cible;
    for (let i = 0; i < 50 && !cible; i++) {
      await pause(150);
      try {
        cible = (await (await fetch(`http://127.0.0.1:${debogage}/json`)).json()).find((x) => x.type === 'page');
      } catch {}
    }
    const ws = new WebSocket(cible.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    let n = 0;
    const attente = new Map();
    const erreurs = [];
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && attente.has(d.id)) {
        const { ok, ko } = attente.get(d.id);
        attente.delete(d.id);
        d.error ? ko(new Error(JSON.stringify(d.error))) : ok(d.result);
      } else if (d.method === 'Runtime.exceptionThrown') {
        erreurs.push(d.params.exceptionDetails?.exception?.description ?? 'exception');
      }
    };
    const envoyer = (method, params = {}) => new Promise((ok, ko) => { const id = ++n; attente.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params })); });
    const evalue = async (expression) => {
      const r = await envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'erreur');
      return r.result.value;
    };

    const largeur = p.largeur ?? (p.app ? 390 : 1280);
    const hauteur = p.hauteur ?? (p.app ? 844 : 900);
    await envoyer('Page.enable');
    await envoyer('Runtime.enable');
    await envoyer('Emulation.setDeviceMetricsOverride', { width: largeur, height: hauteur, deviceScaleFactor: 2, mobile: Boolean(p.app || largeur < 600) });
    if (p.app || largeur < 600) await envoyer('Emulation.setTouchEmulationEnabled', { enabled: true });
    await envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: p.sombre ? 'dark' : 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
    const stockage = Object.entries(p.stockage ?? {});
    if (stockage.length > 0) {
      const source = `try { if (!sessionStorage.getItem('__seme')) { ${stockage.map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join(' ')} sessionStorage.setItem('__seme', '1'); } } catch {}`;
      await envoyer('Page.addScriptToEvaluateOnNewDocument', { source });
    }
    await envoyer('Page.navigate', { url: `http://127.0.0.1:${port}${p.chemin}` });
    await pause(p.attente ?? 900);
    if (p.script) {
      await evalue(`(async () => { ${p.script} })()`);
      await pause(p.attenteScript ?? 500);
    }
    // `"mesure": true` : dit le bord droit le plus lointain, pour voir un
    // débordement que l'émulation mobile cache (elle élargit la fenêtre).
    if (p.mesure) {
      const droite = await evalue(`Math.round(Math.max(...[...document.querySelectorAll('body *')].filter((e) => e.offsetWidth > 0 && !e.closest('.visuellement-cache, [hidden], dialog:not([open])')).map((e) => e.getBoundingClientRect().right)))`);
      console.log(`${p.nom} : bord droit ${droite} pour ${largeur}${droite > largeur ? '  DÉBORDE' : ''}`);
    }
    let clip;
    if (p.pleine) {
      // Une image paresseuse hors de l'écran ne part jamais : on la demande.
      await evalue(`Promise.all([...document.querySelectorAll('img[loading="lazy"]')].map((i) => { i.loading = 'eager'; return i.decode().catch(() => {}); }))`);
      await pause(300);
      const h = await evalue('Math.ceil(document.documentElement.scrollHeight)');
      clip = { x: 0, y: 0, width: largeur, height: Math.min(h, p.hauteurMax ?? 6000), scale: 1 };
    }
    const { data } = await envoyer('Page.captureScreenshot', { format: 'png', captureBeyondViewport: Boolean(p.pleine), ...(clip ? { clip } : {}) });
    writeFileSync(join(sortie, `${p.nom}.png`), Buffer.from(data, 'base64'));
    console.log(`${p.nom}.png${erreurs.length ? `  (erreurs : ${erreurs.join(' | ')})` : ''}`);
    ws.close();
  } finally {
    proc.kill();
  }
}

for (const p of plan) {
  try {
    await prise(p);
  } catch (e) {
    console.error(`${p.nom} : ${e.message}`);
  }
}
serveur.close();
