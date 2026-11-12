import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fichePourLeVerdict, lienPdfFiche } from './fiche-a-reviser';
import { cheminPdf } from './revision';
import { CODES_THEMES } from './themes';
import { SITE } from './seo';

describe('lienPdfFiche', () => {
  it('suit le chemin des pages de fiches, sur le site comme dans l’app', () => {
    expect(lienPdfFiche('balisage', false)).toBe(cheminPdf('balisage'));
    // Dans l'app, le PDF part du site : Safari intégré l'affiche et le partage.
    expect(lienPdfFiche('balisage', true)).toBe(new URL(cheminPdf('balisage'), SITE.domaine).href);
  });

  it('a un PDF sur le disque pour chaque thème', () => {
    for (const code of CODES_THEMES) {
      expect(existsSync(new URL(`../../public${cheminPdf(code)}`, import.meta.url)), code).toBe(true);
    }
  });
});

describe('fichePourLeVerdict', () => {
  it('prend le thème où il y a le plus d’erreurs', () => {
    const f = fichePourLeVerdict({
      ecluses: { bonnes: 1, total: 4 },
      balisage: { bonnes: 4, total: 5 },
      vhf: { bonnes: 3, total: 3 },
    });
    expect(f).toEqual({ theme: 'ecluses', erreurs: 3 });
  });

  it('à égalité d’erreurs, prend le thème le plus mal réussi', () => {
    const f = fichePourLeVerdict({
      balisage: { bonnes: 3, total: 5 },
      ecluses: { bonnes: 0, total: 2 },
    });
    expect(f).toEqual({ theme: 'ecluses', erreurs: 2 });
  });

  it('à égalité complète, suit l’ordre des thèmes du programme', () => {
    const a = fichePourLeVerdict({ vhf: { bonnes: 0, total: 1 }, balisage: { bonnes: 0, total: 1 } });
    expect(a?.theme).toBe(CODES_THEMES.indexOf('balisage') < CODES_THEMES.indexOf('vhf') ? 'balisage' : 'vhf');
  });

  it('ne propose rien sans erreur', () => {
    expect(fichePourLeVerdict({ balisage: { bonnes: 4, total: 4 } })).toBeNull();
    expect(fichePourLeVerdict({})).toBeNull();
  });

  it('ignore un thème inconnu : il n’a pas de fiche', () => {
    expect(fichePourLeVerdict({ inconnu: { bonnes: 0, total: 9 }, vhf: { bonnes: 0, total: 1 } })).toEqual({
      theme: 'vhf',
      erreurs: 1,
    });
  });
});
