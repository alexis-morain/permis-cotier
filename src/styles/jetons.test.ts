/**
 * Chaque `var(--nom)` du code désigne un jeton qui existe. La page calme a
 * retiré les jetons de la signalétique de mer (`--marine`, `--bande`,
 * `--large`, `--bord`…) : un composant qui en lirait encore un perdrait sa
 * couleur sans bruit, le navigateur retombant sur la valeur initiale.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../', import.meta.url).pathname;

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(css|astro|tsx?)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

const sources = fichiers(SRC).map((chemin) => ({ chemin: chemin.slice(SRC.length), texte: readFileSync(chemin, 'utf-8') }));

/** Ce qui pose un jeton : une déclaration CSS, ou une clé de style en script. */
const definis = new Set(
  sources.flatMap(({ texte }) => [
    ...[...texte.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
    ...[...texte.matchAll(/['"`](--[\w-]+)['"`]/g)].map((m) => m[1]),
    ...[...texte.matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)].map((m) => m[1]),
  ]),
);

describe('les jetons employés', () => {
  it('sont tous définis quelque part', () => {
    const orphelins = sources.flatMap(({ chemin, texte }) =>
      [...texte.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)]
        // Un repli explicite (`var(--x, 0)`) est une lecture voulue d'un
        // jeton peut-être absent.
        .filter((m) => m[2] === ')' && !definis.has(m[1]))
        .map((m) => `${chemin} : ${m[1]}`),
    );
    expect([...new Set(orphelins)]).toEqual([]);
  });
});
