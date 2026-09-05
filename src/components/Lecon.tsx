import { useEffect, useMemo, useRef, useState } from 'react';
import type { EtapeAffichable, LeconAffichable } from '../lib/cours';
import type { QuestionAffichable } from '../lib/banque';
import { aujourdhui, charger, enregistrerReponse, sauvegarder, terminerLecon } from '../lib/progression';
import { evenement } from '../lib/mesure';
import './quiz.css';
import './lecon.css';

/**
 * L'écran de leçon.
 *
 * Tout le texte est rendu au serveur : c'est ce que les moteurs lisent et ce
 * que voit qui n'a pas de script. Une fois hydraté, l'écran passe en pas à
 * pas : une idée à la fois, une barre d'avancement, un bouton pour continuer.
 * Le passage ne se voit pas : la page pose la classe `js` sur `<html>` avant
 * que ce composant soit analysé, et la feuille de style cache les écrans qui
 * ne sont pas le courant tant que cette classe est là.
 *
 * La leçon se termine par la vérification, jusqu'à trois questions de la
 * banque sur la notion. Leurs réponses entrent dans la progression comme
 * celles de l'entraînement : une question ratée ici repasse dans `/revoir`.
 */

interface Props {
  lecon: LeconAffichable;
  chapitre: { code: string; titre: string };
  /** Rang de la leçon dans son chapitre, à partir de 1. */
  rang: number;
  /** Nombre de leçons du chapitre. */
  total: number;
  suivante?: { code: string; nom: string };
  theme: { code: string; nom: string };
}

type Ecran =
  | { type: 'accroche'; texte: string }
  | { type: 'etape'; etape: EtapeAffichable; numero: number }
  | { type: 'piege'; texte: string }
  | { type: 'retenir'; lignes: string[] }
  | { type: 'verification' }
  | { type: 'fin' };

export function ecransDe(lecon: LeconAffichable): Ecran[] {
  const ecrans: Ecran[] = [];
  if (lecon.accroche) ecrans.push({ type: 'accroche', texte: lecon.accroche });
  lecon.etapes.forEach((etape, i) => ecrans.push({ type: 'etape', etape, numero: i + 1 }));
  if (lecon.piege) ecrans.push({ type: 'piege', texte: lecon.piege });
  if (lecon.retenir.length > 0) ecrans.push({ type: 'retenir', lignes: lecon.retenir });
  if (lecon.questions.length > 0) ecrans.push({ type: 'verification' });
  ecrans.push({ type: 'fin' });
  return ecrans;
}

const LETTRES: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D' };

