/**
 * L'écran de leçon, sans React.
 *
 * C'était l'îlot `Lecon`, le dernier à faire charger le runtime React entier,
 * sur chacune des 105 leçons. Le script de la page le remplace par un moteur
 * en DOM nu.
 *
 * Le serveur rend tout le texte (`Lecon.astro`) : le premier écran courant,
 * la vérification réduite à ce qu'elle annonce. Le script ne rebâtit pas ces
 * écrans, il les lit dans le DOM et passe en pas à pas : une idée à la fois,
 * une barre d'avancement, un bouton pour continuer. Le passage ne se voit
 * pas : la page pose la classe `js` sur `<html>` avant le script, et la
 * feuille de style cache les écrans qui ne sont pas le courant tant que cette
 * classe est là. Ce qui dépend de la progression ou d'un geste, la
 * vérification et la fin, il le monte depuis le bloc JSON de la page.
 *
 * La leçon se termine par la vérification, jusqu'à trois questions de la
 * banque sur la notion. Leurs réponses entrent dans la progression comme
 * celles de l'entraînement : une question ratée ici repasse dans `/revoir`.
 *
 * Les textes, l'ARIA et les attributs `data-mesure` sont ceux de l'îlot, un
 * par élément, jamais deux. La coquille a sa propre fin (la suite collée en
 * bas) ; `POUR_APP` choisit, et le build du site en ôte la branche.
 */
import type { EtapeAffichable, LeconAffichable } from '../lib/cours';
import type { QuestionAffichable } from '../lib/affichable';
import { aujourdhui, charger, enregistrerReponse, sauvegarder, terminerLecon } from '../lib/progression';
import { evenement } from '../lib/mesure';
import { douceur } from '../lib/douceur';
import { cheminRetour, libelleRetour } from '../lib/retour';
import { graineDeSession, lettreAffichee, melangerPropositions } from '../lib/melange';
import { POUR_APP } from '../lib/cible';
import { vibrer } from '../lib/natif';

/** Ce qui vient après la leçon : la suivante du cours, ou le cours d'après. */
export type Suite =
  | { type: 'lecon'; chemin: string; nom: string }
  | { type: 'cours'; chemin: string; titre: string };

export type Ecran =
  | { type: 'accroche'; texte: string }
  | { type: 'etape'; etape: EtapeAffichable; numero: number }
  | { type: 'piege'; texte: string }
  | { type: 'retenir'; lignes: string[] }
  | { type: 'verification' }
  | { type: 'fin' };

export type TypeEcran = Ecran['type'];

export function ecransDe(lecon: LeconAffichable): Ecran[] {
  const ecrans: Ecran[] = [];
  if (lecon.accroche) ecrans.push({ type: 'accroche', texte: lecon.accroche });
  lecon.etapes.forEach((etape, i) => ecrans.push({ type: 'etape', etape, numero: i + 1 }));
  if (lecon.piege) ecrans.push({ type: 'piege', texte: lecon.piege });
  if (lecon.retenir.length > 0) ecrans.push({ type: 'retenir', lignes: lecon.retenir });
  if (lecon.questions.length > 0) ecrans.push({ type: 'verification' });
  ecrans.push({ type: 'fin' });
  return ecrans;
}

/** Le libellé du bouton qui fait avancer depuis l'écran `i`. */
export function libelleSuite(types: readonly TypeEcran[], i: number): string {
  if (types[i + 1] === 'verification') return 'Vérifier ce que j’ai retenu';
  if (i === types.length - 2 && types[i + 1] === 'fin') return 'Terminer la leçon';
  return 'Continuer';
}

/** Ce que la page donne au script, dans le bloc JSON `ID_LECON`. */
export interface DonneesLecon {
  code: string;
  cours: { code: string; titre: string; chemin: string };
  suite?: Suite;
  /** Vide quand la notion n'a pas encore de question. */
  questions: QuestionAffichable[];
}

/** L'identifiant du bloc JSON que la page écrit. */
export const ID_LECON = 'lecon-donnees';

