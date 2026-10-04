/**
 * La bande d'ouverture de l'accueil, choisie dans la progression.
 *
 * Le nouveau venu garde la bande que le serveur rend. Qui a déjà une trace
 * dans ce navigateur voit à la place la suite logique, avec son dernier état :
 * l'épreuve toute proche, le dernier examen blanc, le cours en cours, ou les
 * questions jouées à l'entraînement. Cette fonction ne fait que choisir ; le
 * rendu est dans `bande-rendu.ts`.
 *
 * Elle tourne avant le premier rendu, dans un script en ligne empaqueté au
 * build (`scripts/bande-avant-rendu.mjs`) : elle n'importe donc que ce que ce
 * script peut porter sans peser, la progression, le jour et `estDue`. Pas la
 * fiche (`profil.ts`), qui tire les notions et le parcours.
 *
 * L'ordre, du plus pressant au plus général :
 *
 * 1. l'épreuve dans trois jours ou moins : rien d'autre ne compte, l'examen
 *    blanc passe devant (c'est ce que dit déjà le compte à rebours) ;
 * 2. le dernier examen blanc, reçu ou recalé, sauf si une leçon a été finie
 *    après lui et que le cours n'est pas fini : alors c'est le cours qui
 *    continue, et l'examen est redit dans la phrase ;
 * 3. le cours commencé, puis le cours fini sans examen ;
 * 4. des questions jouées à l'entraînement, sans leçon ni examen ;
 * 5. rien : le nouveau venu. Le questionnaire rempli seul n'est pas une
 *    trace : il n'y a rien à reprendre.
 */
import type { Etat, ExamenPasse } from './progression';
import { TAILLE_SERIE_PAR_DEFAUT, estDue } from './quiz';
import { joursAvant } from './jour';

/** Une leçon dans l'ordre du parcours, telle que la page la passe. */
export interface LeconBande {
  code: string;
  nom: string;
  chemin: string;
}

export interface ExamenBande {
  bonnes: number;
  total: number;
  erreurs: number;
  /** Jours écoulés depuis, zéro le jour même. */
  depuis: number;
}

export type Bande =
  | { cas: 'nouveau' }
  | { cas: 'echeance'; jours: number; examen: (ExamenBande & { reussi: boolean }) | null; aRevoir: number }
  | { cas: 'recale' | 'recu'; examen: ExamenBande; aRevoir: number; prochaine: LeconBande | null }
  | { cas: 'cours'; faites: number; total: number; prochaine: LeconBande; examen: (ExamenBande & { reussi: boolean }) | null; aRevoir: number }
  | { cas: 'coursFini'; total: number; aRevoir: number }
  | { cas: 'entrainement'; vues: number; aRevoir: number; premiere: LeconBande | null };

/** L'épreuve passe devant tout à ce nombre de jours ou moins. */
export const JOURS_D_ECHEANCE = 3;

function examenBande(e: ExamenPasse, jour: string): ExamenBande & { reussi: boolean } {
  const avant = joursAvant(e.date, jour);
  return {
    bonnes: e.bonnes,
    total: e.total,
    reussi: e.reussi,
    erreurs: e.total - e.bonnes,
    depuis: avant === null ? 0 : Math.max(0, -avant),
  };
}

export function choisirBande(
  etat: Etat,
  lecons: readonly LeconBande[],
  ids: readonly string[],
  jour: string,
): Bande {
  // Ce que `/revoir` jouera : les dues bornées à la banque publiée, et
  // plafonnées au rythme, qui est la taille de série de `serieDuJour`. Le
  // bouton « Revoir 216 questions » promettait une séance qui n'existe pas.
  const publiees = ids.filter((id) => etat.questions[id] !== undefined);
  const dues = publiees.filter((id) => estDue(etat.questions[id], jour)).length;
  const aRevoir = Math.min(dues, etat.profil.rythme ?? TAILLE_SERIE_PAR_DEFAUT);

  const suivies = lecons.filter((l) => etat.lecons[l.code] !== undefined);
  const prochaine = lecons.find((l) => etat.lecons[l.code] === undefined) ?? null;
  const derniere = suivies.reduce((d, l) => (etat.lecons[l.code]!.faiteLe > d ? etat.lecons[l.code]!.faiteLe : d), '');

  const passe = etat.examens.find((x) => x.total > 0) ?? null;
  const examen = passe ? examenBande(passe, jour) : null;

  const jours = etat.dateExamen ? joursAvant(etat.dateExamen, jour) : null;
  if (jours !== null && jours >= 0 && jours <= JOURS_D_ECHEANCE) {
    return { cas: 'echeance', jours, examen, aRevoir };
  }

  if (passe && examen) {
    if (prochaine && derniere > passe.date) {
      return { cas: 'cours', faites: suivies.length, total: lecons.length, prochaine, examen, aRevoir };
    }
    const { reussi: _, ...sansVerdict } = examen;
    return { cas: passe.reussi ? 'recu' : 'recale', examen: sansVerdict, aRevoir, prochaine };
  }

  if (suivies.length > 0) {
    return prochaine
      ? { cas: 'cours', faites: suivies.length, total: lecons.length, prochaine, examen: null, aRevoir }
      : { cas: 'coursFini', total: lecons.length, aRevoir };
  }

  if (publiees.length > 0) return { cas: 'entrainement', vues: publiees.length, aRevoir, premiere: lecons[0] ?? null };

  return { cas: 'nouveau' };
}
