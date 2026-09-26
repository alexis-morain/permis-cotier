// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import AstroPWA from '@vite-pwa/astro';
import {
  GLOB_NOYAU,
  GLOB_HORS_NOYAU,
  IGNORER_PARAMETRES,
  reglesALaDemande,
} from './src/lib/hors-ligne.ts';
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
/**
 * Ce que le site ne doit pas payer pour l'app.
 *
 * Astro empaquette le CSS et les scripts de tout composant importé, qu'il soit
 * rendu ou non : un `{POUR_APP && <Coquille />}` ne rend rien sur le site, mais
 * la feuille de la coquille entrait dans le CSS global et son routeur dans
 * `dist/_astro/`, donc dans le précache du service worker. Hors de la cible
 * « app », ce greffon remplace donc à la source ce qui ne sert qu'à l'app :
 *
 * - les trois feuilles `app*.css`, et celle des transitions d'Astro que
 *   `transition:animate` fait entrer, par une feuille vide ;
 * - les composants propres à l'app, par un composant vide ;
 * - l'écran `/accueil`, par une page qui ne se construit nulle part ;
 * - `import { POUR_APP } from '…/cible'`, par la constante `false` écrite en
 *   place. Importée, la constante restait une liaison entre deux morceaux :
 *   Rollup sait qu'elle est fausse, mais garde le module `cible` et ce qui ne
 *   tient qu'à lui (`natif`, les sons) en morceaux à part. Écrite en place, le
 *   minificateur retire la branche morte et l'import avec.
 *
 * Les tests ne passent pas par ici (`vitest.config.ts`) : ils moquent `cible`
 * pour voir l'app.
 */
const SEULEMENT_APP_CSS = [
  'src/styles/app.css',
  'src/styles/app-jeu.css',
  'src/styles/app-ecrans.css',
  'node_modules/astro/components/viewtransitions.css',
];
const SEULEMENT_APP_ASTRO = ['src/components/Coquille.astro', 'src/components/EntrainementApp.astro', 'src/components/SonsApp.astro'];
const ECRAN_ACCUEIL_APP = 'src/pages/[accueil].astro';
const IMPORT_CIBLE = /import\s*\{\s*POUR_APP\s*\}\s*from\s*['"][^'"]*\/cible(?:\.ts)?['"];?/g;

function siteSansApp() {
  const racine = new URL('.', import.meta.url).pathname;
  const chemin = (id) => id.split('?')[0].replace(racine, '');
  return {
    name: 'permis-cotier:site-sans-app',
    enforce: 'pre',
    load(id) {
      if (id.includes('?')) return null;
      const fichier = chemin(id);
      if (SEULEMENT_APP_CSS.includes(fichier)) return '';
      if (SEULEMENT_APP_ASTRO.includes(fichier)) return '';
      if (fichier === ECRAN_ACCUEIL_APP) return '---\nexport function getStaticPaths() { return []; }\n---\n';
      return null;
    },
    transform(code, id) {
      const fichier = chemin(id);
      if (!fichier.startsWith('src/') || !/\.tsx?$/.test(fichier)) return null;
      const sansCible = code.replace(IMPORT_CIBLE, 'const POUR_APP = false;');
      return sansCible === code ? null : { code: sansCible, map: null };
    },
  };
}

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
      // La fiche du candidat et ses erreurs non plus : elles sont vides tant
      // que le navigateur n'a pas lu sa progression, et déclarées `noindex` —
      // les annoncer au sitemap dirait le contraire.
      filter: (page) =>
        !/\/(examen|revoir|parametres|signaler|recherche)(\.html)?$/.test(page) &&
        !page.includes('/profil') &&
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
        // Les fiches écrites pour ce site : du contenu original, sur des
        // sujets où les concurrents recopient sans jamais citer.
        else if (chemin === '/source' || chemin.startsWith('/source/')) item.priority = 0.7;
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
        // Le manifeste est vu avant le CSS, notamment à l'installation et au
        // démarrage de la PWA. Il doit donc suivre les jetons actuels, pas
        // l'ancienne direction artistique crème et vert sombre.
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
        // Le partage entre ce qui est précaché, ce qui se garde à mesure
        // qu'on le lit et ce qui reste au réseau se lit dans
        // `src/lib/hors-ligne.ts`, où des tests le tiennent.
        globPatterns: [...GLOB_NOYAU],
        globIgnores: [...GLOB_HORS_NOYAU],
        runtimeCaching: reglesALaDemande(versionBanque),
        // Aucun repli de navigation : une adresse inconnue doit recevoir la
        // 404 du serveur, pas l'accueil sous son nom.
        //
        // La clé doit être écrite, même vide : `@vite-pwa/astro` teste
        // `'navigateFallback' in workbox` et, si elle manque, y met la base du
        // site. La retirer ne la supprime donc pas, elle la remet à « / » sans
        // la liste d'exclusion qui l'accompagnait — l'inverse du but.
        navigateFallback: undefined,
        ignoreURLParametersMatching: [...IGNORER_PARAMETRES],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
    ]),
  ],
  vite: {
    plugins: pourApp ? [] : [siteSansApp()],
    define: {
      __VERSION_BANQUE__: JSON.stringify(versionBanque),
      __POUR_APP__: JSON.stringify(pourApp),
    },
  },
});
