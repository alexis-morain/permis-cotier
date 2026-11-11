/**
 * Quand demander la note à l'App Store.
 *
 * La fenêtre d'Apple (« Vous aimez … ? », les étoiles) est un droit qu'on use :
 * trois fois par an au plus, et le système décide seul de l'afficher. Il ne
 * faut donc pas la gaspiller sur quelqu'un qui vient d'ouvrir l'app. Ce module
 * garde deux choses dans `localStorage` : le temps où l'app a été réellement
 * utilisée (page visible), et la dernière fois qu'on a demandé. Il décide, il
 * ne montre rien : le greffon natif `Note` s'en charge, et seulement dans
 * l'app (`proposerLaNote` de `natif.ts`).
 *
 * Aucune donnée ne quitte l'appareil.
 */
import { aujourdhui as jourParis, joursAvant } from './jour';
import { PREFIXE_STOCKAGE, ecrire, lire, stockageParDefaut } from './stockage';
import type { Stockage } from './stockage';

export const CLE_EVALUATION = `${PREFIXE_STOCKAGE}evaluation`;

/** Deux heures d'usage cumulé avant la première demande. */
export const SEUIL_MS = 2 * 3_600_000;

/** Pas de nouvelle demande avant ce délai, sauf version majeure nouvelle. */
export const DELAI_JOURS = 120;

/**
 * Le plus qu'un seul intervalle peut ajouter. Une app suspendue ou un horloge
 * qui saute ne sont pas des minutes d'usage : au-delà, on ne croit pas la
 * durée.
 */
export const PLAFOND_MS = 60_000;

export interface EtatEvaluation {
  /** Temps d'usage cumulé, en millisecondes. */
  actifMs: number;
  /** L'instant (ms) jusqu'où l'usage est déjà compté : voir `ajouterUsage`. */
  jusqua: number;
  demande: { jour: string; majeure: number } | null;
}

const VIDE: EtatEvaluation = { actifMs: 0, jusqua: 0, demande: null };

const positif = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export function lireEtat(stockage: Stockage | null = stockageParDefaut()): EtatEvaluation {
  const brut = lire(CLE_EVALUATION, stockage);
  if (!brut) return { ...VIDE };
  try {
    const donnees = JSON.parse(brut) as Partial<Record<keyof EtatEvaluation, unknown>> | null;
    const d = donnees?.demande as { jour?: unknown; majeure?: unknown } | null | undefined;
    return {
      actifMs: positif(donnees?.actifMs) ? donnees.actifMs : 0,
      jusqua: positif(donnees?.jusqua) ? donnees.jusqua : 0,
      demande:
        d && typeof d.jour === 'string' && positif(d.majeure) ? { jour: d.jour, majeure: d.majeure } : null,
    };
  } catch {
    return { ...VIDE };
  }
}

function ranger(etat: EtatEvaluation, stockage: Stockage | null): void {
  ecrire(CLE_EVALUATION, JSON.stringify(etat), stockage);
}

/**
 * Compte l'intervalle `[debut, fin]` (ms) comme du temps d'usage.
 *
 * Chaque onglet de la coquille est sa propre webview, et toutes partagent ce
 * `localStorage` : ce qu'une a compté, une autre ne le recompte pas. D'où
 * `jusqua`, l'instant jusqu'où le temps est déjà inscrit : on n'ajoute que la
 * part de l'intervalle qui le dépasse.
 */
export function ajouterUsage(
  debut: number,
  fin: number,
  stockage: Stockage | null = stockageParDefaut(),
): void {
  if (!Number.isFinite(debut) || !Number.isFinite(fin)) return;
  const etat = lireEtat(stockage);
  const neuf = fin - Math.max(debut, etat.jusqua);
  if (neuf <= 0) return;
  etat.actifMs += Math.min(neuf, PLAFOND_MS);
  etat.jusqua = fin;
  ranger(etat, stockage);
}

/** Le moment est-il venu de demander ? `majeure` : numéro majeur de l'app. */
export function noteDue(etat: EtatEvaluation, aujourdhui: string, majeure: number): boolean {
  if (etat.actifMs < SEUIL_MS) return false;
  if (!etat.demande) return true;
  if (majeure > etat.demande.majeure) return true;
  // Une date rangée illisible vaut « ne pas redemander » : mieux vaut se taire.
  const ecoules = joursAvant(aujourdhui, etat.demande.jour);
  return ecoules !== null && ecoules >= DELAI_JOURS;
}

/** On a demandé aujourd'hui : que la fenêtre se soit affichée ou non, le délai court. */
export function marquerDemandee(
  jour: string = jourParis(),
  majeure = 0,
  stockage: Stockage | null = stockageParDefaut(),
): void {
  const etat = lireEtat(stockage);
  etat.demande = { jour, majeure };
  ranger(etat, stockage);
}

/** Ce que le suivi lit d'un document : de quoi savoir s'il est visible, et l'écouter. */
export interface Visibilite {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', ecouteur: () => void): void;
  removeEventListener(type: 'visibilitychange', ecouteur: () => void): void;
}

/**
 * Suit l'usage de la page : toutes les `pas` ms tant qu'elle est visible, et à
 * chaque passage visible ↔ caché. Rend de quoi arrêter le suivi.
 */
export function suivreLUsage(
  doc: Visibilite = document,
  stockage: Stockage | null = stockageParDefaut(),
  pas = 15_000,
): () => void {
  let depuis: number | null = doc.visibilityState === 'visible' ? Date.now() : null;

  const pointer = () => {
    if (depuis === null) return;
    const maintenant = Date.now();
    ajouterUsage(depuis, maintenant, stockage);
    depuis = maintenant;
  };
  const changer = () => {
    pointer();
    depuis = doc.visibilityState === 'visible' ? Date.now() : null;
  };

  const minuteur = setInterval(pointer, pas);
  doc.addEventListener('visibilitychange', changer);
  return () => {
    clearInterval(minuteur);
    doc.removeEventListener('visibilitychange', changer);
  };
}
