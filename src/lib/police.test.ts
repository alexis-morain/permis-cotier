/**
 * La police servie : un sous-ensemble d'Archivo commité dans `public/polices/`,
 * que `global.css` déclare et que `Base.astro` précharge par `POLICE`. Les
 * trois doivent désigner le même fichier, qui doit exister, peser moins que
 * la promesse du lot E, et porter sa propre règle de cache.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { POLICE, POIDS_MAX_POLICE } from './police';

const racine = new URL('../../', import.meta.url);
const lire = (chemin: string) => readFileSync(new URL(chemin, racine), 'utf-8');

describe('la police servie', () => {
  it('est un fichier de public/polices/ dont le nom porte son empreinte', () => {
    expect(POLICE).toMatch(/^\/polices\/archivo-latin\.[0-9a-f]{8}\.woff2$/);
    expect(existsSync(new URL(`public${POLICE}`, racine))).toBe(true);
  });

  it('pèse moins que ce que le lot promet', () => {
    expect(statSync(new URL(`public${POLICE}`, racine)).size).toBeLessThan(POIDS_MAX_POLICE);
  });

  it('est celle que global.css déclare, sans toucher à sa plage Unicode', () => {
    const css = lire('src/styles/global.css');
    expect(css).toContain(`src: url('${POLICE}') format('woff2-variations')`);
    expect(css).not.toContain('@fontsource-variable');
    expect(css).toMatch(/unicode-range: U\+0000-00FF, U\+0131, U\+0152-0153/);
  });

  it('a sa propre règle de cache, et aucune autre règle à durée n’attrape son adresse', () => {
    const headers = lire('public/_headers');
    const regles = [...headers.matchAll(/^(\/\S*)\n((?:  .+\n)+)/gm)].map((m) => ({ motif: m[1] ?? '', corps: m[2] ?? '' }));
    const polices = regles.find((r) => r.motif === '/polices/*');
    expect(polices?.corps).toContain('Cache-Control: public, max-age=31536000, immutable');
    // Cloudflare additionne les règles qui matchent et la première gagne : un
    // `Cache-Control` sur `/*` ou sur un motif plus large passerait devant.
    const motifEnRegex = (motif: string) => new RegExp(`^${motif.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    const autresADuree = regles
      .filter((r) => r.motif !== '/polices/*' && r.corps.includes('Cache-Control'))
      .filter((r) => motifEnRegex(r.motif).test(POLICE))
      .map((r) => r.motif);
    expect(autresADuree).toEqual([]);
  });
});
