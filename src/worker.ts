/**
 * Le Worker du site.
 *
 * Le site reste servi par Workers Static Assets, et les actifs passent en
 * premier : `run_worker_first` n'est pas activé, donc toute adresse qui
 * correspond à un fichier de `dist/` est servie sans que ce script ne
 * s'exécute. `html_handling` et `not_found_handling` gardent exactement le
 * comportement d'avant. Seuls les chemins sans fichier arrivent ici, et ce
 * script n'en traite qu'un : `POST /api/signaler`. Tout le reste repart au
 * routeur d'actifs par le binding `ASSETS`, y compris les adresses inconnues,
 * qui y trouvent la page 404, et les redirections de `public/_redirects`.
 *
 * L'endpoint suit une seule ligne de conduite : ne jamais accepter un envoi
 * non vérifié, ne jamais renvoyer au visiteur ce qu'il a envoyé, et ne jamais
 * garder trace de qui il est — sauf l'adresse qu'il donne lui-même pour une
 * réponse, remise par courrier seulement, jamais dans l'issue. À la moindre panne il rend un code hors 2xx, et
 * la page retombe sur le `mailto:` qui n'a jamais quitté le formulaire.
 *
 * « Vérifié » veut dire trois choses, pas une : le jeton Turnstile est bon, il
 * a été frappé sur le domaine du site, et il vient du widget de ce
 * formulaire-là. « Sans trace » n'empêche pas de compter : l'adresse IP que
 * Cloudflare pose devant le Worker sert de clé au limiteur de débit, le temps
 * d'une requête, et ne va nulle part ailleurs.
 */
import {
  SITE,
  TAILLE_CORPS_MAX,
  corpsAvis,
  corpsCourrier,
  corpsIssue,
  titreAvis,
  titreIssue,
  valider,
  validerAvis,
  type Avis,
  type Signalement,
} from './lib/signalement';

/** Le binding d'actifs déclaré dans `wrangler.toml`. */
export interface Actifs {
  fetch(requete: Request): Promise<Response>;
}

/**
 * Le limiteur de débit de Cloudflare, déclaré en `[[ratelimits]]` dans
 * `wrangler.toml`. Il compte à la périphérie, sans état à tenir ici : un
 * compteur maison ne tiendrait pas, un Worker n'ayant pas de mémoire partagée
 * entre ses isolats.
 */
export interface Limiteur {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ASSETS: Actifs;
  /** Binding de `wrangler.toml`, pas un secret. Sans lui, l'endpoint est fermé. */
  LIMITEUR?: Limiteur;
  /** Secret de Worker. Sans lui, l'endpoint est fermé. */
  TURNSTILE_SECRET_KEY?: string;
  /** Secret de Worker, jeton à portée fine, `Issues: Read and write` sur le seul dépôt. */
  GITHUB_BOT_TOKEN?: string;
  /** `proprietaire/depot`. */
  GITHUB_REPO?: string;
  /** Facultatif : notification par courrier, en plus de l'issue. */
  RESEND_API_KEY?: string;
  SIGNALEMENT_MAIL_TO?: string;
  SIGNALEMENT_MAIL_FROM?: string;
}

const CHEMIN = '/api/signaler';
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const GITHUB = 'https://api.github.com';
const RESEND = 'https://api.resend.com/emails';

/** Un appel sortant qui traîne ne doit pas retenir la requête du visiteur. */
const DELAI_MS = 8000;

/** La forme d'un `proprietaire/depot`, pour qu'un réglage fautif ne fabrique pas d'URL. */
const FORME_DEPOT = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/**
 * L'action que le widget de chaque formulaire pose sur son jeton, `data-action`
 * dans `src/pages/signaler.astro` et `src/pages/avis.astro`. Turnstile la rend
 * telle quelle à la vérification : un jeton du formulaire d'avis ne vaut pas
 * pour un signalement, et inversement.
 */
const ACTION_SIGNALEMENT = 'signalement';
const ACTION_AVIS = 'avis';

