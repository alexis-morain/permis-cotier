/**
 * Ce que le site expose vraiment, en ligne.
 *
 * Le build peut être parfait et la production fausse : un réglage de zone
 * Cloudflare remplace le robots.txt, un déploiement fait sans `SITE_URL` pose
 * des adresses canoniques vers le sous-domaine de préversion, trois hôtes
 * servent les mêmes pages. Rien de tout cela n'apparaît dans `dist/`, et aucun
 * test ne le voit.
 *
 * Chaque contrôle qui échoue dit quoi faire. Sort en échec s'il en reste un.
 *
 *   node scripts/verifier-prod.mjs [https://autre-domaine.fr]
 */
import { readFile } from 'node:fs/promises';

const SITE = process.argv[2] ?? 'https://lepermiscotier.fr';
const hote = new URL(SITE).hostname;
const PREVERSION = 'https://permis-cotier.alexis-c1f.workers.dev';

const controles = [];
const ok = (nom, detail) => controles.push({ nom, etat: 'ok', detail });
const ko = (nom, detail, quoiFaire) => controles.push({ nom, etat: 'ko', detail, quoiFaire });

async function recuperer(url, options = {}) {
  try {
    const reponse = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), ...options });
    return { reponse, corps: options.method === 'HEAD' ? '' : await reponse.text() };
  } catch (e) {
    return { erreur: e.message };
  }
}

// 1. Le site répond.
const accueil = await recuperer(SITE);
if (accueil.erreur || !accueil.reponse.ok) {
  ko('le site répond', accueil.erreur ?? `HTTP ${accueil.reponse.status}`, `vérifier la route du Worker sur ${hote}`);
} else {
  ok('le site répond', `HTTP ${accueil.reponse.status}`);
}

// 2. L'adresse canonique désigne le domaine, pas la préversion. C'est le
//    contrôle le plus important : une canonique vers workers.dev revient à
//    dire à Google que la vraie page est ailleurs.
const canonique = /rel="canonical" href="([^"]*)"/.exec(accueil.corps ?? '')?.[1];
if (!canonique) {
  ko('adresse canonique', 'absente de l’accueil', 'vérifier `Base.astro`');
} else if (new URL(canonique).hostname !== hote) {
  ko(
    'adresse canonique',
    `pointe vers ${new URL(canonique).hostname}`,
    `redéployer depuis une branche où \`astro.config.mjs\` a ${hote} par défaut, ou poser SITE_URL=${SITE} dans les variables du Worker`,
  );
} else {
  ok('adresse canonique', canonique);
}

// 3. Le robots.txt servi est celui du site, et non celui que Cloudflare
//    substitue via AI Crawl Control.
const robots = await recuperer(`${SITE}/robots.txt`);
const corpsRobots = robots.corps ?? '';
if (robots.erreur) {
  ko('robots.txt', robots.erreur, 'vérifier que la route sert bien les fichiers du build');
} else if (/Cloudflare Managed Content/i.test(corpsRobots)) {
  ko(
    'robots.txt',
    'remplacé par le robots.txt géré de Cloudflare',
    'tableau de bord Cloudflare → la zone → AI Crawl Control → désactiver la gestion du robots.txt. Tel quel, le sitemap n’est pas annoncé et ClaudeBot, GPTBot et Google-Extended sont bloqués',
  );
} else if (!/^Sitemap:/m.test(corpsRobots)) {
  ko('robots.txt', 'n’annonce aucun sitemap', 'vérifier `src/pages/robots.txt.ts`');
} else if (/^Disallow: \/$/m.test(corpsRobots.split('User-agent: GPTBot')[0] ?? '')) {
  ko('robots.txt', 'ferme tout le site', `le build a été fait avec un hôte de préversion ; redéployer avec ${hote}`);
} else {
  ok('robots.txt', 'servi par le site, sitemap annoncé');
}

// 4. Le sitemap répond et liste des pages.
const sitemap = await recuperer(`${SITE}/sitemap-index.xml`);
if (sitemap.erreur || !sitemap.reponse.ok) {
  ko('sitemap', sitemap.erreur ?? `HTTP ${sitemap.reponse.status}`, 'vérifier l’intégration @astrojs/sitemap');
} else {
  const premier = /<loc>([^<]*)<\/loc>/.exec(sitemap.corps)?.[1];
  const pages = premier ? await recuperer(premier) : null;
  const nombre = pages?.corps ? (pages.corps.match(/<loc>/g) ?? []).length : 0;
  if (nombre === 0) ko('sitemap', 'vide ou illisible', 'relancer le build');
  else ok('sitemap', `${nombre} adresses`);
}

