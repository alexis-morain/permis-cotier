/**
 * « Écouter le signal, 7 s » : le bouton qui fait entendre une frise sonore.
 *
 * En DOM nu, pour servir tel quel aux trois lieux où la frise s'affiche :
 * l'écran de jeu (`BoutonSignal.tsx` l'enveloppe pour React), la page de
 * question et la vérification de leçon. Il n'existe que pour un visuel de
 * `sons/` que la table connaît, et seulement si le navigateur sait jouer.
 *
 * Aucun son sans geste : le contexte audio s'ouvre dans l'appui même, seul
 * moment où WebKit l'autorise, puis le moteur arrive en `import()`. L'écran
 * de jeu ne paie donc que ce bouton et la table, jamais le moteur, tant
 * qu'on n'écoute pas. La frise repart du début quand le son part : on lui
 * sert une copie qui ne joue qu'une passe et s'arrête avec lui.
 *
 * Le chrono n'en sait rien. En examen blanc, écouter consomme les vingt
 * secondes de la question, comme regarder la frise ; la durée écrite sur le
 * bouton dit ce que ça coûte.
 */
import { libelleEcoute, motifDe, secondesEcrites } from '../lib/motif-sonore';
import { evenement } from '../lib/mesure';
import type { ContexteAudio, Lecteur } from '../lib/signal-sonore';
import './bouton-signal.css';

type Contexte = ContexteAudio & { resume(): Promise<void> };

export interface Outils {
  /** Ouvre (une fois) le contexte audio ; `null` quand le navigateur n'en a pas. */
  contexte: (() => Contexte) | null;
  moteur: () => Promise<Pick<typeof import('../lib/signal-sonore'), 'creerLecteur' | 'frisePourUneEcoute'>>;
  lireSvg: (chemin: string) => Promise<string>;
  mesurer: (nom: string, donnees: Record<string, string>) => void;
}

let contexteDeLaPage: Contexte | null = null;

function contexteParDefaut(): Outils['contexte'] {
  if (typeof window === 'undefined') return null;
  const Classe =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Classe) return null;
  return () => (contexteDeLaPage ??= new Classe());
}

const OUTILS: Outils = {
  // Lu à chaque bouton, pas une fois au chargement : un test peut poser le sien.
  get contexte() {
    return contexteParDefaut();
  },
  moteur: () => import('../lib/signal-sonore'),
  lireSvg: async (chemin) => {
    const reponse = await fetch(chemin);
    if (!reponse.ok) throw new Error(`${chemin} : ${reponse.status}`);
    return reponse.text();
  },
  mesurer: evenement,
};

/** Un lecteur par contexte : un seul signal sonne à la fois dans la page. */
const lecteurs = new WeakMap<object, Lecteur>();
/** Le bouton qui sonne, que le suivant fait taire. */
let actif: { couper(): void } | null = null;

export interface BoutonSignal {
  element: HTMLButtonElement;
  /** Coupe le son et rend la frise : la question a changé, l'écran se démonte. */
  detruire(): void;
}

export function boutonSignal(
  fichier: string,
  frise: () => HTMLImageElement | null,
  outils: Outils = OUTILS,
): BoutonSignal | null {
  const signal = motifDe(fichier);
  const ouvrir = outils.contexte;
  if (!signal || !ouvrir) return null;

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'bouton signal-ecoute';

  const libelle = libelleEcoute(signal);
  const auRepos = () => {
    bouton.textContent = libelle;
    bouton.setAttribute('aria-label', `Écouter le signal, ${secondesEcrites(signal)} secondes`);
  };
  auRepos();

  // Un appui en cours : `annule` dit qu'un second appui l'a rattrapé avant le son.
  let appui: { annule: boolean } | null = null;
  let lecteur: Lecteur | null = null;
  let copie: { img: HTMLImageElement; origine: string; url: string } | null = null;

  const rendreLaFrise = () => {
    if (!copie) return;
    copie.img.setAttribute('src', copie.origine);
    URL.revokeObjectURL(copie.url);
    copie = null;
  };

  const ceBouton = {
    couper() {
      if (appui) appui.annule = true;
      appui = null;
      // Le lecteur rappelle `surFin`, qui remet le bouton au repos.
      lecteur?.arreter();
      rendreLaFrise();
      auRepos();
      if (actif === ceBouton) actif = null;
    },
  };

  const ecouter = async () => {
    // Dans le geste, avant toute attente : c'est ce qui autorise le son.
    const contexte = ouvrir();
    void contexte.resume().catch(() => {});
    if (actif && actif !== ceBouton) actif.couper();
    actif = ceBouton;

    const ceTour = { annule: false };
    appui = ceTour;
    bouton.textContent = 'Arrêter';
    bouton.setAttribute('aria-label', 'Arrêter le signal');

    const img = frise();
    const origine = img?.getAttribute('src') ?? null;
    const [moteur, svg] = await Promise.all([
      outils.moteur(),
      origine ? outils.lireSvg(origine).catch(() => null) : Promise.resolve(null),
    ]);
    if (ceTour.annule) return;
    appui = null;

    if (!lecteurs.has(contexte)) lecteurs.set(contexte, moteur.creerLecteur(contexte));
    lecteur = lecteurs.get(contexte)!;

    if (img && origine && svg) {
      rendreLaFrise();
      const url = URL.createObjectURL(new Blob([moteur.frisePourUneEcoute(svg)], { type: 'image/svg+xml' }));
      img.setAttribute('src', url);
      copie = { img, origine, url };
    }

    const parti = lecteur.jouer(signal, () => {
      // Fin naturelle : la frise reste sur sa dernière image, le bouton revient.
      if (actif === ceBouton) actif = null;
      auRepos();
    });
    if (parti) {
      outils.mesurer('signal-ecoute', { signal: signal.nom });
      return;
    }
    // Un autre signal sonne encore, hors de portée de ce bouton : on n'empile pas.
    rendreLaFrise();
    auRepos();
    if (actif === ceBouton) actif = null;
  };

  bouton.addEventListener('click', () => {
    const sonne = appui !== null || (actif === ceBouton && lecteur?.enCours === true);
    if (sonne) ceBouton.couper();
    else void ecouter();
  });

  return {
    element: bouton,
    detruire() {
      if (actif === ceBouton || appui) ceBouton.couper();
      else rendreLaFrise();
    },
  };
}

/**
 * Pose le bouton dans `lieu`, un paragraphe caché placé juste après la frise
 * (`<p class="signal-ecoute-lieu" hidden>`), et le montre. Les trois lieux
 * chargent ce module en `import()` quand un visuel de `sons/` s'affiche :
 * aucune page ne le paie sans signal à écouter. Rend de quoi le démonter.
 */
export function monterBoutonSignal(lieu: HTMLElement, fichier: string, outils: Outils = OUTILS): () => void {
  const frise = () => {
    const voisin = lieu.previousElementSibling;
    return voisin instanceof HTMLImageElement ? voisin : null;
  };
  const b = boutonSignal(fichier, frise, outils);
  if (!b) return () => {};
  lieu.append(b.element);
  lieu.hidden = false;
  return () => {
    b.detruire();
    b.element.remove();
    lieu.hidden = true;
  };
}
