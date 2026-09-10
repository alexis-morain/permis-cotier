import { readdirSync, readFileSync, statSync } from 'node:fs';
import type { Loader } from 'astro/loaders';
import { lireFiche, type Fiche } from './fiches';

/**
 * Ce qui, dans les fiches, dépend du disque : les trouver dans
 * `data/sources`, et les donner à Astro pour qu'il en rende le markdown.
 *
 * Le dossier n'est parcouru qu'une fois par build. Rien n'est codé en dur :
 * une fiche ajoutée demain dans `data/sources/fiche-marees/` aura sa page sans
 * qu'une ligne change ici.
 */

const DOSSIER = new URL('../../data/sources/', import.meta.url);

/** Tous les fichiers markdown de `data/sources`, dossier par dossier. */
function fichiers(): { ref: string; contenu: string }[] {
  const trouves: { ref: string; contenu: string }[] = [];
  for (const dossier of readdirSync(DOSSIER).sort()) {
    const chemin = new URL(`${dossier}/`, DOSSIER);
    if (!statSync(chemin).isDirectory()) continue;
    for (const nom of readdirSync(chemin).sort()) {
      if (!nom.endsWith('.md')) continue;
      trouves.push({ ref: dossier, contenu: readFileSync(new URL(nom, chemin), 'utf-8') });
    }
  }
  return trouves;
}

let cache: Map<string, Fiche> | undefined;

/**
 * Les fiches du disque, par référence.
 *
 * Deux fiches sous la même référence casseraient le build plutôt que de se
 * disputer l'adresse `/source/<ref>` : celle qui perdrait disparaîtrait du
 * site sans que rien ne le dise.
 */
export function fichesDuDisque(): ReadonlyMap<string, Fiche> {
  if (cache) return cache;
  const par = new Map<string, Fiche>();
  for (const { ref, contenu } of fichiers()) {
    const fiche = lireFiche(contenu);
    if (!fiche) continue;
    if (fiche.ref !== ref) {
      throw new Error(
        `data/sources/${ref}/ porte la référence « ${fiche.ref} » : le dossier doit s'appeler comme sa référence`,
      );
    }
    if (par.has(fiche.ref)) {
      throw new Error(`deux fiches sous la référence « ${fiche.ref} » : une seule peut tenir /source/${fiche.ref}`);
    }
    par.set(fiche.ref, fiche);
  }
  cache = par;
  return par;
}

export function estRefDeFiche(ref: string): boolean {
  return fichesDuDisque().has(ref);
}

/**
 * La collection des fiches, corps rendu compris.
 *
 * Un chargeur maison plutôt que `glob()` : il faut détecter les fiches parmi
 * trois cents extraits officiels, et surtout rendre le corps sans son titre ni
 * son en-tête — la page les remonte elle-même, en tête, pour dire ce qu'est ce
 * texte avant qu'on le lise.
 */
export function chargeurFiches(): Loader {
  return {
    name: 'fiches-maison',
    async load({ store, renderMarkdown, generateDigest }) {
      store.clear();
      for (const fiche of fichesDuDisque().values()) {
        const { corps, ...entete } = fiche;
        store.set({
          id: fiche.ref,
          data: entete,
          body: corps,
          digest: generateDigest(corps),
          rendered: await renderMarkdown(corps),
        });
      }
    },
  };
}