function memeEnsemble(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

function douceur(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

interface Score {
  bonnes: number;
  total: number;
}

/** La vérification : les questions de la notion, une par une, corrigées tout de suite. */
function Verification({
  questions,
  onFin,
}: {
  questions: QuestionAffichable[];
  onFin: (score: Score) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<string[]>([]);
  const [corrigee, setCorrigee] = useState(false);
  const [bonnes, setBonnes] = useState(0);
  const verdict = useRef<HTMLDivElement>(null);

  const question = questions[index];
  if (!question) return null;

  const juste = memeEnsemble(selection, question.reponses);
  const plein = selection.length >= 2;

  const basculer = (id: string) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : plein ? s : [...s, id]));

  const valider = () => {
    setCorrigee(true);
    if (juste) setBonnes((b) => b + 1);
    sauvegarder(enregistrerReponse(charger(), question.id, juste, aujourdhui()));
    window.setTimeout(() => verdict.current?.scrollIntoView({ block: 'nearest', behavior: douceur() }), 0);
  };

  const suivante = () => {
    const score = { bonnes: bonnes, total: questions.length };
    if (index + 1 >= questions.length) {
      onFin(score);
      return;
    }
    setIndex(index + 1);
    setSelection([]);
    setCorrigee(false);
  };

  return (
    <div className="verification">
      <p className="verification__compteur">
        Question {index + 1} <span className="discret">sur {questions.length}</span>
      </p>
      {index === 0 && !corrigee && (
        <p className="discret" style={{ marginTop: 0 }}>
          Une ou deux bonnes réponses, comme à l’épreuve. La réponse doit être exacte.
        </p>
      )}
      <h3 className="verification__enonce">{question.enonce}</h3>
      {question.visuel && (
        <img className="jeu__visuel" src={`/visuels/${question.visuel.fichier}`} alt={question.visuel.alt} />
      )}
      <ul className="propositions">
        {question.propositions.map((p) => {
          const cochee = selection.includes(p.id);
          const bonne = question.reponses.includes(p.id);
          let classe = cochee ? ' proposition--cochee' : '';
          if (corrigee) classe = bonne ? ' proposition--juste' : cochee ? ' proposition--fausse' : '';
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`proposition${classe}`}
                aria-pressed={cochee}
                disabled={corrigee || (plein && !cochee)}
                onClick={() => basculer(p.id)}
              >
                <span className="proposition__lettre" aria-hidden="true">{LETTRES[p.id] ?? p.id}</span>
                <span>{p.texte}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {corrigee && (
        <div className={`verdict verdict--${juste ? 'juste' : 'fausse'}`} ref={verdict} role="status">
          <p className="verdict__titre">{juste ? 'Bonne réponse' : 'Raté'}</p>
          <p>{question.explication}</p>
          <div className="sources">
            <span>Source :</span>
            <ul>
              {question.sources.map((s) => (
                <li key={`${s.ref}-${s.texte}`}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer noopener" data-mesure="source-ouverte" data-mesure-ref={s.ref}>
                      {s.texte}
                    </a>
                  ) : (
                    s.texte
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="jeu__actions">
        {corrigee ? (
          <button className="bouton bouton--principal" type="button" onClick={suivante}>
            {index + 1 >= questions.length ? 'Terminer la leçon' : 'Question suivante'}
          </button>
        ) : (
          <button className="bouton bouton--principal" type="button" disabled={selection.length === 0} onClick={valider}>
            Valider
          </button>
        )}
        <a className="signaler" href={`/signaler?question=${encodeURIComponent(question.id)}`}>
          Signaler une erreur
        </a>
      </div>
    </div>
  );
}

export default function Lecon({ lecon, chapitre, rang, total, suivante, theme }: Props) {
  const ecrans = useMemo(() => ecransDe(lecon), [lecon]);
  const [index, setIndex] = useState(0);
  const [pasAPas, setPasAPas] = useState(true);
  const [score, setScore] = useState<Score | null>(null);
  const [monte, setMonte] = useState(false);
  const [tentative, setTentative] = useState(0);
  const racine = useRef<HTMLDivElement>(null);
  const courant = useRef<HTMLDivElement>(null);
  const terminee = useRef(false);

  useEffect(() => {
    setMonte(true);
    evenement('lecon-commencee', { notion: lecon.code, chapitre: chapitre.code });
  }, [lecon.code, chapitre.code]);

  const ecran = ecrans[index] ?? ecrans[0]!;
  const dernierAvantFin = index === ecrans.length - 2 && ecrans[index + 1]?.type === 'fin';

  // Arrivé à la fin, la leçon est faite, une fois, quel que soit le score :
  // ce qui compte est d'être allé au bout. Refaire la leçon remplace la trace.
  useEffect(() => {
    if (ecran.type !== 'fin' || terminee.current) return;
    terminee.current = true;
    const resultat = score ?? { bonnes: 0, total: 0 };
    sauvegarder(terminerLecon(charger(), lecon.code, resultat, aujourdhui()));
    evenement('lecon-terminee', { notion: lecon.code, chapitre: chapitre.code, ...resultat });
  }, [ecran.type, score, lecon.code, chapitre.code]);

  const aller = (i: number) => {
    setIndex(i);
    window.setTimeout(() => {
      const cible = pasAPas ? racine.current : courant.current;
      cible?.scrollIntoView({ block: 'start', behavior: douceur() });
      courant.current?.focus({ preventScroll: true });
    }, 0);
  };

  const recommencer = () => {
    terminee.current = false;
    setScore(null);
    setTentative((t) => t + 1);
    aller(0);
  };

  const derniere = ecrans.length - 1;

  const finDeVerification = (s: Score) => {
    setScore(s);
    aller(ecrans.length - 1);
  };

  const classeRacine = `lecon${pasAPas ? ' lecon--pas-a-pas' : ''}`;
  const avancement = ecrans.length > 1 ? index / (ecrans.length - 1) : 1;

  return (
    <div className={classeRacine} ref={racine}>
      <div className="lecon__entete">
        <p className="lecon__chapitre">
          <a href={`/cours#${chapitre.code}`}>{chapitre.titre}</a>
          <span className="discret"> · leçon {rang} sur {total} · {lecon.duree} min</span>
        </p>
        <div className="lecon__barre" aria-hidden="true">
          <span style={{ transform: `scaleX(${avancement})` }} />
        </div>
        <p className="visuellement-cache" aria-live="polite">
          Écran {index + 1} sur {ecrans.length}
        </p>
      </div>

      {ecrans.map((e, i) => {
        const estCourant = i === index;
        // La fin ne s'affiche que quand on y est : en lecture continue, tout
        // est visible, sauf « Leçon faite » avant d'avoir fini.
        if (e.type === 'fin' && !estCourant) return null;
        const classe = `ecran ecran--${e.type}${estCourant ? ' ecran--courant' : ''}`;
        const props = estCourant ? { ref: courant, tabIndex: -1 } : {};
        return (
          <section key={i} className={classe} {...props} aria-hidden={pasAPas && !estCourant ? true : undefined}>
            {e.type === 'accroche' && <p className="ecran__accroche">{e.texte}</p>}

            {e.type === 'etape' && (
              <>
                <h2 className="ecran__titre">
                  {!lecon.courte && <span className="ecran__numero">{e.numero}</span>}
                  {e.etape.titre}
                </h2>
                {e.etape.visuel && (
                  <figure className="ecran__visuel">
                    <img src={`/visuels/${e.etape.visuel}`} alt={e.etape.alt ?? ''} loading={i === 0 ? 'eager' : 'lazy'} />
                  </figure>
                )}
                {e.etape.paragraphes.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {e.etape.liste && (
                  <ul className="ecran__liste">
                    {e.etape.liste.map((l, j) => (
                      <li key={j}>{l}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {e.type === 'piege' && (
              <div className="piege">
                <p className="piege__titre">Le piège</p>
                <p>{e.texte}</p>
              </div>
            )}

            {e.type === 'retenir' && (
              <div className="retenir">
                <p className="retenir__titre">À retenir</p>
                <ul>
                  {e.lignes.map((l, j) => (
                    <li key={j}>{l}</li>
                  ))}
                </ul>
              </div>
            )}

            {e.type === 'verification' && (
              <>
                <h2 className="ecran__titre">Vérifie ce que tu as retenu</h2>
                {monte ? (
                  <Verification key={tentative} questions={lecon.questions} onFin={finDeVerification} />
                ) : (
                  <p className="discret">
                    {lecon.questions.length} question{lecon.questions.length > 1 ? 's' : ''} de la banque sur cette notion,
                    corrigée{lecon.questions.length > 1 ? 's' : ''} une par une. La vérification a besoin de JavaScript.
                  </p>
                )}
              </>
            )}

            {e.type === 'fin' && (
              <div className="fin">
                <p className="fin__titre display">Leçon faite</p>
                {score && score.total > 0 ? (
                  <p className="fin__score">
                    <b>{score.bonnes}</b> sur <b>{score.total}</b> à la vérification
                    {score.bonnes === score.total
                      ? '. Tout est juste, tu peux passer à la suite.'
                      : '. Les questions ratées repasseront dans ta révision.'}
                  </p>
                ) : (
                  <p className="fin__score">
                    Cette notion n’a pas encore de question dans la banque. Elle est marquée faite.
                  </p>
                )}
                <div className="fin__actions">
                  {suivante ? (
                    <a className="bouton bouton--principal" href={`/cours/${suivante.code}`} data-mesure="lecon-suivante" data-mesure-notion={suivante.code}>
                      Leçon suivante : {suivante.nom}
                    </a>
                  ) : (
                    <a className="bouton bouton--principal" href="/cours" data-mesure="lecon-retour-cours">
                      Retour au cours
                    </a>
                  )}
                  <a className="bouton" href={`/entrainement/${theme.code}`} data-mesure="lecon-entrainement" data-mesure-theme={theme.code}>
                    S’entraîner sur {theme.nom.toLowerCase()}
                  </a>
                  <button className="bouton bouton--discret" type="button" onClick={recommencer}>
                    Revoir la leçon
                  </button>
                </div>
              </div>
            )}

            {pasAPas && estCourant && e.type !== 'verification' && e.type !== 'fin' && (
              <div className="lecon__suite">
                <button className="bouton bouton--principal" type="button" onClick={() => aller(index + 1)}>
                  {ecrans[index + 1]?.type === 'verification'
                    ? 'Vérifier ce que j’ai retenu'
                    : dernierAvantFin
                      ? 'Terminer la leçon'
                      : 'Continuer'}
                </button>
                {index > 0 && (
                  <button className="bouton bouton--discret" type="button" onClick={() => aller(index - 1)}>
                    Revenir
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}

      {!pasAPas && lecon.questions.length === 0 && index !== derniere && (
        <div className="lecon__suite">
          <button className="bouton bouton--principal" type="button" onClick={() => aller(derniere)}>
            Terminer la leçon
          </button>
        </div>
      )}

      <p className="lecon__mode">
        <button type="button" className="bouton bouton--discret" onClick={() => setPasAPas((v) => !v)}>
          {pasAPas ? 'Tout lire d’une traite' : 'Reprendre pas à pas'}
        </button>
      </p>
    </div>
  );
}
