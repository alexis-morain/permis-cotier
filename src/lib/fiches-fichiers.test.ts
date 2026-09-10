import { describe, it, expect } from 'vitest';
import { fichesDuDisque, estRefDeFiche } from './fiches-fichiers';

/**
 * Les fiches telles qu'elles sont sur le disque. La liste ci-dessous n'est pas
 * la source de vérité — le code les détecte tout seul — mais un garde-fou : le
 * jour où une fiche cesse d'être reconnue, ou qu'un texte officiel se met à
 * l'être, ce test rougit avant que le site ne se mette à mentir.
 */
const ATTENDUES = [
  'aism-mbs',
  'fiche-carburant',
  'fiche-carte-marine',
  'fiche-conduite-urgence',
  'fiche-meteo',
  'fiche-ski-nautique',
  'fiche-vhf',
] as const;

describe('fichesDuDisque', () => {
  const fiches = fichesDuDisque();

  it('trouve les fiches écrites à la main, et elles seules', () => {
    expect([...fiches.keys()].sort()).toEqual([...ATTENDUES]);
  });

  it('laisse dehors les textes officiels, même ceux qui portent une autorité', () => {
    expect(estRefDeFiche('decret-2007-1167')).toBe(false);
    expect(estRefDeFiche('bande-300-metres')).toBe(false);
    expect(estRefDeFiche('division-240')).toBe(false);
  });

  it('donne à chaque fiche de quoi remplir sa page', () => {
    for (const ref of ATTENDUES) {
      const fiche = fiches.get(ref);
      expect(fiche, ref).toBeDefined();
      expect(fiche?.titre.length, ref).toBeGreaterThan(10);
      expect(fiche?.versionLe, ref).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fiche?.autorite, `autorité de ${ref}`).toBeTruthy();
      expect(fiche?.corps.length, ref).toBeGreaterThan(500);
    }
  });

  it('range la fiche sous la référence que citent les questions', () => {
    expect(fiches.get('fiche-meteo')?.titre).toContain('Beaufort');
    expect(fiches.get('aism-mbs')?.autorite).toContain('signalisation maritime');
  });
});
