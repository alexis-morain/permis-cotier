import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { schemaQuestion } from './lib/schema';
import { schemaLecon } from './lib/cours';

/**
 * La banque vient de fichiers YAML, un par question. Les brouillons de
 * `_inbox/` ne sont pas chargés : ils n'ont pas encore été relus.
 *
 * Le schéma est celui de `src/lib/schema.ts`, partagé avec les tests. Le
 * validateur Python applique les mêmes règles avant le build, il attrape en
 * plus ce qui dépend du disque, les doublons d'identifiants et les visuels
 * manquants.
 */
const questions = defineCollection({
  loader: glob({ pattern: ['**/*.yaml', '!_inbox/**'], base: './data/questions' }),
  schema: schemaQuestion,
});

/**
 * Les leçons du cours, un fichier YAML par notion dans `data/cours/`. Le nom
 * du fichier est le code de la notion ; `src/lib/lecons.ts` vérifie qu'il
 * correspond au champ `notion`, ce qu'un schéma seul ne peut pas voir.
 */
const lecons = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './data/cours' }),
  schema: schemaLecon,
});

export const collections = { questions, lecons };
