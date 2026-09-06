import { POUR_APP } from './cible';
import type { QuestionAffichable } from './affichable';

/**
 * La banque qui se met à jour sans passer par Apple.
 *
 * L'app embarque la banque du jour de sa publication. Au premier écran de jeu,
 * elle demande au site quel numéro est en ligne ; s'il est plus récent, elle
 * télécharge le JSON et le garde. La série en cours n'est pas dérangée : la
 * nouvelle banque sert à partir du prochain écran.
 *
 * C'est ce qui rend le chantier tenable pendant que la banque bouge encore.
 * Une publication atteint les téléphones en quelques heures ; seul un
 * changement d'écran repasse par la revue.
 *
 * Deux choix expliqués :
 *
 * - **IndexedDB, pas localStorage.** La banque pèse 450 Ko et grossit. Le
 *   stockage local sert à la progression, quelques kilo-octets qu'on relit à
 *   chaque montage en synchrone ; y verser la banque, c'est risquer de faire
 *   sauter le quota et de perdre la progression avec.
 * - **Par version, jamais « la dernière ».** Il est déjà arrivé que deux
 *   branches prennent le même numéro dans `data/VERSION`. On télécharge
 *   `banque/<version>.json`, on vérifie que le fichier reçu annonce bien ce
 *   numéro-là, et on refuse s'il dit autre chose.
 *
 * Sur le site, rien de tout ceci ne tourne : l'adresse porte déjà la version et
 * le service worker fait le reste.
 */

export interface BanqueServie {
  version: string;
  questions: QuestionAffichable[];
}

/** L'origine interrogée. En dur : le build de la coquille n'a pas le `.env`. */
const SITE = 'https://lepermiscotier.fr';

const BASE = 'permis-cotier';
const MAGASIN = 'banque';
const CLE = 'derniere';

/** `1.10.10` est plus récent que `1.10.9` : on compare des nombres, pas du texte. */
export function plusRecente(candidate: string, reference: string): boolean {
  const nombres = (v: string) => v.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const a = nombres(candidate);
  const b = nombres(reference);
  for (let rang = 0; rang < Math.max(a.length, b.length); rang += 1) {
    const gauche = a[rang] ?? 0;
    const droite = b[rang] ?? 0;
    if (gauche !== droite) return gauche > droite;
  }
  return false;
}

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open(BASE, 1);
    demande.onupgradeneeded = () => {
      const base = demande.result;
      if (!base.objectStoreNames.contains(MAGASIN)) base.createObjectStore(MAGASIN);
    };
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
}

function transiger<T>(mode: IDBTransactionMode, faire: (m: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resoudre, rejeter) => {
    void ouvrir().then((base) => {
      const transaction = base.transaction(MAGASIN, mode);
      const demande = faire(transaction.objectStore(MAGASIN));
      demande.onsuccess = () => {
        resoudre(demande.result);
        base.close();
      };
      demande.onerror = () => {
        rejeter(demande.error);
        base.close();
      };
    }, rejeter);
  });
}

/** La banque gardée sur l'appareil, s'il y en a une. */
export async function banqueGardee(): Promise<BanqueServie | null> {
  if (!POUR_APP || typeof indexedDB === 'undefined') return null;
  try {
    const gardee = await transiger<BanqueServie | undefined>('readonly', (m) => m.get(CLE));
    if (!gardee || !Array.isArray(gardee.questions) || gardee.questions.length === 0) return null;
    return gardee;
  } catch {
    return null;
  }
}

async function garder(banque: BanqueServie): Promise<void> {
  await transiger('readwrite', (m) => m.put(banque, CLE));
}

/**
 * Demande au site si une banque plus récente existe, et la garde le cas
 * échéant. Ne rend rien : la série en cours joue la banque qu'elle a déjà, et
 * la nouvelle prend la main au prochain écran. Tout échec est silencieux — pas
 * de réseau, l'app joue ce qu'elle a, et n'annonce rien.
 *
 * `deja` est la version actuellement en main, embarquée ou déjà téléchargée.
 */
export async function chercherMiseAJour(deja: string): Promise<string | null> {
  if (!POUR_APP || typeof indexedDB === 'undefined') return null;
  try {
    const annonce = await fetch(`${SITE}/banque/derniere.json`, { cache: 'no-store' });
    if (!annonce.ok) return null;
    const { version } = (await annonce.json()) as { version?: string };
    if (typeof version !== 'string' || !plusRecente(version, deja)) return null;

    const reponse = await fetch(`${SITE}/banque/${version}.json`);
    if (!reponse.ok) return null;
    const banque = (await reponse.json()) as BanqueServie;

    // Le fichier doit annoncer le numéro qu'on a demandé. Deux branches ont
    // déjà pris le même numéro de version : servir la mauvaise banque à
    // quelqu'un qui révise est le seul dégât qu'on ne rattrape pas.
    if (banque.version !== version) return null;
    if (!Array.isArray(banque.questions) || banque.questions.length === 0) return null;

    await garder(banque);
    return version;
  } catch {
    return null;
  }
}
