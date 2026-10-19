// Pilote CDP minimal pour mesurer la fluidité de l'app (dist-app/ servi, Chromium
// headless, 390 × 844, CPU ralenti). Hors du gate : un outil de mesure.
//
//   node docs/captures-fluidite/cdp.mjs <port> [ralentissement]
//
// Chaque parcours part d'un profil Chromium neuf. Le script injecté rend compte
// par une liaison `__rec` (qui survit aux rechargements) des mutations du DOM,
// des longues tâches et des décalages de mise en page ; Performance.getMetrics
// donne le nombre de recalculs de mise en page et de style.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(fileURLToPath(new URL('../..', import.meta.url)), 'dist-app');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.wav': 'audio/wav', '.webmanifest': 'application/manifest+json' };

export function servir(port) {
  const serveur = createServer((req, rep) => {
    let chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let fichier = join(RACINE, chemin);
    if (existsSync(fichier) && statSync(fichier).isDirectory()) fichier = join(fichier, 'index.html');
    if (!existsSync(fichier)) fichier = join(RACINE, chemin, 'index.html');
    if (!existsSync(fichier)) {
      rep.writeHead(404);
      return rep.end('404');
    }
    rep.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' });
    rep.end(readFileSync(fichier));
  });
  return new Promise((ok) => serveur.listen(port, () => ok(serveur)));
}

const EN_PAGE = `
(() => {
  if (window.__fl) return;
  window.__fl = true;
  const t = () => performance.timeOrigin + performance.now();
  const rec = (type, extra = {}) => window.__rec(JSON.stringify({ type, t: t(), ...extra }));
  new PerformanceObserver((l) => l.getEntries().forEach((e) => rec('longtask', { d: e.duration })))
    .observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) rec('cls', { v: e.value, src: (e.sources || []).map((x) => (x.node ? (x.node.nodeName + '.' + (x.node.className || '')).slice(0, 60) : '?')) }); }))
    .observe({ type: 'layout-shift', buffered: true });
  new MutationObserver(() => rec('mut')).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  addEventListener('pageshow', () => rec('load'));
  let dernier = performance.now();
  const image = (maintenant) => {
    if (maintenant - dernier > 40) rec('image', { d: maintenant - dernier });
    dernier = maintenant;
    requestAnimationFrame(image);
  };
  requestAnimationFrame(image);
})();
`;

export async function lancer({ ralentissement = 4, sansTransitionsNatives = false, debogage = 9400 + Math.floor(Math.random() * 400) } = {}) {
  const dossier = join(homedir(), 'Library/Caches/ms-playwright');
  const bin = [`chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`, `chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell`]
    .map((p) => join(dossier, p)).find(existsSync);
  const profil = mkdtempSync(join(tmpdir(), 'fl-profil-'));
  const proc = spawn(bin, [`--remote-debugging-port=${debogage}`, `--user-data-dir=${profil}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let cible;
  for (let i = 0; i < 50 && !cible; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const l = await (await fetch(`http://127.0.0.1:${debogage}/json`)).json();
      cible = l.find((x) => x.type === 'page');
    } catch {}
  }
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let n = 0;
  const attente = new Map();
  const evenements = [];
  const ecouteurs = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && attente.has(d.id)) {
      const { ok, ko } = attente.get(d.id);
      attente.delete(d.id);
      d.error ? ko(new Error(JSON.stringify(d.error))) : ok(d.result);
    } else if (d.method) ecouteurs.forEach((f) => f(d));
  };
  const envoyer = (method, params = {}) => new Promise((ok, ko) => { const id = ++n; attente.set(id, { ok, ko }); ws.send(JSON.stringify({ id, method, params })); });
  ecouteurs.push((d) => {
    if (d.method === 'Runtime.bindingCalled' && d.params.name === '__rec') evenements.push(JSON.parse(d.params.payload));
  });
  await envoyer('Page.enable');
  await envoyer('Runtime.enable');
  await envoyer('Performance.enable');
  await envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await envoyer('Emulation.setTouchEmulationEnabled', { enabled: true });
  await envoyer('Emulation.setCPUThrottlingRate', { rate: ralentissement });
  await envoyer('Runtime.addBinding', { name: '__rec' });
  // Safari 16 et 17 n'ont pas les View Transitions natives : Astro simule alors l'animation.
  const sans = sansTransitionsNatives ? 'delete Document.prototype.startViewTransition;' : '';
  await envoyer('Page.addScriptToEvaluateOnNewDocument', { source: sans + EN_PAGE });

  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const evalue = async (expression) => {
    const r = await envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'erreur');
    return r.result.value;
  };
  const metriques = async () => Object.fromEntries((await envoyer('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const attendre = async (expression, delai = 15000) => {
    const debut = Date.now();
    while (Date.now() - debut < delai) {
      try { if (await evalue(expression)) return true; } catch {}
      await pause(40);
    }
    throw new Error('délai : ' + expression);
  };
  /** Joue `action`, attend `pret`, puis une accalmie de 400 ms ; rend les chiffres. */
  const mesurer = async (action, pret, minimum = 0) => {
    evenements.length = 0;
    const avant = await metriques();
    const t0 = Date.now();
    await action();
    await attendre(pret);
    if (minimum) await pause(Math.max(0, minimum - (Date.now() - t0)));
    // écran stable : plus aucune mutation, tâche longue ni décalage depuis 400 ms
    let dernier = t0;
    for (;;) {
      await pause(100);
      const bruit = evenements.filter((e) => e.type !== 'load' && e.type !== 'image').map((e) => e.t);
      dernier = Math.max(t0, ...bruit);
      if (Date.now() - dernier > 400) break;
    }
    const apres = await metriques();
    const recharge = evenements.some((e) => e.type === 'load');
    if (recharge) for (const k of Object.keys(avant)) avant[k] = 0;
    const longues = evenements.filter((e) => e.type === 'longtask');
    return {
      premier_changement_ms: Math.round(Math.min(...evenements.filter((e) => e.type === 'mut').map((e) => e.t)) - t0),
      stable_ms: Math.round(dernier - t0),
      longues_taches: longues.length,
      longues_ms: Math.round(longues.reduce((s, e) => s + e.d, 0)),
      images_lentes: evenements.filter((e) => e.type === 'image').length,
      pire_image_ms: Math.round(Math.max(0, ...evenements.filter((e) => e.type === 'image').map((e) => e.d))),
      cls_sources: [...new Set(evenements.filter((e) => e.type === 'cls').flatMap((e) => e.src))],
      cls: +evenements.filter((e) => e.type === 'cls').reduce((s, e) => s + e.v, 0).toFixed(4),
      mises_en_page: (apres.LayoutCount ?? 0) - (avant.LayoutCount ?? 0),
      recalculs_style: (apres.RecalcStyleCount ?? 0) - (avant.RecalcStyleCount ?? 0),
      chargements: evenements.filter((e) => e.type === 'load').length,
    };
  };
  const clic = (selecteur) => evalue(`(()=>{const e=${selecteur};if(!e)throw new Error('introuvable');e.click();return true})()`);
  const capture = async (fichier) => {
    const r = await envoyer('Page.captureScreenshot', { format: 'png' });
    writeFileSync(fichier, Buffer.from(r.data, 'base64'));
  };
  const aller = async (url) => { await envoyer('Page.navigate', { url }); };
  const fin = () => { try { ws.close(); } catch {} proc.kill(); };
  return { envoyer, evalue, attendre, mesurer, clic, capture, aller, pause, fin, evenements };
}
