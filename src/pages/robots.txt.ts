import type { APIRoute } from 'astro';

/**
 * Une préversion ne doit pas concurrencer le domaine dans les résultats. Tant
 * que le site répond sur une adresse en workers.dev ou pages.dev, tout est
 * fermé ; sur `lepermiscotier.fr`, l'indexation s'ouvre d'elle-même.
 *
 * Les robots des modèles de langue sont admis, et c'est un choix. Ce site tire
 * chaque affirmation d'un article qu'il cite : c'est précisément ce qu'un
 * modèle peut reprendre sans se tromper, et être cité par lui vaut une
 * position. La banque est sous CC BY-SA, la réutilisation était déjà permise.
 */

/** Écrans qui tirent des questions au hasard : rien à indexer, jamais. */
const ECRANS_DE_JEU = ['/examen', '/entrainement/', '/revoir', '/signaler', '/parametres'];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://exemple.invalid');
  const provisoire =
    base.hostname.endsWith('.workers.dev') ||
    base.hostname.endsWith('.pages.dev') ||
    base.hostname === 'exemple.invalid';

  const corps = provisoire
    ? [
        '# Adresse provisoire. Le site vit sur lepermiscotier.fr ;',
        '# rien n’est indexé ici pour ne pas lui faire concurrence.',
        'User-agent: *',
        'Disallow: /',
      ]
    : [
        'User-agent: *',
        'Allow: /',
        '',
        '# Écrans de jeu : ils tirent des questions, le contenu est ailleurs.',
        ...ECRANS_DE_JEU.map((c) => `Disallow: ${c}`),
        '',
        '# Les robots des modèles de langue sont les bienvenus : chaque page',
        '# cite le texte réglementaire dont elle tient ce qu’elle affirme.',
        'User-agent: GPTBot',
        'User-agent: OAI-SearchBot',
        'User-agent: ChatGPT-User',
        'User-agent: ClaudeBot',
        'User-agent: Claude-SearchBot',
        'User-agent: PerplexityBot',
        'User-agent: Google-Extended',
        'User-agent: Applebot-Extended',
        'Allow: /',
        ...ECRANS_DE_JEU.map((c) => `Disallow: ${c}`),
        '',
        `Sitemap: ${new URL('/sitemap-index.xml', base).href}`,
      ];

  return new Response(corps.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
