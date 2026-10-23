import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { creerSession, questionCourante, reduire, restaurerSession } from '../lib/session';
import type { Action, Mode, Session } from '../lib/session';
import { aleaSeme, erreursDuJour, estDue, serieCourte, serieDuJour, tirerExamen, TAILLE_SERIE_COURTE } from '../lib/quiz';
import { melangerPropositions } from '../lib/melange';
import { charger, aujourdhui, CLE_STOCKAGE } from '../lib/progression';
import type { QuestionAffichable } from '../lib/banque';
import type { BadgeAnnonce } from '../lib/badges-geste';
import { ATTENTE_BANQUE, chargerBanqueServie } from '../lib/banque-distante';
import { nomDuTheme } from '../lib/themes-client';
import { POUR_APP } from '../lib/cible';
import { vibrer } from '../lib/natif';
import { banqueGardee, chercherMiseAJour, plusRecente } from '../lib/banque-locale';
import BoutonSignal from './BoutonSignal';
import Depart from './quiz/Depart';
import { EnteteApp, EnteteSite } from './quiz/Entete';
import { Panne, SerieVide, Silhouette } from './quiz/Morceaux';
import PanneauVerdict from './quiz/PanneauVerdict';
import Proposition from './quiz/Proposition';
import Resultat from './quiz/Resultat';
import {
  useClavier,
  useEcritureDeLaSerie,
  useFinEtMesureDeLaSerie,
  useModeConcentration,
  useVerdictEnVue,
  type ContexteClavier,
} from './quiz/effets';
import './quiz.css';

interface Props {
  mode: Mode;
  /**
   * Toute la banque en examen, les questions du thème en entraînement. Les
   * pages ne la passent plus : elles donnent `source`, et la banque arrive en
   * un JSON commun. Le tableau reste pour les tests, qui n'ont pas de réseau.
   */
  questions?: QuestionAffichable[];
  /**
   * URL du JSON de banque. Un des deux, jamais les deux : quand elle est là,
   * l'écran attend le téléchargement, puis filtre sur `theme` s'il y en a un.
   */
  source?: string;
  theme?: string;
  /**
   * L'entraînement d'une seule notion. Le nom vient de la page : les cent
   * cinq notions sont une table de mille lignes, et l'écran de jeu n'a pas à
   * l'embarquer dans le navigateur pour afficher un titre.
   */
  notion?: { code: string; nom: string };
  /** Série des seules questions ratées, tous thèmes mêlés. */
  revoir?: boolean;
  /**
   * La première leçon du parcours, que l'examen propose à qui n'a encore rien
   * révisé. Passée par la page pour la même raison que `notion` : le parcours
   * ne voyage pas jusqu'au navigateur pour un seul lien.
   */
  premiereLecon?: { chemin: string; nom: string };
}


/** Action propre à l'écran, que le modèle de session n'a pas à connaître. */
type ActionEcran = Action | { type: 'restaurer'; session: Session };

function reduireEcran(s: Session, action: ActionEcran): Session {
  return action.type === 'restaurer' ? action.session : reduire(s, action);
}

/**
 * L'écran de jeu proprement dit. Il reçoit une banque déjà là : tous ses états
 * se calculent au montage — le tirage, la reprise, la progression lue une
 * fois — et un tableau qui arriverait après coup les prendrait à froid. C'est
 * `Quiz`, en dessous, qui attend le téléchargement avant de le monter.
 *
 * `Partie` tient la session et l'orchestration ; chaque écran est un morceau
 * nommé de `quiz/`, et chaque effet un hook de `quiz/effets.ts`.
 */
