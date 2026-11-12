/**
 * Quand demander la note à l'App Store.
 *
 * La fenêtre d'Apple (« Vous aimez … ? », les étoiles) est un droit qu'on use :
 * trois fois par an au plus, et le système décide seul de l'afficher. On la
 * demande au moment où la personne est la plus contente : un examen blanc
 * réussi, et c'est l'appelant qui choisit ce moment (`effets.ts`). Ce module
 * garde seulement la dernière demande dans `localStorage`, pour ne pas
 * redemander avant 120 jours. Il décide, il ne montre rien : le greffon natif
 * `Note` s'en charge, et seulement dans l'app (`proposerLaNote` de `natif.ts`).
 *
 * Aucune donnée ne quitte l'appareil.
 */
import { aujourdhui as jourParis, joursAvant } from './jour';
import { PREFIXE_STOCKAGE, ecrire, lire, stockageParDefaut } from './stockage';
import type { Stockage } from './stockage';

export const CLE_EVALUATION = `${PREFIXE_STOCKAGE}evaluation`;

/** Pas de nouvelle demande avant ce délai, sauf version majeure nouvelle. */
export const DELAI_JOURS = 120;

export interface EtatEvaluation {
  demande: { jour: string; majeure: number } | null;
}

const positif = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

/**
 * La 1.0.12 rangeait aussi un temps d'usage (`actifMs`, `jusqua`) : on ne le
 * lit plus, et la prochaine écriture l'efface.
 */
export function lireEtat(stockage: Stockage | null = stockageParDefaut()): EtatEvaluation {
  const brut = lire(CLE_EVALUATION, stockage);
  if (!brut) return { demande: null };
  try {
    const donnees = JSON.parse(brut) as { demande?: unknown } | null;
    const d = donnees?.demande as { jour?: unknown; majeure?: unknown } | null | undefined;
    return {
      demande:
        d && typeof d.jour === 'string' && positif(d.majeure) ? { jour: d.jour, majeure: d.majeure } : null,
    };
  } catch {
    return { demande: null };
  }
}

/** Le moment est-il venu de demander ? `majeure` : numéro majeur de l'app. */
export function noteDue(etat: EtatEvaluation, aujourdhui: string, majeure: number): boolean {
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
  ecrire(CLE_EVALUATION, JSON.stringify({ demande: { jour, majeure } }), stockage);
}
