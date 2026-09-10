/**
 * Le chemin du retour, entre une question ratée et la leçon qui l'explique.
 *
 * Une question ratée mène à sa leçon, et la leçon doit ramener là d'où on
 * vient — à la série en cours, pas à l'accueil. La série vit dans le
 * navigateur ; l'adresse d'où l'on part, elle, tient dans un paramètre, et
 * c'est ce que ce module écrit puis relit.
 *
 * Le paramètre est lu au retour, donc il vient de l'extérieur : il ne devient
 * un lien que s'il est exactement l'une des adresses de jeu du site. Pas de
 * requête, pas de fragment, pas de domaine. Une adresse inconnue ne rend rien
 * plutôt qu'un bouton qui emmène ailleurs.
 */

/** Les seules adresses vers lesquelles une leçon accepte de renvoyer. */
const ADRESSES_DE_RETOUR = /^\/(?:revoir|profil\/erreurs|entrainement\/(?:notion\/)?[a-z0-9-]+)$/;

export const PARAMETRE_RETOUR = 'retour';

/** Le chemin de retour porté par une requête, ou `null` s'il n'y en a pas de valable. */
export function cheminRetour(recherche: string): string | null {
  let brut: string | null = null;
  try {
    brut = new URLSearchParams(recherche).get(PARAMETRE_RETOUR);
  } catch {
    return null;
  }
  if (!brut) return null;
  return ADRESSES_DE_RETOUR.test(brut) ? brut : null;
}

/** Ce que dit le bouton du retour : le nom de l'écran d'où l'on vient. */
export function libelleRetour(chemin: string): string {
  if (chemin === '/profil/erreurs') return 'Revenir à mes erreurs';
  if (chemin === '/revoir') return 'Revenir à ta série du jour';
  return 'Revenir à ta série';
}

/**
 * L'adresse de la leçon d'une question, retour compris.
 *
 * Le thème de la question est celui de sa notion — le schéma de la banque le
 * vérifie question par question —, donc la leçon se déduit sans embarquer la
 * table des notions dans le navigateur.
 */
export function lienLecon(theme: string, notion: string, retour: string): string {
  const requete = new URLSearchParams({ [PARAMETRE_RETOUR]: retour });
  return `/cours/${theme}/${notion}?${requete}`;
}