interface Score {
  bonnes: number;
  total: number;
}

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

/** Un bouton et ce qu'il fait. */
function bouton(classe: string, texte: string, faire: () => void): HTMLButtonElement {
  const b = el('button', { class: classe, type: 'button' }, texte) as HTMLButtonElement;
  b.addEventListener('click', faire);
  return b;
}

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

function memeEnsemble(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

const TYPES_RENDUS = ['accroche', 'etape', 'piege', 'retenir', 'verification'] as const;

/** Le type d'un écran rendu par le serveur, lu sur sa classe. */
function typeDe(section: Element): TypeEcran | null {
  return TYPES_RENDUS.find((t) => section.classList.contains(`ecran--${t}`)) ?? null;
}

/**
 * La vérification : les questions de la notion, une par une, corrigées tout
 * de suite. Le bouton d'action reste le même nœud d'un état à l'autre, comme
 * dans l'îlot : qui valide au clavier garde le focus pour passer à la suite.
 */
function monterVerification(
  conteneur: HTMLElement,
  questions: readonly QuestionAffichable[],
  onFin: (score: Score) => void,
): { reprendre: () => void } {
  let index = 0;
  let selection: string[] = [];
  let corrigee = false;
  let bonnes = 0;
  // Une graine pour toute la vérification : les propositions ne se
  // redistribuent pas d'un geste à l'autre. Revoir la leçon en tire une neuve.
  let graine = graineDeSession();
  let lignes: { id: string; bouton: HTMLButtonElement }[] = [];
  let consigne: HTMLElement | null = null;
  let verdict: HTMLElement | null = null;
  /** Le bouton « Écouter le signal » de la question affichée, à démonter avec elle. */
  let demonterSignal: (() => void) | null = null;

  const action = bouton('bouton bouton--principal', 'Valider', () => (corrigee ? suivante() : valider()));
  const signaler = el('a', { class: 'signaler', href: '#' }, 'Signaler une erreur');
  const actions = el('div', { class: 'jeu__actions' }, action, signaler);
  const racine = el('div', { class: 'verification' }, actions);
  conteneur.append(racine);

  const question = () => questions[index]!;
  const plein = () => selection.length >= 2;

  /** L'état des propositions et du bouton, sans rien rebâtir. */
  const actualiser = () => {
    const q = question();
    for (const { id, bouton: b } of lignes) {
      const cochee = selection.includes(id);
      const bonne = q.reponses.includes(id);
      let classe = cochee ? ' proposition--cochee' : '';
      if (corrigee) classe = bonne ? ' proposition--juste' : cochee ? ' proposition--fausse' : '';
      b.className = `proposition${classe}`;
      b.setAttribute('aria-pressed', String(cochee));
      b.disabled = corrigee || (plein() && !cochee);
    }
    if (corrigee) {
      action.textContent = index + 1 >= questions.length ? 'Terminer la leçon' : 'Question suivante';
      action.disabled = false;
    } else {
      action.textContent = 'Valider';
      action.disabled = selection.length === 0;
    }
  };

  /**
   * La question courante. Le bloc d'action reste en place ; son bouton
   * redevient « Valider » désactivé, et le navigateur lui retire alors le
   * focus, comme le faisait l'îlot.
   */
  const afficher = () => {
    const q = question();
    demonterSignal?.();
    demonterSignal = null;
    for (const enfant of [...racine.children]) if (enfant !== actions) enfant.remove();
    verdict = null;
    consigne = index === 0
      ? el('p', { class: 'discret', style: 'margin-top:0' },
          'Une ou deux bonnes réponses, comme à l’épreuve. La réponse doit être exacte.')
      : null;
    lignes = melangerPropositions(q.propositions, graine, q.id).map((p, rang) => {
      const b = el('button', { type: 'button', class: 'proposition' },
        el('span', { class: 'proposition__lettre', 'aria-hidden': 'true' }, lettreAffichee(rang)),
        el('span', {}, p.texte),
      ) as HTMLButtonElement;
      b.addEventListener('click', () => {
        void vibrer('choix');
        selection = selection.includes(p.id)
          ? selection.filter((x) => x !== p.id)
          : plein() ? selection : [...selection, p.id];
        actualiser();
      });
      return { id: p.id, bouton: b };
    });
    const fichier = q.visuel?.fichier;
    const lieuSignal = fichier?.startsWith('sons/') ? el('p', { class: 'signal-ecoute-lieu', hidden: '' }) : null;
    actions.before(
      el('p', { class: 'verification__compteur' },
        `Question ${index + 1} `, el('span', { class: 'discret' }, `sur ${questions.length}`)),
      ...[consigne].filter((n): n is HTMLElement => n !== null),
      el('h3', { class: 'verification__enonce' }, q.enonce),
      ...(q.visuel ? [el('img', { class: 'jeu__visuel', src: `/visuels/${q.visuel.fichier}`, alt: q.visuel.alt })] : []),
      ...(lieuSignal ? [lieuSignal] : []),
      el('ul', { class: 'propositions' }, ...lignes.map(({ bouton: b }) => el('li', {}, b))),
    );
    if (lieuSignal && fichier) {
      // Le bouton et sa table n'arrivent que pour une frise sonore : les autres
      // leçons ne paient rien.
      import('./bouton-signal')
        .then(({ monterBoutonSignal }) => {
          if (lieuSignal.isConnected) demonterSignal = monterBoutonSignal(lieuSignal, fichier);
        })
        .catch(() => {});
    }
    signaler.setAttribute('href', `/signaler?question=${encodeURIComponent(q.id)}`);
    actualiser();
  };

  const valider = () => {
    const q = question();
    const juste = memeEnsemble(selection, q.reponses);
    corrigee = true;
    if (juste) bonnes += 1;
    void vibrer(juste ? 'juste' : 'faux');
    sauvegarder(enregistrerReponse(charger(), q.id, juste, aujourdhui()));
    consigne?.remove();
    consigne = null;
    verdict = el('div', { class: `verdict verdict--${juste ? 'juste' : 'fausse'}`, role: 'status' },
      el('p', { class: 'verdict__titre' }, juste ? 'Bonne réponse' : 'Raté'),
      el('p', {}, q.explication),
      el('div', { class: 'sources' },
        el('span', {}, 'Source :'),
        el('ul', {},
          ...q.sources.map((s) => el('li', {},
            s.url
              ? el('a', {
                  href: s.url,
                  target: '_blank',
                  rel: 'noreferrer noopener',
                  'data-mesure': 'source-ouverte',
                  'data-mesure-ref': s.ref,
                }, s.texte)
              : s.texte,
          )),
        ),
      ),
    );
    actions.before(verdict);
    actualiser();
    const cible = verdict;
    window.setTimeout(() => cible.scrollIntoView({ block: 'nearest', behavior: douceur() }), 0);
  };

  const suivante = () => {
    if (index + 1 >= questions.length) {
      demonterSignal?.();
      demonterSignal = null;
      onFin({ bonnes, total: questions.length });
      return;
    }
    index += 1;
    selection = [];
    corrigee = false;
    afficher();
  };

  afficher();

  return {
    reprendre: () => {
      index = 0;
      selection = [];
      corrigee = false;
      bonnes = 0;
      graine = graineDeSession();
      afficher();
    },
  };
}

/** Les écrans déjà montés, pour qu'un second appel n'empile pas les écouteurs. */
const montees = new WeakSet<Element>();

/**
 * Le point d'entrée du script de la page de leçon. Sans écran de leçon, ou
 * sans données lisibles, il ne touche à rien : la page reste ce que le
 * serveur a rendu, tout à la suite.
 */
export function monterLecon(doc: Document = document): void {
  const racine = doc.querySelector<HTMLElement>('.lecon');
  if (!racine || montees.has(racine)) return;
  const donnees = lireBloc(doc, ID_LECON) as Partial<DonneesLecon> | null;
  if (!donnees || typeof donnees.code !== 'string' || !donnees.cours || !Array.isArray(donnees.questions)) return;
  const sections = [...racine.querySelectorAll<HTMLElement>(':scope > section.ecran')];
  const rendus = sections.map(typeDe);
  if (sections.length === 0 || rendus.some((t) => t === null)) return;
  const entete = racine.querySelector<HTMLElement>('.lecon__entete');
  const barre = racine.querySelector<HTMLElement>('.lecon__barre span');
  const annonce = entete?.querySelector<HTMLElement>('[aria-live]');
  const mode = racine.querySelector<HTMLElement>('.lecon__mode');
  const boutonMode = mode?.querySelector('button');
  if (!entete || !barre || !annonce || !mode || !boutonMode) return;
  montees.add(racine);

  const { code, cours, suite, questions } = donnees as DonneesLecon;
  const types: TypeEcran[] = [...(rendus as TypeEcran[]), 'fin'];
  const derniere = types.length - 1;

  let index = 0;
  let pasAPas = true;
  let score: Score | null = null;
  let terminee = false;
  let fin: HTMLElement | null = null;
  let finDeLecture: HTMLElement | null = null;

  /**
   * D'où l'on vient, quand on vient d'une question ratée. L'adresse est lue
   * dans le navigateur et non rendue au serveur : la page est la même pour
   * tout le monde, seul le retour change. `cheminRetour` ne garde qu'une des
   * adresses de jeu du site.
   */
  const retour = cheminRetour(window.location.search);
  if (retour) {
    entete.querySelector('.lecon__barre')?.before(
      el('p', { class: 'lecon__retour' },
        el('a', { href: retour, 'data-mesure': 'lecon-retour-serie' }, libelleRetour(retour))),
    );
  }

  const courant = (): HTMLElement | null => (index === derniere ? fin : (sections[index] ?? null));

  const aller = (i: number) => {
    index = i;
    rendre();
    finir();
    window.setTimeout(() => {
      const cible = pasAPas ? racine : courant();
      cible?.scrollIntoView({ block: 'start', behavior: douceur() });
      courant()?.focus({ preventScroll: true });
    }, 0);
  };

  // Arrivé à la fin, la leçon est faite, une fois, quel que soit le score :
  // ce qui compte est d'être allé au bout. Refaire la leçon remplace la trace.
  const finir = () => {
    if (index !== derniere || terminee) return;
    terminee = true;
    const resultat = score ?? { bonnes: 0, total: 0 };
    sauvegarder(terminerLecon(charger(), code, resultat, aujourdhui()));
    evenement('lecon-terminee', { notion: code, cours: cours.code, ...resultat });
    void vibrer('lecon');
  };

  const verificationIndex = types.indexOf('verification');
  const verification = verificationIndex >= 0
    ? (() => {
        const section = sections[verificationIndex]!;
        section.querySelector(':scope > p.discret')?.remove();
        return monterVerification(section, questions, (s) => {
          score = s;
          aller(derniere);
        });
      })()
    : null;

  const recommencer = () => {
    terminee = false;
    score = null;
    verification?.reprendre();
    aller(0);
  };

  // La fin de leçon : revenir à la série d'où l'on vient, s'il y en a une,
  // puis la suite du parcours. Le premier des deux est le geste principal.
  const lienRetour = () =>
    retour && el('a', { class: 'bouton bouton--principal', href: retour, 'data-mesure': 'lecon-retour-serie' }, libelleRetour(retour));
  const lienSuite = () => {
    const classe = `bouton${retour ? '' : ' bouton--principal'}`;
    if (suite?.type === 'lecon') {
      return el('a', { class: classe, href: suite.chemin, 'data-mesure': 'lecon-suivante', 'data-mesure-notion': suite.chemin },
        `Leçon suivante : ${suite.nom}`);
    }
    if (suite?.type === 'cours') {
      return el('a', { class: classe, href: suite.chemin, 'data-mesure': 'lecon-cours-suivant', 'data-mesure-cours': suite.chemin },
        `Cours suivant : ${suite.titre}`);
    }
    return el('a', { class: classe, href: '/cours', 'data-mesure': 'lecon-retour-cours' }, 'Retour au cours');
  };

  const ecranDeFin = (): HTMLElement => {
    const s = score;
    const section = el('section', { class: 'ecran ecran--fin ecran--courant', tabindex: '-1' },
      el('div', { class: 'fin' },
        el('p', { class: 'fin__titre display' }, 'Leçon faite'),
        suite?.type !== 'lecon' && el('p', { class: 'fin__cours' }, `C’était la dernière leçon de « ${cours.titre} ».`),
        s && s.total > 0
          ? el('p', { class: 'fin__score' },
              el('b', {}, String(s.bonnes)), ' sur ', el('b', {}, String(s.total)), ' à la vérification',
              s.bonnes === s.total
                ? '. Tout est juste, tu peux passer à la suite.'
                : '. Les questions ratées repasseront dans ta révision.')
          : el('p', { class: 'fin__score' }, 'Cette notion n’a pas encore de question dans la banque. Elle est marquée faite.'),
        // Dans l'app, le geste suivant sort de la liste et colle en bas de
        // l'écran, au-dessus de la barre d'onglets.
        POUR_APP && el('div', { class: 'lecon__suite' }, retour ? lienRetour() : lienSuite()),
        el('div', { class: 'fin__actions' },
          !POUR_APP && lienRetour(),
          (!POUR_APP || retour) && lienSuite(),
          // Les questions de cette notion, pas les soixante et une du thème :
          // ce qu'on vient d'apprendre se vérifie sur ce qu'on vient d'apprendre.
          el('a', {
            class: 'bouton',
            href: `/entrainement/notion/${code}`,
            'data-mesure': 'lecon-entrainement',
            'data-mesure-notion': code,
          }, 'S’entraîner sur cette notion'),
          bouton('bouton bouton--discret', 'Revoir la leçon', recommencer),
        ),
      ),
    );
    return section;
  };

  /** Tout ce qui suit l'écran courant et le mode de lecture. */
  const rendre = () => {
    racine.classList.toggle('lecon--pas-a-pas', pasAPas);

    sections.forEach((section, i) => {
      const estCourant = i === index;
      section.classList.toggle('ecran--courant', estCourant);
      if (estCourant) section.setAttribute('tabindex', '-1');
      else section.removeAttribute('tabindex');
      if (pasAPas && !estCourant) section.setAttribute('aria-hidden', 'true');
      else section.removeAttribute('aria-hidden');

      section.querySelector(':scope > .lecon__suite')?.remove();
      if (pasAPas && estCourant && types[i] !== 'verification') {
        section.append(
          el('div', { class: 'lecon__suite' },
            bouton('bouton bouton--principal', libelleSuite(types, i), () => aller(index + 1)),
            i > 0 && bouton('bouton bouton--discret', 'Revenir', () => aller(index - 1)),
          ),
        );
      }
    });

    // La fin ne s'affiche que quand on y est : en lecture continue, tout est
    // visible, sauf « Leçon faite » avant d'avoir fini.
    if (index === derniere) {
      if (!fin) {
        fin = ecranDeFin();
        mode.before(fin);
      }
    } else {
      fin?.remove();
      fin = null;
    }

    finDeLecture?.remove();
    finDeLecture = null;
    if (!pasAPas && questions.length === 0 && index !== derniere) {
      finDeLecture = el('div', { class: 'lecon__suite' },
        bouton('bouton bouton--principal', 'Terminer la leçon', () => aller(derniere)));
      mode.before(finDeLecture);
    }

    boutonMode.textContent = pasAPas ? 'Tout lire d’une traite' : 'Reprendre pas à pas';
    const avancement = types.length > 1 ? index / (types.length - 1) : 1;
    barre.style.transform = `scaleX(${avancement})`;
    const texte = `Écran ${index + 1} sur ${types.length}`;
    if (annonce.textContent !== texte) annonce.textContent = texte;
  };

  boutonMode.addEventListener('click', () => {
    pasAPas = !pasAPas;
    rendre();
  });

  rendre();
  evenement('lecon-commencee', { notion: code, cours: cours.code });
}
