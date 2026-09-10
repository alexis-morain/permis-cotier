/**
 * Ce qui vit hors ligne, et ce qui ne le fait pas.
 *
 * Le README promet le site « hors ligne une fois la page visitée ». Deux
 * choses le tenaient en échec. La première : le service worker était bien
 * construit et bien déployé, mais aucune page ne l'enregistrait — `sw.js`
 * répondait 200 en production sans qu'aucun navigateur ne l'installe jamais.
 * `@vite-pwa/astro` retire le plugin `vite-plugin-pwa:build`, celui dont le
 * `transformIndexHtml` pose d'ordinaire le manifeste et le script : à Astro de
 * les poser, ce que `Base.astro` fait désormais.
 *
 * La seconde : le précache prenait tout, `**\/*.html` compris, soit les 509
 * pages de question et les 105 de notion. 891 entrées, 18 Mo, téléchargés en
 * silence à la première visite d'un site qu'on ouvre souvent sur un téléphone
 * en 4G. Or la promesse du README n'est pas « tout le site d'avance » mais
 * « une fois la page visitée » : c'est un cache d'usage, pas un miroir.
 *
 * D'où le partage tenu ici :
 *
 *   - le **noyau** est précaché, parce qu'il faut qu'il soit là avant d'avoir
 *     servi : les écrans de jeu, leur code, leurs visuels, et la banque, sans
 *     laquelle `/examen` ne tire aucune question ;
 *   - le **contenu** est gardé à la demande, page par page, à mesure qu'il est
 *     lu — c'est exactement la promesse ;
 *   - le reste va au **réseau**, notamment le pointeur de fraîcheur, qui ne
 *     vaut que s'il dit la vérité du jour.
 *
 * Pas de `navigateFallback` : rendre l'accueil pour toute adresse inconnue est
 * le geste d'une application à page unique. Ici chaque page a son adresse et
 * son fichier ; une adresse inconnue doit recevoir la 404 du serveur, et hors
 * ligne l'échec franc du navigateur.
 *
 * Le partage vaut ~1,5 Mo au lieu de 18, et `/examen` comme `/entrainement`
 * fonctionnent au premier lancement sans réseau.
 *
 * Ce qui reste au noyau alors qu'on pourrait croire le contraire : les 71 SVG
 * de `/visuels/`. Ce ne sont pas des illustrations de page, ce sont les
 * visuels des questions — la banque les référence tous les soixante et onze,
 * et 72 des 516 questions en portent un. Les sortir du précache rendrait
 * `/examen` injouable au premier lancement sans réseau, une question sur sept
 * s'ouvrant sur une image cassée. Leurs 139 Kio bruts sont le prix de la
 * promesse, et le seul poste du précache qu'on ne peut pas rendre.
 */

/**
 * Les dossiers de `src/pages/` qui portent du contenu et non du jeu : une
 * page par question, par notion, par leçon, par thème, par article du guide.
 * Ils pèsent 16 des 19 Mo du site et ne servent pas à jouer : ils se gardent
 * quand on les a ouverts. Un test vérifie que chacun est bien un dossier de
 * pages, faute de quoi l'exclusion ne désignerait plus rien.
 */
export const CONTENU_A_LA_DEMANDE = ['question', 'notion', 'cours', 'theme', 'guide'] as const;

/**
 * Les écrans de jeu qui se gardent à la lecture, et non d'avance.
 *
 * `/entrainement/<thème>` fait quatorze pages, et `/entrainement/notion/<code>`
 * cent cinq de plus, une par unité d'apprentissage. Un candidat en ouvre une
 * poignée : les précacher toutes, c'est faire télécharger cent quinze écrans
 * qu'on n'ouvrira pas pour en avoir trois tout de suite. Elles ne
 * portent d'ailleurs aucune question — la banque est un JSON à part, déjà au
 * précache : l'écran ouvert une fois se rejoue ensuite hors ligne.
 *
 * Le sommaire `/entrainement` reste au noyau : il est la porte d'entrée, et le
 * build le pose à la racine (`entrainement.html`), donc hors de ce dossier.
 */
export const JEU_A_LA_DEMANDE = ['entrainement'] as const;

/** Les dossiers de pages gardés à la demande, contenu et jeu confondus. */
export const PAGES_A_LA_DEMANDE = [...CONTENU_A_LA_DEMANDE, ...JEU_A_LA_DEMANDE] as const;

/**
 * Servi, mais jamais gardé : l'image de partage n'est lue que par les robots
 * des réseaux sociaux, qui ne passent pas par le service worker.
 */
const DOSSIERS_AU_RESEAU = ['partage'] as const;

/**
 * Le pointeur vers la version en ligne de la banque. Il est le seul fichier
 * qui doive dire la vérité du jour : le mettre au cache, c'est répondre
 * « 1.11.0 » à une application qui demande s'il y a mieux.
 */
const POINTEUR_FRAICHEUR = 'banque/derniere.json';

/**
 * L'index de la recherche. 276 Kio bruts, 70 en brotli, 12 % du précache — et
 * la loupe s'ouvre rarement à la première visite. Il ne vaut pas d'être
 * attendu par tout le monde ; il vaut d'être attendu une fois, par qui s'en
 * sert, puis d'être là instantanément ensuite.
 */
const INDEX_RECHERCHE = 'recherche.json';

/**
 * Ce que le service worker sait servir. `json` y est pour la banque, sans
 * laquelle `/examen` ne tire rien ; `svg` pour les visuels des questions.
 * `txt` et `xml` n'y sont pas : `robots.txt` et les sitemaps sont pour les
 * robots, qui sont en ligne par définition.
 */
