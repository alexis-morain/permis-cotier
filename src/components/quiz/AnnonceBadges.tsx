import { useEffect } from 'react';
import { ANNONCES_MONTREES, type BadgeAnnonce } from '../../lib/badges-geste';
import { vibrer } from '../../lib/natif';

interface Props {
  badges: readonly BadgeAnnonce[];
  /**
   * Quand le son de leçon renforce l'annonce, dans l'app : après celui du
   * verdict, qui part au même moment et ne doit pas être couvert.
   */
  delaiSon: number;
}

/**
 * Les badges que la série vient de faire gagner, dits une fois, à l'écran
 * qui les a fait gagner. Le texte d'abord : le palier, le thème, le fait.
 *
 * La région `status` est là avant son contenu : les badges arrivent après
 * le résultat (leur module se charge à la demande), et un lecteur d'écran
 * n'annonce que ce qui change dans une région déjà présente. Vide, elle ne
 * se voit pas. La fin de leçon, sans React, rend le même bloc
 * (`annoncerBadges` de `lecon-site.ts`).
 */
export default function AnnonceBadges({ badges, delaiSon }: Props) {
  const gagne = badges.length > 0;

  useEffect(() => {
    if (!gagne) return;
    const minuteur = window.setTimeout(() => void vibrer('lecon'), delaiSon);
    return () => window.clearTimeout(minuteur);
    // Une fois : d'autres badges arrivés ensuite ne refont pas sonner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gagne]);

  return (
    <div className="badges-gagnes" role="status">
      {gagne && (
        <div className="badges-gagnes__corps">
          <p className="badges-gagnes__titre">{badges.length > 1 ? 'Paliers gagnés' : 'Palier gagné'}</p>
          <ul>
            {badges.slice(0, ANNONCES_MONTREES).map((b) => (
              <li key={b.cle}>
                <b>{b.palier}</b> <span className="badges-gagnes__theme">{b.theme}</span>
                <span className="badges-gagnes__fait">{b.fait}</span>
              </li>
            ))}
          </ul>
          {badges.length > ANNONCES_MONTREES && <p className="discret">Les autres sont sur ta fiche.</p>}
        </div>
      )}
    </div>
  );
}
