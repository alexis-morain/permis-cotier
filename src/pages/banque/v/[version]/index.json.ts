import type { APIRoute } from 'astro';
import { questionsPubliees, versionBanque } from '../../../../lib/banque';
import { POUR_APP } from '../../../../lib/cible';

/**
 * La liste légère de la banque entière : `id`, `theme`, `notion`, dans l'ordre
 * du fichier complet. Une page de thème n'a que ses questions, mais les badges
 * et l'indice comptent la banque entière : c'est ce fichier-ci, quelques
 * kilo-octets, qui le leur dit.
 */
export function getStaticPaths() {
  if (POUR_APP) return [];
  return [{ params: { version: versionBanque() } }];
}

export const GET: APIRoute = async () => {
  const questions = (await questionsPubliees()).map((q) => ({ id: q.id, theme: q.theme, notion: q.notion }));
  return new Response(JSON.stringify({ version: versionBanque(), questions }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
