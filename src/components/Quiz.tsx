import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  creerSession,
  extraireSauvegarde,
  questionCourante,
  reduire,
  restaurerSession,
} from '../lib/session';
import type { Action, Mode, Session } from '../lib/session';
import {
  SECONDES_PAR_QUESTION,
  ERREURS_ADMISES,
  aleaSeme,
  ordonnerEntrainement,
  serieARevoir,
  tirerExamen,
} from '../lib/quiz';
import {
  charger,
  sauvegarder,
  enregistrerReponse,
  enregistrerExamen,
  enregistrerEnCours,
  effacerEnCours,
  aujourdhui,
} from '../lib/progression';
import type { QuestionAffichable } from '../lib/banque';
import { nomDuTheme } from '../lib/themes-client';
import './quiz.css';

interface Props {
  mode: Mode;
  /** Toute la banque en examen, les questions du thème en entraînement. */
  questions: QuestionAffichable[];
  theme?: string;
  /** Série des seules questions ratées, tous thèmes mêlés. */
  revoir?: boolean;
}

const LETTRES: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E' };

/** Action propre à l'écran, que le modèle de session n'a pas à connaître. */
type ActionEcran = Action | { type: 'restaurer'; session: Session };

function reduireEcran(s: Session, action: ActionEcran): Session {
  return action.type === 'restaurer' ? action.session : reduire(s, action);
}

function evenement(nom: string, donnees?: Record<string, unknown>) {
  // Umami, sans cookie. Absent en local, on ne casse rien.
  (window as { umami?: { track: (n: string, d?: unknown) => void } }).umami?.track(nom, donnees);
}

