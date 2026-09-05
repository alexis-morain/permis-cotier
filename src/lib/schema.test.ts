import { describe, it, expect } from 'vitest';
import { schemaQuestion, ID_QUESTION } from './schema';

const valide = {
  id: 'feux-marques-0012',
  option: 'cotier',
  theme: 'feux-marques',
  statut: 'publie',
  difficulte: 2,
  enonce: 'De nuit, vous apercevez un feu vert et un feu blanc superposés. De quoi s’agit-il ?',
  propositions: [
    { id: 'a', texte: 'Un navire à propulsion mécanique de moins de 50 mètres' },
    { id: 'b', texte: 'Un navire en train de pêcher au chalut' },
    { id: 'c', texte: 'Un navire non maître de sa manœuvre' },
    { id: 'd', texte: 'Un navire à voile' },
  ],
  reponses: ['b'],
  explication: 'Un chalutier montre deux feux superposés, le supérieur vert, le inférieur blanc.',
  sources: [{ texte: 'RIPAM, règle 26 b)', ref: 'decret-77-733' }],
  meta: { cree_le: '2026-09-10', genere_par: 'claude', relu_par: 'alexis' },
};

function avec(patch: Record<string, unknown>) {
  return { ...valide, ...patch };
}

describe('schéma de question', () => {
  it('accepte une question conforme', () => {
    expect(schemaQuestion.safeParse(valide).success).toBe(true);
  });

  describe('identifiant', () => {
    it('exige le code du thème comme préfixe', () => {
      expect(schemaQuestion.safeParse(avec({ id: 'feux-0012' })).success).toBe(false);
      expect(schemaQuestion.safeParse(avec({ id: 'balisage-0012' })).success).toBe(false);
    });

    it('exige quatre chiffres après le préfixe', () => {
      expect(schemaQuestion.safeParse(avec({ id: 'feux-marques-12' })).success).toBe(false);
      expect(schemaQuestion.safeParse(avec({ id: 'feux-marques-00012' })).success).toBe(false);
    });

    it('reconnaît un identifiant bien formé par expression régulière', () => {
      expect(ID_QUESTION.test('vhf-0001')).toBe(true);
      expect(ID_QUESTION.test('VHF-0001')).toBe(false);
    });
  });

  describe('thème et option', () => {
    it('refuse un thème hors de la liste de l’arrêté', () => {
      expect(schemaQuestion.safeParse(avec({ theme: 'navigation', id: 'navigation-0001' })).success).toBe(false);
    });

    it('n’accepte que l’option côtière en V1', () => {
      expect(schemaQuestion.safeParse(avec({ option: 'fluvial' })).success).toBe(false);
    });
  });

  describe('propositions', () => {
    it('accepte deux propositions', () => {
      expect(schemaQuestion.safeParse(avec({ propositions: valide.propositions.slice(0, 2), reponses: ['b'] })).success).toBe(true);
    });

    it('refuse une proposition unique', () => {
      expect(schemaQuestion.safeParse(avec({ propositions: valide.propositions.slice(0, 1), reponses: ['a'] })).success).toBe(false);
    });

    it('refuse cinq propositions', () => {
      const cinq = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, texte: 'x'.repeat(5) }));
      expect(schemaQuestion.safeParse(avec({ propositions: cinq })).success).toBe(false);
    });

    it('refuse un identifiant de proposition au-delà de d', () => {
      const avecE = [...valide.propositions.slice(0, 3), { id: 'e', texte: 'la cinquième lettre' }];
      expect(schemaQuestion.safeParse(avec({ propositions: avecE })).success).toBe(false);
    });

    it('refuse des identifiants de proposition dupliqués', () => {
      const dup = [...valide.propositions.slice(0, 3), { id: 'a', texte: 'doublon' }];
      expect(schemaQuestion.safeParse(avec({ propositions: dup })).success).toBe(false);
    });
  });

  describe('réponses', () => {
    it('accepte deux bonnes réponses', () => {
      expect(schemaQuestion.safeParse(avec({ reponses: ['b', 'c'] })).success).toBe(true);
    });

    it('refuse zéro réponse', () => {
      expect(schemaQuestion.safeParse(avec({ reponses: [] })).success).toBe(false);
    });

    it('refuse trois réponses', () => {
      expect(schemaQuestion.safeParse(avec({ reponses: ['a', 'b', 'c'] })).success).toBe(false);
    });

    it('refuse une réponse absente des propositions', () => {
      expect(schemaQuestion.safeParse(avec({ reponses: ['z'] })).success).toBe(false);
    });

    it('refuse une réponse dupliquée', () => {
      expect(schemaQuestion.safeParse(avec({ reponses: ['b', 'b'] })).success).toBe(false);
    });
  });

  describe('sources', () => {
    it('exige au moins une source', () => {
      expect(schemaQuestion.safeParse(avec({ sources: [] })).success).toBe(false);
    });

    it('exige texte et ref sur chaque source', () => {
      expect(schemaQuestion.safeParse(avec({ sources: [{ texte: 'RIPAM' }] })).success).toBe(false);
      expect(schemaQuestion.safeParse(avec({ sources: [{ ref: 'decret-77-733' }] })).success).toBe(false);
    });
  });

  describe('visuel', () => {
    it('est facultatif', () => {
      const { ...sansVisuel } = valide;
      expect(schemaQuestion.safeParse(sansVisuel).success).toBe(true);
    });

    it('exige alt non vide et crédit quand il est présent', () => {
      expect(schemaQuestion.safeParse(avec({ visuel: { fichier: 'feux/x.svg', alt: '', credit: 'code' } })).success).toBe(false);
      expect(schemaQuestion.safeParse(avec({ visuel: { fichier: 'feux/x.svg', alt: 'Un feu vert' } })).success).toBe(false);
      expect(schemaQuestion.safeParse(avec({ visuel: { fichier: 'feux/x.svg', alt: 'Un feu vert', credit: 'code' } })).success).toBe(true);
    });

    it('accepte un crédit Commons avec auteur', () => {
      expect(schemaQuestion.safeParse(avec({ visuel: { fichier: 'balisage/cardinale-nord.svg', alt: 'Marque cardinale Nord', credit: 'commons:Alkab' } })).success).toBe(true);
    });

    it('refuse un crédit inconnu', () => {
      expect(schemaQuestion.safeParse(avec({ visuel: { fichier: 'x.svg', alt: 'x', credit: 'midjourney' } })).success).toBe(false);
    });
  });

  describe('statut et relecture', () => {
    it('exige relu_par dès le statut relu', () => {
      const meta = { cree_le: '2026-09-10', genere_par: 'claude' };
      expect(schemaQuestion.safeParse(avec({ statut: 'relu', meta })).success).toBe(false);
      expect(schemaQuestion.safeParse(avec({ statut: 'publie', meta })).success).toBe(false);
      expect(schemaQuestion.safeParse(avec({ statut: 'brouillon', meta })).success).toBe(true);
    });

    it('refuse un statut inconnu', () => {
      expect(schemaQuestion.safeParse(avec({ statut: 'valide' })).success).toBe(false);
    });
  });

  it('refuse une difficulté hors de 1 à 3', () => {
    expect(schemaQuestion.safeParse(avec({ difficulte: 0 })).success).toBe(false);
    expect(schemaQuestion.safeParse(avec({ difficulte: 4 })).success).toBe(false);
  });

  it('refuse un énoncé ou une explication vide', () => {
    expect(schemaQuestion.safeParse(avec({ enonce: '  ' })).success).toBe(false);
    expect(schemaQuestion.safeParse(avec({ explication: '' })).success).toBe(false);
  });
});
