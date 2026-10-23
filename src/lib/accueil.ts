/**
 * L'écran d'accueil de l'app, lu dans la progression : quatre états, un par
 * bloc. Tout se calcule ici, sans React, pour que chaque cas se teste sur un
 * `Etat` écrit à la main et un jour posé, sans horloge ni stockage.
 *
 * Les règles ne sont pas refaites : les questions dues sont celles de
 * `statistiques` (le même filtre que `/revoir`), les jours avant l'examen ceux
 * de `joursAvant`, la série celle de `serieDeJours`. Ce module ne fait que les
 * ranger dans la forme de l'écran.
 */
import { statistiques, type Etat } from './progression';
import { joursAvant, serieDeJours } from './profil';
import { enDate } from './jour';
import { estDue, TAILLE_SERIE_PAR_DEFAUT } from './quiz';

/** Une leçon telle que la page la passe : dans l'ordre du parcours. */
export interface LeconAccueil {
  code: string;
  nom: string;
  chemin: string;
  /** Le titre du cours qui la contient, « Lire le balisage ». */
  chapitre: string;
}

export type Reprise =
  | { etat: 'termine'; faites: number; total: number }
  | {
      etat: 'vide' | 'enCours';
      faites: number;
      total: number;
      prochaine: LeconAccueil;
      /** Rang de la leçon dans son chapitre, à partir de 1, et taille du chapitre. */
      rang: number;
      dansChapitre: number;
    };

/**
 * Où reprendre le cours : la première leçon non faite, comme `ReprendreCours`.
 * Tout fait, le cours est terminé : on ne renvoie pas au début, l'écran le dit.
 */
export function reprise(lecons: readonly LeconAccueil[], etat: Etat): Reprise {
  const total = lecons.length;
  const faites = lecons.filter((l) => etat.lecons[l.code] !== undefined).length;
  const prochaine = lecons.find((l) => etat.lecons[l.code] === undefined);
  if (!prochaine) return { etat: 'termine', faites, total };
  const chapitre = lecons.filter((l) => l.chapitre === prochaine.chapitre);
  return {
    etat: faites === 0 ? 'vide' : 'enCours',
    faites,
    total,
    prochaine,
    rang: chapitre.indexOf(prochaine) + 1,
    dansChapitre: chapitre.length,
  };
}

export type ARevoir = { etat: 'jamais' } | { etat: 'rien' } | { etat: 'du'; nombre: number };

/**
 * Les questions dues que `/revoir` joue aujourd'hui, bornées aux questions
 * publiées. « Jamais » tant qu'aucune question n'a été jouée : dire « rien à
 * revoir » à qui n'a encore rien fait serait vrai et inutile.
 *
 * Le nombre est celui que la série joue, pas tout le stock dû : `serieDuJour`
 * s'arrête au rythme choisi (vingt sans rythme). Vingt-cinq dues pour une
 * série de dix, l'accueil disait vingt-cinq et la série en jouait dix.
 */
export function aRevoir(etat: Etat, ids: readonly string[], jour: string): ARevoir {
  const s = statistiques(etat, ids, jour);
  if (s.vues === 0) return { etat: 'jamais' };
  const nombre = Math.min(s.aRevoir, etat.profil.rythme ?? TAILLE_SERIE_PAR_DEFAUT);
  return nombre > 0 ? { etat: 'du', nombre } : { etat: 'rien' };
}

export interface DernierExamen {
  bonnes: number;
  total: number;
  reussi: boolean;
  /** Jours écoulés depuis, zéro le jour même. */
  depuis: number;
}

/** Le dernier examen blanc terminé, ou `null` s'il n'y en a pas. */
export function dernierExamen(etat: Etat, jour: string): DernierExamen | null {
  const e = etat.examens[0];
  if (!e) return null;
  const avant = joursAvant(e.date, jour);
  return { bonnes: e.bonnes, total: e.total, reussi: e.reussi, depuis: avant === null ? 0 : Math.max(0, -avant) };
}

