import { describe, it, expect } from 'vitest';
import { estUneFiche, lireFiche, cheminFiche } from './fiches';

/** Un extrait Légifrance, tel que `sources.py` l'écrit. */
const OFFICIEL = `# Décret n°2007-1167, article 2

- Référence : decret-2007-1167
- Version consultée le : 2026-09-04
- Source : https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006885154
- Licence : Licence Ouverte 2.0 (Etalab)

---
La conduite des bateaux de plaisance à moteur…
`;

const FICHE = `# Échelle de Beaufort, état de la mer et bulletins

- Référence : fiche-meteo
- Version consultée le : 2026-09-04
- Autorité : Organisation météorologique mondiale, échelle anémométrique de
  Beaufort ; échelle d'état de la mer dite de Douglas.
- Programme : arrêté du 28 septembre 2007, art. 1er § 1.2, tiret
  « la météorologie ».
- Référence publiée : Météo-France, « Comprendre les bulletins marine ».
  https://meteofrance.com/meteo-marine

## Nature de cette fiche

Ce document n'est pas un texte réglementaire extrait par machine.

---

## Échelle anémométrique de Beaufort

Le degré Beaufort décrit la force du vent moyen.
`;

describe('estUneFiche', () => {
  it('reconnaît une fiche à la section où elle dit ce qu’elle est', () => {
    expect(estUneFiche(FICHE)).toBe(true);
  });

  it('laisse dehors un texte officiel extrait par machine', () => {
    expect(estUneFiche(OFFICIEL)).toBe(false);
  });
});

describe('lireFiche', () => {
  it('rend rien sur un texte officiel', () => {
    expect(lireFiche(OFFICIEL)).toBeUndefined();
  });

  it('lit le titre, la référence et la date de la version consultée', () => {
    const fiche = lireFiche(FICHE);
    expect(fiche?.titre).toBe('Échelle de Beaufort, état de la mer et bulletins');
    expect(fiche?.ref).toBe('fiche-meteo');
    expect(fiche?.versionLe).toBe('2026-09-04');
  });

  it('recolle les champs écrits sur plusieurs lignes', () => {
    const fiche = lireFiche(FICHE);
    expect(fiche?.autorite).toBe(
      'Organisation météorologique mondiale, échelle anémométrique de Beaufort ; échelle d’état de la mer dite de Douglas.',
    );
    expect(fiche?.programme).toBe(
      'arrêté du 28 septembre 2007, art. 1er § 1.2, tiret « la météorologie ».',
    );
  });

  it('sépare le document qui fait foi de son adresse', () => {
    const fiche = lireFiche(FICHE);
    expect(fiche?.publication?.texte).toBe('Météo-France, « Comprendre les bulletins marine ».');
    expect(fiche?.publication?.url).toBe('https://meteofrance.com/meteo-marine');
  });

  it('garde le corps entier, en-tête ôté', () => {
    const corps = lireFiche(FICHE)?.corps ?? '';
    expect(corps.startsWith('## Nature de cette fiche')).toBe(true);
    expect(corps).toContain('## Échelle anémométrique de Beaufort');
    expect(corps).not.toContain('- Référence :');
    expect(corps).not.toContain('# Échelle de Beaufort, état de la mer');
  });

  it('rend rien quand la référence manque : la page n’aurait pas d’adresse', () => {
    expect(lireFiche(FICHE.replace('- Référence : fiche-meteo\n', ''))).toBeUndefined();
  });
});

describe('cheminFiche', () => {
  it('donne l’adresse interne de la fiche', () => {
    expect(cheminFiche('fiche-meteo')).toBe('/source/fiche-meteo');
  });
});
