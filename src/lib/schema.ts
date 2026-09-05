// On prend le zod qu'Astro embarque, pas un second installé à côté : c'est la
// même instance que celle des collections de contenu, donc les types collent
// et le schéma reste l'unique source de vérité, partagée avec les tests.
import { z } from 'astro/zod';
import { CODES_THEMES } from './themes';
import { NOTIONS } from './notions';

/**
 * Règles de validation d'une question. Une violation casse le build.
 * Le validateur Python `scripts/valider.py` applique les mêmes règles, il
 * tourne sur les fichiers YAML avant que Astro ne les charge.
 *
 * Sur l'identifiant : le plan de cadrage donne `feux-0012` en exemple tout en
 * exigeant « préfixe égal au thème ». On tient la règle, pas l'exemple, parce
 * qu'elle se vérifie mécaniquement sans table de correspondance. Un
 * identifiant est donc `<code du thème>-<quatre chiffres>`.
 */
export const ID_QUESTION = /^[a-z][a-z0-9-]*-\d{4}$/;

/**
 * L'arrêté ne dit pas combien de cases une question comporte, et l'épreuve ne
 * l'annonce pas non plus. Un énoncé qui le dit supprime le seul jugement que
 * les questions à deux bonnes réponses servent à entraîner : « ai-je fini ? ».
 * Huit énoncés l'avaient annoncé avant que la règle soit posée, dont un relu
 * par une personne, d'où le contrôle mécanique des deux côtés.
 */
export const ANNONCE_COMPTE_REPONSES =
  /\b(deux|trois)\s+(?:\w+\s+)?(r[ée]ponses?|affirmations?|propositions?|cases?)\b/i;

const texteNonVide = (min = 1) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= min, {
      message: `texte vide ou plus court que ${min} caractères`,
    });

export const STATUTS = ['brouillon', 'relu', 'publie', 'retire'] as const;
export type Statut = (typeof STATUTS)[number];

export const schemaProposition = z.object({
  id: z.string().regex(/^[a-e]$/, 'identifiant de proposition attendu entre a et e'),
  texte: texteNonVide(1),
});

export const schemaSource = z.object({
  /** Ce qui est cité, tel qu'on l'affiche : « RIPAM, règle 26 b) ». */
  texte: texteNonVide(3),
  /** Clé du texte dans `data/sources/<ref>/`. */
  ref: z.string().regex(/^[a-z0-9-]+$/, 'référence en minuscules, chiffres et tirets'),
  url: z.string().url().optional(),
  /** Date de la version consultée, pour retrouver les questions touchées par une modification. */
  version: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const CREDIT = /^(genere|code|commons:.+|auteur)$/;

export const schemaVisuel = z.object({
  fichier: z
    .string()
    .regex(/^[a-z0-9][a-z0-9/_-]*\.(svg|png|webp|jpg)$/, 'chemin relatif à public/visuels/'),
  alt: texteNonVide(3),
  credit: z
    .string()
    .regex(CREDIT, 'crédit attendu : genere, code, auteur ou commons:<auteur>'),
});

export const schemaMeta = z.object({
  cree_le: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genere_par: z.enum(['claude', 'humain']),
  relu_par: z.string().min(1).optional(),
  relu_le: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Deuxième relecture, exigée à partir de J3. */
  relu_par_2: z.string().min(1).optional(),
});

export const schemaQuestion = z
  .object({
    id: z.string().regex(ID_QUESTION, 'identifiant attendu : <theme>-<4 chiffres>'),
    option: z.literal('cotier'),
    theme: z.enum(CODES_THEMES as unknown as [string, ...string[]]),
    /** Notion du programme couverte. Facultative tant que la banque n'est pas
     *  entièrement reclassée ; le rapport de couverture compte les manquantes. */
    notion: z.string().optional(),
    statut: z.enum(STATUTS),
    difficulte: z.number().int().min(1).max(3),
    enonce: texteNonVide(10),
    visuel: schemaVisuel.optional(),
    propositions: z.array(schemaProposition).min(3).max(5),
    reponses: z.array(z.string()).min(1).max(2),
    explication: texteNonVide(20),
    sources: z.array(schemaSource).min(1),
    meta: schemaMeta,
  })
  .superRefine((q, ctx) => {
    if (!q.id.startsWith(`${q.theme}-`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['id'],
        message: `l'identifiant doit commencer par « ${q.theme}- »`,
      });
    }

    const ids = q.propositions.map((p) => p.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['propositions'], message: 'identifiants de proposition dupliqués' });
    }

    if (new Set(q.reponses).size !== q.reponses.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reponses'], message: 'réponse dupliquée' });
    }

    for (const r of q.reponses) {
      if (!ids.includes(r)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reponses'], message: `la réponse « ${r} » n'est pas dans les propositions` });
      }
    }

    if (ANNONCE_COMPTE_REPONSES.test(q.enonce)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['enonce'],
        message: "l'énoncé annonce le nombre de bonnes réponses, ce que l'épreuve ne fait jamais",
      });
    }

    if (q.notion !== undefined) {
      const notion = NOTIONS.find((n) => n.code === q.notion);
      if (notion === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['notion'],
          message: `notion inconnue : « ${q.notion} »`,
        });
      } else if (notion.theme !== q.theme) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['notion'],
          message: `la notion « ${q.notion} » relève du thème « ${notion.theme} », pas de « ${q.theme} »`,
        });
      }
    }

    if ((q.statut === 'relu' || q.statut === 'publie') && !q.meta.relu_par) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['meta', 'relu_par'], message: `le statut « ${q.statut} » exige meta.relu_par` });
    }
  });

export type Question = z.infer<typeof schemaQuestion>;
export type Proposition = z.infer<typeof schemaProposition>;
export type Source = z.infer<typeof schemaSource>;
export type Visuel = z.infer<typeof schemaVisuel>;
