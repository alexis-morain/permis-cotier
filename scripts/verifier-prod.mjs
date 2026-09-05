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

console.log(`\n${SITE}\n`);
for (const c of controles) {
  console.log(`  ${c.etat === 'ok' ? '✓' : '✗'} ${c.nom} — ${c.detail}`);
  if (c.quoiFaire) console.log(`      → ${c.quoiFaire}\n`);
}

const restants = controles.filter((c) => c.etat === 'ko').length;
console.log(`\n${controles.length - restants} sur ${controles.length}.`);
if (restants > 0) process.exit(1);
