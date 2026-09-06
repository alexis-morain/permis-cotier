import type { APIRoute } from 'astro';
import { questionsPubliees, versionBanque } from '../../lib/banque';

/**
 * La banque, servie une fois pour toutes les pages de jeu.
 *
 * Avant, les 483 questions étaient sérialisées trois fois dans le build :
 * dans `examen.html`, dans `revoir.html`, et dans les quatorze pages
 * d'entraînement. Ici elles ne le sont qu'une, sous un nom qui porte la
 * version — donc figeable en cache immuable, et téléchargeable par l'app iOS
 * qui va chercher sa banque par numéro.
 *
 * Le nom porte la version pour une raison précise : il est déjà arrivé que
 * deux branches prennent le même numéro dans `data/VERSION`. Un doublon
 * servirait la mauvaise banque à des gens qui révisent.
 */
export function getStaticPaths() {
  return [{ params: { version: versionBanque() } }];
}

export const GET: APIRoute = async () => {
  const questions = await questionsPubliees();
  return new Response(JSON.stringify({ version: versionBanque(), questions }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
