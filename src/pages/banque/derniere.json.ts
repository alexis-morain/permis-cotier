import type { APIRoute } from 'astro';
import { questionsPubliees, versionBanque } from '../../lib/banque';

/**
 * Le seul numéro de version, et le compte de questions qui va avec.
 *
 * Les fichiers `banque/v/<version>.json` portent leur version dans leur nom et
 * se gardent pour de bon ; celui-ci est le pointeur vers la version en ligne,
 * pour un client qui a déjà une banque et veut savoir si elle a vieilli. Le
 * compte sert de contrôle grossier : une banque tronquée se voit.
 *
 * La coquille iOS est un tel client : `src/lib/banque-locale.ts` interroge ce
 * point au premier écran de jeu, et télécharge la banque si elle a vieilli.
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
