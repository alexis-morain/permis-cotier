import { describe, it, expect } from 'vitest';
import {
  creerSession,
  reduire,
  questionCourante,
  MAX_SELECTION,
  extraireSauvegarde,
  restaurerSession,
  SAUVEGARDE_PERIMEE_MS,
} from './session';
import type { Session } from './session';
import type { QuestionJouable } from './quiz';

function q(id: string, reponses: string[] = ['a']): QuestionJouable {
  return { id, theme: 'vhf', reponses, propositions: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] };
}

const trois = [q('vhf-0001', ['a']), q('vhf-0002', ['b', 'c']), q('vhf-0003', ['d'])];

/** Examen déjà commencé : l'écran de départ est franchi. */
function examen(): Session {
  return reduire(creerSession('examen', trois), { type: 'commencer' });
}
function entrainement(): Session {
  return creerSession('entrainement', trois);
}

describe('création de session', () => {
  it('démarre à la première question, rien de coché', () => {
    const s = examen();
    expect(s.index).toBe(0);
    expect(s.selections[0]).toEqual([]);
    expect(s.phase).toBe('en-cours');
    expect(questionCourante(s)?.id).toBe('vhf-0001');
  });

  it('arme le chrono en examen une fois commencé, jamais en entraînement', () => {
    expect(examen().restant).toBe(20);
    expect(entrainement().restant).toBeNull();
  });

  it('n’affiche jamais la correction avant validation en examen', () => {
    expect(examen().corrigee).toBe(false);
  });
});