/** « aujourd’hui », « hier », « il y a 3 jours ». */
export function depuisLe(jours: number): string {
  if (jours <= 0) return 'aujourd’hui';
  if (jours === 1) return 'hier';
  return `il y a ${jours} jours`;
}

export type Echeance =
  | { etat: 'sansDate' }
  | { etat: 'avenir'; jours: number }
  | { etat: 'aujourdhui' }
  | { etat: 'passe'; jours: number };

/** Le compte à rebours vers la date posée sur la fiche. */
export function echeance(etat: Etat, jour: string): Echeance {
  return echeanceDe(etat.dateExamen, jour);
}

/**
 * Le même compte, pour une date qui n'est pas encore rangée : celle qu'on
 * tape dans le champ de l'accueil du site.
 */
export function echeanceDe(date: string | null, jour: string): Echeance {
  const jours = date ? joursAvant(date, jour) : null;
  if (jours === null) return { etat: 'sansDate' };
  if (jours > 0) return { etat: 'avenir', jours };
  if (jours === 0) return { etat: 'aujourdhui' };
  return { etat: 'passe', jours: -jours };
}

/**
 * La phrase sous la date, sur l'accueil du site, ou `null` sans date.
 * `restantes` : les questions publiées jamais rencontrées.
 */
export function phraseDeLEcheance(e: Echeance, restantes: number): string | null {
  if (e.etat === 'sansDate') return null;
  if (e.etat === 'avenir' && e.jours > 1) {
    return restantes > 0
      ? `Dans ${e.jours} jours. Environ ${Math.max(1, Math.ceil(restantes / e.jours))} questions par jour pour voir les ${restantes} qui restent.`
      : `Dans ${e.jours} jours. Tu as tout vu une fois : place aux examens blancs.`;
  }
  if (e.etat === 'avenir') return 'Demain. Fais deux examens blancs ce soir.';
  if (e.etat === 'aujourdhui') return 'Aujourd’hui. Bon vent.';
  return 'C’est passé. Efface la date au-dessus, ou pose la prochaine.';
}

/** Les jours de suite avec au moins une réponse, pour la ligne sous le compte à rebours. */
export function joursDeSuite(etat: Etat, jour: string): number {
  return serieDeJours(etat, jour).jours;
}

/**
 * Combien de questions `/profil/erreurs` range : celles qui sont dues, et
 * celles ratées au moins une fois. Le même tri que `rangerErreurs`, borné aux
 * questions publiées. Zéro, l'entrée « Tes erreurs » de l'entraînement se tait.
 */
export function nombreDErreurs(etat: Etat, ids: readonly string[], jour: string): number {
  return ids.filter((id) => {
    const e = etat.questions[id];
    return e !== undefined && (estDue(e, jour) || e.ratees > 0);
  }).length;
}

/** Les jours avant l'épreuve à partir desquels l'examen blanc passe devant le reste. */
export const JOURS_AVANT_EXAMEN_BLANC = 7;

export type ProchaineAction = 'examen' | 'serie' | 'cours';

/**
 * Ce que la grande carte de l'accueil met en avant. Épreuve posée à sept jours
 * ou moins, et pas passée : l'examen blanc, même avec des questions dues, parce
 * qu'à ce stade se mesurer compte plus que réviser. Sinon des questions dues
 * (le compte borné de `aRevoir`) : la série du jour. Sinon le cours.
 */
export function prochaineAction(etat: Etat, ids: readonly string[], jour: string): ProchaineAction {
  const e = echeance(etat, jour);
  if (e.etat === 'aujourdhui' || (e.etat === 'avenir' && e.jours <= JOURS_AVANT_EXAMEN_BLANC)) return 'examen';
  return aRevoir(etat, ids, jour).etat === 'du' ? 'serie' : 'cours';
}

/** « vendredi 23 octobre », pour le haut de l'accueil. */
export function dateDuJour(jour: string): string {
  const d = enDate(jour);
  if (!d) return jour;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}
