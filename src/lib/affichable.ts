import type { Question } from './schema';
import type { QuestionJouable } from './quiz';

/**
 * Une question telle que les écrans la reçoivent — et, depuis que la banque
 * sort du HTML, telle qu'elle part dans `dist/banque/<version>.json` puis dans
 * les téléphones. Ce module ne connaît ni `astro:content` ni le disque : c'est
 * ce qui le rend testable, et c'est voulu.
 */
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

/**
 * Les champs du schéma que l'écran n'a pas à recevoir, et pourquoi.
 *
 * `versAffichable` recopie les champs un à un : un champ ajouté au schéma et
 * oublié ici n'atteindrait jamais les pages, et aucun test ne rougirait. Depuis
 * que le même objet part en JSON vers des téléphones qui ne se rechargent pas,
 * l'oubli irait plus loin qu'une page. D'où cette table : `affichable.test.ts`
 * croise les clés de `schemaQuestion` avec celles d'ici, et refuse tout champ
 * qui n'aurait été rangé dans aucune des deux colonnes.
 */
export const CHAMPS_RETENUS: readonly string[] = [
  // Toujours 'cotier' : la banque n'a qu'une option, l'écran n'en fait rien.
  'option',
  // Le tri est fait au build, seules les publiées sortent.
  'statut',
  // Dates de création et de relecture : le pied de page les compte au build,
  // question par question elles ne disent rien au candidat.
  'meta',
];

/** Champ d'une source que l'écran ne reçoit pas : voir `CHAMPS_RETENUS`. */
export const CHAMPS_SOURCE_RETENUS: readonly string[] = [
  // Date de la version consultée : sert à retrouver les questions touchées par
  // une modification du texte, pas à être lue sous une question.
  'version',
];

export function versAffichable(donnees: Question): QuestionAffichable {
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
