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
 * Exclure ce navigateur du compte, ou l'y remettre. Le traceur relit la clé à
 * chaque envoi : l'effet est immédiat, sans rechargement.
 */
export function couperMesure(coupee: boolean): void {
  try {
    if (coupee) localStorage.setItem(CLE_ARRET, '1');
    else localStorage.removeItem(CLE_ARRET);
  } catch {
    /* Pas de stockage, pas d'interrupteur : l'appelant n'a rien à en faire. */
  }
}
