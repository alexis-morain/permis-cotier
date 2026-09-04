import type { APIRoute } from 'astro';

/**
 * Tant que le site vit sur un sous-domaine pages.dev, il reste hors des
 * moteurs : l'acquisition passe par le vrai domaine, et deux adresses
 * indexées pour le même contenu se font du tort. Le jour où `SITE_URL`
 * pointe sur le domaine définitif, l'indexation s'ouvre toute seule.
 */
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://exemple.invalid');
  const provisoire = base.hostname.endsWith('.pages.dev') || base.hostname === 'exemple.invalid';

  const corps = provisoire
    ? [
        '# Adresse provisoire, le domaine définitif n’est pas encore choisi.',
        '# Rien n’est indexé tant que le site vit ici.',
        'User-agent: *',
        'Disallow: /',
      ]
    : [
        'User-agent: *',
        'Allow: /',
        '',
        '# Écrans de jeu : rien à indexer, le contenu est sur les pages thème.',
        'Disallow: /examen',
        'Disallow: /entrainement/',
        'Disallow: /signaler',
        'Disallow: /parametres',
        '',
        `Sitemap: ${new URL('/sitemap-index.xml', base).href}`,
      ];

  return new Response(corps.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
