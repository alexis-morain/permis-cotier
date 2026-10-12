/**
 * Ce que l'app iPhone trouve en ligne quand elle cherche une banque plus récente.
 *
 * L'app embarque la banque du jour de son build, puis interroge
 * `banque/derniere.json` et télécharge `banque/v/<version>.json` si la version
 * annoncée est plus haute (`src/lib/banque-locale.ts`). Elle le fait depuis
 * `capacitor://localhost`, en origine croisée, et tout échec y est muet : un
 * pointeur en retard, un en-tête CORS perdu ou un fichier de version absent
 * laissent chaque téléphone sur sa vieille banque sans que personne le voie.
 *
 * Ce script pose les mêmes questions que l'app, avec la même origine, et
 * compare à la banque du commit extrait : `data/VERSION` et le compte des
 * questions publiées. Sort en échec s'il reste un contrôle rouge.
 *
 *   node scripts/verifier-app.mjs [https://autre-domaine.fr]
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
export const ORIGINE_APP = 'capacitor://localhost';

const dire = (statut) => (typeof statut === 'number' ? `HTTP ${statut}` : statut);

/** Ce que l'app accepte comme réponse d'origine croisée. */
export function corsOuvert(entete) {
  return entete === '*' || entete === ORIGINE_APP;
}

/**
 * Les contrôles, sur ce que le site a rendu. Fonction pure.
 *
 * `pointeur` et `banque` valent `{ statut, cors, corps }`, `corps` déjà lu
 * comme JSON (ou `null` s'il ne l'était pas). `attendu` vaut
 * `{ version, questions }`, lu dans le dépôt.
 */
export function controler(pointeur, banque, attendu) {
  const r = [];
  const ok = (nom, detail) => r.push({ nom, ok: true, detail });
  const ko = (nom, detail, quoiFaire) => r.push({ nom, ok: false, detail, quoiFaire });

  if (pointeur.statut !== 200 || !pointeur.corps) {
    ko('pointeur servi', dire(pointeur.statut), 'vérifier le déploiement de `src/pages/banque/derniere.json.ts`');
    return r;
  }
  ok('pointeur servi', 'HTTP 200');
  if (corsOuvert(pointeur.cors)) ok('pointeur ouvert à l’app', pointeur.cors);
  else ko('pointeur ouvert à l’app', `Access-Control-Allow-Origin : ${pointeur.cors ?? 'absent'}`, 'reposer la règle de `/banque/derniere.json` dans `public/_headers`');

  const annoncee = pointeur.corps.version;
  if (annoncee === attendu.version) ok('version annoncée', annoncee);
  else ko('version annoncée', `${annoncee} en ligne, ${attendu.version} dans le dépôt`, 'le déploiement de `main` a échoué ou n’est pas fini : relire le build Cloudflare');
  if (pointeur.corps.questions === attendu.questions) ok('compte annoncé', String(attendu.questions));
  else ko('compte annoncé', `${pointeur.corps.questions} en ligne, ${attendu.questions} publiées dans le dépôt`, 'une banque tronquée ou d’une autre branche est en ligne');

  if (banque.statut !== 200 || !banque.corps) {
    ko('banque servie', dire(banque.statut), 'le fichier `/banque/v/<version>.json` manque : l’app télécharge une 404');
    return r;
  }
  ok('banque servie', 'HTTP 200');
  if (corsOuvert(banque.cors)) ok('banque ouverte à l’app', banque.cors);
  else ko('banque ouverte à l’app', `Access-Control-Allow-Origin : ${banque.cors ?? 'absent'}`, 'reposer la règle de `/banque/v/*` dans `public/_headers`');
  // `chercherMiseAJour()` refuse un fichier qui n'annonce pas la version
  // demandée : deux branches ont déjà pris le même numéro.
  if (banque.corps.version === annoncee) ok('banque au bon numéro', annoncee);
  else ko('banque au bon numéro', `le fichier annonce ${banque.corps.version}`, 'deux branches ont pris le même numéro : bumper `data/VERSION`');
  const n = Array.isArray(banque.corps.questions) ? banque.corps.questions.length : 0;
  if (n === pointeur.corps.questions) ok('banque entière', `${n} questions`);
  else ko('banque entière', `${n} questions dans le fichier, ${pointeur.corps.questions} annoncées`, 'relire le build de `src/pages/banque/v/[version].json.ts`');
  return r;
}

/** La banque du commit extrait : sa version, et ses questions publiées. */
export async function banqueDuDepot(racine = RACINE) {
  const version = (await readFile(join(racine, 'data/VERSION'), 'utf-8')).trim();
  let questions = 0;
  const dossier = join(racine, 'data/questions');
  for (const theme of await readdir(dossier, { withFileTypes: true })) {
    if (!theme.isDirectory() || theme.name.startsWith('_')) continue;
    for (const f of await readdir(join(dossier, theme.name))) {
      if (!f.endsWith('.yaml')) continue;
      const texte = await readFile(join(dossier, theme.name, f), 'utf-8');
      if (/^statut:\s*publie\s*$/m.test(texte)) questions += 1;
    }
  }
  return { version, questions };
}

async function demander(url) {
  try {
    const reponse = await fetch(url, {
      headers: { Origin: ORIGINE_APP },
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    let corps = null;
    try {
      corps = await reponse.json();
    } catch {
      corps = null;
    }
    return { statut: reponse.status, cors: reponse.headers.get('access-control-allow-origin'), corps };
  } catch (e) {
    return { statut: `injoignable (${e.message})`, cors: null, corps: null };
  }
}

async function principal() {
  const site = process.argv[2] ?? 'https://lepermiscotier.fr';
  const attendu = await banqueDuDepot();
  const pointeur = await demander(`${site}/banque/derniere.json`);
  const version = pointeur.corps?.version ?? attendu.version;
  const banque = await demander(`${site}/banque/v/${version}.json`);
  const resultats = controler(pointeur, banque, attendu);
  for (const c of resultats) {
    console.log(`${c.ok ? 'ok ' : 'KO '} ${c.nom} : ${c.detail}${c.ok ? '' : `\n    → ${c.quoiFaire}`}`);
  }
  const rouges = resultats.filter((c) => !c.ok).length;
  console.log(rouges ? `\n${rouges} contrôle(s) rouge(s).` : '\nCe que l’app trouve en ligne est la banque du dépôt.');
  process.exitCode = rouges ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await principal();
}