/** Le défilement doux, sauf pour qui a demandé qu'on arrête de bouger. */
function douceur(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function Sources({ sources }: { sources: QuestionAffichable['sources'] }) {
  return (
    <div className="sources">
      <span>Source :</span>
      <ul>
        {sources.map((s) => (
          <li key={`${s.ref}-${s.texte}`}>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer noopener">{s.texte}</a>
            ) : (
              s.texte
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Signaler({ id }: { id: string }) {
  return (
    <a className="signaler" href={`/signaler?question=${encodeURIComponent(id)}`}>
      Signaler une erreur sur cette question
    </a>
  );
}

export default function Quiz({ mode, questions, theme, revoir = false }: Props) {
  // La progression est lue une fois, au montage : le tirage et la reprise
  // doivent partir du même état, pas d'un état qui bouge sous eux.
  const [depart] = useState(() => charger());

  // Le tirage se fait au montage, côté navigateur : chaque visite est un
  // examen différent, et le HTML servi reste le même pour tout le monde.
  const serie = useMemo(() => {
    if (questions.length === 0) return [];
    if (mode === 'examen') return tirerExamen(questions, aleaSeme(Date.now() >>> 0));
    if (revoir) return serieARevoir(questions, depart.questions);
    return ordonnerEntrainement(questions, depart.questions);
  }, [mode, questions, revoir, depart]);

  // Un examen laissé en plan, s'il colle encore à la banque et n'a pas un jour.
  const reprise = useMemo(
    () => (mode === 'examen' ? restaurerSession(depart.enCours, questions, mode, theme) : null),
    [mode, questions, theme, depart],
  );

  const parId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const [session, envoyer] = useReducer(reduireEcran, null, () => creerSession(mode, serie));
  const [revue, setRevue] = useState(false);
  const [arretDemande, setArretDemande] = useState(false);
  const journalEcrit = useRef(0);
  const verdict = useRef<HTMLDivElement>(null);
  const continuer = useRef<HTMLButtonElement>(null);

  const question = questionCourante(session);
  const affichee = question ? parId.get(question.id) : undefined;
  const selection = session.selections[session.index] ?? [];

  const titre = mode === 'examen'
    ? 'Examen blanc'
    : revoir
      ? 'Révision de tes erreurs'
      : `Entraînement, ${nomDuTheme(theme ?? '')}`;

  const retour = mode === 'examen' ? '/examen' : revoir ? '/revoir' : `/entrainement/${theme}`;

  // Horloge de l'examen. Une seconde, pas plus précis : le chrono est une
  // contrainte de l'épreuve, pas un instrument de mesure.
  useEffect(() => {
    if (session.mode !== 'examen' || session.phase !== 'en-cours') return;
    const h = window.setInterval(() => envoyer({ type: 'tic', maintenant: Date.now() }), 1000);
    return () => window.clearInterval(h);
  }, [session.mode, session.phase]);

  // Un onglet caché voit son intervalle étranglé par le navigateur. Le chrono
  // est une horloge murale, il ne se fige donc pas, mais l'affichage peut
  // retarder : au retour, on recale sans attendre le prochain battement.
  useEffect(() => {
    if (session.mode !== 'examen' || session.phase !== 'en-cours') return;
    const surRetour = () => {
      if (!document.hidden) envoyer({ type: 'tic', maintenant: Date.now() });
    };
    document.addEventListener('visibilitychange', surRetour);
    return () => document.removeEventListener('visibilitychange', surRetour);
  }, [session.mode, session.phase]);

  // Écriture de la progression locale, au fil des réponses.
  useEffect(() => {
    if (session.journal.length === journalEcrit.current) return;
    let etat = charger();
    for (const ligne of session.journal.slice(journalEcrit.current)) {
      etat = enregistrerReponse(etat, ligne.id, ligne.juste, aujourdhui());
    }
    sauvegarder(etat);
    journalEcrit.current = session.journal.length;
  }, [session.journal]);

  // L'examen en cours survit au rafraîchissement et à l'écran verrouillé. On
  // écrit à chaque question et à chaque case cochée, pas à chaque seconde.
  useEffect(() => {
    if (mode !== 'examen') return;
    const sauvegarde = extraireSauvegarde(session, theme);
    const etat = charger();
    sauvegarder(sauvegarde ? enregistrerEnCours(etat, sauvegarde) : effacerEnCours(etat));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme, session.phase, session.index, session.selections]);

  useEffect(() => {
    if (session.phase !== 'resultat' || !session.resultat || session.resultat.total === 0) return;
    const r = session.resultat;
    if (mode === 'examen') {
      // Un examen arrêté en route n'entre pas dans l'historique : trois
      // questions sur quarante s'afficheraient « reçu » sur l'accueil, ce qui
      // serait faux. Il compte dans la progression par question, pas comme
      // épreuve passée.
      if (!session.interrompu) {
        sauvegarder(
          enregistrerExamen(charger(), { date: aujourdhui(), bonnes: r.bonnes, total: r.total, reussi: r.reussi }),
        );
      }
      evenement('examen-termine', { bonnes: r.bonnes, total: r.total, interrompu: session.interrompu });
    } else {
      evenement(revoir ? 'revoir-termine' : 'entrainement-termine', { theme, bonnes: r.bonnes, total: r.total });
    }
  }, [session.phase, session.resultat, session.interrompu, mode, theme, revoir]);

  useEffect(() => {
    if (session.phase !== 'en-cours') return;
    evenement(mode === 'examen' ? 'examen-commence' : revoir ? 'revoir-commence' : 'entrainement-commence', { theme });
    // Une seule fois, au vrai départ de la série.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase === 'en-cours']);

  // La correction tombait sous la ligne de flottaison sur mobile : valider
  // n'avait l'air de rien faire. On la remonte dans le champ de vision.
  useEffect(() => {
    if (!session.corrigee) return;
    verdict.current?.scrollIntoView({ block: 'nearest', behavior: douceur() });
  }, [session.corrigee, session.index]);

  // Même chose au passage au résultat : le score est en haut de l'écran.
  useEffect(() => {
    if (session.phase !== 'resultat') return;
    window.scrollTo({ top: 0, behavior: douceur() });
  }, [session.phase]);

  useEffect(() => {
    if (arretDemande) continuer.current?.focus();
  }, [arretDemande]);

  // Le chrono ne s'arrête pas pendant qu'on hésite, sinon la confirmation
  // deviendrait un bouton pause. Mais si le temps fait passer la question
  // derrière la boîte, celle-ci décrirait un état qui n'existe plus : elle se
  // referme, et l'écran de jeu reprend la main sur la question suivante.
  useEffect(() => {
    setArretDemande(false);
  }, [session.index]);

  // Le clavier, pour bachoter au bureau. Le contexte passe par une référence :
  // le chrono change l'état à la seconde, on ne réabonne pas l'écouteur pour ça.
  const contexte = useRef({ session, affichee, mode, arretDemande });
  contexte.current = { session, affichee, mode, arretDemande };

  useEffect(() => {
    function surTouche(evenementClavier: KeyboardEvent) {
      if (evenementClavier.metaKey || evenementClavier.ctrlKey || evenementClavier.altKey) return;
      // La cible n'est pas toujours un élément : une touche pressée sans focus
      // arrive avec `document` pour cible.
      const cible = evenementClavier.target instanceof HTMLElement ? evenementClavier.target : null;
      if (cible?.closest('input, textarea, select, [contenteditable="true"]')) return;
      // Un bouton d'action qui a le focus s'active tout seul : ne pas doubler.
      // Une proposition est un bouton elle aussi, mais Chromium lui laisse le
      // focus après un clic souris : sans cette exception, Entrée décochait la
      // réponse au lieu de valider, alors que l'écran de départ le promet.
      const activable =
        (cible?.tagName === 'BUTTON' || cible?.tagName === 'A') &&
        !cible.classList.contains('proposition');

      const { session: s, affichee: a, mode: m, arretDemande: arret } = contexte.current;

      if (s.phase === 'depart') {
        if (evenementClavier.key === 'Enter' && !activable) {
          evenementClavier.preventDefault();
          envoyer({ type: 'commencer', maintenant: Date.now() });
        }
        return;
      }
      if (s.phase !== 'en-cours' || arret) return;

      const lettre = evenementClavier.key.toLowerCase();
      if (LETTRES[lettre] && !s.corrigee) {
        if (!a?.propositions.some((p) => p.id === lettre)) return;
        evenementClavier.preventDefault();
        envoyer({ type: 'basculer', proposition: lettre });
        return;
      }

      if (evenementClavier.key === 'Enter' && !activable) {
        const choix = s.selections[s.index] ?? [];
        if (s.corrigee) {
          evenementClavier.preventDefault();
          envoyer({ type: 'suivante', maintenant: Date.now() });
        } else if (!(m === 'entrainement' && choix.length === 0)) {
          evenementClavier.preventDefault();
          envoyer({ type: 'valider', maintenant: Date.now() });
        }
      }
    }

    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, []);

  const reprendre = useCallback(() => {
    if (!reprise) return;
    // Les réponses du journal repris ont déjà été comptées dans la progression
    // avant l'interruption : sans ce décalage, elles y entreraient deux fois.
    journalEcrit.current = reprise.journal.length;
    envoyer({ type: 'restaurer', session: reprise });
  }, [reprise]);

  if (serie.length === 0) {
    return revoir ? (
      <div className="encadre">
        <h1 className="encadre__titre">Rien à revoir pour l’instant.</h1>
        <p className="discret">
          Les questions ratées atterrissent ici dès que tu en rates une, et en sortent quand tu
          les retrouves. <a href="/entrainement">S’entraîner par thème</a>.
        </p>
      </div>
    ) : (
      <div className="encadre">
        <h1 className="encadre__titre">Aucune question publiée pour l’instant.</h1>
        <p className="discret">
          La banque se remplit thème par thème, chaque question citant le texte dont elle est tirée.
          Reviens dans quelques jours.
        </p>
      </div>
    );
  }

  if (session.phase === 'depart') {
    return (
      <div className="jeu depart">
        <p className="chapitre">Examen blanc</p>
        <h1 className="depart__titre">Quarante questions, dans les conditions de l’épreuve.</h1>

        <ul className="depart__format">
          <li>
            <b>{serie.length} question{serie.length > 1 ? 's' : ''}</b> tirées au sort dans les quatorze
            thèmes du programme.
          </li>
          <li><b>{SECONDES_PAR_QUESTION} secondes</b> par question. Passé ce délai, on passe à la suivante.</li>
          <li>
            <b>Une ou deux bonnes réponses.</b> La réponse doit être exacte : une bonne case seule
            ne suffit pas quand il en faut deux.
          </li>
          <li><b>{ERREURS_ADMISES} erreurs admises.</b> Une question sans réponse compte comme une erreur.</li>
          <li>Aucune correction avant la fin. Tout arrive d’un coup, sur l’écran de résultat.</li>
        </ul>

        <p className="discret">
          Au clavier : <b>A</b>, <b>B</b>, <b>C</b>, <b>D</b> pour cocher, <b>Entrée</b> pour valider et passer.
        </p>
        <p className="discret">
          L’arrêté du 28 septembre 2007 fixe les quarante questions et les cinq erreurs admises.
          Les vingt secondes et la règle des une ou deux bonnes réponses n’y sont pas : elles
          viennent de la description de l’épreuve par les opérateurs agréés.
        </p>

        {reprise && (
          <div className="encadre depart__reprise">
            <p>
              <strong>Tu avais un examen en cours</strong>, arrêté à la question {reprise.index + 1} sur{' '}
              {reprise.questions.length}.
            </p>
            <p className="discret">
              Le commencer à neuf tire quarante autres questions et abandonne celui-là.
            </p>
          </div>
        )}

        <p className="depart__retour">
          <a className="signaler" href="/">Retour à l’accueil</a>
        </p>

        <div className="jeu__actions jeu__actions--collant">
          {reprise ? (
            <>
              <button className="bouton bouton--principal" type="button" onClick={reprendre}>
                Reprendre à la question {reprise.index + 1}
              </button>
              <button
                className="bouton"
                type="button"
                onClick={() => envoyer({ type: 'commencer', maintenant: Date.now() })}
              >
                Commencer un nouvel examen
              </button>
            </>
          ) : (
            <button
              className="bouton bouton--principal"
              type="button"
              onClick={() => envoyer({ type: 'commencer', maintenant: Date.now() })}
            >
              Commencer l’examen
            </button>
          )}
        </div>
      </div>
    );
  }

  if (session.phase === 'resultat' && session.resultat) {
    const r = session.resultat;
    const ratees = new Set(r.ratees);
    const jouees = session.questions.slice(0, r.total);
    return (
      <div className="jeu">
        <h1 className="visuellement-cache">{titre}, résultat</h1>
        <div>
          <p className="chapitre">
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
              <p className="resultat__score">
                {r.bonnes}<small> / {r.total}</small>
              </p>
              {mode === 'examen' && (
                session.interrompu ? (
                  <p className="resultat__verdict">
                    Examen interrompu, {r.total} question{r.total > 1 ? 's' : ''} jouée{r.total > 1 ? 's' : ''} sur{' '}
                    {session.questions.length}, dont {r.erreurs} ratée{r.erreurs > 1 ? 's' : ''}.
                    Une note sur un examen entier demande d’aller au bout.
                  </p>
                ) : (
                  <p className={`resultat__verdict resultat__verdict--${r.reussi ? 'reussi' : 'echoue'}`}>
                    {r.reussi
                      ? `Reçu. ${r.erreurs} erreur${r.erreurs > 1 ? 's' : ''} sur les ${ERREURS_ADMISES} admises.`
                      : `Recalé. ${r.erreurs} erreurs, l’épreuve en admet ${ERREURS_ADMISES}.`}
                  </p>
                )
              )}
            </>
          )}
        </div>

        {r.total > 0 && (
          <ul className="parTheme">
            {Object.entries(r.parTheme)
              .sort(([, a], [, b]) => a.bonnes / a.total - b.bonnes / b.total)
              .map(([code, note]) => (
                <li key={code}>
                  <b>{nomDuTheme(code)}</b>
                  <span className={`parTheme__note${note.bonnes < note.total ? ' parTheme__note--faible' : ''}`}>
                    {note.bonnes} / {note.total}
                  </span>
                </li>
              ))}
          </ul>
        )}

        <div className="jeu__actions">
          {r.total > 0 && (
            <button className="bouton" type="button" onClick={() => setRevue((v) => !v)}>
              {revue ? 'Masquer la revue' : 'Revoir les questions'}
            </button>
          )}
          <a className="bouton bouton--principal" href={retour}>Recommencer</a>
          <a className="bouton bouton--discret" href="/">Accueil</a>
        </div>

        {revue && (
          <div className="revue">
            {jouees.map((q, i) => {
              const d = parId.get(q.id);
              if (!d) return null;
              const donnee = session.selections[i] ?? [];
              const rate = ratees.has(q.id);
              return (
                <article className="revue__item" key={q.id}>
                  <p className="revue__rang">
                    Question {i + 1} sur {jouees.length}, {nomDuTheme(q.theme)}
                    {rate ? ' — ratée' : ''}
                  </p>
                  <h2 className="revue__enonce">{d.enonce}</h2>
                  {d.visuel && (
                    <img className="jeu__visuel" src={`/visuels/${d.visuel.fichier}`} alt={d.visuel.alt} loading="lazy" />
                  )}
                  <ul className="propositions">
                    {d.propositions.map((p) => {
                      const bonne = q.reponses.includes(p.id);
                      const cochee = donnee.includes(p.id);
                      const classe = bonne ? ' proposition--juste' : cochee ? ' proposition--fausse' : '';
                      return (
                        <li key={p.id}>
                          <div className={`proposition${classe}`}>
                            <span className="proposition__lettre">{LETTRES[p.id] ?? p.id}</span>
                            <span>{p.texte}</span>
                            {(bonne || cochee) && (
                              <span className="proposition__marque">
                                {bonne ? 'bonne réponse' : 'ta réponse'}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className={`verdict verdict--${rate ? 'fausse' : 'juste'}`} style={{ marginTop: '0.9rem' }}>
                    <p>{d.explication}</p>
                    <Sources sources={d.sources} />
                  </div>
                  <p style={{ marginTop: '0.6rem' }}><Signaler id={q.id} /></p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (!question || !affichee) return null;

  const urgent = session.restant !== null && session.restant <= 5;
  const plein = session.selections[session.index]?.length === 2;
  const restantes = session.questions.length - session.index;

  return (
    <div className="jeu">
      <h1 className="visuellement-cache">{titre}</h1>

      <div className="jeu__entete">
        <span className="jeu__compteur">
          Question {session.index + 1} <span className="discret">sur {session.questions.length}</span>
        </span>
        {session.restant !== null ? (
          <span className={`jeu__chrono${urgent ? ' jeu__chrono--urgent' : ''}`} aria-live="off">
            {session.restant}<span className="discret"> s</span>
            <span className="visuellement-cache">secondes restantes</span>
          </span>
        ) : (
          <a className="signaler" href={revoir ? '/entrainement' : '/entrainement'}>Changer de thème</a>
        )}
      </div>

      {session.restant !== null && (
        <div className="jeu__jauges" aria-hidden="true">
          <div className={`jeu__barre${urgent ? ' jeu__barre--urgent' : ''}`}>
            <span style={{ transform: `scaleX(${session.restant / SECONDES_PAR_QUESTION})` }} />
          </div>
          {/* Avancement dans l'examen, distinct du chrono : treize minutes sans
              aucune correction, il faut au moins savoir où on en est. */}
          <div className="jeu__avancement">
            <span style={{ transform: `scaleX(${session.index / session.questions.length})` }} />
          </div>
        </div>
      )}

      {mode === 'entrainement' && session.index === 0 && (
        <p className="jeu__consigne">
          Une ou deux bonnes réponses. La réponse doit être exacte, une bonne case seule ne suffit pas
          quand il en faut deux.
        </p>
      )}

      <h2 className="jeu__enonce">{affichee.enonce}</h2>

      {affichee.visuel && (
        <img className="jeu__visuel" src={`/visuels/${affichee.visuel.fichier}`} alt={affichee.visuel.alt} />
      )}

      <ul className="propositions">
        {affichee.propositions.map((p) => {
          const cochee = selection.includes(p.id);
          const bonne = question.reponses.includes(p.id);
          let classe = cochee ? ' proposition--cochee' : '';
          if (session.corrigee) classe = bonne ? ' proposition--juste' : cochee ? ' proposition--fausse' : '';
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`proposition${classe}`}
                aria-pressed={cochee}
                aria-keyshortcuts={LETTRES[p.id] ?? undefined}
                disabled={session.corrigee || (plein && !cochee)}
                onClick={() => envoyer({ type: 'basculer', proposition: p.id })}
              >
                <span className="proposition__lettre" aria-hidden="true">{LETTRES[p.id] ?? p.id}</span>
                <span>{p.texte}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {plein && !session.corrigee && (
        <p className="discret">Deux réponses au maximum. Décoche pour en changer.</p>
      )}

      {session.corrigee && (
        <div
          className={`verdict verdict--${session.juste ? 'juste' : 'fausse'}`}
          ref={verdict}
          role="status"
        >
          <p className="verdict__titre">{session.juste ? 'Bonne réponse' : 'Raté'}</p>
          <p>{affichee.explication}</p>
          <Sources sources={affichee.sources} />
        </div>
      )}

      {arretDemande ? (
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
              onClick={() => setArretDemande(false)}
            >
              Continuer l’examen
            </button>
            <button className="bouton" type="button" onClick={() => envoyer({ type: 'terminer' })}>
              Arrêter et voir le résultat
            </button>
          </div>
        </div>
      ) : (
        <div className="jeu__actions jeu__actions--collant">
          {session.corrigee ? (
            <button
              className="bouton bouton--principal"
              type="button"
              onClick={() => envoyer({ type: 'suivante', maintenant: Date.now() })}
            >
              Question suivante
            </button>
          ) : (
            <button
              className="bouton bouton--principal"
              type="button"
              disabled={mode === 'entrainement' && selection.length === 0}
              onClick={() => envoyer({ type: 'valider', maintenant: Date.now() })}
            >
              {mode === 'examen' ? 'Valider et passer' : 'Valider'}
            </button>
          )}
          {mode === 'examen' ? (
            <button className="bouton bouton--discret" type="button" onClick={() => setArretDemande(true)}>
              Arrêter
            </button>
          ) : (
            <Signaler id={question.id} />
          )}
        </div>
      )}
    </div>
  );
}
