import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import type { Question } from './schema';
import type { QuestionJouable } from './quiz';
import { THEMES, themeParCode } from './themes';

/** Une question telle que la page la donne à l'îlot React. */
export interface QuestionAffichable extends QuestionJouable {
  /** Notion du programme couverte, quand la question a été classée. */
  notion?: string;
  enonce: string;
  explication: string;
  difficulte: number;
  propositions: { id: string; texte: string }[];
  sources: { texte: string; ref: string; url?: string }[];
  visuel?: { fichier: string; alt: string; credit: string };
}

export function versionBanque(): string {
  try {
    return readFileSync(new URL('../../data/VERSION', import.meta.url), 'utf-8').trim();
  } catch {
    return '0.0.0';
  }
}

function versAffichable(donnees: Question): QuestionAffichable {
  return {
    id: donnees.id,
    theme: donnees.theme,
    notion: donnees.notion,
    enonce: donnees.enonce,
    explication: donnees.explication,
    difficulte: donnees.difficulte,
    propositions: donnees.propositions.map((p) => ({ id: p.id, texte: p.texte })),
    reponses: donnees.reponses,
    sources: donnees.sources.map((s) => ({ texte: s.texte, ref: s.ref, url: s.url })),
    visuel: donnees.visuel,
  };
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

export function nomDuTheme(code: string): string {
  return themeParCode(code)?.nom ?? code;
}
