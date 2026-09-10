import type { QuestionAffichable } from './affichable';

/**
 * La banque, telle qu'elle arrive dans le navigateur.
 *
 * Les écrans de jeu ne portent plus les questions dans leur HTML : ils vont
 * chercher `dist/banque/<version>.json`, un seul fichier pour les cent vingt
 * écrans, déjà en cache dès la deuxième visite. Ce module est la porte
 * commune ; chaque écran garde en revanche son attente à lui, parce que ce
 * qu'on montre pendant le téléchargement n'est pas le même partout.
 */

/** Ce que sert `dist/banque/<version>.json`. */
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

export async function chargerBanque(
  source: string,
  signal?: AbortSignal,
): Promise<QuestionAffichable[]> {
  const reponse = await fetch(source, { signal });
  if (!reponse.ok) throw new Error(`banque : ${reponse.status}`);
  const servie = (await reponse.json()) as BanqueServie;
  return servie.questions ?? [];
}
