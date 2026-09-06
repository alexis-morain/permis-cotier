import type { APIRoute } from 'astro';
import { questionsPubliees, versionBanque } from '../../lib/banque';

/**
 * Le seul numéro de version, et le compte de questions qui va avec.
 *
 * C'est le point que l'app interroge au lancement : une version plus récente
 * que celle qu'elle embarque, elle télécharge `banque/<version>.json` et la
 * garde. Pas de réseau, elle joue ce qu'elle a — jamais d'erreur affichée.
 * Le compte sert de contrôle grossier : une banque tronquée se voit.
 *
 * Ce fichier-ci n'est pas figeable en cache, c'est tout son intérêt.
 */
export const GET: APIRoute = async () => {
  const questions = await questionsPubliees();
  return new Response(
    JSON.stringify({ version: versionBanque(), questions: questions.length }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
};
