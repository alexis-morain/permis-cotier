/**
 * Les deux greffons maison de la coquille, inscrits une seule fois.
 *
 * `Son` (`ios/App/App/SonPlugin.swift`) joue les bruitages, `Ecran`
 * (`ios/App/App/EcranPlugin.swift`) cache la barre d'onglets pendant une
 * série. `son.ts` et `natif.ts` les appelaient chacun par son propre
 * `registerPlugin` ; un nom mal tapé d'un côté n'aurait rien dit.
 *
 * `@capacitor/core` n'arrive qu'en `import()` : le site n'en emporte pas une
 * ligne, ce que `scripts/verifier-cible.mjs` vérifie.
 */
import type { Son } from './son';

export interface GreffonSon {
  jouer(options: { nom: Son }): Promise<void>;
  activer(options: { actif: boolean }): Promise<void>;
}

export interface GreffonEcran {
  pleinEcran(options: { actif: boolean }): Promise<void>;
  /** Bascule vers l'onglet dont l'adresse de départ est `chemin` ; `false` si c'est déjà lui. */
  onglet(options: { chemin: string }): Promise<{ bascule: boolean }>;
}

interface Greffons {
  Son: GreffonSon;
  Ecran: GreffonEcran;
}

const inscrits = new Map<keyof Greffons, unknown>();

/**
 * Fait `faire` avec le greffon `nom`.
 *
 * Le greffon ne sort jamais d'une fonction `async` : le mandataire de
 * Capacitor répond à toute propriété, `then` comprise, et une promesse qui le
 * rendrait le prendrait pour une promesse et attendrait une réponse qui ne
 * vient pas. D'où ce rappel plutôt qu'un `await greffon('Son')`.
 */
export async function avecGreffon<N extends keyof Greffons>(
  nom: N,
  faire: (greffon: Greffons[N]) => Promise<void>,
): Promise<void> {
  const { registerPlugin } = await import('@capacitor/core');
  let greffon = inscrits.get(nom) as Greffons[N] | undefined;
  if (!greffon) {
    greffon = registerPlugin<Greffons[N]>(nom);
    inscrits.set(nom, greffon);
  }
  await faire(greffon);
}
