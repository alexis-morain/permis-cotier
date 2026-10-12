/**
 * `scripts/verifier-app.mjs` : ce que l'app trouve en ligne quand elle cherche
 * une banque plus récente. Les contrôles sont une fonction pure ; on lui
 * donne des réponses fabriquées, et la banque du dépôt pour le compte.
 */
import { describe, it, expect } from 'vitest';
import { banqueDuDepot, controler, corsOuvert, ORIGINE_APP } from '../scripts/verifier-app.mjs';

const attendu = { version: '1.20.1', questions: 3 };
const pointeur = (corps: object, cors: string | null = '*', statut = 200) => ({ statut, cors, corps });
const banque = (version: string, n: number, cors: string | null = '*') => ({
  statut: 200,
  cors,
  corps: { version, questions: Array.from({ length: n }, (_, i) => ({ id: String(i) })) },
});
const rouges = (r: { ok: boolean; nom: string }[]) => r.filter((c) => !c.ok).map((c) => c.nom);

describe('controler', () => {
  it('tout est vert quand le site sert la banque du dépôt, ouverte à l’app', () => {
    const r = controler(pointeur({ version: '1.20.1', questions: 3 }), banque('1.20.1', 3), attendu);
    expect(rouges(r)).toEqual([]);
  });

  it('un pointeur en retard sur le dépôt est rouge', () => {
    const r = controler(pointeur({ version: '1.20.0', questions: 3 }), banque('1.20.0', 3), attendu);
    expect(rouges(r)).toEqual(['version annoncée']);
  });

  it('un en-tête CORS perdu est rouge, sur le pointeur comme sur la banque', () => {
    const r = controler(pointeur({ version: '1.20.1', questions: 3 }, null), banque('1.20.1', 3, null), attendu);
    expect(rouges(r)).toEqual(['pointeur ouvert à l’app', 'banque ouverte à l’app']);
  });

  it('un fichier qui annonce un autre numéro est rouge : l’app le refuserait', () => {
    const r = controler(pointeur({ version: '1.20.1', questions: 3 }), banque('1.19.0', 3), attendu);
    expect(rouges(r)).toEqual(['banque au bon numéro']);
  });

  it('une banque tronquée est rouge', () => {
    const r = controler(pointeur({ version: '1.20.1', questions: 3 }), banque('1.20.1', 2), attendu);
    expect(rouges(r)).toEqual(['banque entière']);
  });

  it('un pointeur absent arrête là', () => {
    const r = controler(pointeur(null as unknown as object, null, 404), banque('1.20.1', 3), attendu);
    expect(r).toHaveLength(1);
    expect(rouges(r)).toEqual(['pointeur servi']);
  });
});

describe('corsOuvert', () => {
  it('accepte l’étoile et l’origine de la coquille, rien d’autre', () => {
    expect(corsOuvert('*')).toBe(true);
    expect(corsOuvert(ORIGINE_APP)).toBe(true);
    expect(corsOuvert('https://lepermiscotier.fr')).toBe(false);
    expect(corsOuvert(null)).toBe(false);
  });
});

describe('banqueDuDepot', () => {
  it('lit la version et compte les questions publiées du dépôt', async () => {
    const { version, questions } = await banqueDuDepot();
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(questions).toBeGreaterThan(500);
  });
});
