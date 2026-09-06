import { POUR_APP } from './cible';

/**
 * Ce que l'app sait faire et que le site ne sait pas.
 *
 * Une seule règle ici : `POUR_APP` est une constante figée à la construction,
 * et chaque fonction commence par la tester avant un `import()` dynamique. Sur
 * le site, la branche est morte et Rollup l'ôte avec les paquets Capacitor
 * qu'elle référence : rien n'entre dans le bundle web. Dans la coquille, le
 * greffon n'est chargé qu'au premier usage.
 *
 * Rien de ce qui suit n'est indispensable au jeu. Une permission refusée, un
 * greffon absent, un simulateur sans moteur haptique : on ne montre jamais
 * d'erreur, on ne fait simplement rien. Un examen ne s'interrompt pas parce
 * qu'une vibration a échoué.
 */

/** Le retour haptique de la correction. */
export async function vibrer(genre: 'juste' | 'faux' | 'choix'): Promise<void> {
  if (!POUR_APP) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (genre === 'choix') {
      // Cocher une case : une impulsion légère, pas un verdict.
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    }
    await Haptics.notification({
      type: genre === 'juste' ? NotificationType.Success : NotificationType.Error,
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

const IDS_RAPPELS = RAPPELS.map((r) => r.id);

export async function programmerRappels(dateExamen: string | null): Promise<void> {
  if (!POUR_APP) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    // On efface d'abord, toujours : une date retirée doit taire les rappels.
    const enAttente = await LocalNotifications.getPending();
    const aAnnuler = enAttente.notifications.filter((n) => IDS_RAPPELS.includes(n.id));
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
