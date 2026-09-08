import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { versAffichable } from './affichable';
import type { QuestionAffichable } from './affichable';
import { THEMES, themeParCode } from './themes';

// `QuestionAffichable` et `versAffichable` vivent dans `affichable.ts`, qui
// n'importe pas `astro:content` : c'est ce qui permet de les tester. Le nom
// reste importable d'ici, où tout le site allait déjà le chercher.
export type { QuestionAffichable } from './affichable';

export function versionBanque(): string {
  try {
    return readFileSync(new URL('../../data/VERSION', import.meta.url), 'utf-8').trim();
  } catch {
    return '0.0.0';
  }
}

/** Seules les questions publiées entrent dans le site. */
export async function questionsPubliees(): Promise<QuestionAffichable[]> {
  const entrees = await getCollection('questions', ({ data }) => data.statut === 'publie');
  return entrees
    .map((e) => versAffichable(e.data))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function questionsDuTheme(code: string): Promise<QuestionAffichable[]> {
  return (await questionsPubliees()).filter((q) => q.theme === code);
}

export interface ThemeCompte {
  code: string;
  nom: string;
  intitule: string;
  description: string;
  cibleJ1: number;
  publiees: number;
}

/** La table des thèmes, augmentée du compte réel. Les compteurs sont honnêtes. */
export async function themesAvecComptes(): Promise<ThemeCompte[]> {
  const questions = await questionsPubliees();
  return THEMES.map((t) => ({
    code: t.code,
    nom: t.nom,
    intitule: t.intitule,
    description: t.description,
    cibleJ1: t.cibleJ1,
    publiees: questions.filter((q) => q.theme === t.code).length,
  }));
}

/**
 * Les relecteurs qui ne sont pas des personnes. Une question relue par le seul
 * modèle qui l'a écrite est publiée, mais elle ne vaut pas celle qu'un humain a
 * reprise derrière : le pied de page fait la différence.
 */
const RELECTEURS_MACHINE: ReadonlySet<string> = new Set(['claude']);

export interface CompteRelecture {
  total: number;
  parUnePersonne: number;
}

/**
 * Combien de questions publiées ont été relues par une personne. Le pied de
 * page l'affiche, et le compte se calcule au build : une phrase écrite à la
 * main deviendrait fausse au prochain lot sans que rien ne le signale.
 */
export async function comptesDeRelecture(): Promise<CompteRelecture> {
  const entrees = await getCollection('questions', ({ data }) => data.statut === 'publie');
  const parUnePersonne = entrees.filter(
    (e) => !RELECTEURS_MACHINE.has(e.data.meta.relu_par ?? ''),
  ).length;
  return { total: entrees.length, parUnePersonne };
}

export function nomDuTheme(code: string): string {
  return themeParCode(code)?.nom ?? code;
}
