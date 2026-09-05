/**
 * Les leçons du cours : ce qu'on lit avant de répondre aux questions.
 *
 * Une notion du programme est une unité de révision ; la leçon est ce qui
 * l'enseigne à quelqu'un qui part de zéro. Elle se lit en trois à cinq
 * minutes sur un téléphone : une accroche qui pose la situation, quelques
 * étapes d'une idée chacune, le piège que l'épreuve fait faire, trois lignes
 * à retenir, puis la vérification sur les questions de la banque.
 *
 * Une leçon est un fichier YAML dans `data/cours/`, une par notion. Comme une
 * question, elle cite les textes dont elle vient : une leçon sans source
 * n'entre pas. Les notions qui n'ont pas encore de fichier ont une « leçon
 * courte », construite depuis le résumé de la notion sans rien y ajouter.
 */
import { z } from 'astro/zod';
import { NOTIONS, type Notion } from './notions';
import type { QuestionAffichable } from './banque';

const texteNonVide = (min = 1) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= min, { message: `texte vide ou plus court que ${min} caractères` });

export const schemaEtape = z
  .object({
    titre: texteNonVide(3),
    /** Paragraphes séparés par une ligne vide. */
    texte: texteNonVide(20),
    /** Chemin relatif à `public/visuels/`. */
    visuel: z
      .string()
      .regex(/^[a-z0-9][a-z0-9/_-]*\.(svg|png|webp|jpg)$/, 'chemin relatif à public/visuels/')
      .optional(),
    /** Ce qu'on voit, jamais la règle : le lecteur d'écran n'a pas droit à la réponse. */
    alt: texteNonVide(3).optional(),
    liste: z.array(texteNonVide(1)).min(2).max(8).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.visuel && !e.alt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['alt'], message: 'un visuel exige un texte alternatif' });
    }
  });

export const schemaSourceLecon = z.object({
  /** Ce qui s'affiche : « RIPAM, règle 13 ». */
  texte: texteNonVide(3),
  /** Dossier de `data/sources/`. */
  ref: z.string().regex(/^[a-z0-9-]+$/, 'référence en minuscules, chiffres et tirets'),
  /** Fichier de ce dossier, sans l'extension : l'URL y est lue. */
  fichier: z.string().regex(/^[a-z0-9-]+$/, 'nom de fichier en minuscules, chiffres et tirets'),
});

export const schemaLecon = z
  .object({
    notion: z.string(),
    /** Minutes de lecture, affichées telles quelles. */
    duree: z.number().int().min(1).max(15),
    /** La situation, au tutoiement, avant toute règle. */
    accroche: texteNonVide(20),
    etapes: z.array(schemaEtape).min(2).max(8),
    /** L'erreur que l'épreuve fait faire. */
    piege: texteNonVide(20).optional(),
    /** Ce qu'on relit la veille : deux à cinq lignes. */
    retenir: z.array(texteNonVide(5)).min(2).max(5),
    sources: z.array(schemaSourceLecon).min(1),
    meta: z.object({
      cree_le: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      genere_par: z.enum(['claude', 'humain']),
      relu_par: z.string().min(1).optional(),
      relu_le: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
  })
  .superRefine((l, ctx) => {
    if (!NOTIONS.some((n) => n.code === l.notion)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['notion'], message: `notion inconnue : « ${l.notion} »` });
    }
  });

export type LeconSource = z.infer<typeof schemaLecon>;

/** Les paragraphes d'un texte YAML : une ligne vide sépare, un retour simple recolle. */
export function paragraphes(texte: string): string[] {
  return texte
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p.length > 0);
}

/** Combien de questions ferment une leçon. Trois : assez pour voir, pas assez pour lasser. */
export const VERIFICATION_MAX = 3;

/**
 * Les questions de la vérification : celles de la notion, les plus faciles
 * d'abord, à identifiant égal dans l'ordre de la banque. Le choix est fait au
 * build, il est le même pour tout le monde : la leçon est un contenu, pas un
 * tirage.
 */
export function choisirVerification(
  questions: readonly QuestionAffichable[],
  codeNotion: string,
  max = VERIFICATION_MAX,
): QuestionAffichable[] {
  return questions
    .filter((q) => q.notion === codeNotion)
    .sort((a, b) => a.difficulte - b.difficulte || a.id.localeCompare(b.id))
    .slice(0, max);
}

/** Une étape telle que l'écran la reçoit : texte déjà découpé. */
export interface EtapeAffichable {
  titre: string;
  paragraphes: string[];
  visuel?: string;
  alt?: string;
  liste?: string[];
}

/** Une leçon telle que la page la donne à l'îlot React. */
export interface LeconAffichable {
  code: string;
  nom: string;
  /** Vrai quand la leçon n'est que le résumé de la notion. */
  courte: boolean;
  duree: number;
  accroche?: string;
  etapes: EtapeAffichable[];
  piege?: string;
  retenir: string[];
  sources: { texte: string; url?: string }[];
  /** Vide quand la notion n'a pas encore de question. */
  questions: QuestionAffichable[];
  /** Qui a relu, pour que la page le dise. Absent : la leçon n'est pas relue. */
  reluPar?: string;
}

/**
 * La leçon courte : le résumé de la notion et rien d'autre. Ni mémo ni piège
 * inventés, la page dit que la leçon rédigée n'est pas encore écrite.
 */
export function leconCourte(notion: Notion): Omit<LeconAffichable, 'questions'> {
  return {
    code: notion.code,
    nom: notion.nom,
    courte: true,
    duree: 1,
    etapes: [{ titre: notion.nom, paragraphes: [notion.resume] }],
    retenir: [],
    sources: [],
  };
}

/** La leçon écrite, mise en forme pour l'écran. Les URL des sources sont résolues par l'appelant. */
export function leconEcrite(
  notion: Notion,
  source: LeconSource,
  sources: { texte: string; url?: string }[],
): Omit<LeconAffichable, 'questions'> {
  return {
    code: notion.code,
    nom: notion.nom,
    courte: false,
    duree: source.duree,
    accroche: source.accroche,
    etapes: source.etapes.map((e) => ({
      titre: e.titre,
      paragraphes: paragraphes(e.texte),
      ...(e.visuel ? { visuel: e.visuel, alt: e.alt } : {}),
      ...(e.liste ? { liste: e.liste } : {}),
    })),
    ...(source.piege ? { piege: source.piege } : {}),
    retenir: source.retenir,
    sources,
    ...(source.meta.relu_par ? { reluPar: source.meta.relu_par } : {}),
  };
}
