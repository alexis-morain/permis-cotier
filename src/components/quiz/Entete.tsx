import type { Mode, Session } from '../../lib/session';
import { SECONDES_PAR_QUESTION } from '../../lib/quiz';
import { useChrono } from './Chrono';

interface Props {
  session: Session;
  /** Ce que le chrono appelle quand l'échéance est passée. */
  echoir: () => void;
}

/** Le chrono en dessous de cinq secondes passe au rouge, sur les deux cibles. */
const urgent = (restant: number | null) => restant !== null && restant <= 5;

/**
 * La barre du haut de l'app : la croix à gauche, « 2 / 10 » au centre, le
 * chrono à droite en examen, et dessous une jauge fine pleine largeur. La
 * croix arrête l'examen (avec la confirmation) ou ramène au choix du thème.
 * Le compteur est muet pour VoiceOver, qui entend déjà « Question 12 sur 40 »
 * en tête de l'énoncé. Pas de jauge de chrono : le nombre dit tout, et passe
 * au rouge sur les cinq dernières secondes.
 */
export function EnteteApp({ session, mode, demanderArret, echoir }: Props & { mode: Mode; demanderArret: (oui: boolean) => void }) {
  const restant = useChrono(session.echeance, echoir);
  const presse = urgent(restant);
  return (
    <div className="jeu__entete">
      {mode === 'examen' ? (
        <button className="jeu__croix" type="button" aria-label="Arrêter" onClick={() => demanderArret(true)}>
          <span aria-hidden="true">✕</span>
        </button>
      ) : (
        <a className="jeu__croix" href="/entrainement" aria-label="Quitter">
          <span aria-hidden="true">✕</span>
        </a>
      )}
      <span className="jeu__compteur" aria-hidden="true">
        {session.index + 1} / {session.questions.length}
      </span>
      {restant !== null ? (
        <span className={`jeu__chrono display${presse ? ' jeu__chrono--urgent' : ''}`} aria-live="off">
          {restant}<span className="discret"> s</span>
          <span className="visuellement-cache">secondes restantes</span>
        </span>
      ) : (
        <span />
      )}
      <div className="jeu__avancement" aria-hidden="true">
        <span style={{ transform: `scaleX(${session.index / session.questions.length})` }} />
      </div>
    </div>
  );
}

/** Le compteur écrit, le chrono, puis les deux jauges sous l'en-tête. */
export function EnteteSite({ session, echoir }: Props) {
  const restant = useChrono(session.echeance, echoir);
  const presse = urgent(restant);
  return (
    <>
      <div className="jeu__entete">
        <span className="jeu__compteur">
          Question {session.index + 1} <span className="discret">sur {session.questions.length}</span>
        </span>
        {restant !== null ? (
          <span className={`jeu__chrono${presse ? ' jeu__chrono--urgent' : ''}`} aria-live="off">
            {restant}<span className="discret"> s</span>
            <span className="visuellement-cache">secondes restantes</span>
          </span>
        ) : (
          <a className="signaler" href="/entrainement">Changer de thème</a>
        )}
      </div>

      {restant !== null && (
        <div className="jeu__jauges" aria-hidden="true">
          <div className={`jeu__barre${presse ? ' jeu__barre--urgent' : ''}`}>
            <span style={{ transform: `scaleX(${restant / SECONDES_PAR_QUESTION})` }} />
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
