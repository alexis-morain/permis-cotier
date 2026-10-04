/**
 * La bande d'ouverture de l'accueil, choisie dans la progression. Chaque cas
 * part d'un `Etat` écrit à la main et d'un jour posé : ni horloge ni stockage.
 */
import { describe, it, expect } from 'vitest';
import { choisirBande, type LeconBande } from './bande';
import { enregistrerExamen, enregistrerReponse, etatInitial, terminerLecon, type Etat } from './progression';
import { joursAvant as joursAvantProfil } from './profil';
import { joursAvant } from './jour';

const JOUR = '2026-10-04';
const lecons: LeconBande[] = [
  { code: 'balisage-lateral', nom: 'Marques latérales', chemin: '/cours/balisage/balisage-lateral' },
  { code: 'balisage-cardinal', nom: 'Marques cardinales', chemin: '/cours/balisage/balisage-cardinal' },
  { code: 'barre-veille-vitesse', nom: 'Veille et vitesse', chemin: '/cours/barre-route/barre-veille-vitesse' },
];
const ids = ['vhf-0', 'vhf-1', 'vhf-2', 'vhf-3'];

const choisir = (etat: Etat, jour = JOUR) => choisirBande(etat, lecons, ids, jour);
const recale = (etat: Etat, date = '2026-10-03') =>
  enregistrerExamen(etat, { date, bonnes: 29, total: 40, reussi: false });
const recu = (etat: Etat, date = '2026-10-01') =>
  enregistrerExamen(etat, { date, bonnes: 37, total: 40, reussi: true });
/** Deux questions ratées hier : dues aujourd'hui. */
const deuxRatees = (etat: Etat) =>
  enregistrerReponse(enregistrerReponse(etat, 'vhf-0', false, '2026-10-03'), 'vhf-1', false, '2026-10-03');

describe('le nouveau venu', () => {
  it('garde la bande du nouveau venu sans aucune trace', () => {
    expect(choisir(etatInitial())).toEqual({ cas: 'nouveau' });
  });

  it('la garde aussi quand seul le questionnaire est rempli', () => {
    const etat = { ...etatInitial(), profil: { ...etatInitial().profil, prenom: 'Léa', rempliLe: JOUR } };
    expect(choisir(etat)).toEqual({ cas: 'nouveau' });
  });

  it('ne compte pas une question retirée de la banque comme une trace', () => {
    const etat = enregistrerReponse(etatInitial(), 'question-retiree', false, '2026-10-03');
    expect(choisir(etat)).toEqual({ cas: 'nouveau' });
  });
});

describe('après un examen blanc', () => {
  it('recalé : le score, les erreurs de l’examen et les questions dues', () => {
    expect(choisir(deuxRatees(recale(etatInitial())))).toEqual({
      cas: 'recale',
      examen: { bonnes: 29, total: 40, erreurs: 11, depuis: 1 },
      aRevoir: 2,
      prochaine: lecons[0],
      coursEntame: false,
    });
  });

  it('recalé sans rien de dû : aRevoir vaut zéro, le rendu passe à l’examen', () => {
    const bande = choisir(recale(etatInitial()));
    expect(bande).toMatchObject({ cas: 'recale', aRevoir: 0 });
  });

  it('reçu : le score et le temps écoulé', () => {
    expect(choisir(recu(etatInitial()))).toEqual({
      cas: 'recu',
      examen: { bonnes: 37, total: 40, erreurs: 3, depuis: 3 },
      aRevoir: 0,
      prochaine: lecons[0],
      coursEntame: false,
    });
  });

  it('dit si le cours est entamé, pour ne pas faire « reprendre » ce qui n’a pas commencé', () => {
    const etat = terminerLecon(recu(etatInitial(), '2026-10-03'), 'balisage-lateral', { bonnes: 3, total: 3 }, '2026-10-01');
    expect(choisir(etat)).toMatchObject({ cas: 'recu', prochaine: lecons[1], coursEntame: true });
  });

  it('lit le dernier examen terminé, pas un examen vide', () => {
    const etat = enregistrerExamen(recu(etatInitial()), { date: JOUR, bonnes: 0, total: 0, reussi: false });
    expect(choisir(etat)).toMatchObject({ cas: 'recu' });
  });

  it('le plus récent l’emporte sur un ancien', () => {
    const etat = recu(recale(etatInitial(), '2026-09-20'), '2026-10-02');
    expect(choisir(etat)).toMatchObject({ cas: 'recu', examen: { depuis: 2 } });
  });

  it('n’a plus de prochaine leçon quand le cours est fini', () => {
    let etat = recu(etatInitial(), '2026-10-03');
    for (const l of lecons) etat = terminerLecon(etat, l.code, { bonnes: 3, total: 3 }, '2026-10-01');
    expect(choisir(etat)).toMatchObject({ cas: 'recu', prochaine: null });
  });

  it('annonce la série que /revoir jouera : les dues, plafonnées au rythme', () => {
    const quatre = ['vhf-0', 'vhf-1', 'vhf-2', 'vhf-3'].reduce((e, id) => enregistrerReponse(e, id, false, '2026-10-03'), recale(etatInitial()));
    expect(choisir({ ...quatre, profil: { ...quatre.profil, rythme: 3 } })).toMatchObject({ cas: 'recale', aRevoir: 3 });
    expect(choisir(quatre)).toMatchObject({ cas: 'recale', aRevoir: 4 });
  });

  it('borne les questions dues à la banque publiée, comme /revoir', () => {
    const etat = enregistrerReponse(recale(etatInitial()), 'question-retiree', false, '2026-10-03');
    expect(choisir(etat)).toMatchObject({ cas: 'recale', aRevoir: 0 });
  });
});

