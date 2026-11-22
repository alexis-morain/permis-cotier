/**
 * Les vitaux réels (CLS, LCP, INP), envoyés à Umami comme trois événements.
 *
 * Le laboratoire (Lighthouse) dit ce que fait un téléphone émulé ; seuls les
 * téléphones des candidats disent ce que fait le site. Même règle que le reste
 * de la mesure : pas de cookie, pas d'identifiant, rien qui permette de
 * reconnaître quelqu'un. Un événement porte trois données (la valeur, sa note,
 * l'écran) et une URL réduite à son chemin : ni requête (`?utm_source=…`), ni
 * ancre. Ce module et la bibliothèque `web-vitals` ne se chargent qu'une fois
 * la page finie de charger : ni le premier affichage ni le jeu ne les attendent.
 */

import { onCLS, onINP, onLCP } from 'web-vitals';

/** Les trois mesures suivies. */
export type NomVital = 'CLS' | 'LCP' | 'INP';

export interface Vital {
  nom: NomVital;
  /** Millisecondes pour LCP et INP, sans unité pour CLS. */
  valeur: number;
}

/**
 * La part des visites qui mesurent. Un tirage par visite, pas par mesure : une
 * visite retenue envoie ses trois vitaux, sinon on comparerait des visites
 * différentes d'une mesure à l'autre.
 *
 * 1, c'est-à-dire pas d'échantillonnage : le site compte une dizaine de
 * sessions par jour (518 visiteurs sur 30 jours au 15 novembre), soit au plus
 * quelques milliers d'événements par mois (trois par page vue). À 10 % il en resterait quelques centaines, répartis
 * sur quatre écrans de jeu et trois mesures : rien de lisible, et l'INP, qui
 * n'existe que pour qui a touché l'écran, n'aurait presque aucune ligne. Le
 * coût de tout garder est nul, Umami est sur Gaston. À revoir si le site passe
 * au-delà d'environ 1 000 visites par jour : descendre à 0,25.
 */
export const TAUX_ECHANTILLON = 1;

/** Cette visite mesure-t-elle ? `tirage` : un nombre de [0, 1[, injectable pour les tests. */
export function retenu(taux: number = TAUX_ECHANTILLON, tirage: number = Math.random()): boolean {
  return tirage < taux;
}

/** Les seuils « bon » puis « mauvais » de Google (web.dev/articles/vitals). */
const SEUILS: Record<NomVital, [number, number]> = {
  CLS: [0.1, 0.25],
  LCP: [2500, 4000],
  INP: [200, 500],
};

export type Note = 'bon' | 'a-ameliorer' | 'mauvais';

export function noteDe(nom: NomVital, valeur: number): Note {
  const [bon, mauvais] = SEUILS[nom];
  if (valeur <= bon) return 'bon';
  return valeur <= mauvais ? 'a-ameliorer' : 'mauvais';
}

/** Le chemin d'une adresse, sans requête ni ancre. Illisible : la racine. */
export function cheminSansRequete(href: string): string {
  try {
    return new URL(href).pathname;
  } catch {
    return '/';
  }
}

export interface EvenementVital {
  url: string;
  name: string;
  data: { valeur: number; note: Note; ecran: string };
}

/** Ce qui part chez Umami : le nom, trois données, l'URL réduite à son chemin. */
export function evenementVital(vital: Vital, href: string): EvenementVital {
  const ecran = cheminSansRequete(href);
  const valeur = vital.nom === 'CLS' ? Math.round(vital.valeur * 1000) / 1000 : Math.round(vital.valeur);
  return {
    url: ecran,
    name: `vital-${vital.nom.toLowerCase()}`,
    data: { valeur, note: noteDe(vital.nom, vital.valeur), ecran },
  };
}

interface Traceur {
  track: (charge: (propre: Record<string, unknown>) => Record<string, unknown>) => void;
}

/**
 * Un vital, si le traceur est là. La forme « fonction » de `track` rend la
 * charge par défaut du traceur (site, étiquette web ou app, langue, titre) :
 * on n'y remplace que le nom, les données, et l'URL, que le traceur remplirait
 * sinon avec la requête. Jamais d'erreur, comme `evenement`.
 */
export function envoyerVital(vital: Vital): void {
  try {
    const e = evenementVital(vital, window.location.href);
    (window as unknown as { umami?: Traceur }).umami?.track((propre) => ({ ...propre, url: e.url, name: e.name, data: e.data }));
  } catch {
    /* Un traceur absent, bloqué ou cassé ne regarde pas l'appelant. */
  }
}

/**
 * Branche la mesure. Le module entier se charge après le chargement de la page
 * (`Mesure.astro`), puis ceci attend un temps mort : le premier affichage et le
 * premier geste n'attendent pas ces quelques Ko. Les vitaux se rapportent à la
 * fermeture ou au passage en arrière-plan de l'onglet ; l'envoi du traceur est
 * en `keepalive` et survit au départ.
 */
export function suivreVitals(): void {
  try {
    if (!retenu()) return;
    const demarrer = () => {
      const rapporter = (nom: NomVital) => (m: { value: number }) => envoyerVital({ nom, valeur: m.value });
      onCLS(rapporter('CLS'));
      onLCP(rapporter('LCP'));
      onINP(rapporter('INP'));
    };
    const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void };
    if (w.requestIdleCallback) w.requestIdleCallback(demarrer, { timeout: 5000 });
    else setTimeout(demarrer, 2000);
  } catch {
    /* La mesure ne casse jamais la page. */
  }
}
