/**
 * Les effets de l'écran de jeu, nommés par ce qu'ils gardent.
 *
 * `Partie` les appelle dans l'ordre où ils étaient écrits dans son corps :
 * React lance les effets d'un composant dans l'ordre de leur déclaration, et
 * la fin d'une série lit le drapeau d'abandon que l'effet d'abandon pose.
 */
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { extraireSauvegarde, type Action, type Mode, type Session } from '../../lib/session';
import {
  charger,
  sauvegarder,
  enregistrerReponse,
  enregistrerExamen,
  examenPasse,
  enregistrerEnCours,
  effacerEnCours,
  enregistrerEnCoursSerie,
  effacerEnCoursSerie,
  aujourdhui,
} from '../../lib/progression';
import { evenement } from '../../lib/mesure';
import { douceur } from '../../lib/douceur';
import { POUR_APP } from '../../lib/cible';
import { modeConcentration, vibrer } from '../../lib/natif';
import { rangDeLaTouche } from '../../lib/melange';
import type { QuestionAffichable } from '../../lib/banque';
import { gagnerAuGeste, type BadgeAnnonce } from '../../lib/badges-geste';
import type { QuestionConnue } from '../../lib/profil';

type Envoyer = (action: Action) => void;

/** Les badges gagnés par un geste de la série, à annoncer au résultat. */
export interface Badges {
  /** Toute la banque publiée, pas la part de la série : un geste compte pour tous les thèmes. */
  banque: readonly QuestionConnue[];
  gagnes: (annonces: BadgeAnnonce[]) => void;
}

/**
 * Le geste vient d'être écrit : ce qu'il fait gagner est gardé tout de suite,
 * et rangé pour le résultat. Un module qui ne vient pas (hors ligne sur le
 * site) ne casse rien : le geste suivant attribuera.
 */
function attribuer({ banque, gagnes }: Badges): void {
  gagnerAuGeste(banque).then((annonces) => annonces.length > 0 && gagnes(annonces), () => {});
}

/**
 * Le plein écran de la série, dans l'app : la barre d'onglets se cache dès
 * que la série court — premier clic, reprise d'un examen, entraînement
 * ouvert — et revient au résultat, à l'arrêt, ou quand l'écran s'en va.
 *
 * `pagehide` couvre le lien qu'on suit en pleine série (la leçon d'un
 * verdict raté, « Changer de thème ») : un chargement de page complet ne
 * démonte pas React, et la barre resterait cachée sur l'écran suivant. Sur
 * le site, `modeConcentration` ne fait rien.
 */
export function useModeConcentration(enJeu: boolean, examen: boolean): void {
  useEffect(() => {
    if (!enJeu) return;
    void modeConcentration(true, examen);
    const rendre = () => void modeConcentration(false);
    window.addEventListener('pagehide', rendre);
    return () => {
      window.removeEventListener('pagehide', rendre);
      rendre();
    };
  }, [enJeu, examen]);
}

/**
 * Ce que la série écrit dans le navigateur : chaque réponse dans la
 * progression, l'examen en cours, la série d'entraînement en cours.
 *
 * `journalEcrit` compte les lignes du journal déjà comptées : une reprise le
 * pose à la longueur de son journal, sans quoi ses réponses entreraient deux
 * fois.
 */