function Partie({
  mode,
  questions,
  banque,
  theme,
  notion,
  revoir = false,
  premiereLecon,
}: Props & { questions: QuestionAffichable[]; banque: QuestionAffichable[] }) {
  // La progression est lue au montage, puis relue seulement tant que l'examen
  // n'est pas lancé (voir l'effet `storage` plus bas) : le tirage et la reprise
  // partent du même état, pas d'un état qui bouge sous eux.
  const [depart, setDepart] = useState(charger);

  // Le tirage se fait au montage, côté navigateur : chaque visite est un
  // examen différent, et le HTML servi reste le même pour tout le monde.
  const serie = useMemo(() => {
    if (questions.length === 0) return [];
    if (mode === 'examen') return tirerExamen(questions, aleaSeme(Date.now() >>> 0));
    // La série du jour, bornée par le rythme choisi : ce qui est dû, puis de
    // quoi découvrir. Un seul chemin, celui que la pastille de l'accueil compte.
    // Depuis un examen recalé (`/revoir?examen`) : ses erreurs d'abord, toutes,
    // sans le plafond du rythme ni le retard qui les doublerait.
    if (revoir && new URLSearchParams(window.location.search).has('examen')) {
      const erreurs = erreursDuJour(questions, depart.questions, aujourdhui());
      if (erreurs.length > 0) return erreurs;
    }
    if (revoir) return serieDuJour(questions, depart.questions, aujourdhui(), depart.profil.rythme ?? undefined);
    // L'entraînement : dix questions du thème, les fragiles et les jamais
    // vues d'abord. « Encore 10 » en tire dix autres de la progression du jour.
    return serieCourte(questions, depart.questions, aleaSeme(Date.now() >>> 0));
  }, [mode, questions, revoir, depart]);

  // Un examen laissé en plan, s'il colle encore à la banque et n'a pas un jour.
  const reprise = useMemo(
    () => (mode === 'examen' ? restaurerSession(depart.enCours, questions, mode, theme) : null),
    [mode, questions, theme, depart],
  );

  const parId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const [session, envoyer] = useReducer(reduireEcran, null, () => creerSession(mode, serie));

  // Deux onglets sur le même examen. Le second, ouvert sur l'écran de départ,
  // proposait de reprendre à la question où le premier en était au moment où
  // il a été ouvert — y compris après que le premier l'a fini. Tant qu'on est
  // au départ, on relit l'examen en cours quand un autre onglet l'écrit : la
  // proposition suit, ou disparaît. Lancé, l'examen n'écoute plus personne.
  useEffect(() => {
    if (mode !== 'examen' || session.phase !== 'depart') return;
    const relire = (e: StorageEvent) => {
      if (e.key === null || e.key === CLE_STOCKAGE) setDepart(charger());
    };
    window.addEventListener('storage', relire);
    return () => window.removeEventListener('storage', relire);
  }, [mode, session.phase]);

  // Le visuel qui n'est pas venu : un 404 sur `/visuels/`, ou le réseau coupé
  // avant la première visite. Une image cassée et son `alt` nu ne disent pas
  // ce qui s'est passé ; la description, elle, permet encore de répondre.
  const [visuelAbsent, setVisuelAbsent] = useState<string | null>(null);
  const [arretDemande, setArretDemande] = useState(false);
  const journalEcrit = useRef(0);
  const verdict = useRef<HTMLDivElement>(null);
  const continuer = useRef<HTMLButtonElement>(null);

  const question = questionCourante(session);
  const affichee = question ? parId.get(question.id) : undefined;
  const selection = session.selections[session.index] ?? [];

  // L'ordre d'affichage des propositions, tiré de la graine de la session : il
  // ne bouge ni entre deux rendus, ni au retour sur un examen repris.
  const ordre = useMemo(
    () => (affichee ? melangerPropositions(affichee.propositions, session.graine, affichee.id) : []),
    [affichee, session.graine],
  );

  // L'adresse de cet écran : ce que « recommencer » vise, et sous quel nom la
  // série se range dans le navigateur.
  const retour =
    mode === 'examen'
      ? '/examen'
      : revoir
        ? '/revoir'
        : notion
          ? `/entrainement/notion/${notion.code}`
          : `/entrainement/${theme}`;
  const retourSerie = mode === 'examen' ? undefined : retour;

  /**
   * Où ramène la leçon ouverte depuis un verdict.
   *
   * En entraînement, à la série elle-même : elle est écrite dans le navigateur
   * à chaque réponse, et l'écran la propose à la reprise, question comprise.
   * Après un examen, la revue n'est pas une série en cours — elle n'existe
   * qu'entre le résultat et le premier clic ailleurs. Ce qui lui survit, ce
   * sont les erreurs, et elles ont leur page.
   */
  const retourLecon = mode === 'examen' ? '/profil/erreurs' : retour;

  // La série d'entraînement quittée en route — pour aller lire une leçon, le
  // plus souvent. Elle est rangée sous l'adresse de sa page : une série de
  // balisage ne se reprend pas sur l'écran des feux.
  const repriseSerie = useMemo(
    () => (mode === 'entrainement' ? restaurerSession(depart.enCoursSerie, questions, mode, retourSerie) : null),
    [mode, questions, retourSerie, depart],
  );
  const [repriseEcartee, setRepriseEcartee] = useState(false);

  // Une série du jour sans rien de dû : elle n'est faite que de questions
  // jamais vues, et le candidat doit savoir pourquoi elles sont neuves.
  const rienDu = revoir && !serie.some((q) => estDue(depart.questions[q.id], aujourdhui()));

  const titre = mode === 'examen'
    ? 'Examen blanc'
    : revoir
      ? 'Ta série du jour'
      : notion
        ? `Entraînement, ${notion.nom}`
        : `Entraînement, ${nomDuTheme(theme ?? '')}`;

  // Le nom que cette série porte dans la mesure. Les trois écrans du composant
  // sont trois parcours différents : les mêler dans un seul compteur rendrait
  // chaque chiffre illisible.
  const nomSerie = mode === 'examen' ? 'examen' : revoir ? 'revoir' : 'entrainement';

  // Les badges que la série fait gagner, gardés au geste, annoncés au résultat.
  const [gagnes, setGagnes] = useState<BadgeAnnonce[]>([]);
  const badges = useMemo(
    () => ({ banque, gagnes: (annonces: BadgeAnnonce[]) => setGagnes((g) => [...g, ...annonces]) }),
    [banque],
  );

  useModeConcentration(session.phase === 'en-cours');
  useEcritureDeLaSerie(session, mode, theme, retourSerie, journalEcrit, badges);
  useFinEtMesureDeLaSerie({ session, mode, nomSerie, theme, notion, revoir, badges });
  useVerdictEnVue(session, verdict);

  useEffect(() => {
    if (arretDemande) continuer.current?.focus();
  }, [arretDemande]);

  // Le focus sur l'énoncé, au montage de chaque question et à ce moment-là
  // seulement. Une fonction de référence recréée à chaque rendu était
  // rappelée à chaque seconde du chrono, et reprenait le focus au bouton de
  // la confirmation d'arrêt. Tant que celle-ci est ouverte, il y reste.
  const focaliser = useCallback((noeud: HTMLElement | null) => {
    if (!contexte.current.arretDemande) noeud?.focus();
  }, []);

  const contexte = useRef<ContexteClavier>({ session, ordre, mode, arretDemande });
  contexte.current = { session, ordre, mode, arretDemande };
  useClavier(contexte, envoyer);

  // Le chrono vit dans l'en-tête et ne parle à la session qu'une fois par
  // question, quand l'échéance est passée : l'écran ne se refait pas à la
  // seconde.
  const echoir = useCallback(() => envoyer({ type: 'echu', maintenant: Date.now() }), []);

  // « Encore 10 » : une série neuve du même thème, tirée de la progression telle
  // que la série qui vient de finir l'a laissée. Le journal repart de zéro, et
  // les badges annoncés avec : ils étaient ceux de la série d'avant.
  const encore = useCallback(() => {
    journalEcrit.current = 0;
    setGagnes([]);
    setVisuelAbsent(null);
    envoyer({
      type: 'restaurer',
      session: creerSession(mode, serieCourte(questions, charger().questions, aleaSeme(Date.now() >>> 0))),
    });
    window.scrollTo({ top: 0 });
  }, [mode, questions]);

  const reprendreDepuis = useCallback((reprise: Session) => {
    // Les réponses du journal repris ont déjà été comptées dans la progression
    // avant l'interruption : sans ce décalage, elles y entreraient deux fois.
    journalEcrit.current = reprise.journal.length;
    envoyer({ type: 'restaurer', session: reprise });
  }, []);

  if (serie.length === 0) return <SerieVide revoir={revoir} />;

  if (session.phase === 'depart') {
    return (
      <Depart
        mode={mode}
        taille={serie.length}
        depart={depart}
        premiereLecon={premiereLecon}
        reprise={reprise}
        commencer={() => envoyer({ type: 'commencer', maintenant: Date.now() })}
        reprendre={() => reprise && reprendreDepuis(reprise)}
      />
    );
  }

  if (session.phase === 'resultat' && session.resultat) {
    return (
      <Resultat
        mode={mode}
        session={session}
        titre={titre}
        depart={depart}
        parId={parId}
        retour={retour}
        retourLecon={retourLecon}
        badges={gagnes}
        serie={
          mode === 'entrainement' && !revoir
            ? { encore: Math.min(TAILLE_SERIE_COURTE, questions.length), relancer: encore }
            : undefined
        }
      />
    );
  }

  if (!question || !affichee) return null;

  const plein = selection.length === 2;

  // Reprendre n'a de sens qu'avant d'avoir joué : une série entamée ici a
  // déjà remplacé celle d'avant.
  const offreReprise =
    repriseSerie !== null &&
    repriseSerie.index > 0 &&
    !repriseEcartee &&
    session.index === 0 &&
    session.journal.length === 0 &&
    !session.corrigee;

  const pied = (
    <PanneauVerdict
      mode={mode}
      session={session}
      question={affichee}
      retourLecon={retourLecon}
      arretDemande={arretDemande}
      demanderArret={setArretDemande}
      envoyer={envoyer}
      verdict={verdict}
      continuer={continuer}
    />
  );

  return (
    <div className="jeu">
      <h1 className="visuellement-cache">{titre}</h1>

      {offreReprise && (
        <div className="encadre jeu__reprise">
          <p>
            <strong>Tu avais une série en cours</strong>, arrêtée à la question{' '}
            {repriseSerie.index + 1} sur {repriseSerie.questions.length}.
          </p>
          <div className="jeu__actions">
            <button
              className="bouton bouton--principal"
              type="button"
              onClick={() => reprendreDepuis(repriseSerie)}
            >
              Reprendre à la question {repriseSerie.index + 1}
            </button>
            <button
              className="bouton bouton--discret"
              type="button"
              onClick={() => setRepriseEcartee(true)}
            >
              Repartir du début
            </button>
          </div>
        </div>
      )}

      {POUR_APP ? <EnteteApp session={session} mode={mode} demanderArret={setArretDemande} echoir={echoir} /> : <EnteteSite session={session} echoir={echoir} />}

      {rienDu && session.index === 0 && (
        <p className="discret">
          Rien n’est dû aujourd’hui : voilà {serie.length} question{serie.length > 1 ? 's' : ''} jamais
          vue{serie.length > 1 ? 's' : ''}, prise{serie.length > 1 ? 's' : ''} dans tes notions les plus fragiles.
        </p>
      )}

      {mode === 'entrainement' && session.index === 0 && (
        <p className="jeu__consigne">
          {POUR_APP
            ? 'Une ou deux bonnes réponses : il faut toutes les bonnes cases.'
            : 'Une ou deux bonnes réponses. La réponse doit être exacte, une bonne case seule ne suffit pas quand il en faut deux.'}
        </p>
      )}

      {/* `key` sur ces trois éléments : React les remonte à chaque question,
          ce qui rejoue leur animation d'entrée. Sans lui, le DOM est réutilisé
          et le passage d'une question à l'autre ne se voit plus. */}
      {/* Le focus vient se poser ici à chaque question.

          L'épreuve est chronométrée à vingt secondes : qui joue au clavier ou
          au lecteur d'écran ne peut pas se permettre de repartir du haut du
          document à chaque fois. Or le bouton qu'on vient d'activer disparaît,
          et le focus retombe sur `body` — c'était le cas jusqu'ici, y compris
          au démarrage de l'examen, et rien n'annonçait le changement de
          question.

          Le titre n'est ni un bouton ni un lien : le raccourci Entrée continue
          donc de valider, là où un élément activable se serait déclenché tout
          seul (voir `activable` dans `useClavier`). Le `key` le remonte à
          chaque question, ce qui suffit à rejouer le geste. */}
      <h2
        className="jeu__enonce"
        key={`enonce-${question.id}`}
        tabIndex={-1}
        ref={focaliser}
      >
        <span className="visuellement-cache">
          Question {session.index + 1} sur {session.questions.length}.{' '}
        </span>
        {affichee.enonce}
      </h2>

      {affichee.visuel && (visuelAbsent === question.id ? (
        <div className="jeu__visuel jeu__visuel--absent" key={`visuel-${question.id}`}>
          <span className="discret">Visuel introuvable. Ce qu’il montre :</span>
          <span>{affichee.visuel.alt}</span>
        </div>
      ) : (
        <img
          className="jeu__visuel"
          key={`visuel-${question.id}`}
          src={`/visuels/${affichee.visuel.fichier}`}
          alt={affichee.visuel.alt}
          onError={() => setVisuelAbsent(question.id)}
        />
      ))}
      {/* Présent en examen blanc comme ailleurs : écouter consomme les vingt
          secondes de la question, comme regarder la frise. Le `key` le
          démonte à chaque question, ce qui coupe un son encore en cours. */}
      {affichee.visuel?.fichier.startsWith('sons/') && (
        <BoutonSignal key={`signal-${question.id}`} fichier={affichee.visuel.fichier} />
      )}

      <ul className="propositions" key={`propositions-${question.id}`}>
        {ordre.map((p, rang) => {
          const cochee = selection.includes(p.id);
          const bonne = question.reponses.includes(p.id);
          return (
            <Proposition
              key={p.id}
              texte={p.texte}
              rang={rang}
              cochee={cochee}
              etat={bonne ? 'juste' : cochee ? 'fausse' : null}
              corrigee={session.corrigee}
              desactivee={session.corrigee || (plein && !cochee)}
              basculer={() => {
                void vibrer('choix');
                envoyer({ type: 'basculer', proposition: p.id });
              }}
            />
          );
        })}
      </ul>

      {plein && !session.corrigee && (
        <p className="discret">Deux réponses au maximum. Décoche pour en changer.</p>
      )}

      {POUR_APP ? <div className="jeu__pied">{pied}</div> : pied}
    </div>
  );
}

