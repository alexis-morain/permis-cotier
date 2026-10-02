/**
 * `scripts/poids.mjs` : ce que coûte une page, en brotli, actifs compris.
 *
 * Un faux `dist/` est écrit dans un dossier temporaire : une page qui charge
 * une feuille, un script, une police et un îlot ; le script importe un morceau
 * partagé. On vérifie que la fermeture est bien suivie, que chaque fichier est
 * rangé dans sa colonne, et que le tableau lit une référence et dit l'écart.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliCompressSync } from 'node:zlib';
import {
  actifsDuHtml,
  importsDuScript,
  genre,
  mesurerPage,
  tableau,
  enKo,
} from '../scripts/poids.mjs';

let dist: string;

const HTML = `<!doctype html><html><head>
<link rel="preload" as="font" type="font/woff2" href="/_astro/archivo.AAAA.woff2" crossorigin>
<link rel="stylesheet" href="/_astro/index.BBBB.css">
<link rel="modulepreload" href="/_astro/precharge.EEEE.js">
<script type="module" src="/_astro/Mesure.CCCC.js"></script>
<script defer src="/registerSW.js"></script>
<script async src="https://umami.morain.fr/script.js"></script>
<script type="application/ld+json">{"@context":"https://schema.org"}</script>
</head><body>
<astro-island component-url="/_astro/Reprise.DDDD.js" component-export="default" renderer-url="/_astro/client.FFFF.js" props="{}"></astro-island>
<a href="/examen">lien</a>
</body></html>`;

const SCRIPT_MESURE = 'import{a}from"./progression.GGGG.js";import"./jsx.HHHH.js";const b=import("./tard.IIII.js");a();';

beforeAll(async () => {
  dist = await mkdtemp(join(tmpdir(), 'poids-'));
  await mkdir(join(dist, '_astro'), { recursive: true });
  await mkdir(join(dist, 'cours'), { recursive: true });
  await writeFile(join(dist, 'index.html'), HTML);
  await writeFile(join(dist, 'cours', 'balisage.html'), '<html><body>cours</body></html>');
  await writeFile(join(dist, '_astro', 'archivo.AAAA.woff2'), Buffer.alloc(4000, 7));
  await writeFile(join(dist, '_astro', 'index.BBBB.css'), 'body{color:red}'.repeat(50));
  await writeFile(join(dist, '_astro', 'precharge.EEEE.js'), 'export const p=1;');
  await writeFile(join(dist, '_astro', 'Mesure.CCCC.js'), SCRIPT_MESURE);
  await writeFile(join(dist, '_astro', 'progression.GGGG.js'), 'export const a=()=>1;'.repeat(20));
  await writeFile(join(dist, '_astro', 'jsx.HHHH.js'), 'console.log(1)');
  await writeFile(join(dist, '_astro', 'tard.IIII.js'), 'export default 1');
  await writeFile(join(dist, '_astro', 'Reprise.DDDD.js'), 'import"./progression.GGGG.js";export default()=>null;');
  await writeFile(join(dist, '_astro', 'client.FFFF.js'), 'x'.repeat(3000));
  await writeFile(join(dist, 'registerSW.js'), 'navigator.serviceWorker');
});

afterAll(() => rm(dist, { recursive: true, force: true }));

describe('les actifs qu’une page charge', () => {
  it('lit feuilles, scripts, préchargements et îlots, et ignore les tiers', () => {
    expect(actifsDuHtml(HTML).sort()).toEqual(
      [
        '/_astro/archivo.AAAA.woff2',
        '/_astro/index.BBBB.css',
        '/_astro/precharge.EEEE.js',
        '/_astro/Mesure.CCCC.js',
        '/registerSW.js',
        '/_astro/Reprise.DDDD.js',
        '/_astro/client.FFFF.js',
      ].sort(),
    );
  });

  it('suit les imports statiques d’un script, pas les dynamiques', () => {
    expect(importsDuScript(SCRIPT_MESURE, '/_astro/Mesure.CCCC.js')).toEqual([
      '/_astro/progression.GGGG.js',
      '/_astro/jsx.HHHH.js',
    ]);
  });

  it('range chaque fichier dans sa colonne', () => {
    expect(genre('/index.html')).toBe('html');
    expect(genre('/_astro/index.BBBB.css')).toBe('css');
    expect(genre('/_astro/client.FFFF.js')).toBe('js');
    expect(genre('/_astro/archivo.AAAA.woff2')).toBe('police');
    expect(genre('/visuels/x.svg')).toBe('autre');
  });
});

describe('la mesure d’une page', () => {
  it('compte la fermeture entière une seule fois, en brotli', async () => {
    const m = await mesurerPage(dist, 'index.html');
    const fichiers = m.fichiers.map((f) => f.chemin).sort();
    expect(fichiers).toEqual(
      [
        '/index.html',
        '/_astro/archivo.AAAA.woff2',
        '/_astro/index.BBBB.css',
        '/_astro/precharge.EEEE.js',
        '/_astro/Mesure.CCCC.js',
        '/_astro/progression.GGGG.js',
        '/_astro/jsx.HHHH.js',
        '/_astro/Reprise.DDDD.js',
        '/_astro/client.FFFF.js',
        '/registerSW.js',
      ].sort(),
    );
    expect(m.fichiers.find((f) => f.chemin === '/_astro/client.FFFF.js')?.brotli).toBe(
      brotliCompressSync(Buffer.from('x'.repeat(3000))).length,
    );
    const somme = (g: string) => m.fichiers.filter((f) => f.genre === g).reduce((s, f) => s + f.brotli, 0);
    expect(m.parGenre.html).toBe(somme('html'));
    expect(m.parGenre.js).toBe(somme('js'));
    expect(m.parGenre.police).toBe(somme('police'));
    expect(m.total).toBe(m.fichiers.reduce((s, f) => s + f.brotli, 0));
  });

  it('dit quel fichier manque plutôt que de le compter pour zéro', async () => {
    await writeFile(join(dist, 'cassee.html'), '<link rel="stylesheet" href="/_astro/absente.css">');
    const m = await mesurerPage(dist, 'cassee.html');
    expect(m.manquants).toEqual(['/_astro/absente.css']);
  });
});

describe('le tableau', () => {
  const avant = [
    { nom: 'Accueil', fichier: 'index.html', parGenre: { html: 13000, css: 7000, js: 60000, police: 90000, autre: 0 }, total: 170000, fichiers: [], manquants: [] },
  ];
  const apres = [
    { nom: 'Accueil', fichier: 'index.html', parGenre: { html: 9000, css: 7000, js: 5000, police: 53000, autre: 0 }, total: 74000, fichiers: [], manquants: [] },
  ];

  it('écrit les kilooctets avec une décimale', () => {
    expect(enKo(90104)).toBe('90,1');
    expect(enKo(0)).toBe('0,0');
  });

  it('sans référence, une ligne par page et une colonne par genre', () => {
    const t = tableau(apres);
    expect(t).toContain('Accueil');
    expect(t).toContain('74,0');
    expect(t).not.toContain('→');
  });

  it('avec référence, chaque cellule dit avant, après et l’écart', () => {
    const t = tableau(apres, avant);
    expect(t).toContain('170,0 → 74,0');
    expect(t).toContain('−96,0');
    expect(t).toContain('90,0 → 53,0');
  });
});
