import { groupeDuTheme } from '../../lib/groupes';

/**
 * L'étiquette du groupe d'un thème, là où un thème est nommé dans une liste.
 * Elle redit ce que le nom du thème a déjà dit : le lecteur d'écran la
 * saute, elle n'est là que pour l'œil. Un thème hors table ne porte rien.
 */
export default function EtiquetteGroupe({ theme }: { theme: string }) {
  const groupe = groupeDuTheme(theme);
  if (!groupe) return null;
  return (
    <span className={`etiquette etiquette--${groupe.couleur}`} aria-hidden="true">
      {groupe.nom}
    </span>
  );
}