/**
 * L'écran de jeu, banque comprise.
 *
 * Deux entrées, jamais les deux à la fois : `questions`, que les tests
 * donnent en tableau, et `source`, l'URL du JSON que les pages donnent. Le
 * corps du jeu ne monte qu'une fois la banque là, sans quoi son tirage et sa
 * reprise partiraient d'un tableau vide.
 */
export default function Quiz({ source, questions, ...reste }: Props) {
  const [chargees, setChargees] = useState<QuestionAffichable[] | null>(questions ?? null);
  const [echec, setEchec] = useState(false);
  // Change à chaque « Réessayer » : c'est ce qui relance l'effet.
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    if (!source || questions) return;
    let vivant = true;
    setEchec(false);
    // Une échéance, parce qu'un réseau muet ne rejette rien : un portail
    // captif ou un mobile qui a lâché accepte la connexion et se tait. Sans
    // elle, la silhouette bat sans fin et l'écran n'offre pas même un bouton.
    const controleur = new AbortController();
    const echeance = setTimeout(() => {
      controleur.abort();
      if (vivant) setEchec(true);
    }, ATTENTE_BANQUE);

    void (async () => {
      try {
        // La banque que la page désigne. Sur le site elle vient du réseau ou
        // du service worker ; dans la coquille elle est dans le bundle, donc
        // locale et instantanée, et c'est elle qui fait tenir le mode avion.
        const embarquee = await chargerBanqueServie(source, controleur.signal);
        // L'échéance ne couvre que le réseau : ce qui suit est local, et un
        // IndexedDB lent ne doit pas faire afficher une panne de connexion.
        clearTimeout(echeance);

        // Une banque téléchargée depuis, si elle est plus récente. Sur le
        // site, `banqueGardee` rend toujours null.
        const gardee = await banqueGardee();
        const retenue =
          gardee && plusRecente(gardee.version, embarquee.version) ? gardee : embarquee;
        if (!vivant) return;
        setChargees(retenue.questions);

        // Puis on demande au site s'il y a mieux, sans rien attendre : la
        // série qui commence joue ce qu'elle a en main, la suivante aura le
        // reste. Aucun message, aucune erreur affichée. Sur le site,
        // `chercherMiseAJour` ne fait rien.
        void chercherMiseAJour(retenue.version);
      } catch {
        clearTimeout(echeance);
        if (vivant) setEchec(true);
      }
    })();

    return () => {
      vivant = false;
      clearTimeout(echeance);
    };
  }, [source, questions, essai]);

  // Le JSON porte toute la banque, une seule fois pour les seize écrans de
  // jeu. L'entraînement par thème y taille sa part ici.
  const servies = useMemo(() => {
    if (!chargees) return null;
    if (questions) return chargees;
    // La notion d'abord : elle est plus fine que le thème, et une page de
    // notion donne les deux.
    if (reste.notion) return chargees.filter((q) => q.notion === reste.notion!.code);
    return reste.theme ? chargees.filter((q) => q.theme === reste.theme) : chargees;
  }, [chargees, questions, reste.theme, reste.notion]);

  if (echec) return <Panne reessayer={() => setEssai((n) => n + 1)} />;
  // Quatre propositions : c'est le format visé par la banque, et une silhouette
  // qui se trompe d'une ligne ne se remarque pas ; une qui saute, si.
  if (!servies) return <Silhouette propositions={4} />;
  return <Partie {...reste} questions={servies} banque={chargees!} />;
}
