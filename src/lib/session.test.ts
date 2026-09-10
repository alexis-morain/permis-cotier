import { describe, it, expect } from 'vitest';
import {
  creerSession,
  reduire,
  questionCourante,
  MAX_SELECTION,
  extraireSauvegarde,
  restaurerSession,
  SAUVEGARDE_PERIMEE_MS,
  lenteurs,
} from './session';
import type { Session } from './session';
import type { QuestionJouable } from './quiz';

function q(id: string, reponses: string[] = ['a']): QuestionJouable {
  return { id, theme: 'vhf', reponses, propositions: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] };
}

const trois = [q('vhf-0001', ['a']), q('vhf-0002', ['b', 'c']), q('vhf-0003', ['d'])];

/** Une horloge fixe : le chrono est une durée réelle, pas un compteur de tics. */
const T0 = 1_800_000_000_000;

/** Examen déjà commencé : l'écran de départ est franchi. */
function examen(): Session {
  return reduire(creerSession('examen', trois, 1, T0), { type: 'commencer', maintenant: T0 });
}
function entrainement(): Session {
  return creerSession('entrainement', trois, 1, T0);
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
    s = reduire(s, { type: 'tic', maintenant: T0 + 2_000 });
    expect(s.restant).toBe(18);
    s = reduire(s, { type: 'valider', maintenant: T0 + 2_000 });
    expect(s.restant).toBe(20);
  });

  it('valide tout seul quand le chrono tombe à zéro', () => {
    let s = examen();
    s = reduire(s, { type: 'tic', maintenant: T0 + 20_000 });
    expect(s.index).toBe(1);
    expect(s.selections[0]).toEqual([]);
  });

  it('compte le temps réel, pas les battements reçus', () => {
    // Un onglet en arrière-plan reçoit un tic toutes les minutes au lieu d'un
    // par seconde : le compte à rebours doit avoir couru quand même.
    let s = examen();
    s = reduire(s, { type: 'tic', maintenant: T0 + 7_000 });
    expect(s.restant).toBe(13);
  });

  it('ne brûle qu’une question par retour, même après une longue absence', () => {
    let s = examen();
    s = reduire(s, { type: 'tic', maintenant: T0 + 600_000 });
    expect(s.index).toBe(1);
    expect(s.restant).toBe(20);
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
    s = reduire(s, { type: 'valider', maintenant: T0 + 4_200 });
    expect(s.journal).toEqual([{ id: 'vhf-0001', juste: true, ms: 4_200 }]);
  });

  it('n’inscrit une question qu’une fois', () => {
    let s = entrainement();
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider' });
    s = reduire(s, { type: 'valider' });
    expect(s.journal).toHaveLength(1);
  });

  it('compte le temps de chaque réponse depuis l’affichage de sa question', () => {
    let s = examen();
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider', maintenant: T0 + 3_000 });
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    s = reduire(s, { type: 'basculer', proposition: 'c' });
    s = reduire(s, { type: 'valider', maintenant: T0 + 3_000 + 18_500 });
    expect(s.journal.map((l) => l.ms)).toEqual([3_000, 18_500]);
  });

  it('compte le temps depuis la reprise de la question, pas depuis le départ', () => {
    let s = entrainement();
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider', maintenant: T0 + 1_000 });
    s = reduire(s, { type: 'suivante', maintenant: T0 + 9_000 });
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    s = reduire(s, { type: 'basculer', proposition: 'c' });
    s = reduire(s, { type: 'valider', maintenant: T0 + 11_000 });
    expect(s.journal[1]!.ms).toBe(2_000);
  });

  it('inscrit les vingt secondes pleines à la question passée au buzzer', () => {
    let s = examen();
    s = reduire(s, { type: 'tic', maintenant: T0 + 20_000 });
    expect(s.journal[0]).toEqual({ id: 'vhf-0001', juste: false, ms: 20_000 });
  });
});

