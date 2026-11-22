/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cheminSansRequete, envoyerVital, evenementVital, noteDe, retenu, TAUX_ECHANTILLON, type Vital } from './vitals';

/**
 * Les vitaux réels vont à Umami comme des événements. Trois règles : rien qui
 * identifie quelqu'un (ni requête d'URL, ni identifiant), un tirage par visite
 * et non par mesure, et jamais d'erreur à l'écran.
 */
describe('vitals', () => {
  describe('retenu', () => {
    it('à 1, toute visite est retenue', () => {
      expect(retenu(1, 0)).toBe(true);
      expect(retenu(1, 0.999999)).toBe(true);
    });

    it('à 0, aucune', () => {
      expect(retenu(0, 0)).toBe(false);
    });

    it('à 0,25, le tirage sous 0,25 passe et le reste non', () => {
      expect(retenu(0.25, 0.24)).toBe(true);
      expect(retenu(0.25, 0.25)).toBe(false);
      expect(retenu(0.25, 0.9)).toBe(false);
    });

    it('le taux livré est une proportion', () => {
      expect(TAUX_ECHANTILLON).toBeGreaterThan(0);
      expect(TAUX_ECHANTILLON).toBeLessThanOrEqual(1);
    });
  });

  describe('noteDe', () => {
    it('suit les seuils de Google', () => {
      expect(noteDe('LCP', 2500)).toBe('bon');
      expect(noteDe('LCP', 2501)).toBe('a-ameliorer');
      expect(noteDe('LCP', 4001)).toBe('mauvais');
      expect(noteDe('INP', 200)).toBe('bon');
      expect(noteDe('INP', 501)).toBe('mauvais');
      expect(noteDe('CLS', 0.1)).toBe('bon');
      expect(noteDe('CLS', 0.11)).toBe('a-ameliorer');
      expect(noteDe('CLS', 0.26)).toBe('mauvais');
    });
  });

  describe('cheminSansRequete', () => {
    it('ne garde que le chemin : ni requête, ni ancre', () => {
      expect(cheminSansRequete('https://lepermiscotier.fr/examen?utm_source=chatgpt.com&x=1#haut')).toBe('/examen');
      expect(cheminSansRequete('https://lepermiscotier.fr/entrainement/feux-marques')).toBe('/entrainement/feux-marques');
      expect(cheminSansRequete('https://lepermiscotier.fr/')).toBe('/');
    });

    it('une adresse illisible rend la racine, pas une exception', () => {
      expect(cheminSansRequete('pas une adresse')).toBe('/');
    });
  });

  describe('evenementVital', () => {
    const href = 'https://lepermiscotier.fr/examen?email=a@b.fr';

    it('nomme l’événement, arrondit et note', () => {
      const v: Vital = { nom: 'LCP', valeur: 1234.56789 };
      expect(evenementVital(v, href)).toEqual({
        url: '/examen',
        name: 'vital-lcp',
        data: { valeur: 1235, note: 'bon', ecran: '/examen' },
      });
    });

    it('le CLS garde trois décimales', () => {
      const e = evenementVital({ nom: 'CLS', valeur: 0.123456 }, href);
      expect(e.name).toBe('vital-cls');
      expect(e.data.valeur).toBe(0.123);
      expect(e.data.note).toBe('a-ameliorer');
    });

    it('aucune trace de la requête, nulle part', () => {
      expect(JSON.stringify(evenementVital({ nom: 'INP', valeur: 80 }, href))).not.toMatch(/email|a@b|\?/);
    });

    it('rien de plus que trois données', () => {
      expect(Object.keys(evenementVital({ nom: 'INP', valeur: 80 }, href).data).sort()).toEqual(['ecran', 'note', 'valeur']);
    });
  });

  describe('envoyerVital', () => {
    beforeEach(() => {
      delete (window as unknown as { umami?: unknown }).umami;
    });

    it('ne casse rien quand le traceur est absent', () => {
      expect(() => envoyerVital({ nom: 'CLS', valeur: 0 })).not.toThrow();
    });

    it('passe au traceur une fonction qui pose l’URL sans requête, sans rien perdre du reste', () => {
      const track = vi.fn();
      (window as unknown as { umami: { track: typeof track } }).umami = { track };
      envoyerVital({ nom: 'LCP', valeur: 3000 });
      expect(track).toHaveBeenCalledTimes(1);
      const construire = track.mock.calls[0]![0] as (p: Record<string, unknown>) => Record<string, unknown>;
      const charge = construire({ website: 'id', url: '/examen?x=1', tag: 'web', referrer: '' });
      expect(charge).toMatchObject({ website: 'id', tag: 'web', name: 'vital-lcp', url: expect.not.stringContaining('?') });
      expect(charge.data).toMatchObject({ valeur: 3000, note: 'a-ameliorer' });
    });

    it('avale l’erreur d’un traceur cassé', () => {
      (window as unknown as { umami: unknown }).umami = {
        track() {
          throw new Error('bloqué');
        },
      };
      expect(() => envoyerVital({ nom: 'CLS', valeur: 0 })).not.toThrow();
    });
  });
});
