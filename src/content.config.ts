import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { schemaQuestion } from './lib/schema';

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

export const collections = { questions };
