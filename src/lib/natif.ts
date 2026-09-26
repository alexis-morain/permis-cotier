import { POUR_APP } from './cible';
import { jouer } from './son';
import type { Son } from './son';

/**
 * Ce que l'app sait faire et que le site ne sait pas.
 *
 * Une seule règle ici : `POUR_APP` est une constante figée à la construction,
 * et chaque fonction commence par la tester avant un `import()` dynamique. Sur
 * le site, la branche est morte et Rollup l'ôte avec les paquets Capacitor
 * qu'elle référence : rien n'entre dans le bundle web. Dans la coquille, le
 * greffon n'est chargé qu'au premier usage.
 *
 * Les gestes qu'on lance sans attendre de réponse (`vibrer`,
 * `programmerRappels`, `modeConcentration`) ne sont pas `async` : ils rendent
 * `undefined` sur le site, et la promesse de leur version app sinon. Rollup ne
 * retire pas l'appel d'une fonction `async`, même vide ; il retire celui d'une
 * fonction qui ne fait que `return`. C'est ce qui garde ce module entier hors
 * du site, et aucun état au niveau du module ne doit l'y ramener.
 *
 * Rien de ce qui suit n'est indispensable au jeu. Une permission refusée, un
 * greffon absent, un simulateur sans moteur haptique : on ne montre jamais
 * d'erreur, on ne fait simplement rien. Un examen ne s'interrompt pas parce
 * qu'une vibration a échoué.
 */

/**
 * Le retour d'un geste : la vibration, et le son du même nom (`son.ts`), que
 * le réglage peut couper. Cocher, corriger, finir une leçon, une série, un
 * examen blanc : chaque écran n'a qu'un appel à faire.
 */
export function vibrer(genre: Son): Promise<void> | undefined {
  if (!POUR_APP) return;
  return vibrerDansLApp(genre);
}

async function vibrerDansLApp(genre: Son): Promise<void> {
  void jouer(genre);
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (genre === 'choix') {
      // Cocher une case : une impulsion légère, pas un verdict.
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    }
    const echec = genre === 'faux' || genre === 'echoue';
    await Haptics.notification({
      type: echec ? NotificationType.Error : NotificationType.Success,
    });
  } catch {
    // Pas de moteur haptique, ou l'utilisateur l'a coupé. Sans conséquence.
  }
}

/** Le partage natif, sur l'écran de résultat. */
export async function partager(titre: string, texte: string, url?: string): Promise<boolean> {
  if (!POUR_APP) return false;
  try {
    const { Share } = await import('@capacitor/share');
    if (!(await Share.canShare()).value) return false;
    await Share.share({ title: titre, text: texte, url, dialogTitle: titre });
    return true;
  } catch {
    // Feuille de partage refermée sans rien choisir : ce n'est pas une erreur.
    return false;
  }
}

/**
 * Les rappels avant l'épreuve, la seule fonction que le web ne rend pas sur
 * iOS et celle qui justifie honnêtement l'existence de l'app.
 *
 * Quatre rappels, adossés à la date que l'écran d'accueil collecte déjà :
 * J-7, J-3, J-1 et le matin même. Chacun à neuf heures — un rappel de révision
 * qui tombe à trois heures du matin se fait couper les notifications.
 *
 * Les identifiants sont fixes : reprogrammer efface les précédents plutôt que
 * de les empiler. Changer de date deux fois ne donne pas huit rappels.
 */
const RAPPELS = [
  { jours: 7, id: 1707, titre: 'Ton examen est dans une semaine', corps: 'Un examen blanc de quarante questions prend dix minutes.' },
  { jours: 3, id: 1703, titre: 'Plus que trois jours', corps: 'C’est le moment de revoir tes erreurs, pas d’en découvrir.' },
  { jours: 1, id: 1701, titre: 'C’est demain', corps: 'Un dernier examen blanc ce soir, et au lit.' },
  { jours: 0, id: 1700, titre: 'C’est aujourd’hui', corps: 'Bonne épreuve. Tu as révisé pour ça.' },
];

export function programmerRappels(dateExamen: string | null): Promise<void> | undefined {
  if (!POUR_APP) return;
  return programmerDansLApp(dateExamen);
}