export function useEcritureDeLaSerie(
  session: Session,
  mode: Mode,
  theme: string | undefined,
  retourSerie: string | undefined,
  journalEcrit: MutableRefObject<number>,
  badges: Badges,
): void {
  // Écriture de la progression locale, au fil des réponses.
  useEffect(() => {
    if (session.journal.length === journalEcrit.current) return;
    let etat = charger();
    for (const ligne of session.journal.slice(journalEcrit.current)) {
      etat = enregistrerReponse(etat, ligne.id, ligne.juste, aujourdhui());
    }
    sauvegarder(etat);
    journalEcrit.current = session.journal.length;
    // `retenu` se gagne à la réponse ; l'annonce attend le résultat.
    attribuer(badges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.journal, journalEcrit]);

  // L'examen en cours survit au rafraîchissement et à l'écran verrouillé. On
  // écrit à chaque question et à chaque case cochée, pas à chaque seconde.
  useEffect(() => {
    if (mode !== 'examen') return;
    const sauvegarde = extraireSauvegarde(session, theme);
    const etat = charger();
    sauvegarder(sauvegarde ? enregistrerEnCours(etat, sauvegarde) : effacerEnCours(etat));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme, session.phase, session.index, session.selections]);

  /**
   * La série d'entraînement survit à la page, elle aussi.
   *
   * Elle ne s'écrit qu'une fois commencée : tant qu'on est à la première
   * question sans avoir répondu, la série d'avant reste offerte à la reprise
   * plutôt que d'être écrasée par celle qu'on vient d'ouvrir. Finie, la fente
   * se vide : rien à reprendre d'une série qu'on a menée au bout.
   */
  useEffect(() => {
    if (mode !== 'entrainement') return;
    const commencee = session.index > 0 || session.journal.length > 0;
    if (!commencee && session.phase !== 'resultat') return;
    const sauvegarde = session.phase === 'resultat' ? null : extraireSauvegarde(session, retourSerie);
    const etat = charger();
    sauvegarder(sauvegarde ? enregistrerEnCoursSerie(etat, sauvegarde) : effacerEnCoursSerie(etat));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, retourSerie, session.phase, session.index, session.selections, session.journal]);
}

interface Serie {
  session: Session;
  mode: Mode;
  /** Le nom de la série dans la mesure : `examen`, `revoir` ou `entrainement`. */
  nomSerie: string;
  theme?: string;
  notion?: { code: string };
  revoir: boolean;
  badges: Badges;
}

/**
 * La fin d'une série, son départ, et son abandon : l'historique des examens,
 * le verdict qui se sent, et ce que la mesure en apprend.
 */
export function useFinEtMesureDeLaSerie({ session, mode, nomSerie, theme, notion, revoir, badges }: Serie): void {
  // Un abandon déjà compté pour la série en cours, et pas encore suivi d'un
  // retour. Partagé entre l'effet qui l'envoie et celui qui annonce la fin.
  const abandonEnvoye = useRef(false);

  useEffect(() => {
    if (session.phase !== 'resultat' || !session.resultat || session.resultat.total === 0) return;
    const r = session.resultat;
    let frame = 0;
    if (mode === 'examen') {
      // Un examen arrêté en route n'entre pas dans l'historique : trois
      // questions sur quarante s'afficheraient « reçu » sur l'accueil, ce qui
      // serait faux. Il compte dans la progression par question, pas comme
      // épreuve passée.
      if (!session.interrompu) {
        // Avec son détail par thème, que `sur` relit aux examens suivants.
        sauvegarder(enregistrerExamen(charger(), examenPasse(r, aujourdhui())));
        attribuer(badges);
        // Le verdict d'examen se sent, comme celui de chaque question en
        // entraînement. Un examen interrompu n'a pas de verdict à faire sentir.
        // Après un clic, cet effet part avant que le navigateur peigne : la
        // vibration aurait devancé le verdict écrit. La frame suivante est
        // celle qui le peint.
        frame = requestAnimationFrame(() => void vibrer(r.reussi ? 'reussi' : 'echoue'));
      }
      evenement('examen-termine', {
        bonnes: r.bonnes,
        erreurs: r.erreurs,
        total: r.total,
        // Le résultat juge les seules questions jouées : trois justes sur
        // quatre y sont « reçu ». Un examen arrêté n'a pas de verdict, ni à
        // l'écran ni dans la mesure.
        reussi: r.reussi && !session.interrompu,
        interrompu: session.interrompu,
        absent: abandonEnvoye.current,
      });
    } else {
      evenement(`${nomSerie}-termine`, { theme, notion: notion?.code, bonnes: r.bonnes, erreurs: r.erreurs, total: r.total });
      if (!session.interrompu) void vibrer('fin-serie');
    }
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase, session.resultat, session.interrompu, mode, theme, revoir]);

  useEffect(() => {
    if (session.phase !== 'en-cours') return;
    evenement(`${nomSerie}-commence`, { theme, notion: notion?.code });
    // Une seule fois, au vrai départ de la série.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase === 'en-cours']);

  // Une série quittée en route ne dit rien d'elle-même. Sans ce signal, les
  // départs et les arrivées ne se recoupent pas : on saurait que la moitié des
  // examens ne finit pas, jamais à quelle question ils s'arrêtent.
  const enCours = useRef({ index: 0, total: 0, phase: session.phase });
  enCours.current = { index: session.index, total: session.questions.length, phase: session.phase };

  useEffect(() => {
    if (session.phase !== 'en-cours') return;
    abandonEnvoye.current = false;
    const partir = () => {
      const s = enCours.current;
      if (abandonEnvoye.current || s.phase !== 'en-cours') return;
      abandonEnvoye.current = true;
      evenement(`${nomSerie}-abandonne`, { rang: s.index + 1, total: s.total, theme });
    };
    // `pagehide` couvre la fermeture et la navigation, là où `unload` ne part
    // plus. Il manque pourtant sur mobile : téléphone verrouillé, autre app,
    // onglet tué depuis le sélecteur. Huit examens sur vingt-neuf finissaient
    // ainsi sans un mot, en septembre 2026. La page cachée compte donc comme
    // un abandon ; si elle revient, `-revenu` le dit, et les abandons nets
    // se lisent par soustraction dans Umami. Un examen qui finit page cachée,
    // mené au bout par le chrono sans personne, reste un abandon : son
    // `examen-termine` porte `absent: true`, à retirer des examens terminés.
    const surVisibilite = () => {
      if (document.hidden) {
        partir();
        return;
      }
      const s = enCours.current;
      if (!abandonEnvoye.current || s.phase !== 'en-cours') return;
      abandonEnvoye.current = false;
      evenement(`${nomSerie}-revenu`, { rang: s.index + 1, total: s.total, theme });
    };
    window.addEventListener('pagehide', partir);
    document.addEventListener('visibilitychange', surVisibilite);
    return () => {
      window.removeEventListener('pagehide', partir);
      document.removeEventListener('visibilitychange', surVisibilite);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.phase === 'en-cours', nomSerie, theme]);
}

/** Dans l'app, remonte la page pour que le panneau de correction ne couvre pas les réponses. */
function degagerReponses(): void {
  const pied = document.querySelector<HTMLElement>('.jeu__pied');
  const marquees = [...document.querySelectorAll<HTMLElement>('.propositions .proposition--juste, .propositions .proposition--fausse')];
  if (!pied || pied.offsetHeight === 0 || marquees.length === 0) return;
  const hautPanneau = window.innerHeight - pied.offsetHeight;
  const bas = Math.max(...marquees.map((e) => e.getBoundingClientRect().bottom));
  const haut = Math.min(...marquees.map((e) => e.getBoundingClientRect().top));
  // L'en-tête collé en haut reste visible : la première réponse s'arrête dessous.
  const defile = Math.min(bas - hautPanneau + 12, haut - 72);
  if (defile > 0) window.scrollBy({ top: defile, behavior: douceur() });
}

/**
 * La correction tombait sous la ligne de flottaison sur mobile : valider
 * n'avait l'air de rien faire. On la remonte dans le champ de vision, et
 * dans l'app le verdict se sent avant de se lire : le pouce est encore sur
 * le bouton quand la réponse tombe. Sur le site, `vibrer` ne fait rien. Même
 * chose au passage au résultat : le score est en haut de l'écran.
 */
export function useVerdictEnVue(session: Session, verdict: MutableRefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    if (!session.corrigee) return;
    // Dans l'app, le verdict monte en panneau collé au bas de l'écran : il
    // est déjà dans le champ. Le panneau peut en revanche couvrir la réponse
    // cochée et la bonne : la page remonte juste assez pour les dégager, sans
    // jamais pousser la première hors de l'écran.
    if (!POUR_APP) verdict.current?.scrollIntoView({ block: 'nearest', behavior: douceur() });
    else degagerReponses();
    void vibrer(session.juste ? 'juste' : 'faux');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.corrigee, session.index]);

  useEffect(() => {
    if (session.phase !== 'resultat') return;
    window.scrollTo({ top: 0, behavior: douceur() });
  }, [session.phase]);
}

/** Ce que le clavier lit à chaque touche, sans réabonner l'écouteur à chaque case. */
export interface ContexteClavier {
  session: Session;
  ordre: QuestionAffichable['propositions'];
  mode: Mode;
  arretDemande: boolean;
}

/**
 * Les commandes de la barre de menus du Mac, relayées par la coquille
 * (`BarreOnglets.swift`) en `app:commande`. Elles font ce que font les
 * touches, et rien de plus : le menu ne sait que nommer le geste.
 */
export const EVENEMENT_COMMANDE = 'app:commande';
type Commande = 'valider' | 'passer' | 'quitter';

/**
 * Échap, le menu « Quitter » : en examen, la confirmation d'arrêt s'ouvre, et
 * se referme au second appui, comme « Continuer l'examen ». En entraînement,
 * rien n'est perdu à partir, la série est écrite : on suit le lien de l'écran,
 * la croix de l'app ou « Changer de thème » du site, pour passer par les
 * mêmes chemins qu'un clic.
 */
function quitter(contexte: ContexteClavier, demanderArret: (oui: boolean) => void): boolean {
  const { session: s, mode: m, arretDemande: arret } = contexte;
  if (s.phase !== 'en-cours') return false;
  if (m === 'examen') {
    demanderArret(!arret);
    return true;
  }
  const lien = document.querySelector<HTMLAnchorElement>('a.jeu__croix, .jeu__entete a.signaler');
  if (!lien) return false;
  lien.click();
  return true;
}

/** Entrée hors d'un bouton : valide, ou passe à la suivante une fois corrigée. */
function valider(contexte: ContexteClavier, envoyer: Envoyer): boolean {
  const { session: s, mode: m, arretDemande: arret } = contexte;
  if (s.phase !== 'en-cours' || arret) return false;
  const choix = s.selections[s.index] ?? [];
  if (s.corrigee) {
    envoyer({ type: 'suivante', maintenant: Date.now() });
    return true;
  }
  if (m === 'entrainement' && choix.length === 0) return false;
  envoyer({ type: 'valider', maintenant: Date.now() });
  return true;
}

/**
 * « Passer la question », en examen seulement : comptée sans réponse, comme
 * le bouton « Passer » quand rien n'est coché. Ce qui était coché est
 * décoché d'abord : le menu dit passer, pas valider.
 */
function passer(contexte: ContexteClavier, envoyer: Envoyer): boolean {
  const { session: s, mode: m, arretDemande: arret } = contexte;
  if (m !== 'examen' || s.phase !== 'en-cours' || arret || s.corrigee) return false;
  for (const proposition of s.selections[s.index] ?? []) envoyer({ type: 'basculer', proposition });
  envoyer({ type: 'valider', maintenant: Date.now() });
  return true;
}

/**
 * ↑ et ↓ font circuler le focus d'une proposition à l'autre, en boucle ;
 * l'espace coche celle qui l'a. Pour qui joue sans souris, Tab y arrive aussi,
 * mais traverse l'en-tête à chaque question.
 */
function circuler(sens: 1 | -1, cible: HTMLElement | null): boolean {
  const lignes = [...document.querySelectorAll<HTMLButtonElement>('.propositions .proposition:not(:disabled)')];
  if (lignes.length === 0) return false;
  const ici = cible ? lignes.indexOf(cible as HTMLButtonElement) : -1;
  const suivante = ici < 0 ? (sens === 1 ? 0 : lignes.length - 1) : (ici + sens + lignes.length) % lignes.length;
  lignes[suivante]!.focus();
  return true;
}

/**
 * Le clavier, pour bachoter au bureau. Le contexte passe par une référence :
 * il change à chaque case cochée, on ne réabonne pas l'écouteur pour ça.
 */
export function useClavier(
  contexte: MutableRefObject<ContexteClavier>,
  envoyer: Envoyer,
  demanderArret: (oui: boolean) => void,
): void {
  useEffect(() => {
    function surCommande(evenement: Event) {
      const nom = (evenement as CustomEvent<{ nom?: Commande } | null>).detail?.nom;
      if (nom === 'valider') valider(contexte.current, envoyer);
      else if (nom === 'passer') passer(contexte.current, envoyer);
      else if (nom === 'quitter') quitter(contexte.current, demanderArret);
    }

    function surTouche(evenementClavier: KeyboardEvent) {
      if (evenementClavier.metaKey || evenementClavier.ctrlKey || evenementClavier.altKey) return;
      // La cible n'est pas toujours un élément : une touche pressée sans focus
      // arrive avec `document` pour cible.
      const cible = evenementClavier.target instanceof HTMLElement ? evenementClavier.target : null;
      if (cible?.closest('input, textarea, select, [contenteditable="true"]')) return;
      // Un bouton d'action qui a le focus s'active tout seul : ne pas doubler.
      // Une proposition est un bouton elle aussi, mais Chromium lui laisse le
      // focus après un clic souris : sans cette exception, Entrée décochait la
      // réponse au lieu de valider, alors que l'écran de départ le promet. Même
      // chose pour « Écouter le signal » : Entrée y relançait le son, et
      // l'examen perdait ses secondes. L'espace, elle, l'active toujours.
      const activable =
        (cible?.tagName === 'BUTTON' || cible?.tagName === 'A') &&
        !cible.classList.contains('proposition') &&
        !cible.classList.contains('signal-ecoute');

      const { session: s, ordre: o, arretDemande: arret } = contexte.current;

      if (s.phase === 'depart') {
        if (evenementClavier.key === 'Enter' && !activable) {
          evenementClavier.preventDefault();
          envoyer({ type: 'commencer', maintenant: Date.now() });
        }
        return;
      }
      if (evenementClavier.key === 'Escape') {
        if (quitter(contexte.current, demanderArret)) evenementClavier.preventDefault();
        return;
      }
      if (s.phase !== 'en-cours' || arret) return;

      if (evenementClavier.key === 'ArrowDown' || evenementClavier.key === 'ArrowUp') {
        if (circuler(evenementClavier.key === 'ArrowDown' ? 1 : -1, cible)) evenementClavier.preventDefault();
        return;
      }

      // La touche vise une ligne de l'écran, pas un identifiant de fichier :
      // « B » coche ce que l'écran appelle B, quel que soit l'id derrière.
      const rang = rangDeLaTouche(evenementClavier.key);
      if (rang !== undefined && !s.corrigee) {
        const visee = o[rang];
        if (!visee) return;
        evenementClavier.preventDefault();
        envoyer({ type: 'basculer', proposition: visee.id });
        return;
      }

      if (evenementClavier.key === 'Enter' && !activable) {
        if (valider(contexte.current, envoyer)) evenementClavier.preventDefault();
      }
    }

    document.addEventListener('keydown', surTouche);
    window.addEventListener(EVENEMENT_COMMANDE, surCommande);
    return () => {
      document.removeEventListener('keydown', surTouche);
      window.removeEventListener(EVENEMENT_COMMANDE, surCommande);
    };
  }, [contexte, envoyer, demanderArret]);
}
