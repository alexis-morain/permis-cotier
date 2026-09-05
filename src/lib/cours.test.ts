import { describe, it, expect } from 'vitest';
import { schemaLecon, paragraphes, choisirVerification, leconCourte, VERIFICATION_MAX } from './cours';
import type { QuestionAffichable } from './banque';
import { notionParCode } from './notions';

const valide = {
  notion: 'balisage-lateral',
  duree: 3,
  accroche: 'Tu rentres au port en venant du large. Deux bouées devant toi, une rouge, une verte.',
  etapes: [
    {
      titre: 'Le sens conventionnel',
      texte: 'Le balisage latéral se lit dans un sens et un seul : du large vers le port.\n\nEn rentrant, tu es dans le sens conventionnel.',
      visuel: 'balisage/laterale-babord.svg',
      alt: 'Une bouée rouge cylindrique surmontée d’un cylindre rouge.',
    },
    {
      titre: 'Rouge à bâbord, vert à tribord',
      texte: 'En région A, la marque bâbord est rouge et cylindrique, la marque tribord verte et conique.',
      liste: ['Bâbord : rouge, cylindre', 'Tribord : vert, cône'],
    },
  ],
  piege: 'En sortant du port, tu vas contre le sens conventionnel : la rouge passe à ta droite.',
  retenir: ['Du large vers le port, rouge à gauche, vert à droite.', 'La forme ne ment jamais : cylindre à bâbord, cône à tribord.'],
  sources: [{ texte: 'Balisage AISM, région A, marques latérales', ref: 'aism-mbs', fichier: 'region-a' }],
  meta: { cree_le: '2026-09-05', genere_par: 'claude' },
};

describe('schéma d’une leçon', () => {
  it('accepte une leçon complète', () => {
    expect(schemaLecon.safeParse(valide).success).toBe(true);
  });

  it('refuse une notion inconnue', () => {
    const r = schemaLecon.safeParse({ ...valide, notion: 'balisage-inconnue' });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.success ? '' : r.error.issues)).toContain('notion inconnue');
  });

  it('exige un texte alternatif quand il y a un visuel', () => {
    const etapes = [{ ...valide.etapes[0], alt: undefined }, valide.etapes[1]];
    expect(schemaLecon.safeParse({ ...valide, etapes }).success).toBe(false);
  });

  it('veut au moins deux étapes et deux lignes à retenir', () => {
    expect(schemaLecon.safeParse({ ...valide, etapes: [valide.etapes[0]] }).success).toBe(false);
    expect(schemaLecon.safeParse({ ...valide, retenir: ['Une seule.'] }).success).toBe(false);
  });

  it('veut une source', () => {
    expect(schemaLecon.safeParse({ ...valide, sources: [] }).success).toBe(false);
  });

  it('refuse un chemin de visuel qui sort de public/visuels', () => {
    const etapes = [{ ...valide.etapes[0], visuel: '../secret.svg' }, valide.etapes[1]];
    expect(schemaLecon.safeParse({ ...valide, etapes }).success).toBe(false);
  });
});

describe('paragraphes', () => {
  it('coupe sur les lignes vides et nettoie les bords', () => {
    expect(paragraphes('  Un.\n\nDeux.\n\n\n Trois. ')).toEqual(['Un.', 'Deux.', 'Trois.']);
  });

  it('recolle les retours à la ligne simples d’un même paragraphe', () => {
    expect(paragraphes('Un mot\nla suite.')).toEqual(['Un mot la suite.']);
  });
});

function question(id: string, difficulte: number, notion = 'balisage-lateral'): QuestionAffichable {
  return {
    id,
    theme: 'balisage',
    notion,
    reponses: ['a'],
    enonce: `Énoncé ${id}`,
    explication: `Explication ${id}`,
    difficulte,
    propositions: [
      { id: 'a', texte: 'A' },
      { id: 'b', texte: 'B' },
    ],
    sources: [{ texte: 'Balisage AISM', ref: 'aism-mbs' }],
  };
}

describe('la vérification de fin de leçon', () => {
  it('prend les questions de la notion, les plus faciles d’abord, trois au plus', () => {
    const banque = [
      question('balisage-0004', 3),
      question('balisage-0002', 1),
      question('balisage-0009', 2, 'balisage-cardinal'),
      question('balisage-0003', 1),
      question('balisage-0001', 2),
    ];
    const choisies = choisirVerification(banque, 'balisage-lateral');
    expect(choisies.length).toBe(VERIFICATION_MAX);
    expect(choisies.map((q) => q.id)).toEqual(['balisage-0002', 'balisage-0003', 'balisage-0001']);
  });

  it('rend une liste vide quand la notion n’a pas de question', () => {
    expect(choisirVerification([question('balisage-0001', 1)], 'signaux-portuaires')).toEqual([]);
  });
});

describe('la leçon courte', () => {
  it('se construit depuis le résumé de la notion, sans rien inventer', () => {
    const notion = notionParCode('balisage-cardinal')!;
    const lecon = leconCourte(notion);
    expect(lecon.courte).toBe(true);
    expect(lecon.etapes).toHaveLength(1);
    expect(lecon.etapes[0]!.paragraphes).toEqual([notion.resume]);
    expect(lecon.retenir).toEqual([]);
    expect(lecon.piege).toBeUndefined();
  });
});
