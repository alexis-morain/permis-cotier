import { useState } from 'react';
import type React from 'react';
import type { QuestionAffichable } from '../../lib/banque';
import type { Etat } from '../../lib/progression';
import { lenteurs, type Mode, type Session } from '../../lib/session';
import { ERREURS_ADMISES, lienErreursExamen } from '../../lib/quiz';
import { nomDuTheme } from '../../lib/themes-client';
import { groupeDuTheme } from '../../lib/groupes';
import { pointFinal, rappel } from '../../lib/raison';
import { POUR_APP } from '../../lib/cible';
import { partager } from '../../lib/natif';
import RevueDesErreurs from './RevueDesErreurs';
import Recap from './Recap';
import AnnonceBadges from './AnnonceBadges';
import type { BadgeAnnonce } from '../../lib/badges-geste';

interface Props {
  mode: Mode;
  session: Session;
  titre: string;
  /** L'état lu au montage : l'examen d'avant, la raison dite au départ. */
  depart: Etat;
  parId: ReadonlyMap<string, QuestionAffichable>;
  /** Ce que « recommencer » vise. */
  retour: string;
  /** Où ramène la leçon ouverte depuis une question ratée. */
  retourLecon: string;
  /** Les badges que cette série a fait gagner. */
  badges: readonly BadgeAnnonce[];
  /**
   * Présent pour une série courte de l'entraînement : combien de questions
   * donnerait « Encore », et de quoi la relancer sans quitter l'écran.
   */
  serie?: { encore: number; relancer: () => void };
}

type Revue = 'erreurs' | 'toutes' | null;

/**
 * L'écran de résultat : le score, le verdict, le temps, la raison quand ça
 * coince, la note par thème, puis le geste suivant et la revue.
 */
export default function Resultat({ mode, session, titre, depart, parId, retour, retourLecon, badges, serie }: Props) {
  // La revue dépliée : les seules ratées, ou toutes les questions.
  const [revue, setRevue] = useState<Revue>(null);
  const basculerRevue = (quoi: 'erreurs' | 'toutes') => setRevue((v) => (v === quoi ? null : quoi));

  const r = session.resultat;
  if (!r) return null;
  const erreurs = new Set(r.ratees).size;
  // Le coup de mou : un examen recalé, ou un entraînement sous la moitié.
  // C'est là qu'on rappelle la raison dite au départ, pas ailleurs.
  const coupDeMou = r.total > 0 && (mode === 'examen'
    ? !session.interrompu && !r.reussi
    : r.bonnes * 2 < r.total);
  const raison = coupDeMou ? rappel(depart.profil) : null;
  // Un examen mené au bout et recalé : l'app envoie sur les erreurs.
  const recale = mode === 'examen' && !session.interrompu && r.total > 0 && !r.reussi;
  const actions = { mode, session, retour, revue, basculerRevue, ratees: erreurs, recale: recale && erreurs > 0 };

  return (
    <div className="jeu">
      <h1 className="visuellement-cache">{titre}, résultat</h1>
      <Score mode={mode} session={session} titre={titre} depart={depart} enSerie={serie !== undefined} />
      {/* Le son de leçon attend la fin de celui du verdict : la cloche d'un
          examen dure 1,15 s, l'arpège de fin de série 0,5 s. */}
      <AnnonceBadges badges={badges} delaiSon={mode === 'examen' ? 1200 : 600} />
      <Temps session={session} />

      {raison && (
        <>
          <p className="rappel resultat__rappel">Tu passes ce permis pour <q>{raison}</q>{pointFinal(raison)}</p>
          <p className="discret">
            {mode !== 'examen' ? (
              'Chaque question ratée revient jusqu’à ce que tu la tiennes. C’est le principe.'
            ) : POUR_APP ? (
              'Les questions ratées sont dans la revue, et elles reviennent en entraînement jusqu’à ce que tu les tiennes.'
            ) : (
              <>
                {r.erreurs > 1 ? `Tes ${r.erreurs} erreurs sont` : 'Ton erreur est'} dans{' '}
                <a href="/profil/erreurs">ce que tu as raté</a>, et {r.erreurs > 1 ? 'elles reviennent' : 'elle revient'} dans
                ta série du jour jusqu’à ce que tu {r.erreurs > 1 ? 'les tiennes' : 'la tiennes'}.
              </>
            )}
          </p>
        </>
      )}

      {serie ? (
        // Une série d'un seul thème : la note par thème redirait le score.
        <>
          <Recap session={session} parId={parId} retourLecon={retourLecon} />
          <ActionsSerie encore={serie.encore} relancer={serie.relancer} />
        </>
      ) : (
        <>
          {/* Dans l'app, le geste suivant vient sous le score, avant la carte
              des thèmes : sinon il tombe sous le pli (layout.md). Le
              récapitulatif reste après, chaque ligne s'ouvre. */}
          {POUR_APP && <ActionsApp {...actions} />}
          {r.total > 0 && <ParTheme parTheme={r.parTheme} />}
          {POUR_APP ? (
            <Recap session={session} parId={parId} retourLecon={retourLecon} erreursSeules={recale} />
          ) : (
            <ActionsSite {...actions} />
          )}
          {revue && <RevueDesErreurs session={session} parId={parId} quoi={revue} retourLecon={retourLecon} />}
        </>
      )}
    </div>
  );
}

