import type { RefObject } from 'react';
import type { QuestionAffichable } from '../../lib/banque';
import type { Action, Mode, Session } from '../../lib/session';
import { POUR_APP } from '../../lib/cible';
import { LienLecon, Signaler, Sources } from './Morceaux';

interface Props {
  mode: Mode;
  session: Session;
  question: QuestionAffichable;
  /** Où ramène la leçon ouverte depuis un verdict raté. */
  retourLecon: string;
  arretDemande: boolean;
  demanderArret: (oui: boolean) => void;
  envoyer: (action: Action) => void;
  verdict: RefObject<HTMLDivElement | null>;
  continuer: RefObject<HTMLButtonElement | null>;
}

/**
 * Le verdict, puis la barre d'action, ou la confirmation d'arrêt. Dans l'app
 * ils forment un seul bloc collé au bas de l'écran : le panneau de correction
 * monte au-dessus du bouton « Continuer », sur le même fond.
 */
export default function PanneauVerdict(props: Props) {
  const { mode, session, question, retourLecon, arretDemande, verdict } = props;
  // Dans l'app, le verdict est un mot qui monte avec le panneau ; sur le
  // site, une phrase au-dessus de l'explication.
  const app = POUR_APP;
  const mots = app
    ? { juste: 'Juste', faux: 'Faux', suivante: 'Continuer' }
    : { juste: 'Bonne réponse', faux: 'Raté', suivante: 'Question suivante' };
  return (
    <>
      {session.corrigee && (
        <div
          className={`verdict verdict--${session.juste ? 'juste' : 'fausse'}`}
          ref={verdict}
          role="status"
        >
          <p className="verdict__titre">{session.juste ? mots.juste : mots.faux}</p>
          <p>{question.explication}</p>
          <Sources sources={question.sources} />
          {!session.juste && <LienLecon question={question} retour={retourLecon} />}
          {app && <Signaler id={question.id} />}
        </div>
      )}

      {arretDemande ? <ConfirmationArret {...props} /> : <BarreAction {...props} app={app} suivante={mots.suivante} />}
    </>
  );
}

/**
 * Le chrono ne s'arrête pas pendant qu'on hésite, sinon la confirmation
 * deviendrait un bouton pause. Mais elle survit au passage de la question :
 * la refermer sous le pouce du candidat annulait son geste, et elle se relit
 * à chaque rendu, donc le nombre de questions restantes suit.
 */
function ConfirmationArret({ session, demanderArret, envoyer, continuer }: Props) {
  const restantes = session.questions.length - session.index;
  return (
    <div className="arret" role="group" aria-label="Arrêter l’examen">
      <p className="arret__question">Arrêter l’examen maintenant ?</p>
      <p className="discret">
        {session.index === 0
          ? 'Aucune question n’a encore été validée : tu n’auras pas de résultat.'
          : `Il te reste ${restantes} question${restantes > 1 ? 's' : ''}. Ton résultat portera ${
              session.index === 1
                ? 'sur la seule que tu as jouée'
                : `sur les ${session.index} que tu as jouées`
            }, pas sur ${session.questions.length}.`}
      </p>
      <div className="jeu__actions">
        <button
          className="bouton bouton--principal"
          type="button"
          ref={continuer}
          onClick={() => demanderArret(false)}
        >
          Continuer l’examen
        </button>
        <button className="bouton" type="button" onClick={() => envoyer({ type: 'terminer' })}>
          Arrêter et voir le résultat
        </button>
      </div>
    </div>
  );
}

function BarreAction({ mode, session, question, demanderArret, envoyer, suivante, app }: Props & { suivante: string; app: boolean }) {
  const selection = session.selections[session.index] ?? [];
  return (
    <div
      className={`jeu__actions jeu__actions--collant${
        session.corrigee ? (session.juste ? ' jeu__actions--juste' : ' jeu__actions--fausse') : ''
      }`}
    >
      {session.corrigee ? (
        <button
          className="bouton bouton--principal"
          type="button"
          onClick={() => envoyer({ type: 'suivante', maintenant: Date.now() })}
        >
          {suivante}
        </button>
      ) : (
        <button
          className="bouton bouton--principal"
          type="button"
          disabled={mode === 'entrainement' && selection.length === 0}
          onClick={() => envoyer({ type: 'valider', maintenant: Date.now() })}
        >
          {/* En examen, rien de coché : le bouton dit ce qu'il fait, il saute
              la question, comptée sans réponse comme au buzzer. */}
          {mode === 'examen' ? (selection.length === 0 ? 'Passer' : 'Valider et passer') : 'Valider'}
        </button>
      )}
      {!app &&
        (mode === 'examen' ? (
          <button className="bouton bouton--discret" type="button" onClick={() => demanderArret(true)}>
            Arrêter
          </button>
        ) : (
          <Signaler id={question.id} />
        ))}
    </div>
  );
}
