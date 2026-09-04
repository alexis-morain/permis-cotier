import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { creerSession, questionCourante, reduire } from '../lib/session';
import type { Mode } from '../lib/session';
import { SECONDES_PAR_QUESTION, ERREURS_ADMISES, aleaSeme, ordonnerEntrainement, tirerExamen } from '../lib/quiz';
import { charger, sauvegarder, enregistrerReponse, enregistrerExamen, aujourdhui } from '../lib/progression';
import type { QuestionAffichable } from '../lib/banque';
import { nomDuTheme } from '../lib/themes-client';
import './quiz.css';

interface Props {
  mode: Mode;
  /** Toute la banque en examen, les questions du thème en entraînement. */
  questions: QuestionAffichable[];
  theme?: string;
}

const LETTRES: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E' };

function evenement(nom: string, donnees?: Record<string, unknown>) {
  // Umami, sans cookie. Absent en local, on ne casse rien.
  (window as { umami?: { track: (n: string, d?: unknown) => void } }).umami?.track(nom, donnees);
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

export default function Quiz({ mode, questions, theme }: Props) {
  // Le tirage se fait au montage, côté navigateur : chaque visite est un
  // examen différent, et le HTML servi reste le même pour tout le monde.
  const serie = useMemo(() => {
    if (questions.length === 0) return [];
    if (mode === 'examen') return tirerExamen(questions, aleaSeme(Date.now() >>> 0));
    return ordonnerEntrainement(questions, charger().questions);
  }, [mode, questions]);

  const parId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const [session, envoyer] = useReducer(reduire, null, () => creerSession(mode, serie));
  const [revue, setRevue] = useState(false);
  const journalEcrit = useRef(0);

  const question = questionCourante(session);
  const affichee = question ? parId.get(question.id) : undefined;
  const selection = session.selections[session.index] ?? [];

  // Horloge de l'examen. Une seconde, pas plus précis : le chrono est une
  // contrainte de l'épreuve, pas un instrument de mesure.
  useEffect(() => {
    if (session.mode !== 'examen' || session.phase !== 'en-cours') return;
    const h = window.setInterval(() => envoyer({ type: 'tic' }), 1000);
    return () => window.clearInterval(h);
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

  useEffect(() => {
    if (session.phase !== 'resultat' || !session.resultat || session.resultat.total === 0) return;
    const r = session.resultat;
    if (mode === 'examen') {
      sauvegarder(
        enregistrerExamen(charger(), { date: aujourdhui(), bonnes: r.bonnes, total: r.total, reussi: r.reussi }),
      );
      evenement('examen-termine', { bonnes: r.bonnes, total: r.total });
    } else {
      evenement('entrainement-termine', { theme, bonnes: r.bonnes, total: r.total });
    }
  }, [session.phase, session.resultat, mode, theme]);

  useEffect(() => {
    evenement(mode === 'examen' ? 'examen-commence' : 'entrainement-commence', { theme });
  }, [mode, theme]);

  if (serie.length === 0) {
    return (
      <div className="encadre">
        <p><strong>Aucune question publiée pour l’instant.</strong></p>
        <p className="discret">
          La banque se remplit thème par thème, chaque question citant le texte dont elle est tirée.
          Reviens dans quelques jours.
        </p>
      </div>
    );
  }

  if (session.phase === 'resultat' && session.resultat) {
    const r = session.resultat;
    const ratees = new Set(r.ratees);
    return (
      <div className="jeu">
        <div>
          <p className="chapitre">{mode === 'examen' ? 'Examen blanc terminé' : `Entraînement, ${nomDuTheme(theme ?? '')}`}</p>
          <p className="resultat__score">
            {r.bonnes}<small> / {r.total}</small>
          </p>
          {mode === 'examen' && (
            <p className={`resultat__verdict resultat__verdict--${r.reussi ? 'reussi' : 'echoue'}`}>
              {r.reussi
                ? `Reçu. ${r.erreurs} erreur${r.erreurs > 1 ? 's' : ''} sur les ${ERREURS_ADMISES} admises.`
                : `Recalé. ${r.erreurs} erreurs, l’épreuve en admet ${ERREURS_ADMISES}.`}
            </p>
          )}
        </div>

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

        <div className="jeu__actions">
          <button className="bouton" type="button" onClick={() => setRevue((v) => !v)}>
            {revue ? 'Masquer la revue' : 'Revoir les questions'}
          </button>
          <a className="bouton bouton--principal" href={mode === 'examen' ? '/examen' : `/entrainement/${theme}`}>
            Recommencer
          </a>
          <a className="bouton bouton--discret" href="/">Accueil</a>
        </div>

        {revue && (
          <div className="revue">
            {session.questions.map((q, i) => {
              const d = parId.get(q.id);
              if (!d) return null;
              const donnee = session.selections[i] ?? [];
              const rate = ratees.has(q.id);
              return (
                <article className="revue__item" key={q.id}>
                  <p className="revue__rang">
                    Question {i + 1} sur {session.questions.length}, {nomDuTheme(q.theme)}
                    {rate ? ' — ratée' : ''}
                  </p>
                  <h3 className="revue__enonce">{d.enonce}</h3>
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

  return (
    <div className="jeu">
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
          <a className="signaler" href={`/entrainement`}>Changer de thème</a>
        )}
      </div>

      {session.restant !== null && (
        <div className={`jeu__barre${urgent ? ' jeu__barre--urgent' : ''}`} aria-hidden="true">
          <span style={{ transform: `scaleX(${session.restant / SECONDES_PAR_QUESTION})` }} />
        </div>
      )}

      <p className="jeu__consigne">
        Une ou deux bonnes réponses. La réponse doit être exacte, une bonne case seule ne suffit pas
        quand il en faut deux.
      </p>

      {/* `key` sur ces trois éléments : React les remonte à chaque question,
          ce qui rejoue leur animation d'entrée. Sans lui, le DOM est réutilisé
          et le passage d'une question à l'autre ne se voit plus. */}
      <h2 className="jeu__enonce" key={`enonce-${question.id}`}>{affichee.enonce}</h2>

      {affichee.visuel && (
        <img
          className="jeu__visuel"
          key={`visuel-${question.id}`}
          src={`/visuels/${affichee.visuel.fichier}`}
          alt={affichee.visuel.alt}
        />
      )}

      <ul className="propositions" key={`propositions-${question.id}`}>
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
        <div className={`verdict verdict--${session.juste ? 'juste' : 'fausse'}`}>
          <p className="verdict__titre">{session.juste ? 'Bonne réponse' : 'Raté'}</p>
          <p>{affichee.explication}</p>
          <Sources sources={affichee.sources} />
        </div>
      )}

      <div className="jeu__actions">
        {session.corrigee ? (
          <button className="bouton bouton--principal" type="button" onClick={() => envoyer({ type: 'suivante' })}>
            Question suivante
          </button>
        ) : (
          <button
            className="bouton bouton--principal"
            type="button"
            disabled={mode === 'entrainement' && selection.length === 0}
            onClick={() => envoyer({ type: 'valider' })}
          >
            {mode === 'examen' ? 'Valider et passer' : 'Valider'}
          </button>
        )}
        {mode === 'examen' ? (
          <button className="bouton bouton--discret" type="button" onClick={() => envoyer({ type: 'terminer' })}>
            Arrêter et voir le résultat
          </button>
        ) : (
          <Signaler id={question.id} />
        )}
      </div>
    </div>
  );
}