const EXTENSIONS_NOYAU = ['js', 'css', 'html', 'svg', 'png', 'webp', 'woff2', 'json'] as const;

/** Motifs de fichiers pris au précache, relatifs à `dist/`. */
export const GLOB_NOYAU: readonly string[] = [`**/*.{${EXTENSIONS_NOYAU.join(',')}}`];

/** Motifs écartés du précache, relatifs à `dist/`. */
export const GLOB_HORS_NOYAU: readonly string[] = [
  '**/node_modules/**/*',
  POINTEUR_FRAICHEUR,
  INDEX_RECHERCHE,
  ...DOSSIERS_AU_RESEAU.map((d) => `${d}/**`),
  ...PAGES_A_LA_DEMANDE.map((d) => `${d}/**`),
];

/**
 * Les adresses gardées à la demande, du point de vue de Workbox.
 *
 * Workbox applique l'expression à l'adresse entière (`RegExpRoute` fait
 * `regExp.exec(url.href)`) et n'accepte un domaine tiers que si le match
 * commence au premier caractère. Le motif commence par une barre : il ne peut
 * pas matcher en position 0, donc il ne peut pas attraper un tiers. C'est la
 * garde, et un test la tient.
 */
export const MOTIF_A_LA_DEMANDE = new RegExp(`/(?:${PAGES_A_LA_DEMANDE.join('|')})/`);

/**
 * L'index de la recherche, du point de vue de Workbox. Même garde que
 * ci-dessus : le motif commence par une barre, il ne peut pas matcher en
 * position 0, donc pas attraper un tiers. La fin est ancrée pour ne pas
 * confondre l'index avec `/recherche`, la page qui le lit.
 */
export const MOTIF_RECHERCHE = /\/recherche\.json$/;

/**
 * Les paramètres d'adresse que le précache doit ignorer pour retrouver sa page.
 *
 * Workbox n'en ignore que `utm_*` et `fbclid` par défaut. Tout autre paramètre
 * fait manquer l'entrée précachée : `/signaler?question=balisage-0001`, le
 * bouton d'erreur porté par chaque question, ne correspondait plus à
 * `/signaler`. Le site est entièrement statique et aucun document ne dépend de
 * la requête — `/recherche` et `/signaler` la lisent en JavaScript, après
 * chargement, sur une page identique pour tous. On les ignore donc tous.
 */
export const IGNORER_PARAMETRES: readonly RegExp[] = [/.*/];

export type Politique = 'noyau' | 'a-la-demande' | 'reseau';

/**
 * Le sort d'une adresse servie par le site. Décrit la même règle que les
 * globs ci-dessus, mais lisible et testable une adresse à la fois.
 */
export function politique(chemin: string): Politique {
  // La requête et le fragment ne changent aucun document de ce site : ils ne
  // doivent pas décider du sort d'une adresse.
  const propre = chemin.replace(/[?#].*$/, '').replace(/^\//, '');
  if (propre === POINTEUR_FRAICHEUR) return 'reseau';
  if (propre === INDEX_RECHERCHE) return 'a-la-demande';

  const segments = propre === '' ? [] : propre.split('/');
  const tete = segments[0];

  // Un dossier ne se reconnaît qu'à partir de deux segments : `/cours` est le
  // sommaire du cours, une page racine ; `/cours/balisage` est une leçon. De
  // même `/entrainement` est le sommaire, `/entrainement/balisage` un écran.
  if (tete !== undefined && segments.length > 1) {
    if ((PAGES_A_LA_DEMANDE as readonly string[]).includes(tete)) return 'a-la-demande';
    if ((DOSSIERS_AU_RESEAU as readonly string[]).includes(tete)) return 'reseau';
  }

  const extension = /\.([a-z0-9]+)$/.exec(propre)?.[1];
  if (extension !== undefined && !(EXTENSIONS_NOYAU as readonly string[]).includes(extension)) {
    return 'reseau';
  }

  return 'noyau';
}

/**
 * Les règles de cache à la demande, au format attendu par `generateSW`.
 *
 * Deux règles, deux besoins.
 *
 * Les **pages**, en `NetworkFirst` et non en `StaleWhileRevalidate` : une
 * question corrigée doit se lire corrigée dès qu'il y a du réseau. Le délai de
 * quatre secondes borne l'attente quand la connexion est mauvaise sans être
 * absente, le cas d'un bateau au mouillage.
 *
 * L'**index de la recherche**, en `StaleWhileRevalidate` : la loupe doit
 * s'ouvrir tout de suite dès la deuxième visite, et un index vieux d'une
 * visite ne rate que les questions publiées entre-temps — la page trouvée,
 * elle, est à jour, puisqu'elle passe par la règle ci-dessus. C'est le seul
 * endroit du site où l'on préfère une réponse instantanée à une réponse juste
 * à la seconde près.
 *
 * Les deux caches portent la version de la banque, comme le précache : une
 * publication ne laisse pas traîner l'ancienne page ni l'ancien index.
 */
export function reglesALaDemande(versionBanque: string) {
  return [
    {
      urlPattern: MOTIF_A_LA_DEMANDE,
      handler: 'NetworkFirst' as const,
      options: {
        cacheName: `permis-cotier-pages-v${versionBanque}`,
        networkTimeoutSeconds: 4,
        expiration: {
          // De quoi tenir une session de révision entière sans jamais tout
          // garder : 200 pages lues, un mois.
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
        cacheableResponse: { statuses: [200] },
      },
    },
    {
      urlPattern: MOTIF_RECHERCHE,
      handler: 'StaleWhileRevalidate' as const,
      options: {
        cacheName: `permis-cotier-recherche-v${versionBanque}`,
        cacheableResponse: { statuses: [200] },
      },
    },
  ];
}
