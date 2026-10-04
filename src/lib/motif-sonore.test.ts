import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { libelleEcoute, motifDe, secondesEcrites } from './motif-sonore';

const DOSSIER = new URL('../../public/visuels/sons/', import.meta.url);

describe('motifDe', () => {
  it('trouve le signal par le chemin de son visuel', () => {
    const coude = motifDe('sons/coude.svg');
    expect(coude?.nom).toBe('coude');
    expect(coude?.instrument).toBe('sifflet');
  });

  it("ne trouve rien pour un visuel qui n'est pas un signal sonore", () => {
    expect(motifDe('feux/chalut.svg')).toBeNull();
    expect(motifDe('sons/inconnu.svg')).toBeNull();
    expect(motifDe('coude.svg')).toBeNull();
    expect(motifDe('sons/coude.png')).toBeNull();
  });

  it('a un motif pour chacun des seize dessins', () => {
    const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.svg'));
    expect(fichiers).toHaveLength(16);
    for (const f of fichiers) expect(motifDe(`sons/${f}`), f).not.toBeNull();
  });

  it('dure exactement le cycle du dessin moins sa pause', () => {
    for (const f of readdirSync(DOSSIER).filter((x) => x.endsWith('.svg'))) {
      const svg = readFileSync(new URL(f, DOSSIER), 'utf-8');
      const cycle = Number(/-son ([\d.]+)s step-end/.exec(svg)?.[1]);
      expect(motifDe(`sons/${f}`)!.duree, f).toBeCloseTo(cycle - 3.5, 3);
    }
  });
});

describe('la durée écrite sur le bouton', () => {
  it('arrondit à la seconde', () => {
    expect(secondesEcrites(motifDe('sons/coude.svg')!)).toBe(5);
    expect(secondesEcrites(motifDe('sons/avertissement-doute.svg')!)).toBe(7);
    expect(secondesEcrites(motifDe('sons/brume-echouement.svg')!)).toBe(12);
  });

  it('dit le prix en secondes', () => {
    expect(libelleEcoute(motifDe('sons/avertissement-doute.svg')!)).toBe('Écouter le signal, 7 s');
  });
});