/** Le domaine du site. `SITE` vient de `src/lib/seo.ts` : une seule copie. */
const HOTE_SITE = new URL(SITE).hostname;

/**
 * Les hôtes de développement. `wrangler dev` sert depuis localhost, et la clé
 * Turnstile du projet couvre ce nom-là autant que le domaine : sans cette
 * exception, le formulaire serait intestable en local, et un durcissement
 * qu'on ne peut pas essayer finit par être désactivé.
 */
const HOTES_LOCAUX = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Les hôtes dont un jeton est recevable, pour cette requête-ci.
 *
 * L'exception locale suit l'hôte sous lequel le Worker répond, jamais celui
 * que le jeton annonce : en ligne, le Worker ne répond que sous le nom du
 * site, et la liste se referme donc d'elle-même sur ce seul nom.
 */
function hotesAcceptes(requete: Request): Set<string> {
  const servi = new URL(requete.url).hostname;
  return HOTES_LOCAUX.has(servi) ? new Set([HOTE_SITE, servi]) : new Set([HOTE_SITE]);
}

/**
 * Le même refus pour toutes les entrées mal formées. Il ne dit pas ce qui a
 * échoué et ne renvoie rien de ce qui a été reçu : le détail ne sert qu'à
 * celui qui cherche la faille.
 */
const REFUS = 'Signalement refusé : la requête n’a pas la forme attendue.';
const FERME = 'Le signalement en ligne n’est pas disponible.';
const TROP = 'Trop de signalements d’affilée. Réessaie dans une minute.';

/**
 * La période du limiteur, telle qu'elle est écrite dans `wrangler.toml`. Elle
 * ne sert ici qu'à dire au visiteur combien de temps attendre.
 */
const PERIODE_S = 60;

function json(statut: number, charge: Record<string, unknown>, entetes: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(charge), {
    status: statut,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      ...entetes,
    },
  });
}

const refus = (statut: number, message: string, entetes?: Record<string, string>) =>
  json(statut, { ok: false, message }, entetes);

/**
 * Le corps de la requête, lu avec un plafond.
 *
 * La longueur annoncée est vérifiée quand elle est là, mais on ne s'y fie pas :
 * le flux est lu morceau par morceau et abandonné dès le plafond franchi. Un
 * corps démesuré n'entre donc jamais en mémoire, annoncé ou non.
 */
async function corpsBorne(requete: Request, max: number): Promise<string | null> {
  const annonce = requete.headers.get('content-length');
  if (annonce !== null) {
    const taille = Number(annonce);
    if (!Number.isInteger(taille) || taille < 0 || taille > max) return null;
  }

  const flux = requete.body;
  if (flux === null) return null;

  const lecteur = flux.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > max) {
        await lecteur.cancel();
        return null;
      }
      morceaux.push(value);
    }
  } catch {
    return null;
  } finally {
    lecteur.releaseLock();
  }

  const tampon = new Uint8Array(total);
  let position = 0;
  for (const morceau of morceaux) {
    tampon.set(morceau, position);
    position += morceau.byteLength;
  }
  return new TextDecoder().decode(tampon);
}

/**
 * Le jeton Turnstile, vérifié côté serveur. Aucune adresse IP n'est transmise.
 *
 * `success` ne suffit pas. La clé de site est publique — c'est sa nature, elle
 * est dans le source de la page — et la liste de domaines d'une clé en couvre
 * souvent plusieurs. Un jeton frappé sur une autre page du même compte, ou par
 * un autre widget, revient donc d'ici en succès. Deux champs disent d'où il
 * vient vraiment : `hostname`, l'hôte où le défi a été relevé, et `action`,
 * celle que le widget avait posée. On exige les deux, et on refuse une réponse
 * qui ne les porte pas : un jeton dont on ne sait pas d'où il vient n'est pas
 * un jeton vérifié.
 */
