import { PALIERS_BADGE, badgesLisibles, faitDuBadge, prochainPalier } from '../../lib/badges';
import type { Etat } from '../../lib/progression';
import type { QuestionConnue } from '../../lib/profil';

interface Props {
  etat: Etat;
  banque: readonly QuestionConnue[];
  theme: string;
  /** Questions du thème déjà vues : un thème jamais ouvert ne dit rien. */
  vues: number;
}

/**
 * Les badges d'un thème sur la fiche, sous sa jauge : les paliers gagnés,
 * chacun avec le fait daté qui l'a fait gagner, puis ce qui mène au suivant,
 * dit comme un fait. Jamais de total, jamais de compte à rebours : la fiche
 * lit, elle n'attribue pas (l'attribution se fait au geste).
 */
export default function PaliersDuTheme({ etat, banque, theme, vues }: Props) {
  const dates = badgesLisibles(etat.badges)[theme] ?? {};
  const gagnes = PALIERS_BADGE.filter(({ code }) => dates[code]);
  if (vues === 0 && gagnes.length === 0) return null;
  const prochain = prochainPalier(etat, banque, theme);
  return (
    <div className="paliers">
      {gagnes.length > 0 && (
        <ul>
          {gagnes.map(({ code, nom }) => (
            <li key={code}>
              <b>{nom}</b> {faitDuBadge(theme, code, { date: dates[code]! })}
            </li>
          ))}
        </ul>
      )}
      {prochain && <p className="paliers__prochain discret">{prochain.fait}</p>}
    </div>
  );
}
