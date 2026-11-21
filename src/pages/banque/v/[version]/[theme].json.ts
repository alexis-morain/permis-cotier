import type { APIRoute } from 'astro';
import { questionsPubliees, versionBanque } from '../../../../lib/banque';
import { POUR_APP } from '../../../../lib/cible';
import { THEMES } from '../../../../lib/themes';

/**
 * La banque d'un seul thème, pour les pages d'entraînement du site.
 *
 * Le fichier complet (`../<version>.json`, 130 Ko compressés) restait chargé en
 * entier pour un thème de dix questions. Celui-ci ne porte que les questions du
 * thème, en entier (énoncé, explication, sources) : la page de thème gagne
 * environ cent kilo-octets. Même nom de version dans le chemin, donc même cache
 * immuable, et jamais un thème d'une version avec un autre d'une autre.
 *
 * Le fichier complet ne change pas : l'app iPhone et les pages qui mêlent les
 * thèmes (examen, révisions) le lisent toujours. L'app n'a pas ces fichiers.
 */
export function getStaticPaths() {
  if (POUR_APP) return [];
  return THEMES.map((t) => ({ params: { version: versionBanque(), theme: t.code } }));
}

export const GET: APIRoute = async ({ params }) => {
  const questions = (await questionsPubliees()).filter((q) => q.theme === params.theme);
  return new Response(JSON.stringify({ version: versionBanque(), theme: params.theme, questions }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
