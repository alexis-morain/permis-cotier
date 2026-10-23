import type { Etat } from '../../lib/progression';
import { rappel } from '../../lib/profil';
import { accorde } from './accorde';

/** « 2 questions, 1 examen blanc, ta raison et ta date. », sans ce qui vaut zéro. */
function ceQuiPart(parts: string[]): string {
  if (parts.length === 0) return '';
  const phrase = parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}.`;
}

/** Ce qui part avec l'effacement, compté, sans ce qui vaut zéro. */
export function ceQuiPartira(etat: Etat): string {
  const nbQuestions = Object.keys(etat.questions).length;
  const nbLecons = Object.keys(etat.lecons).length;
  return ceQuiPart([
    ...(nbQuestions > 0 ? [accorde(nbQuestions, 'question')] : []),
    ...(etat.examens.length > 0 ? [`${etat.examens.length} examen${etat.examens.length > 1 ? 's blancs' : ' blanc'}`] : []),
    ...(nbLecons > 0 ? [accorde(nbLecons, 'leçon')] : []),
    ...(rappel(etat.profil) ? ['ta raison'] : []),
    ...(etat.dateExamen ? ['ta date'] : []),
  ]);
}
