/**
 * La fiche de révision d'un cours : une ou deux pages A4 à télécharger, faites
 * de schémas, de tableaux et de quelques règles.
 *
 * « Fiche » seul désigne déjà les fiches maison de `data/sources/fiche-*`
 * (`fiches.ts`) : d'où le nom `revision` dans le code et `/fiches-revision/`
 * dans l'adresse.
 *
 * Contrairement au mémo (`memo.ts`), qui recopie les lignes « à retenir »
 * sans rien y mettre, la fiche est composée : elle range les leçons en
 * tableaux et en schémas. Elle garde pourtant la même règle, rien ne dit plus
 * que les leçons. Chaque section nomme les notions qu'elle résume, toutes du
 * cours, et les sources affichées sont celles de leurs leçons, tirées au
 * build : aucune fiche n'écrit une source à la main.
 *
 * Une section se fait de blocs, chacun d'un seul type : un schéma dessiné
 * pour la fiche (`public/fiches-revision/schemas/`), une galerie de visuels
 * de la banque (`public/visuels/`), un tableau, des règles, une astuce, un
 * piège. Le disque se vérifie dans `revision-fichiers.test.ts`.
 */
import { z } from 'astro/zod';
import { NOTIONS } from './notions';
import { CODES_THEMES } from './themes';
import type { SourceAffichee } from './sources';

const texte = (min: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= min, { message: `texte vide ou plus court que ${min} caractères` });

const cheminVisuel = z
  .string()
  .regex(/^[a-z0-9][a-z0-9/_-]*\.svg$/, 'chemin d’un SVG, relatif à son dossier');

/** Un visuel de la banque, posé avec ce qu'on voit. L'`alt` décrit, il ne dit pas la règle. */
const schemaVisuel = z.object({ visuel: cheminVisuel, alt: texte(3) }).strict();

const schemaCellule = z.union([texte(1), schemaVisuel]);

const schemaBloc = z.union([
  z.object({ schema: z.object({ fichier: cheminVisuel, alt: texte(3), legende: texte(3).optional() }).strict() }).strict(),
  z
    .object({
      galerie: z
        .array(
          z
            .object({ visuel: cheminVisuel, alt: texte(3), nom: texte(2), lignes: z.array(texte(2)).max(4).optional() })
            .strict(),
        )
        .min(1)
        .max(8),
    })
    .strict(),
  z
    .object({
      tableau: z
        .object({ colonnes: z.array(texte(1)).min(1).max(6), lignes: z.array(z.array(schemaCellule)).min(1).max(14) })
        .strict()
        .superRefine((t, ctx) => {
          t.lignes.forEach((l, i) => {
            if (l.length !== t.colonnes.length) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['lignes', i],
                message: `${l.length} cellules pour ${t.colonnes.length} colonnes`,
              });
            }
          });
        }),
    })
    .strict(),
  z.object({ regles: z.array(texte(5)).min(1).max(8) }).strict(),
  z.object({ astuce: texte(10) }).strict(),
  z.object({ piege: texte(10) }).strict(),
]);

export type BlocRevision = z.infer<typeof schemaBloc>;

const schemaSection = z
  .object({
    titre: texte(3),
    /** Pleine : toute la largeur de la page. Demie : une colonne sur deux, à l'écran large et à l'impression. */
    largeur: z.enum(['pleine', 'demie']).default('pleine'),
    /** Ce que la section résume. Rien ne se dit hors des leçons de ces notions. */
    notions: z.array(z.string()).min(1),
    blocs: z.array(schemaBloc).min(1).max(6),
  })
  .strict();

export type SectionRevision = z.infer<typeof schemaSection>;

export const schemaRevision = z
  .object({
    cours: z.string(),
    /** Une phrase sous le titre : ce que la fiche fait tenir. */
    resume: texte(20),
    sections: z.array(schemaSection).min(1).max(10),
    meta: z
      .object({
        cree_le: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        genere_par: z.enum(['claude', 'humain']),
        relu_par: z.string().min(1).optional(),
        relu_le: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((f, ctx) => {
    if (!CODES_THEMES.includes(f.cours)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cours'], message: `cours inconnu : « ${f.cours} »` });
      return;
    }
    f.sections.forEach((s, i) => {
      s.notions.forEach((code, j) => {
        const notion = NOTIONS.find((n) => n.code === code);
        if (!notion || notion.theme !== f.cours) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['sections', i, 'notions', j],
            message: `« ${code} » n’est pas une notion du cours ${f.cours}`,
          });
        }
      });
    });
  });

export type Revision = z.infer<typeof schemaRevision>;

export function cheminRevision(codeCours: string): string {
  return `/fiches-revision/${codeCours}`;
}

export function cheminPdf(codeCours: string): string {
  return `/fiches-revision/${codeCours}.pdf`;
}

/** Les notions résumées par la fiche, chacune une fois, dans l'ordre des sections. */
export function notionsDeLaFiche(fiche: Revision): string[] {
  return [...new Set(fiche.sections.flatMap((s) => s.notions))];
}

/** Les fichiers dessinés : schémas propres aux fiches, visuels repris de la banque. */
export function visuelsDeLaFiche(fiche: Revision): { schemas: string[]; visuels: string[] } {
  const schemas = new Set<string>();
  const visuels = new Set<string>();
  for (const s of fiche.sections) {
    for (const b of s.blocs) {
      if ('schema' in b) schemas.add(b.schema.fichier);
      if ('galerie' in b) b.galerie.forEach((g) => visuels.add(g.visuel));
      if ('tableau' in b) {
        for (const l of b.tableau.lignes) for (const c of l) if (typeof c !== 'string') visuels.add(c.visuel);
      }
    }
  }
  return { schemas: [...schemas], visuels: [...visuels] };
}

/** Les sources des leçons résumées, chacune une fois, dans l'ordre d'apparition. */
export function sourcesDeLaFiche(parLecon: readonly (readonly SourceAffichee[])[]): SourceAffichee[] {
  const vues = new Map<string, SourceAffichee>();
  for (const sources of parLecon) for (const s of sources) if (!vues.has(s.texte)) vues.set(s.texte, s);
  return [...vues.values()];
}

export interface SourceRegroupee {
  /** Le texte, sans son dernier segment : « Arrêté du 30 novembre 2017, annexe I ». */
  readonly texte: string;
  /** Les articles ou parties cités, dans l'ordre : « 2.1.1 », « 2.2 ». */
  readonly parties: string[];
  readonly provenance: SourceAffichee['provenance'];
}

/**
 * Les sources d'une fiche, un texte par ligne. Une fiche résume plusieurs
 * leçons et cite vite trente articles du même arrêté : sur papier, une ligne
 * par article prend une page. Le dernier segment après la virgule est la
 * partie citée ; ce qui le précède nomme le texte.
 */
export function regrouperSources(sources: readonly SourceAffichee[]): SourceRegroupee[] {
  const parTexte = new Map<string, { texte: string; parties: string[]; provenance: SourceAffichee['provenance'] }>();
  for (const s of sources) {
    const coupure = s.texte.lastIndexOf(', ');
    const texte = coupure > 0 ? s.texte.slice(0, coupure) : s.texte;
    const partie = coupure > 0 ? s.texte.slice(coupure + 2) : undefined;
    const groupe = parTexte.get(texte) ?? { texte, parties: [], provenance: s.provenance };
    if (partie && !groupe.parties.includes(partie)) groupe.parties.push(partie);
    parTexte.set(texte, groupe);
  }
  return [...parTexte.values()];
}
