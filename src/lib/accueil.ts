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
 * Les questions dues aujourd'hui, bornées aux questions publiées. « Jamais »
 * tant qu'aucune question n'a été jouée : dire « rien à revoir » à qui n'a
 * encore rien fait serait vrai et inutile.
 */
export function aRevoir(etat: Etat, ids: readonly string[], jour: string): ARevoir {
  const s = statistiques(etat, ids, jour);
  if (s.vues === 0) return { etat: 'jamais' };
  return s.aRevoir > 0 ? { etat: 'du', nombre: s.aRevoir } : { etat: 'rien' };
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
  const jours = etat.dateExamen ? joursAvant(etat.dateExamen, jour) : null;
  if (jours === null) return { etat: 'sansDate' };
  if (jours > 0) return { etat: 'avenir', jours };
  if (jours === 0) return { etat: 'aujourdhui' };
  return { etat: 'passe', jours: -jours };
}

/** Les jours de suite avec au moins une réponse, pour la ligne sous le compte à rebours. */
export function joursDeSuite(etat: Etat, jour: string): number {
  return serieDeJours(etat, jour).jours;
}
