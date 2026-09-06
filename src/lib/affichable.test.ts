import { describe, it, expect } from 'vitest';
import {
  CHAMPS_RETENUS,
  CHAMPS_SOURCE_RETENUS,
  versAffichable,
} from './affichable';
import { objetQuestion, schemaSource } from './schema';
import type { Question } from './schema';

/**
 * `versAffichable` recopie les champs un à un. Le CLAUDE.md prévient qu'un
 * oubli n'y rougit aucun test ; depuis que le même objet part en JSON vers des
 * téléphones, l'oubli irait plus loin qu'une page du site. Ces tests refusent
 * tout champ du schéma qu'on n'aurait ni servi ni explicitement retenu.
 */

/** Une question qui remplit tous les champs, y compris les facultatifs. */
const source = {
  texte: 'Arrêté du 30 novembre 2017, annexe I',
  ref: 'arrete-2017-11-30',
  url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036194045',
  version: '2026-09-04',
} as const;

const complete: Question = {
  id: 'balisage-0001',
  option: 'cotier',
  theme: 'balisage',
  notion: 'balisage-lateral',
  statut: 'publie',
  difficulte: 2,
  enonce: 'Une bouée conique verte est laissée de quel bord en venant du large ?',
  visuel: { fichier: 'balisage/laterale-verte.svg', alt: 'Bouée conique verte', credit: 'code' },
  propositions: [
    { id: 'a', texte: 'À tribord' },
    { id: 'b', texte: 'À bâbord' },
  ],
  reponses: ['a'],
  explication:
    'En région A, la marque latérale tribord est verte et conique ; on la laisse à tribord en venant du large.',
  sources: [{ ...source }],
  meta: { cree_le: '2026-09-01', genere_par: 'claude', relu_par: 'alexis', relu_le: '2026-09-02' },
};

describe('les champs qui atteignent les écrans', () => {
  it('sert tout ce que le schéma décrit, sauf ce qui est retenu exprès', () => {
    const servis = Object.keys(versAffichable(complete));
    const attendus = Object.keys(objetQuestion.shape).filter(
      (champ) => !CHAMPS_RETENUS.includes(champ),
    );
    expect(servis.sort()).toEqual(attendus.sort());
  });

  it('range chaque champ du schéma dans une colonne ou dans l’autre', () => {
    const servis = new Set(Object.keys(versAffichable(complete)));
    const orphelins = Object.keys(objetQuestion.shape).filter(
      (champ) => !servis.has(champ) && !CHAMPS_RETENUS.includes(champ),
    );
    expect(orphelins).toEqual([]);
  });

  it('sert tout ce qu’une source décrit, sauf ce qui est retenu exprès', () => {
    const [servie] = versAffichable(complete).sources;
    // `noUncheckedIndexedAccess` : on vérifie qu'il y a bien une source plutôt
    // que de l'affirmer, sinon un tableau vide passerait pour un succès.
    expect(servie).toBeDefined();
    const servis = Object.keys(servie ?? {});
    const attendus = Object.keys(schemaSource.shape).filter(
      (champ) => !CHAMPS_SOURCE_RETENUS.includes(champ),
    );
    expect(servis.sort()).toEqual(attendus.sort());
  });

  it('recopie les valeurs sans les altérer', () => {
    const vue = versAffichable(complete);
    expect(vue).toEqual({
      id: complete.id,
      theme: complete.theme,
      notion: complete.notion,
      enonce: complete.enonce,
      explication: complete.explication,
      difficulte: complete.difficulte,
      propositions: complete.propositions,
      reponses: complete.reponses,
      sources: [{ texte: source.texte, ref: source.ref, url: source.url }],
      visuel: complete.visuel,
    });
  });

  it('survit à une question sans notion, sans visuel et sans URL de source', () => {
    const depouillee: Question = {
      ...complete,
      notion: undefined,
      visuel: undefined,
      sources: [{ texte: 'RIPAM, règle 26', ref: 'decret-77-733' }],
    };
    const vue = versAffichable(depouillee);
    expect(vue.notion).toBeUndefined();
    expect(vue.visuel).toBeUndefined();
    expect(vue.sources[0]?.url).toBeUndefined();
    expect(vue.enonce).toBe(complete.enonce);
  });

  it('passe le schéma : la question d’essai n’est pas une invention', () => {
    expect(() => objetQuestion.parse(complete)).not.toThrow();
  });
});
