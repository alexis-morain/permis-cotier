import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { NOTIONS } from './notions';
import { cheminLecon } from './parcours';

/**
 * `public/_redirects` est lu par Cloudflare. Les leçons ont changé d'adresse
 * quand chaque thème a eu son cours : chaque ancienne adresse doit renvoyer,
 * en 301, vers la nouvelle, sinon un lien indexé tombe sur la page 404.
 */
const lignes = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf-8')
  .split('\n')
  .filter((l) => l.trim() !== '' && !l.startsWith('#'))
  .map((l) => l.trim().split(/\s+/));

describe('les redirections des anciennes leçons', () => {
  it('couvrent chaque notion, en 301, vers son adresse sous le cours', () => {
    const table = new Map(lignes.map(([de, vers, code]) => [de, { vers, code }]));
    for (const n of NOTIONS) {
      const r = table.get(`/cours/${n.code}`);
      expect(r, `redirection absente pour /cours/${n.code}`).toBeDefined();
      expect(r?.vers).toBe(cheminLecon(n));
      expect(r?.code).toBe('301');
    }
  });

  it('ne redirigent jamais l’adresse d’un cours', () => {
    for (const [de = ""] of lignes) {
      expect(de.split('/').length, de).toBe(3);
      expect(NOTIONS.some((n) => `/cours/${n.code}` === de), de).toBe(true);
    }
  });
});
