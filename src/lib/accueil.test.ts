import { describe, it, expect } from 'vitest';
import {
  aRevoir,
  depuisLe,
  nombreDErreurs,
  dernierExamen,
  echeance,
  echeanceDe,
  joursDeSuite,
  phraseDeLEcheance,
  reprise,
  type LeconAccueil,
} from './accueil';
import { enregistrerExamen, enregistrerProfil, enregistrerReponse, etatInitial, profilVide, terminerLecon } from './progression';
import { estDue, serieDuJour, TAILLE_SERIE_PAR_DEFAUT } from './quiz';

const JOUR = '2026-09-25';

const lecons: LeconAccueil[] = [
  { code: 'a', nom: 'Marques latérales', chemin: '/cours/balisage/a', chapitre: 'Lire le balisage' },
  { code: 'b', nom: 'Cardinales', chemin: '/cours/balisage/b', chapitre: 'Lire le balisage' },
  { code: 'c', nom: 'Priorités', chemin: '/cours/barre-route/c', chapitre: 'Se croiser' },
];

describe('reprise du cours', () => {
  it('rien de fait : la première leçon, premier rang de son chapitre', () => {
    const r = reprise(lecons, etatInitial());
    expect(r).toMatchObject({ etat: 'vide', faites: 0, total: 3, rang: 1, dansChapitre: 2 });
    expect(r.etat !== 'termine' && r.prochaine.code).toBe('a');
  });

  it('en cours : la première non faite, même après un saut', () => {
    const e = terminerLecon(terminerLecon(etatInitial(), 'a', { bonnes: 3, total: 3 }, JOUR), 'c', { bonnes: 1, total: 2 }, JOUR);
    const r = reprise(lecons, e);
    expect(r).toMatchObject({ etat: 'enCours', faites: 2, rang: 2, dansChapitre: 2 });
    expect(r.etat !== 'termine' && r.prochaine.code).toBe('b');
  });

  it('tout fait : terminé, sans prochaine leçon', () => {
    let e = etatInitial();
    for (const l of lecons) e = terminerLecon(e, l.code, { bonnes: 1, total: 1 }, JOUR);
    expect(reprise(lecons, e)).toEqual({ etat: 'termine', faites: 3, total: 3 });
  });

  it('une leçon faite qui n’est plus au parcours ne compte pas', () => {
    const e = terminerLecon(etatInitial(), 'retiree', { bonnes: 1, total: 1 }, JOUR);
    expect(reprise(lecons, e).etat).toBe('vide');
  });
});

describe('à revoir aujourd’hui', () => {
  const ids = ['q1', 'q2', 'q3'];

  it('jamais joué', () => {
    expect(aRevoir(etatInitial(), ids, JOUR)).toEqual({ etat: 'jamais' });
  });

  it('joué, tout réussi : rien de dû aujourd’hui', () => {
    const e = enregistrerReponse(etatInitial(), 'q1', true, JOUR);
    expect(aRevoir(e, ids, JOUR)).toEqual({ etat: 'rien' });
  });

  it('les ratées et les réussites arrivées à échéance', () => {
    let e = enregistrerReponse(etatInitial(), 'q1', false, JOUR);
    e = enregistrerReponse(e, 'q2', true, '2026-09-24');
    e = enregistrerReponse(e, 'q3', true, JOUR);
    expect(aRevoir(e, ids, JOUR)).toEqual({ etat: 'du', nombre: 2 });
  });

  it('une question retirée de la banque ne compte pas', () => {
    const e = enregistrerReponse(etatInitial(), 'retiree', false, JOUR);
    expect(aRevoir(e, ids, JOUR)).toEqual({ etat: 'jamais' });
  });

  describe('le même nombre que /revoir joue', () => {
    /** `n` questions ratées aujourd'hui : toutes dues. */
    function ratees(n: number, rythme: number | null) {
      const banque = Array.from({ length: n + 5 }, (_, k) => ({ id: `q${k}`, theme: 'vhf' }));
      let e = enregistrerProfil(etatInitial(), { ...profilVide(), rythme });
      for (const q of banque.slice(0, n)) e = enregistrerReponse(e, q.id, false, JOUR);
      return { e, banque, ids: banque.map((q) => q.id) };
    }
    /** Ce que la page `/revoir` met en série parmi les dues : le chemin de `Quiz.tsx`. */
    const duesJouees = (e: ReturnType<typeof etatInitial>, banque: { id: string; theme: string }[]) =>
      serieDuJour(banque, e.questions, JOUR, e.profil.rythme ?? undefined).filter((q) => estDue(e.questions[q.id], JOUR)).length;

    it('borné au rythme choisi : 25 dues, une série de 10 en joue 10', () => {
      const { e, banque, ids } = ratees(25, 10);
      expect(duesJouees(e, banque)).toBe(10);
      expect(aRevoir(e, ids, JOUR)).toEqual({ etat: 'du', nombre: 10 });
    });

    it('borné à la série par défaut sans rythme', () => {
      const { e, banque, ids } = ratees(25, null);
      expect(duesJouees(e, banque)).toBe(TAILLE_SERIE_PAR_DEFAUT);
      expect(aRevoir(e, ids, JOUR)).toEqual({ etat: 'du', nombre: TAILLE_SERIE_PAR_DEFAUT });
    });

    it('toutes, quand elles tiennent dans la série', () => {
      const { e, banque, ids } = ratees(4, 10);
      expect(duesJouees(e, banque)).toBe(4);
      expect(aRevoir(e, ids, JOUR)).toEqual({ etat: 'du', nombre: 4 });
    });
  });
});

