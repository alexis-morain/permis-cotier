/**
 * Mesure d'audience.
 *
 * Umami auto-hébergé, sans cookie, sans identifiant de visiteur, sans suivi
 * d'un site à l'autre. Ce que le site apprend tient en une phrase : combien de
 * gens arrivent, par où, et jusqu'où ils vont dans une série de questions.
 *
 * Le traceur est chargé par `src/components/Mesure.astro`. Ce module est ce
 * que le reste du code utilise : un appel qui ne casse rien quand le traceur
 * est absent — en développement, hors ligne, ou derrière un bloqueur — et
 * l'interrupteur des réglages.
 */

/**
 * Ce que la page écrit dans le HTML. L'identifiant du site n'est pas un
 * secret : il est visible dans le source de toutes les pages, et ne sert qu'à
 * ranger les visites dans le bon tableau. Il est en dur pour que le build de
 * Cloudflare, qui n'a pas le `.env`, produise un site mesuré ; les variables
 * `UMAMI_WEBSITE_ID` et `UMAMI_SCRIPT_URL` le remplacent au besoin.
 */
export const MESURE = {
  script: 'https://umami.morain.fr/script.js',
  site: 'eaf95e93-6cb6-44e5-a60a-b3db00a05fcf',
  /**
   * Le traceur ne compte que depuis cet hôte. Ni `localhost`, ni une
   * préversion en `.workers.dev`, ni un miroir du site n'entrent dans les
   * chiffres : les tests de développement salissaient les vrais.
   */
  domaines: 'lepermiscotier.fr',
} as const;

/** La clé que le traceur lui-même relit avant chaque envoi. */
export const CLE_ARRET = 'umami.disabled';

interface Traceur {
  track: (nom: string, donnees?: Record<string, unknown>) => void;
}

/**
 * Un événement, si le traceur est là. Jamais d'erreur : la mesure ne doit pas
 * pouvoir casser l'écran de jeu, qui est la seule chose qui compte vraiment.
 */
export function evenement(nom: string, donnees?: Record<string, unknown>): void {
  try {
    (window as unknown as { umami?: Traceur }).umami?.track(nom, donnees);
  } catch {
    /* Un traceur absent, bloqué ou cassé ne regarde pas l'appelant. */
  }
}

/** Ce navigateur est-il exclu du compte ? */
export function mesureCoupee(): boolean {
  try {
    return localStorage.getItem(CLE_ARRET) === '1';
  } catch {
    // Stockage verrouillé (Safari en navigation privée) : rien n'est coupé.
    return false;
  }
}

/**
 * Exclure ce navigateur du compte, ou l'y remettre.
 *
 * Le traceur relit la clé avant chaque envoi : couper prend effet tout de
 * suite. Remettre, presque — le traceur n'installe son écoute de la page vue
 * qu'une fois, au démarrage, et ne la rattrape pas. Les clics repartent, la
 * page vue attend le prochain chargement.
 */
export function couperMesure(coupee: boolean): void {
  try {
    if (coupee) localStorage.setItem(CLE_ARRET, '1');
    else localStorage.removeItem(CLE_ARRET);
  } catch {
    /* Pas de stockage, pas d'interrupteur : l'appelant n'a rien à en faire. */
  }
}

/**
 * L'attribut qui nomme un clic à compter, et le préfixe de ses données :
 * `data-mesure="guide-examen" data-mesure-theme="meteo"`.
 *
 * Ce n'est pas `data-umami-event`, et c'est voulu. Le traceur intercepte cet
 * attribut-là lui-même, mais il annule la navigation, attend la réponse du
 * serveur, puis rend la main au lien. Un bouton « Passer un examen blanc » se
 * met alors à dépendre du temps de réponse d'un serveur de statistiques, ce qui
 * est exactement à l'envers. Ici le clic part sans rien retenir : l'envoi est en
 * `keepalive`, il survit au changement de page.
 */
const ATTRIBUT = 'data-mesure';

/** Le nom et les données d'un clic, lus sur l'élément qui les porte. */
export function evenementDeLElement(element: Element): { nom: string; donnees?: Record<string, string> } | null {
  const nom = element.getAttribute(ATTRIBUT);
  if (!nom) return null;

  const donnees: Record<string, string> = {};
  for (const attribut of element.getAttributeNames()) {
    const cle = attribut.startsWith(`${ATTRIBUT}-`) ? attribut.slice(ATTRIBUT.length + 1) : null;
    const valeur = cle ? element.getAttribute(attribut) : null;
    if (cle && valeur) donnees[cle] = valeur;
  }

  return { nom, donnees: Object.keys(donnees).length > 0 ? donnees : undefined };
}

/**
 * Compte les clics sur les éléments qui se nomment, où qu'ils soient dans la
 * page. Une seule écoute, en capture, posée une fois pour toutes : les îlots
 * React remplacent leurs boutons sans que personne ait à se réabonner.
 */
export function brancherClics(racine: Document | HTMLElement = document): void {
  racine.addEventListener(
    'click',
    (clic) => {
      const cible = clic.target;
      if (!(cible instanceof Element)) return;
      const porteur = cible.closest(`[${ATTRIBUT}]`);
      if (!porteur) return;
      const trouve = evenementDeLElement(porteur);
      if (trouve) evenement(trouve.nom, trouve.donnees);
    },
    true,
  );
}
