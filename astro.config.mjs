// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import AstroPWA from '@vite-pwa/astro';
import { readFileSync } from 'node:fs';

const versionBanque = readFileSync(new URL('./data/VERSION', import.meta.url), 'utf-8').trim();

// Le domaine du site. `SITE_URL` le remplace pour une prévisualisation : sur
// une adresse en .workers.dev ou .pages.dev, `src/pages/robots.txt.ts` referme
// l'indexation tout seul, pour qu'une préversion ne fasse pas concurrence au
// domaine dans les résultats.
const site = process.env.SITE_URL ?? 'https://lepermiscotier.fr';

export default defineConfig({
  site,
  trailingSlash: 'never',
  // `file` et non `directory` : avec `trailingSlash: 'never'`, un dossier
  // ferait rediriger /examen vers /examen/ à chaque navigation.
  build: { format: 'file' },
  integrations: [
    react(),
    sitemap({
      // Les écrans de jeu ne sont pas du contenu : ils tirent des questions et
      // n'ont rien d'indexable. Ils sont écartés ici comme dans robots.txt.
      filter: (page) =>
        !/\/(examen|revoir|parametres|signaler)(\.html)?$/.test(page) &&
        !page.includes('/entrainement/'),
      changefreq: 'weekly',
      lastmod: new Date(),
      serialize(item) {
        const chemin = new URL(item.url).pathname.replace(/\.html$/, '');
        // Ce que Google doit explorer en premier : l'accueil, puis les pages
        // qui répondent à une question, puis le programme, puis la banque.
        if (chemin === '/' || chemin === '') item.priority = 1.0;
        else if (chemin.startsWith('/guide')) item.priority = 0.9;
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
        background_color: '#f2ecdd',
        theme_color: '#16231f',
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
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: '/',
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  vite: {
    define: {
      __VERSION_BANQUE__: JSON.stringify(versionBanque),
    },
  },
});
