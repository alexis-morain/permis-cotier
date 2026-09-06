// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import AstroPWA from '@vite-pwa/astro';
import { existsSync, readFileSync } from 'node:fs';

const versionBanque = readFileSync(new URL('./data/VERSION', import.meta.url), 'utf-8').trim();

// Le domaine du site. `SITE_URL` le remplace pour une prévisualisation : sur
// une adresse en .workers.dev ou .pages.dev, `src/pages/robots.txt.ts` referme
// l'indexation tout seul, pour qu'une préversion ne fasse pas concurrence au
// domaine dans les résultats.
const site = process.env.SITE_URL ?? 'https://lepermiscotier.fr';

// La cible du build. `CIBLE=app` sort dans `dist-app/` ce que la coquille iOS
// embarque : les mêmes écrans, sans ce qui ne sert qu'à être trouvé par
// Google. Le détail des différences est commenté dans `src/lib/cible.ts`.
const pourApp = process.env.CIBLE === 'app';

// Une leçon du cours n'entre au sitemap que si elle est écrite : une leçon
// courte n'est que le résumé de sa fiche de notion, la page la déclare en
// `noindex`, et un sitemap qui l'annoncerait dirait le contraire. Une leçon
// est à `/cours/<thème>/<notion>` ; la page d'un cours, `/cours/<thème>`,
// entre toujours.
const leconIndexable = (page) => {
  const code = /\/cours\/[a-z0-9-]+\/([a-z0-9-]+)(?:\.html)?$/.exec(new URL(page).pathname)?.[1];
  return !code || existsSync(new URL(`./data/cours/${code}.yaml`, import.meta.url));
};

export default defineConfig({
  site,
  outDir: pourApp ? './dist-app' : './dist',
  trailingSlash: 'never',
  // `file` et non `directory` : avec `trailingSlash: 'never'`, un dossier
  // ferait rediriger /examen vers /examen/ à chaque navigation.
  //
  // Sauf dans la coquille, où c'est l'inverse : le serveur d'assets iOS de
  // Capacitor, sur un chemin sans extension, y ajoute `/index.html`. Avec le
  // format fichier, chaque lien de la navigation rendrait 404. Cloudflare, lui,
  // fait la correspondance par `html_handling = "drop-trailing-slash"`.
  build: { format: pourApp ? 'directory' : 'file' },
  integrations: [
    react(),
    // Le sitemap et la PWA ne concernent que le site : dans un bundle, le
    // premier n'a pas de lecteur et le second doublerait un cache local.
    ...(pourApp ? [] : [
    sitemap({
      // Les écrans de jeu ne sont pas du contenu : ils tirent des questions et
      // n'ont rien d'indexable. Ils sont écartés ici comme dans robots.txt.
      filter: (page) =>
        !/\/(examen|revoir|parametres|signaler|recherche)(\.html)?$/.test(page) &&
        !page.includes('/entrainement/') &&
        leconIndexable(page),
      changefreq: 'weekly',
      lastmod: new Date(),
      serialize(item) {
        const chemin = new URL(item.url).pathname.replace(/\.html$/, '');
        // Ce que Google doit explorer en premier : l'accueil, puis les pages
        // qui répondent à une question, puis le programme, puis la banque.
        if (chemin === '/' || chemin === '') item.priority = 1.0;
        else if (chemin === '/cours' || chemin.startsWith('/guide')) item.priority = 0.9;
        else if (/^\/cours\/[a-z0-9-]+$/.test(chemin)) item.priority = 0.8;
        else if (chemin.startsWith('/cours/')) item.priority = 0.7;
        else if (chemin === '/themes' || chemin.startsWith('/theme/')) item.priority = 0.8;
        else if (chemin.startsWith('/notion/')) item.priority = 0.7;
        else if (chemin.startsWith('/question/')) item.priority = 0.4;
        else item.priority = 0.3;
        return item;
      },
    }),
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Le Permis Côtier — révision',
        short_name: 'Permis côtier',
        description:
          'Examens blancs au format de l’épreuve et entraînement par thème pour le permis plaisance option côtière.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        // Les jetons de la direction artistique, `--brume` et `--marine`. Le
        // beige et le vert sombre d'avant traînaient encore ici, et c'est la
        // couleur de l'écran de démarrage : elle serait fausse dès le premier
        // lancement.
        background_color: '#f3f6fb',
        theme_color: '#0b1d3a',
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // La version de banque entre dans le nom du cache : une publication
        // invalide le hors-ligne périmé au lieu de le laisser traîner.
        cacheId: `permis-cotier-v${versionBanque}`,
        // `json` porte deux choses : l'index de la recherche, sans quoi la
        // loupe ne trouverait plus rien dès que le réseau tombe, et la banque
        // depuis qu'elle est sortie du HTML, sans quoi /examen ne rendrait plus
        // rien hors ligne. Le nom de la banque porte sa version, donc une
        // publication la remplace au lieu de l'empiler.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,json}'],
        // `derniere.json` doit dire la vérité du jour, jamais celle du cache :
        // c'est le point que l'app iOS interroge pour savoir si sa banque a
        // vieilli, et le site n'en a aucun usage.
        globIgnores: ['**/node_modules/**/*', 'banque/derniere.json'],
        navigateFallback: '/',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
    ]),
  ],
  vite: {
    define: {
      __VERSION_BANQUE__: JSON.stringify(versionBanque),
      __POUR_APP__: JSON.stringify(pourApp),
    },
  },
});