// 5. Le www renvoie vers le domaine nu, sinon deux hôtes servent les mêmes
//    pages et se partagent les signaux.
const www = await recuperer(`https://www.${hote}`, { method: 'HEAD' });
if (www.erreur) {
  ok('www', 'ne répond pas, rien à rediriger');
} else if ([301, 308].includes(www.reponse.status)) {
  ok('www', `${www.reponse.status} vers ${www.reponse.headers.get('location')}`);
} else {
  ko(
    'www',
    `répond ${www.reponse.status} sans rediriger`,
    `tableau de bord Cloudflare → Rules → Redirect Rules → si le nom d’hôte est www.${hote}, rediriger en 301 vers ${SITE} en conservant le chemin. \`_redirects\` ne sait pas le faire, il ignore l’hôte`,
  );
}

// 6. La préversion ne doit plus servir le site.
const preversion = await recuperer(PREVERSION, { method: 'HEAD' });
if (preversion.erreur || !preversion.reponse.ok) {
  ok('sous-domaine de préversion', 'ne sert plus le site');
} else {
  ko(
    'sous-domaine de préversion',
    `${PREVERSION} répond ${preversion.reponse.status}`,
    'tableau de bord Cloudflare → le Worker → Settings → Domains & Routes → désactiver la route workers.dev. Les adresses canoniques désignent déjà le domaine, mais un troisième hôte servant les mêmes pages n’aide personne',
  );
}

// 7. Les fichiers que le référencement suppose.
for (const [chemin, nom] of [['/llms.txt', 'llms.txt'], ['/partage/le-permis-cotier.png', 'image de partage']]) {
  const r = await recuperer(`${SITE}${chemin}`, { method: 'HEAD' });
  if (r.erreur || !r.reponse.ok) ko(nom, r.erreur ?? `HTTP ${r.reponse.status}`, 'présent dans le build ? redéployer');
  else ok(nom, `HTTP ${r.reponse.status}`);
}


// 8. La mesure d'audience est branchée sur le site en ligne. Le traceur est
//    posé par un script de la page : c'est l'identifiant du site, l'adresse du
//    traceur et l'hôte autorisé qu'on retrouve dans le HTML, pas un attribut.
//    Les trois valeurs sont lues dans le code, pour que ce contrôle suive une
//    modification au lieu de recopier des constantes qui divergeront.
const mesure = await readFile(new URL('../src/lib/mesure.ts', import.meta.url), 'utf-8');
const valeur = (cle) => new RegExp(`${cle}:\\s*'([^']+)'`).exec(mesure)?.[1];
const [siteUmami, scriptUmami, domainesUmami] = ['site', 'script', 'domaines'].map(valeur);

if (!siteUmami || !scriptUmami || !domainesUmami) {
  ko('mesure d’audience', 'valeurs illisibles dans `src/lib/mesure.ts`', 'vérifier la constante MESURE');
} else if (!(accueil.corps ?? '').includes(siteUmami)) {
  ko(
    'mesure d’audience',
    'l’identifiant du site est absent de l’accueil',
    'le traceur n’est pas servi : vérifier `Mesure.astro` dans `Base.astro`, et que le build en ligne est bien celui de la branche',
  );
} else if (!(accueil.corps ?? '').includes(scriptUmami)) {
  ko('mesure d’audience', `l’adresse ${scriptUmami} est absente de l’accueil`, 'vérifier `Mesure.astro`');
} else if (domainesUmami !== hote) {
  ko(
    'mesure d’audience',
    `le compte n’accepte que ${domainesUmami}, le site répond sur ${hote}`,
    'aligner `MESURE.domaines` sur le domaine servi, sinon aucune visite ne sera comptée',
  );
} else {
  const traceur = await recuperer(scriptUmami, { method: 'HEAD' });
  if (traceur.erreur || !traceur.reponse.ok) {
    ko(
      'mesure d’audience',
      `le traceur ne répond pas (${traceur.erreur ?? `HTTP ${traceur.reponse.status}`})`,
      'l’instance Umami est-elle debout ? le tunnel Cloudflare est-il ouvert ?',
    );
  } else {
    ok('mesure d’audience', `traceur servi, compte fermé hors ${domainesUmami}`);
  }
}

