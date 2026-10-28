import type { Mode, Session } from '../../lib/session';
import { ERREURS_ADMISES, SECONDES_PAR_QUESTION } from '../../lib/quiz';
import { groupeDuTheme } from '../../lib/groupes';
import { nomDuTheme } from '../../lib/themes-client';
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

/** La consigne de l'épreuve, dite en légende ; plus longue à la toute première question d'une série d'entraînement. */
const CONSIGNE = 'Une ou deux bonnes réponses';
const CONSIGNE_LONGUE = `${CONSIGNE}. La réponse doit être exacte, une bonne case seule ne suffit pas quand il en faut deux.`;

/**
 * L'en-tête du site : le compteur écrit et le chrono, puis la méta de la
 * question (le groupe de son thème, la consigne), puis le trait du chrono.
 * En examen il pose aussi le carnet. Fragment exprès : le carnet doit être un
 * enfant direct de `.jeu` pour que la grille le range à droite et que la
 * feuille de l'app, qui vise `.jeu > …`, retrouve son balisage.
 */
export function EnteteSite({ session, echoir, mode, theme }: Props & { mode: Mode; theme: string }) {
  const restant = useChrono(session.echeance, echoir);
  const presse = urgent(restant);
  const groupe = groupeDuTheme(theme);
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

      <p className="jeu__meta">
        <span className={`etiquette${groupe ? ` etiquette--${groupe.couleur}` : ''}`}>{nomDuTheme(theme)}</span>
        <span>{mode === 'entrainement' && session.index === 0 ? CONSIGNE_LONGUE : CONSIGNE}</span>
      </p>

      {restant !== null && (
        <div className="jeu__jauges" aria-hidden="true">
          <div className={`jeu__barre${presse ? ' jeu__barre--urgent' : ''}`}>
            <span style={{ transform: `scaleX(${restant / SECONDES_PAR_QUESTION})` }} />
          </div>
        </div>
      )}

      {restant !== null && <Carnet session={session} restant={restant} />}
    </>
  );
}

/**
 * Le carnet de l'examen, à droite de la question sur un écran large : où on en
 * est, combien de temps reste, ce qu'il faut pour être reçu. Tout vient de
 * l'état de la session ; la grille ne dit rien que les lignes du dessus ne
 * disent déjà, d'où `aria-hidden`. Rendu toujours, masqué par la feuille sous
 * 60 rem, où le compteur de l'en-tête suffit. Son titre est un paragraphe, pas
 * un `h2` : l'énoncé reste le seul titre de l'écran, celui qui prend le focus.
 */
function Carnet({ session, restant }: { session: Session; restant: number }) {
  const total = session.questions.length;
  return (
    <aside className="encadre carnet" aria-labelledby="carnet-titre">
      <p className="carnet__titre" id="carnet-titre">Ton examen</p>
      <dl className="carnet__proprietes">
        <div>
          <dt>Question</dt>
          <dd>{session.index + 1} sur {total}</dd>
        </div>
        <div>
          <dt>Temps</dt>
          <dd>{restant} s</dd>
        </div>
        <div>
          <dt>Admis si</dt>
          <dd>{ERREURS_ADMISES} erreurs au plus</dd>
        </div>
      </dl>
      <div className="carnet__grille" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i < session.index ? 'fait' : i === session.index ? 'ici' : undefined} />
        ))}
      </div>
      <p className="carnet__pied">Aucune correction avant la fin, comme le jour de l’épreuve.</p>
    </aside>
  );
}
