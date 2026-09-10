import { useEffect, useMemo, useState } from 'react';
import type { QuestionAffichable } from '../lib/banque';
import { ATTENTE_BANQUE, chargerBanque } from '../lib/banque-distante';
import { aujourdhui, charger } from '../lib/progression';
import type { Etat } from '../lib/progression';
import { estDue } from '../lib/quiz';
import type { EtatQuestion } from '../lib/quiz';
import { lienLecon } from '../lib/retour';
import { nomDuTheme } from '../lib/themes-client';
import { dateLisible } from '../lib/jour';
import './profil.css';

/**
 * Mes erreurs, lisibles sans rejouer.
 *
 * La progression comptait les échecs question par question depuis le début et
 * ne les montrait nulle part : pour revoir une question ratée, il fallait la
 * retirer au sort dans une série. Cette page la pose à plat — l'énoncé, la
 * bonne réponse, l'explication, la leçon — parce que relire n'est pas
 * rejouer, et que les deux gestes ne se remplacent pas.
 *
 * Deux listes, et l'ordre compte. Ce qui est dû aujourd'hui d'abord, le plus
 * en retard en tête : c'est ce que la série du jour va poser. Puis ce qui a
 * été raté un jour et n'est pas encore revenu, pour le candidat qui cherche
 * une question précise.
 *
 * Rien ne part d'ici : la progression est dans ce navigateur, la banque
 * arrive en un JSON comme sur les écrans de jeu.
 */

const CHEMIN = '/profil/erreurs';

interface Props {
  /** La banque déjà là. Les tests s'en servent ; les pages donnent `source`. */
  questions?: QuestionAffichable[];
  /** URL du JSON de la banque. */
  source?: string;
  /** Le jour, pour dire ce qui est dû. Les tests le figent. */
  jour?: string;
}

interface Ligne {
  question: QuestionAffichable;
  etat: EtatQuestion;
}

/** Le texte des bonnes réponses, dans l'ordre de la question. */
function bonnesReponses(q: QuestionAffichable): string {
  return q.propositions
    .filter((p) => q.reponses.includes(p.id))
    .map((p) => p.texte)
    .join(' — ');
}

function Erreur({ question, etat, jour }: Ligne & { jour: string }) {
  const retard = etat.revoirLe && etat.revoirLe < jour ? etat.revoirLe : null;
  return (
    <li className="erreur">
      <p className="erreur__rang discret">
        {nomDuTheme(question.theme)}
        {etat.ratees > 0 && ` · ratée ${etat.ratees === 1 ? 'une fois' : `${etat.ratees} fois`}`}
        {retard && ` · due depuis le ${dateLisible(retard)}`}
      </p>
      <h3 className="erreur__enonce">{question.enonce}</h3>
      {question.visuel && (
        <img
          className="erreur__visuel"
          src={`/visuels/${question.visuel.fichier}`}
          alt={question.visuel.alt}
          loading="lazy"
        />
      )}
      <p className="erreur__bonne">
        <b>La bonne réponse :</b> {bonnesReponses(question)}
      </p>
      <p className="erreur__explication">{question.explication}</p>
      {question.notion && (
        <p className="erreur__lecon">
          <a
            href={lienLecon(question.theme, question.notion, CHEMIN)}
            data-mesure="erreurs-lecon"
            data-mesure-notion={question.notion}
          >
            La leçon qui l’explique
          </a>
        </p>
      )}
    </li>
  );
}

/** Ce que la progression retient de mes erreurs, rangé en deux listes. */
export function rangerErreurs(
  questions: readonly QuestionAffichable[],
  etat: Etat,
  jour: string,
): { dues: Ligne[]; ratees: Ligne[] } {
  const dues: Ligne[] = [];
  const ratees: Ligne[] = [];

  for (const question of questions) {
    const e = etat.questions[question.id];
    if (!e) continue;
    if (estDue(e, jour)) dues.push({ question, etat: e });
    else if (e.ratees > 0) ratees.push({ question, etat: e });
  }

  // Le plus en retard d'abord, et à égalité de jour le plus fragile : le même
  // ordre que la série du jour, pour que la page et le jeu disent pareil.
  dues.sort(
    (a, b) =>
      (a.etat.revoirLe ?? '').localeCompare(b.etat.revoirLe ?? '') ||
      a.etat.succes - b.etat.succes ||
      a.question.id.localeCompare(b.question.id),
  );
  // Les plus ratées d'abord, puis les plus récentes.
  ratees.sort(
    (a, b) =>
      b.etat.ratees - a.etat.ratees ||
      b.etat.vueLe.localeCompare(a.etat.vueLe) ||
      a.question.id.localeCompare(b.question.id),
  );
  return { dues, ratees };
}

