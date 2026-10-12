import type { Etat } from '../../lib/progression';
import { rienRevise } from '../../lib/progression';
import type { Mode, Session } from '../../lib/session';
import { SECONDES_PAR_QUESTION, ERREURS_ADMISES } from '../../lib/quiz';
import { POUR_APP } from '../../lib/cible';

interface Props {
  mode: Mode;
  /** Combien de questions la série tirée compte. */
  taille: number;
  /** L'état lu au montage : ce qu'on sait du candidat avant qu'il commence. */
  depart: Etat;
  premiereLecon?: { chemin: string; nom: string };
  /** L'examen laissé en plan, s'il colle encore à la banque. */
  reprise: Session | null;
  commencer: () => void;
  reprendre: () => void;
}

/**
 * L'écran de départ de l'examen blanc : le format de l'épreuve, l'examen
 * laissé en plan s'il y en a un, et le bouton qui lance le chrono. Rien ne
 * part avant ce clic.
 */
export default function Depart({ mode, taille, depart, premiereLecon, reprise, commencer, reprendre }: Props) {
  return (
    <div className="jeu depart">
      {/* Dans l'app, le titre est celui de l'onglet : l'écran se comprend en
          le regardant, les cinq règles dessous disent le reste. */}
      <h1 className="depart__titre">
        {POUR_APP ? 'Examen blanc' : 'Quarante questions, dans les conditions de l’épreuve.'}
      </h1>

      {/* Un premier examen sans rien avoir lu : on tourne autour de vingt
          sur quarante, et on part avant la dixième question. Huit premiers
          essais mesurés en septembre 2026 : de 14 à 25, médiane 19,5. Le
          chiffre se revoit quand la mesure en aura davantage. Sous le titre,
          pas sous les règles : sur un téléphone, le bouton collant est déjà
          là et l'encart, plus bas, ne se verrait pas. */}
      {/* Qui a déjà navigué, ou repasse l'épreuve, vient d'entendre le
          questionnaire lui dire de faire un examen blanc tout de suite :
          l'encart le contredirait. */}
      {mode === 'examen' && premiereLecon && !reprise && rienRevise(depart) &&
        depart.profil.depart !== 'navigue' && depart.profil.depart !== 'repasse' && (
        <div className="encadre depart__novice">
          <p>
            <strong>Tu n’as encore rien révisé.</strong> Au premier essai, on tourne autour de 20 sur 40,
            et il en faut 35.
          </p>
          <p>
            Commence plutôt par la première leçon :{' '}
            <a href={premiereLecon.chemin} data-mesure="examen-premiere-lecon">{premiereLecon.nom}</a>.
          </p>
        </div>
      )}

      <ul className="depart__format">
        <li>
          <b>{taille} question{taille > 1 ? 's' : ''}</b> tirées au sort dans les quatorze
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

      {/* L'aide clavier n'a rien à faire sur un téléphone, et la note sur
          l'arrêté est un texte de site : l'app ouvre sur l'action. */}
      {!POUR_APP && (
        <>
          <p className="discret">
            Au clavier : <b>A</b>, <b>B</b>, <b>C</b>, <b>D</b> pour cocher, <b>Entrée</b> pour valider et passer.
          </p>
          <p className="discret">
            L’arrêté du 28 septembre 2007 fixe les quarante questions et les cinq erreurs admises.
            Les vingt secondes et la règle des une ou deux bonnes réponses n’y sont pas : elles
            viennent de la description de l’épreuve par les opérateurs agréés.
          </p>
        </>
      )}

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

      {/* Dans l'app, la barre d'onglets est encore là avant le départ. */}
      {!POUR_APP && (
        <p className="depart__retour">
          <a className="signaler" href="/">Retour à l’accueil</a>
        </p>
      )}

      <div className="jeu__actions jeu__actions--collant">
        {reprise ? (
          <>
            <button className="bouton bouton--principal" type="button" onClick={reprendre}>
              Reprendre à la question {reprise.index + 1}
            </button>
            <button className="bouton" type="button" onClick={commencer}>
              Commencer un nouvel examen
            </button>
          </>
        ) : (
          <button className="bouton bouton--principal" type="button" onClick={commencer}>
            Commencer l’examen
          </button>
        )}
      </div>
    </div>
  );
}
