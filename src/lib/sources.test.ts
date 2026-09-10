import { describe, it, expect } from 'vitest';
import {
  urlSource,
  resoudreSource,
  resoudreSources,
  citeLegifrance,
  citeUneFiche,
  NOM_PROVENANCE,
} from './sources';

describe('urlSource', () => {
  it('lit l’adresse Légifrance dans l’en-tête du fichier extrait', () => {
    expect(urlSource({ ref: 'decret-2007-1167', fichier: 'article-2' })).toMatch(
      /^https:\/\/www\.legifrance\.gouv\.fr\//,
    );
  });

  it('ne rend rien quand le fichier n’est pas nommé, ni quand il n’existe pas', () => {
    expect(urlSource({ ref: 'decret-2007-1167' })).toBeUndefined();
    expect(urlSource({ ref: 'decret-2007-1167', fichier: 'article-999' })).toBeUndefined();
  });
});

describe('resoudreSource', () => {
  it('envoie une fiche du site vers sa page, et le dit', () => {
    const source = resoudreSource({ texte: 'Fiche météorologie', ref: 'fiche-meteo' });
    expect(source).toEqual({
      texte: 'Fiche météorologie',
      ref: 'fiche-meteo',
      provenance: 'fiche',
      url: '/source/fiche-meteo',
    });
  });

  it('envoie une fiche vers sa page même quand son en-tête porte une adresse', () => {
    // `aism-mbs` cite la planche du secrétariat d'État chargé de la Mer : cette
    // adresse est celle de l'autorité, pas celle de la fiche.
    const source = resoudreSource({ texte: 'Balisage AISM', ref: 'aism-mbs', fichier: 'region-a' });
    expect(source.url).toBe('/source/aism-mbs');
    expect(source.provenance).toBe('fiche');
  });

  it('envoie un texte officiel vers Légifrance', () => {
    const source = resoudreSource({
      texte: 'Décret n° 2007-1167, article 2',
      ref: 'decret-2007-1167',
      fichier: 'article-2',
    });
    expect(source.provenance).toBe('officiel');
    expect(source.url).toMatch(/^https:\/\/www\.legifrance\.gouv\.fr\//);
  });

  it('garde un texte officiel dont l’adresse manque, au lieu de le jeter', () => {
    const source = resoudreSource({ texte: 'RIPAM, règle 26 b)', ref: 'decret-77-733' });
    expect(source.provenance).toBe('officiel');
    expect(source.url).toBeUndefined();
    expect(source.texte).toBe('RIPAM, règle 26 b)');
  });

  it('préfère l’adresse écrite dans la donnée à celle du fichier', () => {
    const source = resoudreSource({
      texte: 'Arrêté n° 125/2013',
      ref: 'bande-300-metres',
      url: 'https://www.premar-mediterranee.gouv.fr/arrete.pdf',
    });
    expect(source.url).toBe('https://www.premar-mediterranee.gouv.fr/arrete.pdf');
  });
});

describe('ce que le bloc de sources peut affirmer', () => {
  const melange = resoudreSources([
    { texte: 'Fiche météorologie', ref: 'fiche-meteo' },
    { texte: 'Décret n° 2007-1167, article 2', ref: 'decret-2007-1167', fichier: 'article-2' },
  ]);

  it('ne perd aucune source en chemin', () => {
    expect(melange).toHaveLength(2);
  });

  it('reconnaît qu’un bloc cite Légifrance, et qu’un autre non', () => {
    expect(citeLegifrance(melange)).toBe(true);
    expect(citeLegifrance(resoudreSources([{ texte: 'Fiche météo', ref: 'fiche-meteo' }]))).toBe(false);
    expect(
      citeLegifrance(
        resoudreSources([
          { texte: 'Arrêté préfectoral', ref: 'bande-300-metres', fichier: 'mediterranee-125-2013' },
        ]),
      ),
    ).toBe(false);
  });

  it('reconnaît qu’un bloc cite une fiche du site', () => {
    expect(citeUneFiche(melange)).toBe(true);
    expect(
      citeUneFiche(
        resoudreSources([{ texte: 'Décret', ref: 'decret-2007-1167', fichier: 'article-2' }]),
      ),
    ).toBe(false);
  });

  it('nomme les deux provenances en français, pour l’écran', () => {
    expect(NOM_PROVENANCE.fiche).toBe('Fiche du site');
    expect(NOM_PROVENANCE.officiel).toBe('Texte officiel');
  });
});
