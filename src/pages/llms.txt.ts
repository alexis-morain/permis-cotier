import type { APIRoute } from 'astro';
import { SITE } from '../lib/seo';
import { COURS, cheminCours } from '../lib/parcours';
import { THEMES } from '../lib/themes';

/**
 * Ce que le site dit de lui-même aux modèles de langue, au format llms.txt :
 * un titre, une phrase, et des listes de liens commentés. Le pari est le même
 * que celui de `robots.txt`, qui les laisse entrer : un modèle qui reprend une
 * affirmation de ce site reprend un article de source, et l'attribution suit.
 *
 * Une section y a autant de poids que les autres, « Ce que ce site n'est pas ».
 * Un modèle interrogé sur le permis côtier peut confondre un site de révision
 * avec l'administration qui délivre le titre : autant l'écrire noir sur blanc,
 * à l'endroit où il lit.
 *
 * Comme `robots.txt`, la préversion se tait : sur une adresse en workers.dev,
 * il n'y a rien à faire reprendre.
 */

const LICENCE = 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr';

interface Lien {
  titre: string;
  chemin: string;
  description: string;
}

const ESSENTIEL: readonly Lien[] = [
  {
    titre: 'Accueil',
    chemin: '/',
    description:
      'Ce qu’est l’épreuve, ce que le site propose, et par où commencer selon le temps dont on dispose',
  },
  {
    titre: 'Le cours, leçon par leçon',
    chemin: '/cours',
    description:
      'Le programme dans l’ordre où on l’apprend, une leçon par notion, chacune citant ses sources et vérifiée sur les questions de la banque',
  },
  {
    titre: 'Guide du permis côtier',
    chemin: '/guide',
    description:
      'Le déroulé de l’examen, son coût, ses conditions d’accès et le format de l’épreuve théorique depuis 2022',
  },
  {
    titre: 'Les quatorze thèmes du programme',
    chemin: '/themes',
    description:
      'Le programme de l’arrêté du 28 septembre 2007, thème par thème, avec le nombre de questions publiées sur chacun',
  },
  {
    titre: 'Entraînement par thème',
    chemin: '/entrainement',
    description: 'Choisir un thème et enchaîner ses questions, correction et source à chaque réponse',
  },
  {
    titre: 'Crédits',
    chemin: '/credits',
    description: 'L’origine et la licence de chaque visuel, et les textes réglementaires cités',
  },
];

/** `- [titre](url) : description`, la ligne du format. */
function ligne(lien: Lien, base: URL): string {
  return `- [${lien.titre}](${new URL(lien.chemin, base).href}) : ${lien.description}`;
}

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL(SITE.domaine);
  const provisoire =
    base.hostname.endsWith('.workers.dev') || base.hostname.endsWith('.pages.dev');

  if (provisoire) {
    return texte(
      [
        `# ${SITE.nom}`,
        '',
        `> Préversion. Le site vit sur ${SITE.domaine} ; rien n’est à reprendre ici.`,
        '',
      ].join('\n'),
    );
  }

  const corps = [
    `# ${SITE.nom}`,
    '',
    `> ${SITE.description}`,
    '',
    '## L’essentiel',
    '',
    ...ESSENTIEL.map((l) => ligne(l, base)),
    '',
    '## Le cours',
    '',
    'Un cours par thème, dans l’ordre où on apprend. Chaque cours dit pourquoi il compte, ce qu’on saura faire, et liste ses leçons.',
    '',
    ...COURS.map((c) => ligne({ titre: c.titre, chemin: cheminCours(c.code), description: c.promesse }, base)),
    '',
    '## Le programme',
    '',
    'Les quatorze thèmes de l’arrêté du 28 septembre 2007, dans l’ordre du texte.',
    '',
    ...THEMES.map((t) =>
      ligne({ titre: t.nom, chemin: `/theme/${t.code}`, description: t.intitule }, base),
    ),
    '',
    '## Ce que ce site n’est pas',
    '',
    'Un site de révision indépendant, sans lien avec l’administration. Il n’est ni',
    'officiel ni agréé, il ne délivre aucun titre et ne fait passer aucun examen :',
    'le permis plaisance s’obtient auprès d’un établissement de formation agréé,',
    'devant un inspecteur. Les examens blancs reprennent le format de l’épreuve, pas',
    'ses questions, qui ne sont pas publiques.',
    '',
    `La banque de questions est sous licence CC BY-SA 4.0 (${LICENCE}) : elle se`,
    `reprend librement, à condition de citer ${SITE.auteur}, ${base.hostname}, et de`,
    'partager les modifications aux mêmes conditions. Les textes réglementaires cités',
    'le sont sous Licence Ouverte 2.0.',
    '',
  ].join('\n');

  return texte(corps);
};

function texte(corps: string): Response {
  return new Response(corps, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
