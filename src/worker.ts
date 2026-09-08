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
 * garder trace de qui il est. À la moindre panne il rend un code hors 2xx, et
 * la page retombe sur le `mailto:` qui n'a jamais quitté le formulaire.
 */
import {
  TAILLE_CORPS_MAX,
  corpsIssue,
  titreIssue,
  valider,
  type Signalement,
} from './lib/signalement';

/** Le binding d'actifs déclaré dans `wrangler.toml`. */
export interface Actifs {
  fetch(requete: Request): Promise<Response>;
}

export interface Env {
  ASSETS: Actifs;
  /** Secret de Worker. Sans lui, l'endpoint est fermé. */
  TURNSTILE_SECRET_KEY?: string;
  /** Secret de Worker, jeton à portée fine, `issues:write` sur le seul dépôt. */
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
 * Le même refus pour toutes les entrées mal formées. Il ne dit pas ce qui a
 * échoué et ne renvoie rien de ce qui a été reçu : le détail ne sert qu'à
 * celui qui cherche la faille.
 */
const REFUS = 'Signalement refusé : la requête n’a pas la forme attendue.';
const FERME = 'Le signalement en ligne n’est pas disponible.';

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

/** Le jeton Turnstile, vérifié côté serveur. Aucune adresse IP n'est transmise. */
async function jetonValide(jeton: string, secret: string): Promise<boolean | null> {
  try {
    const reponse = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: jeton }).toString(),
      signal: AbortSignal.timeout(DELAI_MS),
    });
    if (!reponse.ok) return null;
    const rendu = (await reponse.json()) as { success?: unknown };
    return rendu.success === true;
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
 * La notification par courrier, si Resend est configuré. Facultative : son
 * échec ne change rien, l'issue est déjà ouverte et c'est elle qui fait foi.
 * Texte brut seulement, jamais de HTML.
 */
async function notifier(signalement: Signalement, env: Env): Promise<void> {
  const { RESEND_API_KEY, SIGNALEMENT_MAIL_TO, SIGNALEMENT_MAIL_FROM } = env;
  if (!RESEND_API_KEY || !SIGNALEMENT_MAIL_TO || !SIGNALEMENT_MAIL_FROM) return;
  try {
    await fetch(RESEND, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: SIGNALEMENT_MAIL_FROM,
        to: SIGNALEMENT_MAIL_TO,
        subject: titreIssue(signalement),
        text: corpsIssue(signalement),
      }),
      signal: AbortSignal.timeout(DELAI_MS),
    });
  } catch {
    console.warn('signalement : notification par courrier impossible');
  }
}

export async function signaler(requete: Request, env: Env): Promise<Response> {
  if (requete.method !== 'POST') {
    return refus(405, 'Seul POST est accepté ici.', { allow: 'POST' });
  }

  // Rien n'est accepté tant que la vérification ou la remise manquent : mieux
  // vaut renvoyer la page au `mailto:` que garder un signalement sans preuve
  // ni destination.
  const { TURNSTILE_SECRET_KEY, GITHUB_BOT_TOKEN, GITHUB_REPO } = env;
  if (!TURNSTILE_SECRET_KEY || !GITHUB_BOT_TOKEN || !GITHUB_REPO || !FORME_DEPOT.test(GITHUB_REPO)) {
    return refus(503, FERME);
  }

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

  const validation = valider(donnees);
  if (!validation.ok) return refus(400, REFUS);
  const { turnstile, ...signalement } = validation.valeur;

  const verdict = await jetonValide(turnstile, TURNSTILE_SECRET_KEY);
  if (verdict === null) return refus(503, FERME);
  if (!verdict) return refus(403, 'Vérification anti-robot échouée.');

  const issue = await ouvrirIssue(signalement, GITHUB_REPO, GITHUB_BOT_TOKEN);
  if (issue === null) return refus(503, FERME);

  await notifier(signalement, env);

  return json(200, { ok: true, url: issue.url });
}

export default {
  async fetch(requete: Request, env: Env): Promise<Response> {
    const chemin = new URL(requete.url).pathname;
    if (chemin === CHEMIN || chemin === `${CHEMIN}/`) return signaler(requete, env);
    return env.ASSETS.fetch(requete);
  },
};