async function programmerDansLApp(dateExamen: string | null): Promise<void> {
  const idsRappels = RAPPELS.map((r) => r.id);
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    // On efface d'abord, toujours : une date retirée doit taire les rappels.
    const enAttente = await LocalNotifications.getPending();
    const aAnnuler = enAttente.notifications.filter((n) => idsRappels.includes(n.id));
    if (aAnnuler.length > 0) await LocalNotifications.cancel({ notifications: aAnnuler });

    if (!dateExamen) return;

    // La permission ne se demande qu'ici : au moment où le candidat vient de
    // poser sa date, donc où l'app peut dire à quoi elle sert. Demander au
    // premier lancement, sans raison visible, se fait refuser.
    const etat = await LocalNotifications.checkPermissions();
    if (etat.display !== 'granted') {
      const demande = await LocalNotifications.requestPermissions();
      if (demande.display !== 'granted') return;
    }

    const jour = new Date(`${dateExamen}T09:00:00`);
    if (Number.isNaN(jour.getTime())) return;

    const maintenant = Date.now();
    const aPoser = RAPPELS.map((rappel) => {
      const quand = new Date(jour);
      quand.setDate(quand.getDate() - rappel.jours);
      return { rappel, quand };
    })
      // Un rappel dont l'heure est passée ne se programme pas : iOS le
      // délivrerait immédiatement, ce qui n'a aucun sens.
      .filter(({ quand }) => quand.getTime() > maintenant)
      .map(({ rappel, quand }) => ({
        id: rappel.id,
        title: rappel.titre,
        body: rappel.corps,
        schedule: { at: quand, allowWhileIdle: true },
      }));

    if (aPoser.length > 0) await LocalNotifications.schedule({ notifications: aPoser });
  } catch {
    // Greffon absent, permission révoquée entre-temps : sans conséquence.
  }
}

/**
 * Le retour au premier plan.
 *
 * Le chrono d'examen est une horloge murale — `session.ts` compare des
 * millisecondes, il ne compte pas les battements — mais l'affichage, lui, vient
 * d'un `setInterval` qu'une app suspendue gèle tout net, là où un onglet caché
 * n'était qu'étranglé. Sans ce signal, on revient sur un chrono figé à la
 * seconde où l'app est partie, alors que le temps a couru.
 *
 * Rend la fonction qui débranche l'écoute.
 */
export function surRetourAuPremierPlan(faire: () => void): () => void {
  if (!POUR_APP) return () => {};
  let debrancher: (() => void) | undefined;
  let vivant = true;

  void (async () => {
    try {
      const { App } = await import('@capacitor/app');
      const abonnement = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) faire();
      });
      if (vivant) debrancher = () => void abonnement.remove();
      else void abonnement.remove();
    } catch {
      // Greffon absent : le `visibilitychange` du web reste branché à côté.
    }
  })();

  return () => {
    vivant = false;
    debrancher?.();
  };
}

/**
 * Le plein écran de l'épreuve.
 *
 * Une série qui commence cache la barre d'onglets native ; le résultat ou
 * l'arrêt la ramène. C'est le geste d'une app d'apprentissage : pendant les
 * vingt secondes d'une question, rien d'autre à l'écran. Le greffon `Ecran`
 * est écrit dans la coquille (`ios/App/App/EcranPlugin.swift`), une méthode,
 * `pleinEcran({ actif })`. Absent, rien ne se passe.
 */
export function modeConcentration(actif: boolean): Promise<void> | undefined {
  if (!POUR_APP) return;
  return concentrerDansLApp(actif);
}

async function concentrerDansLApp(actif: boolean): Promise<void> {
  try {
    const { registerPlugin } = await import('@capacitor/core');
    const Ecran = registerPlugin<{ pleinEcran(options: { actif: boolean }): Promise<void> }>('Ecran');
    await Ecran.pleinEcran({ actif });
  } catch {
    // Greffon absent, ou coquille d'une autre version : la barre reste.
  }
}

/**
 * Un lien vers un autre site : Légifrance, GitHub, Wikimedia, une licence.
 *
 * Dans l'app, il s'ouvre dans Safari intégré, par-dessus l'écran, et un geste
 * le referme. Ouvert dans la webview de l'onglet, il remplacerait l'app par
 * le site d'un autre, sans barre d'adresse ni moyen propre d'en revenir.
 *
 * Rend `false` quand rien ne s'est ouvert, pour que l'appelant se rabatte sur
 * le navigateur.
 */
export async function ouvrirDehors(url: string): Promise<boolean> {
  if (!POUR_APP) return false;
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
    return true;
  } catch {
    return false;
  }
}