async function jetonValide(
  jeton: string,
  secret: string,
  hotes: Set<string>,
  action: string,
): Promise<boolean | null> {
  try {
    const reponse = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: jeton }).toString(),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (!reponse.ok) return null;
    const rendu = (await reponse.json()) as {
      success?: unknown;
      hostname?: unknown;
      action?: unknown;
    };
    if (rendu.success !== true) return false;
    if (typeof rendu.hostname !== 'string' || !hotes.has(rendu.hostname)) {
      console.warn('signalement : jeton frappé hors du site');
      return false;
    }
    if (rendu.action !== action) {
      console.warn('signalement : jeton frappé hors du formulaire');
      return false;
    }
    return true;
  } catch {
    // Turnstile injoignable : on ne devine pas, on refuse le service.
    return null;
  }
}

/** L'issue publique. Rend son adresse, ou `null` si GitHub n'a pas voulu. */
async function ouvrirIssue(
  signalement: Signalement,
  depot: string,
  jeton: string,
): Promise<{ url?: string } | null> {
  try {
    const reponse = await fetch(`${GITHUB}/repos/${depot}/issues`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${jeton}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'permis-cotier-signalement',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title: titreIssue(signalement),
        body: corpsIssue(signalement),
      }),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (!reponse.ok) {
      console.warn(`signalement : GitHub a répondu ${reponse.status}`);
      return null;
    }
    const rendu = (await reponse.json().catch(() => ({}))) as { html_url?: unknown };
    return { url: typeof rendu.html_url === 'string' ? rendu.html_url : undefined };
  } catch {
    console.warn('signalement : GitHub injoignable');
    return null;
  }
}

/**
 * Un courrier par Resend, texte brut seulement, jamais de HTML. Rend `true`
 * quand Resend l'a pris, `false` sinon, et `null` quand Resend n'est pas
 * configuré. Pour un signalement il est facultatif (l'issue fait foi) ; pour
 * un avis, c'est la seule remise.
 */
async function envoyerCourrier(
  sujet: string,
  texte: string,
  env: Env,
  repondreA: string | null = null,
): Promise<boolean | null> {
  const { RESEND_API_KEY, SIGNALEMENT_MAIL_TO, SIGNALEMENT_MAIL_FROM } = env;
  if (!RESEND_API_KEY || !SIGNALEMENT_MAIL_TO || !SIGNALEMENT_MAIL_FROM) return null;
  try {
    const reponse = await fetch(RESEND, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: SIGNALEMENT_MAIL_FROM,
        to: SIGNALEMENT_MAIL_TO,
        subject: sujet,
        text: texte,
        // L'adresse laissée par le visiteur, déjà passée par `valider` : un
        // clic sur « Répondre » lui écrit, sans recopier quoi que ce soit.
        ...(repondreA ? { reply_to: repondreA } : {}),
      }),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (!reponse.ok) console.warn(`signalement : Resend a répondu ${reponse.status}`);
    return reponse.ok;
  } catch {
    console.warn('signalement : courrier impossible');
    return false;
  }
}

/**
 * La part d'un visiteur, comptée par Cloudflare.
 *
 * La clé est l'adresse IP que Cloudflare pose devant le Worker. C'est la seule
 * chose qui distingue deux visiteurs sur un site sans compte ni cookie, et
 * elle ne sert qu'ici : elle n'est ni enregistrée, ni jointe à l'issue, ni
 * envoyée à Turnstile, ni rendue au visiteur. La périphérie de Cloudflare l'a
 * déjà, par construction — la faire passer par un condensat ne cacherait rien
 * à personne, ce serait du décor.
 *
 * Sans en-tête, tout le monde partage le même compteur : cela n'arrive qu'en
 * local, où le trafic est d'une personne.
 */
async function partRestante(requete: Request, limiteur: Limiteur | undefined): Promise<boolean | null> {
  if (!limiteur) {
    console.warn('signalement : binding LIMITEUR absent, endpoint fermé');
    return null;
  }
  const cle = requete.headers.get('cf-connecting-ip') ?? 'sans-adresse';
  try {
    const { success } = await limiteur.limit({ key: cle });
    return success;
  } catch {
    console.warn('signalement : limiteur injoignable');
    return null;
  }
}

