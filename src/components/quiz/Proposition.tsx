import { LETTRES_AFFICHEES, lettreAffichee } from '../../lib/melange';

interface Props {
  texte: string;
  /** Rang à l'écran : il donne la lettre et la touche, pas l'identifiant du fichier. */
  rang: number;
  cochee: boolean;
  /** Après correction : juste, fausse (cochée à tort), ou rien. */
  etat: 'juste' | 'fausse' | null;
  corrigee: boolean;
  desactivee: boolean;
  basculer: () => void;
}

/**
 * Une proposition de l'écran de jeu : un bouton à bascule, sa lettre dans un
 * carré, son texte. Avant correction, elle dit si elle est cochée ; après,
 * si elle était juste ou cochée à tort : par la couleur, par le signe qui
 * remplace la lettre (feuille de style), et par un mot pour le lecteur
 * d'écran.
 */
export default function Proposition({ texte, rang, cochee, etat, corrigee, desactivee, basculer }: Props) {
  let classe = cochee ? ' proposition--cochee' : '';
  if (corrigee) classe = etat ? ` proposition--${etat}` : '';
  return (
    <li>
      <button
        type="button"
        className={`proposition${classe}`}
        aria-pressed={cochee}
        aria-keyshortcuts={LETTRES_AFFICHEES[rang]}
        disabled={desactivee}
        onClick={basculer}
      >
        <span className="proposition__lettre" aria-hidden="true">{lettreAffichee(rang)}</span>
        <span className="proposition__texte">{texte}</span>
        {corrigee && etat && (
          <span className="visuellement-cache">{etat === 'juste' ? ', bonne réponse' : ', réponse fausse'}</span>
        )}
      </button>
    </li>
  );
}