// 10. Le hors ligne. Le service worker a longtemps été construit, déployé, et
//     jamais enregistré : `sw.js` répondait 200 en production sans qu'aucun
//     navigateur ne l'installe, parce qu'aucune page ne le demandait. Rien
//     dans `dist/` ne le montrait, et aucun test non plus. Ce contrôle regarde
//     donc ce que l'accueil demande au navigateur de faire, puis ce que le
//     service worker emporte vraiment.
const versionBanque = (await readFile(new URL('../data/VERSION', import.meta.url), 'utf-8')).trim();
const corpsAccueil = accueil.corps ?? '';
const manifesteLie = /<link[^>]+rel="manifest"/.test(corpsAccueil);
const swDemande = corpsAccueil.includes('registerSW.js');

if (!swDemande || !manifesteLie) {
  ko(
    'hors ligne',
    swDemande ? 'l’accueil ne lie pas le manifeste' : 'l’accueil n’enregistre aucun service worker',
    'sans ces deux balises, `sw.js` est servi mais jamais installé, et le site n’est ni hors ligne ni installable : vérifier le bloc PWA de `Base.astro`',
  );
} else {
  const sw = await recuperer(`${SITE}/sw.js`);
  if (sw.erreur || !sw.reponse.ok) {
    ko(
      'hors ligne',
      `sw.js ne répond pas (${sw.erreur ?? `HTTP ${sw.reponse.status}`})`,
      'l’accueil l’enregistre pourtant : le build PWA n’est pas celui qui est déployé',
    );
  } else if (!sw.corps.includes(`banque/v/${versionBanque}.json`)) {
    ko(
      'hors ligne',
      `la banque ${versionBanque} n’est pas au précache`,
      '/examen ne tirerait aucune question hors ligne : vérifier `GLOB_NOYAU` dans `src/lib/hors-ligne.ts`',
    );
  } else if (/NavigationRoute\(\w+\.createHandlerBoundToURL/.test(sw.corps)) {
    ko(
      'hors ligne',
      'le service worker rend l’accueil pour toute adresse qu’il ne trouve pas',
      'une page portant un paramètre, `/signaler?question=…` par exemple, s’ouvrirait sur l’accueil sous son adresse : poser `navigateFallback: undefined` dans `astro.config.mjs`, la clé doit être écrite pour que `@vite-pwa/astro` ne la remette pas',
    );
  } else if (!/ignoreURLParametersMatching/.test(sw.corps)) {
    ko(
      'hors ligne',
      'le précache ne retrouve pas une page dès qu’un paramètre s’ajoute à son adresse',
      'vérifier `IGNORER_PARAMETRES` dans `src/lib/hors-ligne.ts`',
    );
  } else if (/\{url:"(?:question|notion|cours|theme|guide|entrainement)\//.test(sw.corps)) {
    ko(
      'hors ligne',
      'le précache reprend les pages de contenu ou les écrans par thème',
      'ce sont 16 des 19 Mo du site, téléchargés à la première visite : vérifier `GLOB_HORS_NOYAU` dans `src/lib/hors-ligne.ts`',
    );
  } else if (/\{url:"recherche\.json"/.test(sw.corps)) {
    ko(
      'hors ligne',
      'le précache reprend l’index de la recherche',
      '276 Kio pour une loupe qui s’ouvre rarement à la première visite : elle a sa règle `StaleWhileRevalidate` dans `reglesALaDemande()`',
    );
  } else if (!/\{url:"visuels\//.test(sw.corps)) {
    ko(
      'hors ligne',
      'les visuels des questions ne sont plus au précache',
      'la banque référence les 71 SVG de `/visuels/` : sans eux, une question sur sept s’ouvre sur une image cassée au premier lancement hors ligne',
    );
  } else {
    const entrees = (sw.corps.match(/\{url:/g) ?? []).length;
    ok('hors ligne', `service worker enregistré, ${entrees} entrées au précache, banque ${versionBanque} comprise`);
  }
}

// 11. La charge utile du premier écran. Deux découvertes tardives coûtaient
//     un aller-retour chacune : la police, trouvée deux sauts après le HTML,
//     et la banque, partie au quatrième — HTML, puis le runtime React, puis
//     l'exécution du composant, puis seulement le `fetch`. Les deux
//     préchargements doivent viser une adresse qui existe, et pour la banque,
//     exactement celle que l'écran donne au `Quiz` : un préchargement qui rate
//     son adresse n'économise pas un aller-retour, il en ajoute un.
const examen = await recuperer(`${SITE}/examen`);
const corpsExamen = examen.corps ?? '';
const prechargements = [...corpsExamen.matchAll(/<link rel="preload"[^>]*href="([^"]+)"[^>]*>/g)];
const police = prechargements.find(([balise]) => balise.includes('as="font"'))?.[1];
const banquePrechargee = prechargements.find(([balise]) => balise.includes('as="fetch"'))?.[1];
const banqueDemandee = /"source":"([^"]*banque\/v\/[^"]*)"/.exec(corpsExamen)?.[1]
  ?? new RegExp(`/banque/v/${versionBanque}\\.json`).exec(corpsExamen)?.[0];

if (!police) {
  ko('charge utile', 'la police n’est pas préchargée', '90 Ko découverts deux sauts après le HTML : vérifier le bloc de préchargement de `Base.astro`');
} else if (!banquePrechargee) {
  ko('charge utile', '/examen ne précharge pas la banque', 'la banque part au quatrième aller-retour : poser `prechargeBanque` sur l’écran');
} else if (banqueDemandee && banquePrechargee !== banqueDemandee) {
  ko('charge utile', `la banque préchargée (${banquePrechargee}) n’est pas celle que l’écran demande (${banqueDemandee})`, 'les deux doivent venir de `cheminBanque()` dans `src/lib/banque.ts`');
} else {
  const [rp, rb] = await Promise.all([
    recuperer(`${SITE}${police}`, { method: 'HEAD' }),
    recuperer(`${SITE}${banquePrechargee}`, { method: 'HEAD' }),
  ]);
  const perdu = [
    !rp.reponse?.ok ? `police ${police}` : null,
    !rb.reponse?.ok ? `banque ${banquePrechargee}` : null,
  ].filter(Boolean);
  if (perdu.length > 0) {
    ko('charge utile', `préchargement vers le vide : ${perdu.join(', ')}`, 'un préchargement qui rate son adresse ajoute un aller-retour au lieu d’en retirer un');
  } else {
    ok('charge utile', `police et banque préchargées sur /examen, les deux adresses répondent`);
  }
}

// 12. Le signalement en ligne. Le Worker rend le même 503 générique à toutes
//     ses pannes — c'est voulu, le détail ne sert qu'à qui cherche la faille —
//     et la page retombe alors sur le courrier pré-rempli sans que le visiteur
//     s'aperçoive de rien. Personne ne regardait donc cette adresse : elle
//     pouvait rester fermée des semaines. Ce contrôle la regarde chaque matin.
//
//     Les deux requêtes ne peuvent rien ouvrir. Le GET n'est pas accepté par
//     l'endpoint, et le POST porte un corps vide : `valider` le refuse bien
//     avant Turnstile, et donc bien avant GitHub. Aucune issue n'est créée.
const signalementGet = await recuperer(`${SITE}/api/signaler`);
const signalementPost = await recuperer(`${SITE}/api/signaler`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
});

if (signalementGet.erreur || signalementPost.erreur) {
  ko(
    'signalement en ligne',
    signalementGet.erreur ?? signalementPost.erreur,
    'l’adresse ne répond pas du tout : le Worker est-il déployé, la route est-elle posée ?',
  );
} else if (signalementGet.reponse.status !== 405) {
  ko(
    'signalement en ligne',
    `GET /api/signaler répond ${signalementGet.reponse.status} au lieu de 405`,
    signalementGet.reponse.status === 404
      ? 'l’adresse tombe sur la page 404 des actifs : le Worker n’est plus devant ce chemin, `wrangler deploy` avec `main` dans `wrangler.toml`'
      : 'quelque chose d’autre répond sur ce chemin',
  );
} else if (signalementPost.reponse.status === 503) {
  // L'état du jour, et il est normal : les secrets ne sont pas encore posés.
  ok('signalement en ligne', 'endpoint en attente de ses secrets, la page passe par le courrier');
} else if (signalementPost.reponse.status === 400) {
  ok('signalement en ligne', 'le formulaire répond, un corps vide est refusé comme prévu');
} else if (signalementPost.reponse.status === 429) {
  ko(
    'signalement en ligne',
    'la borne de débit a répondu avant l’endpoint',
    'une seule requête par jour part d’ici : si elle est déjà bornée, `[[ratelimits]]` de `wrangler.toml` compte autre chose que le visiteur',
  );
} else {
  ko(
    'signalement en ligne',
    `POST d’un corps vide répond ${signalementPost.reponse.status}`,
    'un corps vide doit être refusé sans rien ouvrir : vérifier `valider` dans `src/lib/signalement.ts`',
  );
}

console.log(`\n${SITE}\n`);
for (const c of controles) {
  console.log(`  ${c.etat === 'ok' ? '✓' : '✗'} ${c.nom} — ${c.detail}`);
  if (c.quoiFaire) console.log(`      → ${c.quoiFaire}\n`);
}

const restants = controles.filter((c) => c.etat === 'ko').length;
console.log(`\n${controles.length - restants} sur ${controles.length}.`);
if (restants > 0) process.exit(1);