export async function signaler(requete: Request, env: Env): Promise<Response> {
  if (requete.method !== 'POST') {
    return refus(405, 'Seul POST est accepté ici.', { allow: 'POST' });
  }

  // Rien n'est accepté tant que la vérification ou la remise manquent : mieux
  // vaut renvoyer la page au `mailto:` que garder un envoi sans preuve ni
  // destination. La remise propre à chaque genre se vérifie plus bas, une fois
  // le genre connu.
  const { TURNSTILE_SECRET_KEY, GITHUB_BOT_TOKEN, GITHUB_REPO } = env;
  if (!TURNSTILE_SECRET_KEY) return refus(503, FERME);

  // Avant de lire quoi que ce soit : une adresse qui poste en rafale n'a pas
  // besoin qu'on analyse son corps. Un refus ici ne coûte rien et n'appelle
  // personne.
  const part = await partRestante(requete, env.LIMITEUR);
  if (part === null) return refus(503, FERME);
  if (!part) return refus(429, TROP, { 'retry-after': String(PERIODE_S) });

  const type = (requete.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase();
  if (type !== 'application/json') return refus(400, REFUS);

  const brut = await corpsBorne(requete, TAILLE_CORPS_MAX);
  if (brut === null) return refus(400, REFUS);

  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    return refus(400, REFUS);
  }

  // Un avis se reconnaît à son genre. Il a son propre validateur, sa propre
  // action Turnstile et sa propre remise : le courrier, jamais une issue.
  const estAvis =
    typeof donnees === 'object' && donnees !== null && (donnees as { genre?: unknown }).genre === 'avis';

  if (estAvis) {
    const validation = validerAvis(donnees);
    if (!validation.ok) return refus(400, REFUS);
    const { turnstile, ...avis } = validation.valeur;
    return remettreAvis(avis, turnstile, TURNSTILE_SECRET_KEY, requete, env);
  }

  const validation = valider(donnees);
  if (!validation.ok) return refus(400, REFUS);
  const { turnstile, ...signalement } = validation.valeur;

  if (!GITHUB_BOT_TOKEN || !GITHUB_REPO || !FORME_DEPOT.test(GITHUB_REPO)) return refus(503, FERME);

  const verdict = await jetonValide(turnstile, TURNSTILE_SECRET_KEY, hotesAcceptes(requete), ACTION_SIGNALEMENT);
  if (verdict === null) return refus(503, FERME);
  if (!verdict) return refus(403, 'Vérification anti-robot échouée.');

  const issue = await ouvrirIssue(signalement, GITHUB_REPO, GITHUB_BOT_TOKEN);
  if (issue === null) return refus(503, FERME);

  // Facultatif : l'issue est ouverte, c'est elle qui fait foi.
  await envoyerCourrier(titreIssue(signalement), corpsCourrier(signalement), env, signalement.adresse ?? null);

  return json(200, { ok: true, url: issue.url });
}

/** L'avis : Turnstile, puis le courrier. Sans courrier configuré ou pris, 503. */
async function remettreAvis(
  avis: Avis,
  turnstile: string,
  secret: string,
  requete: Request,
  env: Env,
): Promise<Response> {
  if (!env.RESEND_API_KEY || !env.SIGNALEMENT_MAIL_TO || !env.SIGNALEMENT_MAIL_FROM) {
    return refus(503, FERME);
  }
  const verdict = await jetonValide(turnstile, secret, hotesAcceptes(requete), ACTION_AVIS);
  if (verdict === null) return refus(503, FERME);
  if (!verdict) return refus(403, 'Vérification anti-robot échouée.');

  if (!(await envoyerCourrier(titreAvis(avis), corpsAvis(avis), env, avis.adresse ?? null))) return refus(503, FERME);
  return json(200, { ok: true });
}

export default {
  async fetch(requete: Request, env: Env): Promise<Response> {
    const chemin = new URL(requete.url).pathname;
    if (chemin === CHEMIN || chemin === `${CHEMIN}/`) return signaler(requete, env);
    return env.ASSETS.fetch(requete);
  },
};