function Liste({ questions, jour }: { questions: QuestionAffichable[]; jour: string }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  useEffect(() => setEtat(charger()), []);

  const range = useMemo(
    () => (etat ? rangerErreurs(questions, etat, jour) : null),
    [questions, etat, jour],
  );

  if (!range) return null;
  const { dues, ratees } = range;

  return (
    <div className="erreurs">
      <h1>Ce que tu as raté</h1>
      <p>
        Ce qui est dû aujourd’hui, puis ce que tu as raté au moins une fois. Tout est là pour être
        relu : la bonne réponse, l’explication, et la leçon derrière.
      </p>

      {dues.length === 0 && ratees.length === 0 ? (
        <div className="encadre">
          <p className="encadre__titre">Rien à revoir, rien de raté.</p>
          <p className="discret">
            Réponds à quelques questions, et ce que tu rates se range ici.{' '}
            <a href="/entrainement">S’entraîner par thème</a>.
          </p>
        </div>
      ) : (
        <div className="jeu__actions">
          <a className="bouton bouton--principal" href="/revoir" data-mesure="erreurs-serie">
            Jouer ma série du jour
          </a>
        </div>
      )}

      {dues.length > 0 && (
        <section className="erreurs__dues" aria-labelledby="dues-titre">
          <h2 id="dues-titre">
            Dû aujourd’hui <span className="pastille">{dues.length}</span>
          </h2>
          <p className="discret">
            Ces questions reviennent dans ta série du jour. Les relire d’abord ne les fait pas
            disparaître : il faut les réussir deux jours différents.
          </p>
          <ul className="erreurs__liste">
            {dues.map((l) => (
              <Erreur key={l.question.id} {...l} jour={jour} />
            ))}
          </ul>
        </section>
      )}

      {ratees.length > 0 && (
        <section className="erreurs__ratees" aria-labelledby="ratees-titre">
          <h2 id="ratees-titre">
            Déjà ratées <span className="pastille">{ratees.length}</span>
          </h2>
          <p className="discret">
            Tu les as ratées au moins une fois, et elles ne sont pas dues aujourd’hui. Elles
            reviendront le jour dit.
          </p>
          <ul className="erreurs__liste">
            {ratees.map((l) => (
              <Erreur key={l.question.id} {...l} jour={jour} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * La page, banque comprise. Même partage que l'écran de jeu : deux entrées,
 * jamais les deux à la fois, et rien n'est monté avant que la banque soit là.
 */
export default function Erreurs({ questions, source, jour }: Props) {
  const [chargees, setChargees] = useState<QuestionAffichable[] | null>(questions ?? null);
  const [echec, setEchec] = useState(false);
  const [leJour] = useState(() => jour ?? aujourdhui());

  useEffect(() => {
    if (!source || questions) return;
    let vivant = true;
    const controleur = new AbortController();
    const echeance = setTimeout(() => {
      controleur.abort();
      if (vivant) setEchec(true);
    }, ATTENTE_BANQUE);
    chargerBanque(source, controleur.signal)
      .then((servies) => {
        clearTimeout(echeance);
        if (vivant) setChargees(servies);
      })
      .catch(() => {
        clearTimeout(echeance);
        if (vivant) setEchec(true);
      });
    return () => {
      vivant = false;
      clearTimeout(echeance);
    };
  }, [source, questions]);

  if (echec) {
    return (
      <div className="encadre">
        <h1 className="encadre__titre">Les questions ne sont pas arrivées.</h1>
        <p className="discret">
          La connexion a lâché pendant le téléchargement de la banque. Rien n’est perdu : ce que tu
          as raté est sur cet appareil.
        </p>
      </div>
    );
  }

  if (!chargees) {
    return (
      <p className="discret" aria-busy="true" aria-live="polite">
        Chargement de tes erreurs.
      </p>
    );
  }

  return <Liste questions={chargees} jour={leJour} />;
}