describe('sélection des propositions', () => {
  it('coche et décoche', () => {
    let s = reduire(examen(), { type: 'basculer', proposition: 'b' });
    expect(s.selections[0]).toEqual(['b']);
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    expect(s.selections[0]).toEqual([]);
  });

  it('accepte deux réponses', () => {
    let s = reduire(examen(), { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'basculer', proposition: 'c' });
    expect(s.selections[0]).toEqual(['a', 'c']);
  });

  it('refuse une troisième réponse, l’épreuve n’en admet jamais plus de deux', () => {
    expect(MAX_SELECTION).toBe(2);
    let s = reduire(examen(), { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    s = reduire(s, { type: 'basculer', proposition: 'c' });
    expect(s.selections[0]).toEqual(['a', 'b']);
  });

  it('laisse décocher pour changer d’avis une fois à deux', () => {
    let s = reduire(examen(), { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'basculer', proposition: 'c' });
    expect(s.selections[0]).toEqual(['b', 'c']);
  });

  it('ne bouge plus une fois la question corrigée', () => {
    let s = reduire(entrainement(), { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    expect(s.selections[0]).toEqual(['a']);
  });
});

describe('examen blanc', () => {
  it('passe à la question suivante sans rien montrer', () => {
    let s = reduire(examen(), { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    expect(s.index).toBe(1);
    expect(s.corrigee).toBe(false);
    expect(s.phase).toBe('en-cours');
  });

  it('remet le chrono à vingt secondes à chaque question', () => {
    let s = examen();
    s = reduire(s, { type: 'tic' });
    s = reduire(s, { type: 'tic' });
    expect(s.restant).toBe(18);
    s = reduire(s, { type: 'valider' });
    expect(s.restant).toBe(20);
  });

  it('valide tout seul quand le chrono tombe à zéro', () => {
    let s = examen();
    for (let i = 0; i < 20; i++) s = reduire(s, { type: 'tic' });
    expect(s.index).toBe(1);
    expect(s.selections[0]).toEqual([]);
  });

  it('finit sur l’écran de résultat après la dernière question', () => {
    let s = examen();
    for (let i = 0; i < 3; i++) s = reduire(s, { type: 'valider' });
    expect(s.phase).toBe('resultat');
    expect(s.restant).toBeNull();
  });

  it('calcule le résultat à l’arrivée', () => {
    let s = examen();
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    s = reduire(s, { type: 'basculer', proposition: 'c' });
    s = reduire(s, { type: 'valider' });
    s = reduire(s, { type: 'valider' });
    const r = s.resultat!;
    expect(r.bonnes).toBe(2);
    expect(r.ratees).toEqual(['vhf-0003']);
  });

  it('permet d’abandonner et ne note que les questions jouées', () => {
    const s = reduire(examen(), { type: 'terminer' });
    expect(s.phase).toBe('resultat');
    expect(s.resultat!.total).toBe(0);
  });
});

describe('entraînement', () => {
  it('montre la correction sans changer de question', () => {
    let s = reduire(entrainement(), { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    expect(s.corrigee).toBe(true);
    expect(s.index).toBe(0);
    expect(s.juste).toBe(true);
  });

  it('signale une mauvaise réponse', () => {
    let s = reduire(entrainement(), { type: 'basculer', proposition: 'b' });
    s = reduire(s, { type: 'valider' });
    expect(s.juste).toBe(false);
  });

  it('avance seulement sur demande, et remet la correction à zéro', () => {
    let s = reduire(entrainement(), { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    s = reduire(s, { type: 'suivante' });
    expect(s.index).toBe(1);
    expect(s.corrigee).toBe(false);
  });

  it('ne valide pas une question sans réponse cochée', () => {
    const s = reduire(entrainement(), { type: 'valider' });
    expect(s.corrigee).toBe(false);
  });

  it('n’a pas de chrono qui court', () => {
    const s = reduire(entrainement(), { type: 'tic' });
    expect(s.restant).toBeNull();
    expect(s.index).toBe(0);
  });

  it('finit sur le résultat après la dernière question', () => {
    let s = entrainement();
    for (let i = 0; i < 3; i++) {
      s = reduire(s, { type: 'basculer', proposition: 'a' });
      s = reduire(s, { type: 'valider' });
      s = reduire(s, { type: 'suivante' });
    }
    expect(s.phase).toBe('resultat');
  });
});

describe('journal des réponses', () => {
  it('note chaque question jouée, pour la progression locale', () => {
    let s = examen();
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    expect(s.journal).toEqual([{ id: 'vhf-0001', juste: true }]);
  });

  it('n’inscrit une question qu’une fois', () => {
    let s = entrainement();
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    s = reduire(s, { type: 'valider' });
    expect(s.journal).toHaveLength(1);
  });
});

describe('session vide', () => {
  it('affiche le résultat tout de suite plutôt que de planter', () => {
    const s = creerSession('examen', []);
    expect(s.phase).toBe('resultat');
    expect(questionCourante(s)).toBeUndefined();
  });
});


describe('écran de départ de l’examen', () => {
  it('attend le clic avant de lancer le chrono', () => {
    const s = creerSession('examen', trois);
    expect(s.phase).toBe('depart');
    expect(s.restant).toBeNull();
  });

  it('ne laisse rien faire tant que l’examen n’a pas commencé', () => {
    let s = creerSession('examen', trois);
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'tic' });
    s = reduire(s, { type: 'valider' });
    expect(s.phase).toBe('depart');
    expect(s.selections[0]).toEqual([]);
    expect(s.index).toBe(0);
  });

  it('arme le chrono au démarrage, et pas avant', () => {
    const s = reduire(creerSession('examen', trois), { type: 'commencer' });
    expect(s.phase).toBe('en-cours');
    expect(s.restant).toBe(20);
  });

  it('n’impose pas d’écran de départ à l’entraînement', () => {
    expect(creerSession('entrainement', trois).phase).toBe('en-cours');
  });

  it('ne redémarre pas un examen déjà en cours', () => {
    let s = examen();
    for (let i = 0; i < 5; i++) s = reduire(s, { type: 'tic' });
    s = reduire(s, { type: 'commencer' });
    expect(s.restant).toBe(15);
  });
});

describe('examen interrompu', () => {
  it('note sur les seules questions jouées, pas sur les quarante', () => {
    let s = examen();
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    s = reduire(s, { type: 'terminer' });
    expect(s.resultat!.total).toBe(1);
    expect(s.resultat!.bonnes).toBe(1);
    expect(s.resultat!.erreurs).toBe(0);
    expect(s.interrompu).toBe(true);
  });

  it('ne compte pas la question en cours, jamais validée', () => {
    let s = examen();
    s = reduire(s, { type: 'valider' });
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    s = reduire(s, { type: 'terminer' });
    expect(s.resultat!.total).toBe(1);
  });

  it('ne marque pas interrompu un examen mené au bout', () => {
    let s = examen();
    for (let i = 0; i < 3; i++) s = reduire(s, { type: 'valider' });
    expect(s.interrompu).toBe(false);
    expect(s.resultat!.total).toBe(3);
  });

  it('ne fait pas semblant d’avoir un verdict à zéro question', () => {
    const s = reduire(examen(), { type: 'terminer' });
    expect(s.resultat!.total).toBe(0);
    expect(s.resultat!.parTheme).toEqual({});
  });
});

describe('reprise d’une session interrompue', () => {
  const maintenant = 1_800_000_000_000;

  function enCours(): Session {
    let s = examen();
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    return s;
  }

  it('rend une sauvegarde qui redonne la même session', () => {
    const avant = enCours();
    const sauvegarde = extraireSauvegarde(avant, undefined, maintenant);
    const apres = restaurerSession(sauvegarde, trois, 'examen', undefined, maintenant + 1000);
    expect(apres).not.toBeNull();
    expect(apres!.index).toBe(1);
    expect(apres!.selections).toEqual(avant.selections);
    expect(apres!.restant).toBe(avant.restant);
    expect(apres!.journal).toEqual(avant.journal);
    expect(apres!.phase).toBe('en-cours');
  });

  it('refuse une sauvegarde d’un autre mode', () => {
    const sauvegarde = extraireSauvegarde(enCours(), undefined, maintenant);
    expect(restaurerSession(sauvegarde, trois, 'entrainement', undefined, maintenant)).toBeNull();
  });

  it('refuse une sauvegarde d’un autre thème', () => {
    const sauvegarde = extraireSauvegarde(enCours(), 'vhf', maintenant);
    expect(restaurerSession(sauvegarde, trois, 'examen', 'feux-marques', maintenant)).toBeNull();
  });

  it('refuse quand une question a quitté la banque', () => {
    const sauvegarde = extraireSauvegarde(enCours(), undefined, maintenant);
    const amputee = trois.filter((question) => question.id !== 'vhf-0002');
    expect(restaurerSession(sauvegarde, amputee, 'examen', undefined, maintenant)).toBeNull();
  });

  it('refuse une sauvegarde périmée', () => {
    const sauvegarde = extraireSauvegarde(enCours(), undefined, maintenant);
    const tard = maintenant + SAUVEGARDE_PERIMEE_MS + 1;
    expect(restaurerSession(sauvegarde, trois, 'examen', undefined, tard)).toBeNull();
  });

  it('ne propose rien d’une session finie ou pas commencée', () => {
    const finie = reduire(examen(), { type: 'terminer' });
    expect(extraireSauvegarde(finie, undefined, maintenant)).toBeNull();
    expect(extraireSauvegarde(creerSession('examen', trois), undefined, maintenant)).toBeNull();
  });
});
