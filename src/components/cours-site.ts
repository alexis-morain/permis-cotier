/**
 * La liste des cours et les leçons d'un cours, sans React.
 *
 * C'étaient deux îlots, `ListeCours` et `Parcours`, pour quelques lignes de
 * logique : ils faisaient charger le runtime React entier sur `/cours` et sur
 * chaque page de cours. Le script de ces pages les rend maintenant en DOM nu.
 *
 * Ce que la page sert avant le script est ce que l'îlot rendait côté
 * serveur : la liste sans état ni bloc de reprise. Le script lit la
 * progression et rebâtit chaque conteneur depuis les données de la page, à
 * chaque appel : dans l'app, `<ClientRouter />` le rappelle à chaque écran,
 * et rien ne doit s'empiler. Les textes, les liens et les attributs
 * `data-mesure` sont ceux des îlots, un par élément, jamais deux.
 *
 * La coquille a sa propre présentation (cellules de chapitre, durée à droite
 * des leçons) ; `POUR_APP` choisit, et le build du site en ôte la branche.
 */
import { charger, type LeconSuivie } from '../lib/progression';
import { POUR_APP } from '../lib/cible';

export interface LeconDuParcours {
  code: string;
  nom: string;
  chemin: string;
  /** Faux quand la leçon n'est que le résumé de la notion. */
  ecrite: boolean;
  duree: number;
}

export interface CoursAffichable {
  code: string;
  titre: string;
  lecons: LeconDuParcours[];
}

export interface CoursListe extends CoursAffichable {
  promesse: string;
  chemin: string;
  minutes: number;
}

export interface DonneesListe {
  cours: CoursListe[];
}

export interface DonneesParcours {
  cours: CoursAffichable;
  suivant?: { chemin: string; titre: string };
}

/** Les identifiants des blocs JSON que les pages écrivent. */
export const ID_LISTE = 'liste-cours-donnees';
export const ID_PARCOURS = 'parcours-donnees';

type Suivies = Record<string, LeconSuivie>;

export type EtatChapitre = 'vide' | 'encours' | 'fait';

/** Où en est un chapitre, au compte de ses leçons faites. */
export function etatDuChapitre(faites: number, total: number): EtatChapitre {
  if (faites === 0) return 'vide';
  return faites >= total ? 'fait' : 'encours';
}

const MOT_ETAT: Record<EtatChapitre, string> = {
  vide: 'pas commencé',
  encours: 'en cours',
  fait: 'terminé',
};

type Enfant = Node | string | null | false | undefined;

/** Un élément, ses attributs, ses enfants. Jamais de HTML recollé. */
function el(balise: string, attributs: Record<string, string> = {}, ...enfants: Enfant[]): HTMLElement {
  const e = document.createElement(balise);
  for (const [nom, valeur] of Object.entries(attributs)) e.setAttribute(nom, valeur);
  for (const enfant of enfants) {
    if (enfant === null || enfant === false || enfant === undefined) continue;
    e.append(typeof enfant === 'string' ? document.createTextNode(enfant) : enfant);
  }
  return e;
}

const SVG = 'http://www.w3.org/2000/svg';