describe('dernier examen blanc', () => {
  it('aucun', () => {
    expect(dernierExamen(etatInitial(), JOUR)).toBeNull();
  });

  it('le plus récent, avec les jours écoulés', () => {
    let e = enregistrerExamen(etatInitial(), { date: '2026-09-20', bonnes: 30, total: 40, reussi: false });
    e = enregistrerExamen(e, { date: '2026-09-22', bonnes: 36, total: 40, reussi: true });
    expect(dernierExamen(e, JOUR)).toEqual({ bonnes: 36, total: 40, reussi: true, depuis: 3 });
  });

  it('dit le temps écoulé en mots', () => {
    expect(depuisLe(0)).toBe('aujourd’hui');
    expect(depuisLe(1)).toBe('hier');
    expect(depuisLe(3)).toBe('il y a 3 jours');
  });
});

describe('ton examen', () => {
  const avec = (date: string | null) => ({ ...etatInitial(), dateExamen: date });

  it('sans date', () => {
    expect(echeance(avec(null), JOUR)).toEqual({ etat: 'sansDate' });
  });

  it('à venir, le jour même, passé', () => {
    expect(echeance(avec('2026-10-07'), JOUR)).toEqual({ etat: 'avenir', jours: 12 });
    expect(echeance(avec(JOUR), JOUR)).toEqual({ etat: 'aujourdhui' });
    expect(echeance(avec('2026-09-21'), JOUR)).toEqual({ etat: 'passe', jours: 4 });
  });

  it('une date illisible vaut une date absente', () => {
    expect(echeance(avec('bientôt'), JOUR)).toEqual({ etat: 'sansDate' });
  });

  it('compte les jours de suite jusqu’à hier si rien aujourd’hui', () => {
    const e = { ...etatInitial(), activite: { '2026-09-22': 4, '2026-09-23': 2, '2026-09-24': 9 } };
    expect(joursDeSuite(e, JOUR)).toBe(3);
    expect(joursDeSuite(etatInitial(), JOUR)).toBe(0);
  });
});

describe('le nombre d’erreurs de /profil/erreurs', () => {
  const ids = ['q1', 'q2', 'q3'];

  it('zéro sans rien de joué, zéro sans rien de raté ni de dû', () => {
    expect(nombreDErreurs(etatInitial(), ids, JOUR)).toBe(0);
    const e = enregistrerReponse(etatInitial(), 'q1', true, JOUR);
    expect(nombreDErreurs(e, ids, JOUR)).toBe(0);
  });

  it('compte ce qui a été raté et ce qui est dû, comme la page', () => {
    let e = enregistrerReponse(etatInitial(), 'q1', false, JOUR);
    e = enregistrerReponse(e, 'q2', false, '2026-09-20');
    expect(nombreDErreurs(e, ids, JOUR)).toBe(2);
  });

  it('ignore une question qui n’est plus publiée', () => {
    const e = enregistrerReponse(etatInitial(), 'retiree', false, JOUR);
    expect(nombreDErreurs(e, ids, JOUR)).toBe(0);
  });
});

describe('phraseDeLEcheance, sous la date de l’accueil du site', () => {
  const jour = '2026-10-12';
  it('se tait sans date', () => {
    expect(phraseDeLEcheance(echeanceDe(null, jour), 10)).toBeNull();
  });
  it('dit le rythme qui reste, et passe aux examens blancs quand tout est vu', () => {
    expect(phraseDeLEcheance(echeanceDe('2026-10-22', jour), 95)).toBe(
      'Dans 10 jours. Environ 10 questions par jour pour voir les 95 qui restent.',
    );
    expect(phraseDeLEcheance(echeanceDe('2026-10-22', jour), 0)).toBe(
      'Dans 10 jours. Tu as tout vu une fois : place aux examens blancs.',
    );
  });
  it('nomme la veille, le jour même et la date passée', () => {
    expect(phraseDeLEcheance(echeanceDe('2026-10-13', jour), 5)).toBe('Demain. Fais deux examens blancs ce soir.');
    expect(phraseDeLEcheance(echeanceDe('2026-10-12', jour), 5)).toBe('Aujourd’hui. Bon vent.');
    expect(phraseDeLEcheance(echeanceDe('2026-10-01', jour), 5)).toBe(
      'C’est passé. Efface la date au-dessus, ou pose la prochaine.',
    );
  });
});
