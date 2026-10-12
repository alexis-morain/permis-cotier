import type { Session } from '../../lib/session';
import { SECONDES_PAR_QUESTION } from '../../lib/quiz';

interface Props {
  session: Session;
}

/** Le chrono en dessous de cinq secondes passe au rouge, sur les deux cibles. */
const urgent = (s: Session) => s.restant !== null && s.restant <= 5;

/**
 * La ligne d'avancement de l'app : une jauge fine pleine largeur, le chrono
 * en grand, le compteur en petit à droite. Pas de « Question 12 » écrit : le
 * compteur est muet pour VoiceOver, qui entend déjà « Question 12 sur 40 » en
 * tête de l'énoncé, juste dessous.
 */
export function EnteteApp({ session }: Props) {
  const presse = urgent(session);
  return (
    <div className="jeu__entete">
      <div className="jeu__avancement" aria-hidden="true">
        <span style={{ transform: `scaleX(${session.index / session.questions.length})` }} />
      </div>
      {session.restant !== null ? (
        <span className={`jeu__chrono display${presse ? ' jeu__chrono--urgent' : ''}`} aria-live="off">
          {session.restant}<span className="discret"> s</span>
          <span className="visuellement-cache">secondes restantes</span>
        </span>
      ) : (
        <a className="signaler" href="/entrainement">Changer de thème</a>
      )}
      <span className="jeu__compteur" aria-hidden="true">
        {session.index + 1} / {session.questions.length}
      </span>
      {session.restant !== null && (
        <div className={`jeu__barre${presse ? ' jeu__barre--urgent' : ''}`} aria-hidden="true">
          <span style={{ transform: `scaleX(${session.restant / SECONDES_PAR_QUESTION})` }} />
        </div>
      )}
    </div>
  );
}

/** Le compteur écrit, le chrono, puis les deux jauges sous l'en-tête. */
export function EnteteSite({ session }: Props) {
  const presse = urgent(session);
  return (
    <>
      <div className="jeu__entete">
        <span className="jeu__compteur">
          Question {session.index + 1} <span className="discret">sur {session.questions.length}</span>
        </span>
        {session.restant !== null ? (
          <span className={`jeu__chrono${presse ? ' jeu__chrono--urgent' : ''}`} aria-live="off">
            {session.restant}<span className="discret"> s</span>
            <span className="visuellement-cache">secondes restantes</span>
          </span>
        ) : (
          <a className="signaler" href="/entrainement">Changer de thème</a>
        )}
      </div>

      {session.restant !== null && (
        <div className="jeu__jauges" aria-hidden="true">
          <div className={`jeu__barre${presse ? ' jeu__barre--urgent' : ''}`}>
            <span style={{ transform: `scaleX(${session.restant / SECONDES_PAR_QUESTION})` }} />
          </div>
          {/* Avancement dans l'examen, distinct du chrono : treize minutes sans
              aucune correction, il faut au moins savoir où on en est. */}
          <div className="jeu__avancement">
            <span style={{ transform: `scaleX(${session.index / session.questions.length})` }} />
          </div>
        </div>
      )}
    </>
  );
}
