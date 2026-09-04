// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import AstroPWA from '@vite-pwa/astro';
import { readFileSync } from 'node:fs';

const versionBanque = readFileSync(new URL('./data/VERSION', import.meta.url), 'utf-8').trim();

// Domaine pas encore arrêté, cinq candidats à choisir avant la mise en ligne.
// À remplacer ici et dans `public/robots.txt` le jour du choix.
const site = process.env.SITE_URL ?? 'https://exemple.invalid';

export default defineConfig({
  site,
  trailingSlash: 'never',
  build: { format: 'directory' },
  integrations: [
    react(),
    sitemap({ filter: (page) => !page.includes('/examen') }),
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Révision permis côtier',
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
