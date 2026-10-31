import { describe, it, expect } from 'vitest';
import {
  schemaRevision,
  cheminRevision,
  cheminPdf,
  notionsDeLaFiche,
  visuelsDeLaFiche,
  sourcesDeLaFiche,
  regrouperSources,
} from './revision';
import type { SourceAffichee } from './sources';

const meta = { cree_le: '2026-10-31', genere_par: 'claude' };

function fiche(sections: unknown[], extra: Record<string, unknown> = {}) {
  return { cours: 'balisage', resume: 'Une bouée se lit à sa forme, sa couleur et son voyant.', sections, meta, ...extra };
}

const section = {
  titre: 'Les marques latérales',
  notions: ['balisage-lateral'],
  blocs: [{ regles: ['Bâbord : rouge, cylindre.', 'Tribord : vert, cône.'] }],
};

describe('schemaRevision', () => {
  it('accepte une fiche minimale', () => {
    const r = schemaRevision.safeParse(fiche([section]));
    expect(r.success, r.success ? '' : JSON.stringify(r.error.issues)).toBe(true);
  });

  it('met une section en pleine largeur par défaut', () => {
    const r = schemaRevision.parse(fiche([section]));
    expect(r.sections[0]?.largeur).toBe('pleine');
  });

  it('refuse un cours inconnu', () => {
    expect(schemaRevision.safeParse(fiche([section], { cours: 'peche-a-pied' })).success).toBe(false);
  });

  it('refuse une notion qui n’est pas du cours', () => {
    const r = schemaRevision.safeParse(fiche([{ ...section, notions: ['vhf-canaux'] }]));
    expect(r.success).toBe(false);
  });

  it('refuse une section sans notion : rien ne se dit hors des leçons', () => {
    expect(schemaRevision.safeParse(fiche([{ ...section, notions: [] }])).success).toBe(false);
  });

  it('refuse un bloc qui mêle deux types', () => {
    const r = schemaRevision.safeParse(fiche([{ ...section, blocs: [{ regles: ['a b c d e'], piege: 'Un piège assez long.' }] }]));
    expect(r.success).toBe(false);
  });

  it('exige un texte alternatif pour un schéma et pour un visuel de galerie', () => {
    const sansAlt = { ...section, blocs: [{ schema: { fichier: 'balisage-chenal.svg' } }] };
    expect(schemaRevision.safeParse(fiche([sansAlt])).success).toBe(false);
    const galerie = { ...section, blocs: [{ galerie: [{ visuel: 'balisage/laterale-babord.svg', nom: 'Bâbord' }] }] };
    expect(schemaRevision.safeParse(fiche([galerie])).success).toBe(false);
  });

  it('veut des lignes de tableau aussi longues que ses colonnes', () => {
    const tableau = { colonnes: ['Marque', 'Feu'], lignes: [['Bâbord', 'Rouge'], ['Tribord']] };
    expect(schemaRevision.safeParse(fiche([{ ...section, blocs: [{ tableau }] }])).success).toBe(false);
  });

  it('accepte une cellule de tableau qui porte un visuel', () => {
    const tableau = {
      colonnes: ['Marque', 'Feu'],
      lignes: [[{ visuel: 'rythmes/laterale-babord.svg', alt: 'Un feu rouge.' }, 'Rouge']],
    };
    expect(schemaRevision.safeParse(fiche([{ ...section, blocs: [{ tableau }] }])).success).toBe(true);
  });
});

describe('les adresses', () => {
  it('donnent la page et son PDF', () => {
    expect(cheminRevision('balisage')).toBe('/fiches-revision/balisage');
    expect(cheminPdf('balisage')).toBe('/fiches-revision/balisage.pdf');
  });
});

describe('notionsDeLaFiche et visuelsDeLaFiche', () => {
  const f = schemaRevision.parse(
    fiche([
      {
        titre: 'Latérales',
        notions: ['balisage-lateral', 'balisage-chenal-prefere'],
        blocs: [
          { schema: { fichier: 'balisage-chenal.svg', alt: 'Un chenal vu du ciel.' } },
          { galerie: [{ visuel: 'balisage/laterale-babord.svg', alt: 'Une bouée rouge.', nom: 'Bâbord' }] },
        ],
      },
      {
        titre: 'Feux',
        notions: ['balisage-feux', 'balisage-lateral'],
        blocs: [{ tableau: { colonnes: ['Feu'], lignes: [[{ visuel: 'rythmes/laterale-babord.svg', alt: 'Un feu rouge.' }]] } }],
      },
    ]),
  );

  it('rend chaque notion une fois, dans l’ordre', () => {
    expect(notionsDeLaFiche(f)).toEqual(['balisage-lateral', 'balisage-chenal-prefere', 'balisage-feux']);
  });

  it('sépare les schémas propres aux fiches des visuels de la banque', () => {
    expect(visuelsDeLaFiche(f)).toEqual({
      schemas: ['balisage-chenal.svg'],
      visuels: ['balisage/laterale-babord.svg', 'rythmes/laterale-babord.svg'],
    });
  });
});

describe('sourcesDeLaFiche', () => {
  const s = (texte: string): SourceAffichee => ({ texte, ref: 'x', provenance: 'officiel' }) as SourceAffichee;

  it('reprend les sources des leçons, chacune une fois', () => {
    const r = sourcesDeLaFiche([[s('Annexe I, 2.1'), s('Annexe I, 2.2')], [s('Annexe I, 2.2'), s('AISM')]]);
    expect(r.map((x) => x.texte)).toEqual(['Annexe I, 2.1', 'Annexe I, 2.2', 'AISM']);
  });
});

describe('regrouperSources', () => {
  const s = (texte: string, provenance: 'officiel' | 'fiche' = 'officiel', url?: string): SourceAffichee =>
    ({ texte, ref: 'x', provenance, url }) as SourceAffichee;

  it('range les articles d’un même texte sur une ligne, dans l’ordre', () => {
    const r = regrouperSources([
      s('Arrêté du 30 novembre 2017, annexe I, 2.5.1'),
      s('Balisage AISM, région A, marques latérales', 'fiche'),
      s('Arrêté du 30 novembre 2017, annexe I, 2.1.1'),
      s('Balisage AISM, région A, marques cardinales', 'fiche'),
    ]);
    expect(r).toEqual([
      { texte: 'Arrêté du 30 novembre 2017, annexe I', parties: ['2.5.1', '2.1.1'], provenance: 'officiel' },
      { texte: 'Balisage AISM, région A', parties: ['marques latérales', 'marques cardinales'], provenance: 'fiche' },
    ]);
  });

  it('garde entière une source sans virgule', () => {
    expect(regrouperSources([s('RIPAM')])).toEqual([{ texte: 'RIPAM', parties: [], provenance: 'officiel' }]);
  });
});
