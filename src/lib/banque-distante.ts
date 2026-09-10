import type { QuestionAffichable } from './affichable';

/**
 * La banque, telle qu'elle arrive dans le navigateur.
 *
 * Les écrans de jeu ne portent plus les questions dans leur HTML : ils vont
 * chercher `dist/banque/v/<version>.json`, un seul fichier pour les cent vingt
 * écrans, déjà en cache dès la deuxième visite. Ce module est la porte
 * commune ; chaque écran garde en revanche son attente à lui, parce que ce
 * qu'on montre pendant le téléchargement n'est pas le même partout.
 */

/**
 * L'adresse du JSON d'une version donnée de la banque.
 *
 * Elle est ici, dans le seul module que le navigateur et le build partagent :
 * `cheminBanque()` de `src/lib/banque.ts` s'en sert pour le préchargement et
 * les écrans de jeu, `banque-locale.ts` pour ce que la coquille iOS va
 * chercher sur le site. Deux façons d'écrire la même adresse, c'est un
 * préchargement qui rate sa cible ou une app qui télécharge une 404.
 */
export function cheminDeVersion(version: string): string {
  return `/banque/v/${version}.json`;
}

/** Ce que sert `dist/banque/v/<version>.json`. */
export interface BanqueServie {
  version: string;
  questions: QuestionAffichable[];
}

/**
 * Le délai au bout duquel on renonce. Quinze secondes : de quoi laisser
 * passer une 3G lente sur 96 Ko compressés, pas de quoi laisser le candidat
 * devant une silhouette qui bat pour rien. Un réseau muet ne rejette rien de
 * lui-même — un portail captif accepte la connexion et se tait.
 */
export const ATTENTE_BANQUE = 15_000;

/**
 * La banque servie telle quelle, numéro de version compris.
 *
 * Presque tous les écrans n'ont besoin que des questions. La coquille iOS,
 * elle, compare la version embarquée à celle qu'elle garde sur l'appareil :
 * c'est la seule raison pour laquelle le numéro remonte jusqu'ici.
 */
export async function chargerBanqueServie(
  source: string,
  signal?: AbortSignal,
): Promise<BanqueServie> {
  const reponse = await fetch(source, { signal });
  if (!reponse.ok) throw new Error(`banque : ${reponse.status}`);
  return (await reponse.json()) as BanqueServie;
}

export async function chargerBanque(
  source: string,
  signal?: AbortSignal,
): Promise<QuestionAffichable[]> {
  return (await chargerBanqueServie(source, signal)).questions ?? [];
}