/** La coche d'une leçon faite ou d'un cours terminé. */
function coche(): SVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  for (const [nom, valeur] of Object.entries({ viewBox: '0 0 16 16', width: '14', height: '14', 'aria-hidden': 'true' })) {
    svg.setAttribute(nom, valeur);
  }
  const trait = document.createElementNS(SVG, 'path');
  for (const [nom, valeur] of Object.entries({
    d: 'M2.5 8.5 6 12l7.5-8',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.4',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  })) {
    trait.setAttribute(nom, valeur);
  }
  svg.append(trait);
  return svg;
}

const pluriel = (n: number) => (n > 1 ? 's' : '');

/** Le JSON d'un bloc de la page, ou `null` s'il manque ou ne se lit pas. */
function lireBloc(doc: Document, id: string): unknown {
  const bloc = doc.getElementById(id);
  if (!bloc) return null;
  try {
    return JSON.parse(bloc.textContent ?? '');
  } catch {
    return null;
  }
}

/**
 * Les chapitres tels que la coquille les montre : une cellule pleine largeur
 * par chapitre, un disque numéroté, le titre, le compte et une jauge. L'état
 * est dit par le disque et, en toutes lettres, par son nom accessible : la
 * couleur seule ne dit jamais rien.
 */
function chapitresApp(cours: readonly CoursListe[], suivies: Suivies): HTMLElement {
  return el('ol', { class: 'chapitres' },
    ...cours.map((c, i) => {
      const total = c.lecons.length;
      const faitesIci = c.lecons.filter((l) => suivies[l.code]).length;
      const etat = etatDuChapitre(faitesIci, total);
      return el('li', {},
        el('a', {
          href: c.chemin,
          class: `chapitres__cellule chapitres__cellule--${etat}`,
          'data-mesure': 'cours-ouvert',
          'data-mesure-cours': c.code,
        },
          el('span', { class: 'chapitres__disque', role: 'img', 'aria-label': `Chapitre ${i + 1}, ${MOT_ETAT[etat]}` },
            etat === 'fait' ? coche() : el('span', { 'aria-hidden': 'true' }, String(i + 1)),
          ),
          el('span', { class: 'chapitres__corps' },
            el('span', { class: 'chapitres__titre' }, c.titre),
            el('span', { class: 'chapitres__compte' }, `${faitesIci} / ${total} leçons`),
            el('span', { class: 'chapitres__jauge', 'aria-hidden': 'true' },
              el('span', { style: `transform: scaleX(${faitesIci / total})` }),
            ),
          ),
        ),
      );
    }),
  );
}

/** Les cours dans l'ordre du parcours, l'avancement de chacun, et la leçon à faire maintenant. */
export function monterListeCours(racine: HTMLElement, cours: readonly CoursListe[], suivies: Suivies): void {
  const toutes = cours.flatMap((c) => c.lecons);
  const faites = toutes.filter((l) => suivies[l.code]).length;
  const prochaine = toutes.find((l) => !suivies[l.code]) ?? toutes[0];
  const enCours = cours.find((c) => c.lecons.some((l) => l.code === prochaine?.code));

  const enfants: Node[] = [];
  if (prochaine) {
    enfants.push(
      el('div', { class: 'parcours__reprise' },
        faites === 0
          ? el('p', {}, `Aucune leçon faite pour l’instant. La première prend ${prochaine.duree} min.`)
          : el('p', {},
              el('b', {}, String(faites)),
              ` leçon${pluriel(faites)} faite${pluriel(faites)} sur ${toutes.length}.`,
              faites === toutes.length && ' Tout le cours est fait : tu peux le reprendre du début.',
            ),
        el('a', {
          class: 'bouton bouton--principal',
          href: prochaine.chemin,
          'data-mesure': 'cours-reprise',
          'data-mesure-notion': prochaine.code,
        }, `${faites === 0 ? 'Commencer' : 'Reprendre'} : ${prochaine.nom}`),
      ),
    );
  }

  if (POUR_APP) {
    enfants.push(chapitresApp(cours, suivies));
  } else {
    enfants.push(
      el('ol', { class: 'coursListe__liste' },
        ...cours.map((c, i) => {
          const faitesIci = c.lecons.filter((l) => suivies[l.code]).length;
          const fait = faitesIci === c.lecons.length;
          const actif = enCours?.code === c.code && !fait;
          const classe = `coursListe__item${fait ? ' coursListe__item--fait' : ''}${actif ? ' coursListe__item--encours' : ''}`;
          return el('li', { class: classe },
            el('a', { href: c.chemin, 'data-mesure': 'cours-ouvert', 'data-mesure-cours': c.code },
              el('span', { class: 'coursListe__rang', 'aria-hidden': 'true' }, fait ? coche() : String(i + 1)),
              el('span', { class: 'coursListe__corps' },
                el('span', { class: 'coursListe__titre' }, c.titre),
                el('span', { class: 'coursListe__promesse' }, c.promesse),
                el('span', { class: 'coursListe__meta discret' },
                  el('span', {}, `${faitesIci} sur ${c.lecons.length}`),
                  el('span', {}, ` · ${c.minutes} min`),
                  actif && el('span', {}, ' · en cours'),
                ),
              ),
              el('span', { class: 'visuellement-cache' }, fait ? ', cours fait' : actif ? ', cours en cours' : ''),
            ),
          );
        }),
      ),
    );
  }

  racine.replaceChildren(...enfants);
}

/** La méta d'une leçon, sous son nom. Dans l'app, `null` quand il n'y a rien à dire. */
function meta(l: LeconDuParcours, suivie: LeconSuivie | undefined, estProchaine: boolean): HTMLElement | null {
  const score = suivie && suivie.total > 0 ? `${suivie.bonnes} sur ${suivie.total}` : null;
  if (POUR_APP) {
    // Dans l'app, la durée passe à droite de la cellule ; ce qui reste
    // dessous ne s'écrit que s'il y a quelque chose.
    const morceaux = [!l.ecrite && 'résumé seulement', score, estProchaine && 'à faire maintenant'].filter(Boolean);
    return morceaux.length > 0 ? el('span', { class: 'etape__meta discret' }, morceaux.join(' · ')) : null;
  }
  return el('span', { class: 'etape__meta discret' },
    `${l.duree} min`,
    !l.ecrite && ' · résumé seulement',
    score && ` · ${score}`,
    estProchaine && ' · à faire maintenant',
  );
}

/**
 * Les leçons d'un cours, dans l'ordre : les faites cochées, la suivante
 * désignée. Tout fait, le bloc de reprise tend le cours d'après.
 */
export function monterParcours(racine: HTMLElement, donnees: DonneesParcours, suivies: Suivies): void {
  const { cours: { lecons }, suivant } = donnees;
  const faites = lecons.filter((l) => suivies[l.code]).length;
  const tout = faites === lecons.length;
  const prochaine = lecons.find((l) => !suivies[l.code]) ?? lecons[0];

  const enfants: Node[] = [];
  if (prochaine) {
    const reprise = (classe: string, verbe: string) =>
      el('a', { class: classe, href: prochaine.chemin, 'data-mesure': 'cours-reprise', 'data-mesure-notion': prochaine.code },
        `${verbe} : ${prochaine.nom}`);
    const nb = lecons.length;
    enfants.push(
      el('div', { class: 'parcours__reprise' },
        faites === 0
          ? el('p', {}, `Aucune leçon faite pour l’instant. La première prend ${prochaine.duree} min.`)
          : tout
            ? el('p', {},
                el('b', {}, 'Cours fait'),
                `, ${nb} leçon${pluriel(nb)} sur ${nb}.`,
                suivant ? ' Tu peux passer au suivant.' : ' C’était le dernier du parcours.',
              )
            : el('p', {}, el('b', {}, String(faites)), ` leçon${pluriel(faites)} faite${pluriel(faites)} sur ${nb}.`),
        tout && suivant
          ? el('p', { class: 'parcours__boutons' },
              el('a', {
                class: 'bouton bouton--principal',
                href: suivant.chemin,
                'data-mesure': 'cours-suivant',
                'data-mesure-cours': suivant.chemin,
              }, `Cours suivant : ${suivant.titre}`),
              reprise('bouton', 'Refaire'),
            )
          : reprise('bouton bouton--principal', faites === 0 ? 'Commencer' : tout ? 'Refaire' : 'Reprendre'),
      ),
    );
  }

  enfants.push(
    el('p', { class: 'chapitre__compte' }, el('span', { class: 'pastille' }, `${faites} sur ${lecons.length}`)),
    el('ol', { class: 'etapes' },
      ...lecons.map((l, i) => {
        const suivie = suivies[l.code];
        const estProchaine = prochaine?.code === l.code && !tout;
        const classe = `etape${suivie ? ' etape--faite' : ''}${estProchaine ? ' etape--prochaine' : ''}`;
        return el('li', {},
          el('a', { href: l.chemin, class: classe, 'data-mesure': 'cours-lecon', 'data-mesure-notion': l.code },
            el('span', { class: 'etape__rang', 'aria-hidden': 'true' }, suivie ? coche() : String(i + 1)),
            el('span', { class: 'etape__corps' }, el('span', { class: 'etape__nom' }, l.nom), meta(l, suivie, estProchaine)),
            POUR_APP && el('span', { class: 'etape__duree discret' }, `${l.duree} min`),
            el('span', { class: 'visuellement-cache' }, suivie ? ', leçon faite' : estProchaine ? ', prochaine leçon' : ''),
          ),
        );
      }),
    ),
  );

  racine.replaceChildren(...enfants);
}

/**
 * Le point d'entrée du script des pages de cours. Sur une page sans ces
 * conteneurs, ou dont les données ne se lisent pas, il ne touche à rien : la
 * page reste ce que le serveur a rendu.
 */
export function monterCours(doc: Document = document): void {
  const listes = doc.querySelectorAll<HTMLElement>('[data-liste-cours]');
  const parcours = doc.querySelectorAll<HTMLElement>('[data-parcours]');
  if (listes.length === 0 && parcours.length === 0) return;

  const suivies = charger().lecons;

  if (listes.length > 0) {
    const donnees = lireBloc(doc, ID_LISTE) as Partial<DonneesListe> | null;
    if (donnees && Array.isArray(donnees.cours)) {
      for (const racine of listes) monterListeCours(racine, donnees.cours, suivies);
    }
  }

  if (parcours.length > 0) {
    const donnees = lireBloc(doc, ID_PARCOURS) as Partial<DonneesParcours> | null;
    if (donnees?.cours && Array.isArray(donnees.cours.lecons)) {
      for (const racine of parcours) monterParcours(racine, { cours: donnees.cours, suivant: donnees.suivant }, suivies);
    }
  }
}
