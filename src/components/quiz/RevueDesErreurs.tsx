import type { QuestionAffichable } from '../../lib/banque';
import type { Session } from '../../lib/session';
import { lettreAffichee, melangerPropositions } from '../../lib/melange';
import { nomDuTheme } from '../../lib/themes-client';
import { groupeDuTheme } from '../../lib/groupes';
import BoutonSignal from '../BoutonSignal';
import { LienLecon, Signaler, Sources } from './Morceaux';

interface Props {
  session: Session;
  parId: ReadonlyMap<string, QuestionAffichable>;
  /** Les seules ratées, ou toutes les questions jouées. */
  quoi: 'erreurs' | 'toutes';
  /** Où ramène la leçon ouverte depuis une question ratée. */
  retourLecon: string;
}

/**
 * La revue dépliée au résultat : chaque question jouée, la réponse donnée, la
 * bonne, l'explication et la source. Les propositions y gardent l'ordre du
 * jeu : la revue montre l'écran que le candidat a eu sous les yeux.
 */
export default function RevueDesErreurs({ session, parId, quoi, retourLecon }: Props) {
  const r = session.resultat;
  if (!r) return null;
  const ratees = new Set(r.ratees);
  const jouees = session.questions.slice(0, r.total);
  return (
    <div className="revue">
      {jouees.map((q, i) => {
        // Le bouton des erreurs les promet : la revue les tient seules.
        if (quoi === 'erreurs' && !ratees.has(q.id)) return null;
        return <ItemRevue key={q.id} session={session} parId={parId} rang={i} retourLecon={retourLecon} />;
      })}
    </div>
  );
}

/**
 * Une question de la revue : l'énoncé, ce qui a été coché, la bonne réponse,
 * l'explication, la source. Le récapitulatif de fin de série l'ouvre sous la
 * ligne touchée.
 */
export function ItemRevue({
  session,
  parId,
  rang: i,
  retourLecon,
}: Pick<Props, 'session' | 'parId' | 'retourLecon'> & { rang: number }) {
  const r = session.resultat;
  const q = session.questions[i];
  const d = q && parId.get(q.id);
  if (!r || !q || !d) return null;
  const jouees = r.total;
  const donnee = session.selections[i] ?? [];
  const rate = new Set(r.ratees).has(q.id);
  // Une seule case cochée quand il en fallait deux : le candidat
  // ne voyait pas qu'il manquait une réponse, seulement laquelle.
  const incomplete = rate && q.reponses.length === 2 && donnee.length === 1;
  const groupe = groupeDuTheme(q.theme);
  return (
    <article className="revue__item">
      {/* Les virgules restent dans le texte, cachées à l'œil : le rang se lit
          comme une phrase, et l'étiquette du groupe tient la place du thème. */}
      <p className="revue__rang">
        <span>Question {i + 1} sur {jouees}</span>
        <span className="visuellement-cache">, </span>
        <span className={`etiquette${groupe ? ` etiquette--${groupe.couleur}` : ''}`}>{nomDuTheme(q.theme)}</span>
        {rate && (
          <>
            <span className="visuellement-cache">, </span>
            <span className="etiquette etiquette--faux">ratée</span>
          </>
        )}
      </p>
      <h2 className="revue__enonce">{d.enonce}</h2>
      {incomplete && (
        <p className="discret">Il fallait deux réponses, tu en as coché une.</p>
      )}
      {d.visuel && (
        <img className="jeu__visuel" src={`/visuels/${d.visuel.fichier}`} alt={d.visuel.alt} loading="lazy" />
      )}
      {d.visuel?.fichier.startsWith('sons/') && <BoutonSignal fichier={d.visuel.fichier} />}
      <ul className="propositions">
        {melangerPropositions(d.propositions, session.graine, d.id).map((p, rang) => {
          const bonne = q.reponses.includes(p.id);
          const cochee = donnee.includes(p.id);
          const classe = bonne ? ' proposition--juste' : cochee ? ' proposition--fausse' : '';
          return (
            <li key={p.id}>
              <div className={`proposition${classe}`}>
                <span className="proposition__lettre">{lettreAffichee(rang)}</span>
                <span className="proposition__texte">{p.texte}</span>
                {(bonne || cochee) && (
                  <span className="proposition__marque">
                    {cochee
                      ? bonne ? 'ta réponse, juste' : 'ta réponse'
                      : rate && donnee.length > 0 ? 'bonne réponse, oubliée' : 'bonne réponse'}
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
        {rate && <LienLecon question={d} retour={retourLecon} />}
      </div>
      <p style={{ marginTop: '0.6rem' }}><Signaler id={q.id} /></p>
    </article>
  );
}