describe('lenteur, le mode d’échec de cette épreuve', () => {
  /** Un examen mené jusqu’au bout, chaque réponse à la durée voulue. */
  function jusquAuBout(durees: readonly number[]): Session {
    let s = examen();
    let t = T0;
    for (const ms of durees) {
      t += ms;
      s = reduire(s, { type: 'basculer', proposition: 'a' });
      s = reduire(s, { type: 'valider', maintenant: t });
    }
    return s;
  }

  it('nomme les questions passées au buzzer et celles arrachées à la dernière seconde', () => {
    const s = jusquAuBout([2_000, 19_400, 20_000]);
    expect(s.phase).toBe('resultat');
    const l = lenteurs(s);
    expect(l.auBuzzer).toEqual(['vhf-0003']);
    expect(l.aLaLimite).toEqual(['vhf-0002']);
  });

  it('ne compte ni l’une ni l’autre quand tout est répondu large', () => {
    const l = lenteurs(jusquAuBout([2_000, 3_000, 4_000]));
    expect(l.auBuzzer).toEqual([]);
    expect(l.aLaLimite).toEqual([]);
  });

  it('ne dit rien d’un examen pas fini, ni d’un entraînement', () => {
    let s = examen();
    s = reduire(s, { type: 'basculer', proposition: 'a' });
    s = reduire(s, { type: 'valider', maintenant: T0 + 20_000 });
    expect(lenteurs(s)).toEqual({ auBuzzer: [], aLaLimite: [] });

    let t = entrainement();
    t = reduire(t, { type: 'basculer', proposition: 'a' });
    t = reduire(t, { type: 'valider', maintenant: T0 + 40_000 });
    t = reduire(t, { type: 'terminer' });
    expect(lenteurs(t)).toEqual({ auBuzzer: [], aLaLimite: [] });
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
    const s = reduire(creerSession('examen', trois), { type: 'commencer', maintenant: T0 });
    expect(s.phase).toBe('en-cours');
    expect(s.restant).toBe(20);
    expect(s.echeance).toBe(T0 + 20_000);
  });

  it('n’impose pas d’écran de départ à l’entraînement', () => {
    expect(creerSession('entrainement', trois).phase).toBe('en-cours');
  });

  it('ne redémarre pas un examen déjà en cours', () => {
    let s = examen();
    s = reduire(s, { type: 'tic', maintenant: T0 + 5_000 });
    s = reduire(s, { type: 'commencer', maintenant: T0 + 5_000 });
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
    s = reduire(s, { type: 'valider', maintenant });
    s = reduire(s, { type: 'basculer', proposition: 'b' });
    return s;
  }

  it('garde le temps déjà passé dans le journal sauvegardé', () => {
    const sauvegarde = extraireSauvegarde(enCours(), undefined, maintenant);
    expect(sauvegarde!.journal[0]!.ms).toBeGreaterThanOrEqual(0);
    const apres = restaurerSession(sauvegarde, trois, 'examen', undefined, maintenant + 1000);
    expect(apres!.journal[0]!.ms).toBe(sauvegarde!.journal[0]!.ms);
  });

  it('relit une sauvegarde écrite avant le temps par réponse', () => {
    const ancienne = {
      mode: 'examen' as const,
      theme: null,
      ids: ['vhf-0001', 'vhf-0002', 'vhf-0003'],
      index: 1,
      selections: [['a'], [], []],
      echeance: maintenant + 20_000,
      journal: [{ id: 'vhf-0001', juste: true }],
      majLe: maintenant,
    };
    const apres = restaurerSession(ancienne, trois, 'examen', undefined, maintenant);
    expect(apres!.journal).toEqual([{ id: 'vhf-0001', juste: true, ms: 0 }]);
  });

  it('rend une sauvegarde qui redonne la même session', () => {
    const avant = enCours();
    const sauvegarde = extraireSauvegarde(avant, undefined, maintenant);
    const apres = restaurerSession(sauvegarde, trois, 'examen', undefined, maintenant + 1000);
    expect(apres).not.toBeNull();
    expect(apres!.index).toBe(1);
    expect(apres!.selections).toEqual(avant.selections);
    expect(apres!.journal).toEqual(avant.journal);
    expect(apres!.phase).toBe('en-cours');
  });

  it('ne rend pas les secondes déjà passées à qui rafraîchit', () => {
    const sauvegarde = extraireSauvegarde(enCours(), undefined, maintenant);
    const apres = restaurerSession(sauvegarde, trois, 'examen', undefined, maintenant + 8_000);
    expect(apres!.restant).toBe(12);
  });

  it('redonne la question entière quand son temps est passé pendant l’absence', () => {
    const sauvegarde = extraireSauvegarde(enCours(), undefined, maintenant);
    const apres = restaurerSession(sauvegarde, trois, 'examen', undefined, maintenant + 120_000);
    expect(apres!.restant).toBe(20);
    expect(apres!.index).toBe(1);
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

describe('graine de mélange', () => {
  const maintenant = 1_700_000_000_000;

  it('accompagne la session d’un bout à l’autre', () => {
    const s = creerSession('examen', trois, 4242);
    expect(s.graine).toBe(4242);
    // Le réducteur ne la touche jamais : l'ordre des propositions ne bouge pas
    // pendant qu'on coche, qu'on valide ou qu'on avance.
    const apres = reduire(reduire(s, { type: 'commencer', maintenant }), {
      type: 'basculer',
      proposition: 'a',
    });
    expect(apres.graine).toBe(4242);
  });

  it('survit à la sauvegarde et à la reprise', () => {
    const s = reduire(creerSession('examen', trois, 4242), { type: 'commencer', maintenant });
    const sauvegarde = extraireSauvegarde(s, undefined, maintenant);
    // Le voyage complet, tel que `localStorage` le fait : une session reprise
    // sur un autre ordre déplacerait les propositions sous le candidat.
    const relue = JSON.parse(JSON.stringify(sauvegarde));
    expect(relue.graine).toBe(4242);
    expect(restaurerSession(relue, trois, 'examen', undefined, maintenant)?.graine).toBe(4242);
  });

  it('en invente une quand la sauvegarde est d’avant le mélange', () => {
    const sauvegarde = extraireSauvegarde(
      reduire(creerSession('examen', trois, 4242), { type: 'commencer', maintenant }),
      undefined,
      maintenant,
    )!;
    delete (sauvegarde as { graine?: number }).graine;
    const reprise = restaurerSession(sauvegarde, trois, 'examen', undefined, maintenant);
    expect(typeof reprise?.graine).toBe('number');
  });

  it('tire une graine différente à chaque session neuve', () => {
    const graines = new Set(Array.from({ length: 50 }, () => creerSession('examen', trois).graine));
    expect(graines.size).toBe(50);
  });
});
