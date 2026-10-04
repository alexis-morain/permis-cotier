/**
 * Le jour, dit à un seul endroit.
 *
 * Ça vit dans son propre module et non dans `progression.ts` : le jour n'est
 * pas une donnée de la progression, c'est une lecture de l'horloge. La fiche,
 * le compte à rebours de l'examen, l'épreuve et les leçons le lisent tous,
 * et aucun d'eux n'a à connaître le stockage du navigateur pour ça.
 *
 * Deux conventions, et elles ne se mélangent pas :
 *
 * - l'horloge se lit à Paris, parce que les candidats y sont. Un jour UTC
 *   fait commencer la journée à 1 h du matin l'hiver, 2 h l'été : deux
 *   révisions à 23 h et à 00 h 30 comptaient pour le même jour, et la série
 *   de jours affichait 1 au lieu de 2 ;
 * - une fois écrite `AAAA-MM-JJ`, une date n'est plus un instant mais une
 *   case de calendrier. On la relit ancrée à minuit UTC, jamais en local :
 *   c'est le seul repère qui ne saute pas au changement d'heure, et il rend
 *   l'arithmétique des jours exacte à la journée près.
 */

/** `fr-CA` écrit les dates `AAAA-MM-JJ` : le format qu'on range, sans découpage. */
const JOUR_A_PARIS = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' });

/** Le jour courant à Paris, `AAAA-MM-JJ`. */
export function aujourdhui(): string {
  return JOUR_A_PARIS.format(new Date());
}

/** Une date rangée, relue comme une case de calendrier. `null` si elle est illisible. */
export function enDate(iso: string): Date | null {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Le jour de la semaine d'une date rangée, 0 pour dimanche. */
export function jourDeLaSemaine(iso: string): number | null {
  return enDate(iso)?.getUTCDay() ?? null;
}

/** « 10 septembre », pour les libellés lus à voix haute. */
export function dateLisible(iso: string): string {
  const d = enDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** Le jour `n` jours après une date rangée. `n` négatif remonte le temps. */
export function jourPlus(iso: string, n: number): string {
  const d = enDate(iso);
  if (!d) return iso;
  d.setUTCDate(d.getUTCDate() + n);
  // Ancrée à minuit UTC, la date ne peut pas glisser d'une case en repassant
  // en texte : c'est pour ça que l'arithmétique reste en UTC.
  return d.toISOString().slice(0, 10);
}

/**
 * Combien de jours de `aujourdhui` à `date`, négatif si elle est passée.
 * `null` si l'une des deux est illisible. Ici et non dans `profil.ts` : la
 * bande d'ouverture de l'accueil en a besoin dans un script qui tourne avant
 * le premier rendu, et qui ne doit pas embarquer la fiche entière.
 */
export function joursAvant(date: string, aujourdhui: string): number | null {
  const cible = enDate(date);
  const ici = enDate(aujourdhui);
  if (!cible || !ici) return null;
  return Math.round((cible.getTime() - ici.getTime()) / 86_400_000);
}
