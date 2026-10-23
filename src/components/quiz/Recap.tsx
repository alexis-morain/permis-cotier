import { useState } from 'react';
import type { QuestionAffichable } from '../../lib/banque';
import type { Session } from '../../lib/session';
import { ItemRevue } from './RevueDesErreurs';

interface Props {
  session: Session;
  parId: ReadonlyMap<string, QuestionAffichable>;
  /** Où ramène la leçon ouverte depuis une question ratée. */
  retourLecon: string;
  /** Les seules ratées d'abord ; un bouton déplie le reste. */
  erreursSeules?: boolean;
}

/**
 * Le récapitulatif de fin de série : une ligne par question jouée, juste ou
 * faux écrit en toutes lettres (la couleur n'est qu'un renfort), et chaque
 * ligne s'ouvre sur la question, la bonne réponse et l'explication, par le
 * même bloc que la revue des erreurs.
 */
export default function Recap({ session, parId, retourLecon, erreursSeules = false }: Props) {
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [toutes, setToutes] = useState(false);
  const r = session.resultat;
  if (!r || r.total === 0) return null;
  const ratees = new Set(r.ratees);
  // Un examen recalé : les erreurs seules d'abord, le reste à la demande.
  const filtre = erreursSeules && !toutes && ratees.size > 0;
  return (
    <section className="recap" aria-labelledby="recap-titre">
      <h2 className="recap__titre" id="recap-titre">{filtre ? 'Tes erreurs' : 'Tes réponses'}</h2>
      <ol className="recap__liste">
        {session.questions.slice(0, r.total).map((q, i) => {
          const d = parId.get(q.id);
          if (!d) return null;
          const faux = ratees.has(q.id);
          if (filtre && !faux) return null;
          const ouvert = ouverte === i;
          return (
            <li key={q.id}>
              <button
                className="recap__ligne"
                type="button"
                aria-expanded={ouvert}
                onClick={() => setOuverte(ouvert ? null : i)}
              >
                <span className={`recap__marque recap__marque--${faux ? 'faux' : 'juste'}`}>
                  <span aria-hidden="true">{faux ? '✗' : '✓'}</span> {faux ? 'Faux' : 'Juste'}
                </span>
                <span className="recap__enonce">
                  <span className="visuellement-cache">Question {i + 1}. </span>
                  {d.enonce}
                </span>
              </button>
              {ouvert && <ItemRevue session={session} parId={parId} rang={i} retourLecon={retourLecon} />}
            </li>
          );
        })}
      </ol>
      {erreursSeules && ratees.size > 0 && (
        <button
          className="bouton bouton--discret recap__toutes"
          type="button"
          aria-expanded={toutes}
          onClick={() => {
            setToutes(!toutes);
            setOuverte(null);
          }}
        >
          {toutes ? 'Ne garder que mes erreurs' : `Voir les ${r.total} questions`}
        </button>
      )}
    </section>
  );
}