describe('le cours', () => {
  it('pointe la première leçon pas faite, et compte les faites', () => {
    const etat = terminerLecon(etatInitial(), 'balisage-lateral', { bonnes: 2, total: 3 }, '2026-10-02');
    expect(choisir(etat)).toEqual({ cas: 'cours', faites: 1, total: 3, prochaine: lecons[1], examen: null, aRevoir: 0 });
  });

  it('prend le pas sur un examen plus ancien que la dernière leçon', () => {
    const etat = terminerLecon(recale(etatInitial(), '2026-09-28'), 'balisage-lateral', { bonnes: 3, total: 3 }, '2026-10-02');
    expect(choisir(etat)).toMatchObject({
      cas: 'cours',
      faites: 1,
      prochaine: lecons[1],
      examen: { bonnes: 29, total: 40, erreurs: 11, depuis: 6 },
    });
  });

  it('laisse l’examen passer devant une leçon faite le même jour', () => {
    const etat = terminerLecon(recale(etatInitial(), '2026-10-02'), 'balisage-lateral', { bonnes: 3, total: 3 }, '2026-10-02');
    expect(choisir(etat)).toMatchObject({ cas: 'recale' });
  });

  it('ignore une leçon sortie du parcours', () => {
    const etat = terminerLecon(etatInitial(), 'lecon-retiree', { bonnes: 3, total: 3 }, '2026-10-02');
    expect(choisir(etat)).toEqual({ cas: 'nouveau' });
  });

  it('cours fini sans examen : place à l’examen blanc', () => {
    let etat = deuxRatees(etatInitial());
    for (const l of lecons) etat = terminerLecon(etat, l.code, { bonnes: 3, total: 3 }, '2026-10-01');
    expect(choisir(etat)).toEqual({ cas: 'coursFini', total: 3, aRevoir: 2 });
  });
});

describe('l’entraînement seul', () => {
  it('compte les questions jouées, et garde la première leçon', () => {
    expect(choisir(deuxRatees(etatInitial()))).toEqual({ cas: 'entrainement', vues: 2, aRevoir: 2, premiere: lecons[0] });
  });
});

describe('l’épreuve toute proche', () => {
  const avecDate = (etat: Etat, date: string) => ({ ...etat, dateExamen: date });

  it('passe devant tout le reste à trois jours ou moins', () => {
    const etat = avecDate(deuxRatees(recale(etatInitial())), '2026-10-05');
    expect(choisir(etat)).toEqual({
      cas: 'echeance',
      jours: 1,
      examen: { bonnes: 29, total: 40, reussi: false, erreurs: 11, depuis: 1 },
      aRevoir: 2,
    });
  });

  it('vaut aussi pour qui n’a encore rien fait, le jour même', () => {
    expect(choisir(avecDate(etatInitial(), JOUR))).toEqual({ cas: 'echeance', jours: 0, examen: null, aRevoir: 0 });
  });

  it('se tait à quatre jours, et une fois la date passée', () => {
    expect(choisir(avecDate(etatInitial(), '2026-10-08'))).toEqual({ cas: 'nouveau' });
    expect(choisir(avecDate(recu(etatInitial()), '2026-10-03'))).toMatchObject({ cas: 'recu' });
  });

  it('ignore une date illisible', () => {
    expect(choisir(avecDate(etatInitial(), 'bientôt'))).toEqual({ cas: 'nouveau' });
  });
});

describe('les jours, comptés à un seul endroit', () => {
  it('jour.ts et la fiche comptent pareil', () => {
    for (const [date, jour] of [['2026-09-20', '2026-09-05'], ['2026-03-29', '2026-03-28'], ['x', JOUR]] as const) {
      expect(joursAvant(date, jour)).toBe(joursAvantProfil(date, jour));
    }
    expect(joursAvant('2026-03-30', '2026-03-28')).toBe(2);
  });
});
