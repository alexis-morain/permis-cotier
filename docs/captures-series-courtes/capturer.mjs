// Captures de l'app (dist-app/ servi sur un port), 390 × 844, clair et sombre.
// Usage : node capturer.mjs <avant|apres> <port> <dossier-de-sortie> <dist-app>
// Le script sert lui-même <dist-app> sur <port>, le temps des captures.
// Chromium headless (chrome-headless-shell) piloté en CDP, profil neuf à chaque
// lancement : le localStorage est par origine, donc par port.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

const [nom, port, sortie, racine] = process.argv.slice(2);
const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', woff2: 'font/woff2', png: 'image/png', wav: 'audio/wav' };
createServer((req, rep) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(racine, chemin);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  else if (!existsSync(f) && existsSync(`${f}.html`)) f = `${f}.html`;
  if (!existsSync(f)) { rep.writeHead(404).end(); return; }
  rep.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] ?? 'application/octet-stream' }).end(readFileSync(f));
}).listen(Number(port));
const CHROME = join(homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const DEBUG = 9400 + Number(port) % 100;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

for (const schema of ['clair', 'sombre']) {
  const profil = mkdtempSync(join(tmpdir(), 'cap-'));
  const chrome = spawn(CHROME, [`--remote-debugging-port=${DEBUG}`, `--user-data-dir=${profil}`, '--no-sandbox', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  await attendre(1500);
  const cible = await (await fetch(`http://127.0.0.1:${DEBUG}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let n = 0;
  const attente = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); attente.get(d.id)?.(d); };
  const cdp = (method, params = {}) => new Promise((r) => { const id = ++n; attente.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const js = async (expression) => (await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const photo = async (fichier, pleine = false) => {
    let params = { format: 'png' };
    if (pleine) {
      const h = await js('document.documentElement.scrollHeight');
      params = { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h, scale: 1 } };
    }
    const { result } = await cdp('Page.captureScreenshot', params);
    writeFileSync(join(sortie, `${nom}-${fichier}-${schema}.png`), Buffer.from(result.data, 'base64'));
  };

  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: schema === 'sombre' ? 'dark' : 'light' }] });
  await cdp('Page.navigate', { url: `http://127.0.0.1:${port}/entrainement/ecluses` });
  await attendre(2500);
  await photo('question');
  // Joue toute la série : première proposition, valider, continuer.
  await js(`(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 400; i++) {
      if (document.querySelector('.resultat__score')) return;
      const p = document.querySelector('.propositions .proposition:not([disabled])');
      if (p) { if (i % 4 === 3) document.querySelectorAll('.propositions .proposition')[1]?.click(); else p.click(); }
      await pause(15);
      [...document.querySelectorAll('button.bouton--principal')].find((b) => /^Valider/.test(b.textContent))?.click();
      await pause(15);
      [...document.querySelectorAll('button.bouton--principal')].find((b) => /^(Continuer|Question suivante)/.test(b.textContent))?.click();
      await pause(15);
    }
  })()`);
  await attendre(1200);
  await photo('fin-serie');
  await photo('fin-serie-complet', true);
  await js(`document.querySelectorAll('.recap__ligne')[1]?.click()`);
  await attendre(400);
  await photo('fin-serie-ligne-ouverte', true);
  ws.close();
  chrome.kill();
}
process.exit(0);