/** Le score, le verdict, le pavillon d'un examen reçu, et l'écart avec le précédent. */
function Score({
  mode,
  session,
  titre,
  depart,
  enSerie,
}: Pick<Props, 'mode' | 'session' | 'titre' | 'depart'> & { enSerie: boolean }) {
  const r = session.resultat!;
  // L'examen d'avant, lu au montage : celui-ci n'y est pas encore.
  const precedent = mode === 'examen' && !session.interrompu ? depart.examens[0] ?? null : null;
  const ecart = precedent ? r.bonnes - precedent.bonnes : 0;
  // Le second moment écrit du site : un examen blanc reçu hisse le pavillon
  // Q, jaune uni, le long d'un mât en encre qui longe le score et le verdict. Il est
  // dessiné en CSS sur ce bloc, rien de plus ici. Recalé, interrompu,
  // entraînement : le bloc n'a pas de classe, et rien ne se hisse.
  const recu = mode === 'examen' && !session.interrompu && r.total > 0 && r.reussi;
  return (
    <div>
      <p className="resultat__titre">
        {mode === 'examen'
          ? session.interrompu ? 'Examen blanc interrompu' : 'Examen blanc terminé'
          : titre}
      </p>

      {r.total === 0 ? (
        <p className="resultat__verdict">
          Examen arrêté avant la première réponse. Rien à noter, rien de perdu.
        </p>
      ) : (
        <>
          <div className={recu ? 'resultat--recu' : undefined}>
            <p className="resultat__score">
              {r.bonnes}<small> {enSerie ? 'sur' : '/'} {r.total}</small>
            </p>
            {mode === 'examen' && (
              session.interrompu ? (
                <p className="resultat__verdict">
                  Examen interrompu, {r.total} question{r.total > 1 ? 's' : ''} jouée{r.total > 1 ? 's' : ''} sur{' '}
                  {session.questions.length}, dont {r.erreurs} ratée{r.erreurs > 1 ? 's' : ''}.
                  Une note sur un examen entier demande d’aller au bout.
                </p>
              ) : (
                // Le mot du verdict en étiquette ; le point qui le suit reste
                // dans le texte, caché à l'œil, pour que la phrase se lise
                // entière.
                <p className={`resultat__verdict resultat__verdict--${r.reussi ? 'reussi' : 'echoue'}`}>
                  <span className={`etiquette etiquette--${r.reussi ? 'juste' : 'faux'}`}>
                    {r.reussi ? 'Reçu' : 'Recalé'}
                  </span>
                  <span className="visuellement-cache">.</span>
                  {r.reussi
                    ? ` ${r.erreurs} erreur${r.erreurs > 1 ? 's' : ''} sur les ${ERREURS_ADMISES} admises.`
                    : ` ${r.erreurs} erreurs, l’épreuve en admet ${ERREURS_ADMISES}.`}
                </p>
              )
            )}
            {recu && (
              <p className="resultat__pavillon">
                Pavillon Q hissé : libre pratique.
                <span className="discret">
                  Au Code international des signaux, le pavillon jaune seul demande l’entrée au port.
                  Tu peux y aller.
                </span>
              </p>
            )}
          </div>
          {precedent && (
            <p className="resultat__ecart">
              Ton examen d’avant : {precedent.bonnes} sur {precedent.total}.{' '}
              {ecart > 0 && `${ecart} de plus que la dernière fois.`}
              {ecart < 0 && `${-ecart} de moins que la dernière fois.`}
              {ecart === 0 && 'Le même score.'}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Le temps, que le score ne dit pas. Vingt secondes par question, et l'échec
 * par lenteur est le mode d'échec propre à cette épreuve. Au buzzer,
 * l'épreuve relève ce qui est coché : des cases vides font une erreur, des
 * cases cochées comptent pour ce qu'elles valent. Une réponse arrachée à la
 * dernière seconde ne tiendra pas dans une salle.
 */
function Temps({ session }: { session: Session }) {
  const lent = lenteurs(session);
  if (lent.sansReponse.length === 0 && lent.cocheesAuBuzzer.length === 0 && lent.aLaLimite.length === 0) return null;
  return (
    <p className="resultat__temps">
      {lent.sansReponse.length > 0 && (
        <>
          <b>
            {lent.sansReponse.length} question{lent.sansReponse.length > 1 ? 's' : ''} sans réponse
          </b>
          {' : les vingt secondes sont passées avant toi. '}
        </>
      )}
      {lent.cocheesAuBuzzer.length > 0 && (
        <>
          <b>
            {lent.cocheesAuBuzzer.length > 1
              ? `${lent.cocheesAuBuzzer.length} questions retenues telles que tu les avais cochées`
              : '1 question retenue telle que tu l’avais cochée'}
          </b>
          {' : les vingt secondes sont passées avant ton clic. À l’épreuve aussi, c’est ce qui est coché à ce moment-là qui compte. '}
        </>
      )}
      {lent.aLaLimite.length > 0 && (
        <>
          {lent.aLaLimite.length} répondue{lent.aLaLimite.length > 1 ? 's' : ''} dans la
          dernière seconde.{' '}
        </>
      )}
      <span className="discret">Le chrono compte autant que la réponse.</span>
    </p>
  );
}

/** Le nom d'un thème en étiquette, à la couleur de son groupe. */
function Theme({ code }: { code: string }) {
  const groupe = groupeDuTheme(code);
  return <span className={`etiquette${groupe ? ` etiquette--${groupe.couleur}` : ''}`}>{nomDuTheme(code)}</span>;
}

/** La note par thème, du plus faible au plus solide. */
function ParTheme({ parTheme }: { parTheme: Record<string, { bonnes: number; total: number }> }) {
  return (
    <ul className="parTheme">
      {Object.entries(parTheme)
        .sort(([, a], [, b]) => a.bonnes / a.total - b.bonnes / b.total)
        .map(([code, note], rang) => (
          <li key={code} style={{ '--part': note.bonnes / note.total, '--rang': rang } as React.CSSProperties}>
            {/* Sur le site, le nom mène à l'entraînement du thème. Dans
                l'app, chaque onglet est sa propre webview : un lien
                ouvrirait l'entraînement sous l'onglet Examen. */}
            <b>{POUR_APP ? <Theme code={code} /> : <a href={`/entrainement/${code}`}><Theme code={code} /></a>}</b>
            <span className={`parTheme__note${note.bonnes < note.total ? ' parTheme__note--faible' : ''}`}>
              {note.bonnes} / {note.total}
            </span>
            {/* Dans l'app, la jauge est un élément : elle se remplit en
                `scaleX`, là où le site peint un dégradé de fond. */}
            {POUR_APP && (
              <span className="parTheme__jauge" aria-hidden="true"><span /></span>
            )}
          </li>
        ))}
    </ul>
  );
}

/**
 * La fin d'une série courte : « Encore » en action principale, le changement
 * de thème en lien discret. Le palier et le son sont déjà venus avec le score.
 */
function ActionsSerie({ encore, relancer }: { encore: number; relancer: () => void }) {
  return (
    <div className="jeu__actions resultat__actions">
      <button className="bouton bouton--principal" type="button" onClick={relancer}>
        Encore {encore}
      </button>
      <a className="signaler" href="/entrainement">Changer de thème</a>
    </div>
  );
}

interface PropsActions {
  mode: Mode;
  session: Session;
  retour: string;
  revue: Revue;
  basculerRevue: (quoi: 'erreurs' | 'toutes') => void;
  /** Combien de questions ont été ratées. */
  ratees: number;
  /** Un examen mené au bout et recalé : le geste suivant, ce sont les erreurs. */
  recale: boolean;
}

/**
 * Le geste suivant dans l'app : refaire. Les erreurs se revoient dans le
 * récapitulatif dessous, et la barre d'onglets est revenue : un lien
 * « Accueil » la doublerait.
 */
function ActionsApp({ mode, session, retour, ratees, recale }: PropsActions) {
  const r = session.resultat!;
  // Recalé : les erreurs viennent d'entrer dans la file de révision, c'est
  // là que « Revoir » mène ; refaire un examen attend (feedback.md).
  return (
    <>
      <div className="jeu__actions resultat__actions">
        {recale && (
          <a className="bouton bouton--principal" href={lienErreursExamen(r.ratees)}>
            {ratees > 1 ? `Revoir mes ${ratees} erreurs` : 'Revoir mon erreur'}
          </a>
        )}
        <a className={`bouton${recale ? ' bouton--discret' : ' bouton--principal'}`} href={retour}>
          {mode === 'examen' ? 'Refaire un examen' : 'Refaire la série'}
        </a>
      </div>
      {/* Un examen interrompu ne se partage pas : le score ne veut rien
          dire, et personne n'a envie de l'annoncer. */}
      {mode === 'examen' && !session.interrompu && r.total > 0 && (
        <p className="resultat__partage">
          <button
            className="bouton bouton--discret"
            type="button"
            onClick={(evenement) =>
              void partager(
                'Mon examen blanc du permis côtier',
                r.reussi
                  ? `Reçu à l’examen blanc : ${r.bonnes} sur ${r.total}, ${r.erreurs} erreur${r.erreurs > 1 ? 's' : ''} sur les ${ERREURS_ADMISES} admises.`
                  : `${r.bonnes} sur ${r.total} à l’examen blanc, ${r.erreurs} erreurs. L’épreuve en admet ${ERREURS_ADMISES}. On y retourne.`,
                'https://lepermiscotier.fr',
                evenement.currentTarget,
              )
            }
          >
            Partager
          </button>
        </p>
      )}
    </>
  );
}

/** Comme dans l'app : ce qui a été raté d'abord, puis refaire, puis l'accueil. */
function ActionsSite({ mode, session, retour, revue, basculerRevue, ratees }: PropsActions) {
  const r = session.resultat!;
  return (
    <div className="jeu__actions">
      {ratees > 0 && (
        <button
          className="bouton bouton--principal"
          type="button"
          aria-expanded={revue === 'erreurs'}
          onClick={() => basculerRevue('erreurs')}
        >
          {revue === 'erreurs'
            ? 'Masquer mes erreurs'
            : ratees > 1 ? `Revoir mes ${ratees} erreurs` : 'Revoir mon erreur'}
        </button>
      )}
      {r.total > 0 && (
        <button
          className={`bouton${ratees > 0 ? ' bouton--discret' : ''}`}
          type="button"
          aria-expanded={revue === 'toutes'}
          onClick={() => basculerRevue('toutes')}
        >
          {revue === 'toutes'
            ? 'Masquer la revue'
            : ratees === 0
              ? 'Revoir les questions'
              : r.total > 1 ? `Revoir les ${r.total} questions` : 'Revoir la question'}
        </button>
      )}
      <a className={`bouton${ratees > 0 ? '' : ' bouton--principal'}`} href={retour}>
        {mode === 'examen' ? 'Refaire un examen' : 'Recommencer'}
      </a>
      {/* Pas de partage dessiné sur le site : le bouton de partage du
          navigateur est déjà là, un doublon en HTML n'ajoute rien. */}
      <a className="bouton bouton--discret" href="/">Accueil</a>
    </div>
  );
}
