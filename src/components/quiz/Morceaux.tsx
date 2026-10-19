import type { QuestionAffichable } from '../../lib/banque';
import { POUR_APP } from '../../lib/cible';
import { lienLecon } from '../../lib/retour';

/** Les textes cités sous une explication, avec leur lien quand ils en ont un. */
function ListeSources({ sources }: { sources: QuestionAffichable['sources'] }) {
  return (
    <ul>
      {sources.map((s) => (
        <li key={`${s.ref}-${s.texte}`}>
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              data-mesure="source-ouverte"
              data-mesure-ref={s.ref}
            >
              {s.texte}
            </a>
          ) : (
            s.texte
          )}
        </li>
      ))}
    </ul>
  );
}

/** Sur le site, la source est écrite sous l'explication ; dans l'app, elle se déplie. */
export function Sources({ sources }: { sources: QuestionAffichable['sources'] }) {
  if (POUR_APP) {
    return (
      <details className="sources sources--repli">
        <summary>Source</summary>
        <ListeSources sources={sources} />
      </details>
    );
  }
  return (
    <div className="sources">
      <span>Source :</span>
      <ListeSources sources={sources} />
    </div>
  );
}

export function Signaler({ id }: { id: string }) {
  return (
    <a className="signaler" href={`/signaler?question=${encodeURIComponent(id)}`}>
      Signaler une erreur sur cette question
    </a>
  );
}

/**
 * Sous un verdict raté : la leçon de la notion, et le chemin du retour.
 *
 * C'était le manque le plus cher de l'écran de jeu. L'explication et la
 * source disent pourquoi la réponse est fausse ; elles ne disent pas où
 * apprendre la règle. Chaque question publiée porte une notion, donc une
 * leçon : elle est à un clic, et le retour ramène à la série.
 *
 * Une question sans notion n'affiche rien plutôt qu'un lien mort.
 */
export function LienLecon({ question, retour }: { question: QuestionAffichable; retour: string }) {
  if (!question.notion) return null;
  return (
    <p className="verdict__lecon">
      <a
        href={lienLecon(question.theme, question.notion, retour)}
        data-mesure="verdict-lecon"
        data-mesure-notion={question.notion}
      >
        La leçon qui l’explique
      </a>
    </p>
  );
}

/**
 * L'attente.
 *
 * L'îlot est en `client:only` : rien n'est rendu au serveur, donc le
 * téléchargement ajoute un vide visible là où la page était déjà pleine. Une
 * silhouette de question tient la place — même gouttière, mêmes hauteurs de
 * carte — plutôt qu'un tourniquet, qui n'annonce rien de ce qui vient.
 *
 * `aria-busy` et le texte hors écran disent au lecteur d'écran ce que l'œil
 * comprend tout seul.
 */
export function Silhouette({ propositions }: { propositions: number }) {
  return (
    <div className="jeu silhouette" aria-busy="true" aria-live="polite">
      <p className="visuellement-cache">Chargement des questions.</p>
      <div className="silhouette__enonce">
        <span className="silhouette__ligne" />
        <span className="silhouette__ligne silhouette__ligne--courte" />
      </div>
      <ul className="propositions">
        {Array.from({ length: propositions }, (_, rang) => (
          <li key={rang}>
            <span className="proposition silhouette__proposition">
              <span className="silhouette__pastille" />
              <span className="silhouette__ligne" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * La banque n'est pas venue. Sur le site, c'est une coupure de réseau au
 * premier chargement : le service worker garde le JSON, donc ça ne se produit
 * qu'avant la première visite hors ligne. Dans la coquille iOS, le fichier est
 * dans le bundle et ce cas n'existe pas.
 */
export function Panne({ reessayer }: { reessayer: () => void }) {
  return (
    <div className="encadre">
      <h1 className="encadre__titre">Les questions ne sont pas arrivées.</h1>
      <p className="discret">
        La connexion a lâché pendant le téléchargement de la banque. Rien n’est perdu : ta
        progression est sur cet appareil.
      </p>
      <p>
        <button className="bouton bouton--principal" type="button" onClick={reessayer}>
          Réessayer
        </button>
      </p>
    </div>
  );
}

/** Une série vide : rien de dû aujourd'hui, ou une banque encore sans question. */
export function SerieVide({ revoir }: { revoir: boolean }) {
  return revoir ? (
    <div className="encadre">
      <h1 className="encadre__titre">Rien à revoir aujourd’hui.</h1>
      <p className="discret">
        Chaque question réussie revient un jour plus tard, puis trois, puis sept, puis vingt et un.
        Rien n’est dû aujourd’hui. <a href="/entrainement">S’entraîner par thème</a>.
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
