/** « 1 vue », « 2 vues » : zéro et un au singulier, comme on le dit. */
export function accorde(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? 's' : ''}`;
}
