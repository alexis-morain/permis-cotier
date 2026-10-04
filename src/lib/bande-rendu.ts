/**
 * La bande d'ouverture de qui revient, en DOM nu.
 *
 * `monterBande` tourne dans un script en ligne posé en tête de la grille de
 * la bande, avant que le navigateur ait lu la colonne du nouveau venu : la
 * colonne de qui revient est insérée devant, la section prend
 * `data-bande="<cas>"`, et la feuille de l'accueil cache la colonne du nouveau
 * venu. Tout se joue avant la première peinture : ni saut de mise en page, ni
 * bande du nouveau venu entrevue. Sans JavaScript, ou si quoi que ce soit
 * manque, rien ne bouge et le nouveau venu a sa bande, entière.
 *
 * Les textes disent toujours le verdict en mots : la couleur ne dit jamais
 * seule reçu ou recalé.
 */
import type { Etat } from './progression';
import { choisirBande, type Bande, type ExamenBande, type LeconBande } from './bande';

type Enfant = Node | string | null | false | undefined;

/** Jamais de HTML recollé : les noms de leçon viennent d'un JSON de la page. */
function el(doc: Document, balise: string, attributs: Record<string, string> = {}, ...enfants: Enfant[]): HTMLElement {
  const e = doc.createElement(balise);
  for (const [nom, valeur] of Object.entries(attributs)) e.setAttribute(nom, valeur);
  for (const enfant of enfants) {
    if (enfant === null || enfant === false || enfant === undefined) continue;
    e.append(typeof enfant === 'string' ? doc.createTextNode(enfant) : enfant);
  }
  return e;
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
/** L'espace insécable avant les deux-points. */
const DEUX_POINTS = ' :';

function depuis(jours: number): string {
  if (jours <= 0) return 'C’était aujourd’hui';
  if (jours === 1) return 'C’était hier';
  return `C’était il y a ${jours} jours`;
}

/** « 29 sur 40 » ne se coupe pas : un titre qui finit une ligne sur « 29 sur » se lit mal. */
const score = (e: ExamenBande) => `${e.bonnes}\u00a0sur\u00a0${e.total}`;

function dernier(examen: ExamenBande, reussi: boolean): string {
  return `Dernier examen blanc${DEUX_POINTS} ${score(examen)}, ${reussi ? 'reçu' : 'recalé'}.`;
}

interface Geste {
  texte: string;
  href: string;
  geste: string;
}

const EXAMEN: Geste = { texte: 'Passer un examen blanc', href: '/examen', geste: 'examen' };
const REFAIRE: Geste = { texte: 'Refaire un examen blanc', href: '/examen', geste: 'examen' };
const ENTRAINEMENT: Geste = { texte: 'S’entraîner par thème', href: '/entrainement', geste: 'entrainement' };
/**
 * La série du jour de `/revoir` joue le rythme entier : les dues d'abord, les
 * plus anciennes en tête, puis des neuves. « Revoir 3 questions » ouvrait une
 * série de vingt ; le bouton nomme la série, le texte dit ce qui est dû.
 */
const SERIE: Geste = { texte: 'Faire la série du jour', href: '/revoir', geste: 'revoir' };
/** Le cours se reprend s'il est entamé, il se commence sinon. */
const cours = (l: LeconBande, entame: boolean): Geste => ({
  texte: entame ? 'Reprendre le cours' : 'Commencer le cours',
  href: l.chemin,
  geste: 'cours',
});
const reprendre = (l: LeconBande): Geste => cours(l, true);

interface Contenu {
  titre: string;
  phrase: string;
  principal: Geste;
  second: Geste | null;
  /** La ligne discrète sous les boutons : un lien dans une phrase, ou rien. */
  suite: { avant: string; lien: Geste; apres: string } | null;
}

/** Le second geste : la série s'il y a du dû, sinon le cours s'il en reste, sinon l'entraînement. */
const ensuite = (aRevoir: number, prochaine: LeconBande | null, entame: boolean): Geste =>
  aRevoir > 0 ? SERIE : prochaine ? cours(prochaine, entame) : ENTRAINEMENT;

function contenu(bande: Exclude<Bande, { cas: 'nouveau' }>): Contenu {
  switch (bande.cas) {
    case 'echeance': {
      const titre =
        bande.jours === 0 ? 'Ton examen, c’est aujourd’hui.'
        : bande.jours === 1 ? 'Ton examen est demain.'
        : `Ton examen est dans ${bande.jours} jours.`;
      const conseil =
        bande.jours === 0 ? 'Un examen blanc pour te mettre dans le rythme, puis bon vent.'
        : bande.jours === 1 ? 'Fais deux examens blancs ce soir, au chrono.'
        : 'Un examen blanc par jour d’ici là, et tes erreurs entre deux.';
      return {
        titre,
        phrase: bande.examen ? `${dernier(bande.examen, bande.examen.reussi)} ${conseil}` : conseil,
        principal: EXAMEN,
        second: bande.aRevoir > 0 ? SERIE : null,
        suite: null,
      };
    }
    case 'recale': {
      const { examen, aRevoir, prochaine, coursEntame } = bande;
      const bilan = `${depuis(examen.depuis)}, avec ${pluriel(examen.erreurs, 'erreur')}${DEUX_POINTS} l’épreuve en admet cinq.`;
      return aRevoir > 0
        ? {
            titre: dernier(examen, false),
            // Pas « elles sont dans ta série du jour » : la série prend les
            // dues les plus anciennes d'abord, et des erreurs d'hier peuvent
            // attendre demain. Elles y reviennent, c'est ce qui est sûr.
            phrase: `${bilan} Revois-les avant d’en repasser un${DEUX_POINTS} elles reviennent dans ta série du jour jusqu’à ce que tu les tiennes.`,
            principal: SERIE,
            second: REFAIRE,
            suite: prochaine
              ? {
                  avant: coursEntame ? 'Ou reprends le cours à ' : 'Ou commence le cours par ',
                  lien: { ...cours(prochaine, coursEntame), texte: prochaine.nom },
                  apres: '.',
                }
              : null,
          }
        : {
            titre: dernier(examen, false),
            phrase: `${bilan} Tes questions à revoir sont faites, refais un examen pour voir si ça tient.`,
            principal: REFAIRE,
            second: prochaine ? cours(prochaine, coursEntame) : ENTRAINEMENT,
            suite: null,
          };
    }
    case 'recu': {
      const { examen, aRevoir, prochaine, coursEntame } = bande;
      const fautes = examen.erreurs === 0 ? 'sans une erreur' : `avec ${pluriel(examen.erreurs, 'erreur')} sur les cinq admises`;
      return {
        titre: dernier(examen, true),
        phrase: `${depuis(examen.depuis)}, ${fautes}. Un examen reçu ne dit rien du suivant${DEUX_POINTS} les quarante questions changent à chaque tirage.`,
        principal: REFAIRE,
        second: ensuite(aRevoir, prochaine, coursEntame),
        suite: null,
      };
    }
    case 'cours': {
      const { faites, total, prochaine, examen, aRevoir } = bande;
      const s = faites > 1 ? 's' : '';
      return {
        titre: `${faites} leçon${s} faite${s} sur ${total}.`,
        phrase: `La suivante${DEUX_POINTS} ${prochaine.nom}, trois minutes. ${
          examen ? dernier(examen, examen.reussi) : 'L’examen blanc dira ce qui tient déjà.'
        }`,
        principal: reprendre(prochaine),
        second: examen ? REFAIRE : EXAMEN,
        suite:
          aRevoir > 0
            ? { avant: '', lien: { texte: `${pluriel(aRevoir, 'question')} à revoir`, href: '/revoir', geste: 'revoir' }, apres: ' dans ta série du jour.' }
            : null,
      };
    }
    case 'coursFini':
      return {
        titre: `Les ${bande.total} leçons du cours sont faites.`,
        phrase: `Reste à te mesurer au format du jour J${DEUX_POINTS} quarante questions, vingt secondes chacune, cinq erreurs admises.`,
        principal: EXAMEN,
        second: ensuite(bande.aRevoir, null, true),
        suite: null,
      };
    case 'entrainement':
      return {
        titre: `Tu as déjà répondu à ${pluriel(bande.vues, 'question')}.`,
        phrase: `L’examen blanc dit si ça tient au format du jour J${DEUX_POINTS} quarante questions, vingt secondes chacune, cinq erreurs admises.`,
        principal: EXAMEN,
        second:
          bande.aRevoir > 0 ? SERIE
          : bande.premiere ? cours(bande.premiere, false)
          : ENTRAINEMENT,
        suite: null,
      };
  }
}

/** La colonne de texte de qui revient, ou `null` pour le nouveau venu. */
export function rendreBande(doc: Document, bande: Bande): HTMLElement | null {
  if (bande.cas === 'nouveau') return null;
  const c = contenu(bande);
  const lien = (g: Geste, classe: string | null) =>
    el(doc, 'a', {
      ...(classe ? { class: classe } : {}),
      href: g.href,
      'data-mesure': 'accueil-bande',
      'data-mesure-cas': bande.cas,
      'data-mesure-geste': g.geste,
    }, g.texte);

  return el(doc, 'div', { class: 'ouverture__texte ouverture__texte--retour' },
    el(doc, 'h1', {}, c.titre),
    el(doc, 'p', { class: 'ouverture__promesse' }, c.phrase),
    el(doc, 'div', { class: 'ouverture__actions' },
      lien(c.principal, 'bouton bouton--principal'),
      c.second && lien(c.second, 'bouton'),
    ),
    c.suite && el(doc, 'p', { class: 'ouverture__deja' }, c.suite.avant, lien(c.suite.lien, null), c.suite.apres),
  );
}

/** L'identifiant du bloc JSON de l'accueil, partagé avec `accueil-site.ts`. */
export const ID_DONNEES = 'accueil-donnees';

function lireDonnees(doc: Document): { lecons: LeconBande[]; ids: string[] } | null {
  const bloc = doc.getElementById(ID_DONNEES);
  if (!bloc) return null;
  try {
    const brut = JSON.parse(bloc.textContent ?? '') as { lecons?: unknown; banque?: unknown };
    if (!Array.isArray(brut.lecons) || !Array.isArray(brut.banque)) return null;
    return { lecons: brut.lecons as LeconBande[], ids: (brut.banque as { id: string }[]).map((q) => q.id) };
  } catch {
    return null;
  }
}

/**
 * Pose la bande de qui revient. À appeler depuis la grille de la bande, avant
 * que la colonne du nouveau venu soit lue : la colonne neuve passe en tête.
 */
export function monterBande(doc: Document, etat: Etat, jour: string): void {
  const grille = doc.querySelector<HTMLElement>('[data-bande-grille]');
  const section = grille?.closest('.ouverture');
  const donnees = lireDonnees(doc);
  if (!grille || !section || !donnees) return;

  const bande = choisirBande(etat, donnees.lecons, donnees.ids, jour);
  const colonne = rendreBande(doc, bande);
  if (!colonne) return;
  grille.prepend(colonne);
  section.setAttribute('data-bande', bande.cas);
}
