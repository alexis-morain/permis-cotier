import { jourPlus } from './jour';
import type { Etat, ExamenPasse, Profil } from './progression';
import { estRetenue } from './quiz';
import { NOTIONS, notionParCode } from './notions';
import { cheminLecon } from './parcours';
import { THEMES } from './themes';

// La raison et ses phrases vivent à part : le résultat d'examen les montre,
// et `/examen` n'a pas à charger la fiche entière, notions comprises.
export { MOTIVATIONS, pointFinal, rappel } from './raison';
export type { Motivation } from './raison';

/**
 * Le moteur de la fiche du candidat : tout ce qui se déduit de la progression
 * locale sans rien lui ajouter. Fonctions pures, le composant ne fait que
 * les dessiner.
 *
 * Ce qu'on emprunte aux applications d'apprentissage : un objectif du jour
 * choisi, une série de jours, un indice lisible en un nombre, et
 * le rappel de la raison de départ au moment où ça coince. Ce qu'on leur
 * laisse : tout ce qui punit, tout ce qui demande un compte.
 */

/** Une question de la banque, réduite à ce que la fiche a besoin de savoir. */
export interface QuestionConnue {
  readonly id: string;
  readonly theme: string;
  /** Code de notion, quand la question en porte un. */
  readonly notion?: string;
}

export interface Depart {
  readonly code: string;
  readonly libelle: string;
  /** Ce qu'on conseille pour commencer, sur l'écran de fin du questionnaire. */
  readonly conseil: string;
  readonly lien: string;
}

export const DEPARTS: readonly Depart[] = [
  { code: 'zero', libelle: 'Je pars de zéro', conseil: 'Commence par le cours, leçon par leçon. Les examens blancs viendront après.', lien: '/cours' },
  { code: 'navigue', libelle: 'J’ai déjà navigué, jamais passé l’épreuve', conseil: 'Fais un examen blanc tout de suite : il dira où sont tes trous.', lien: '/examen' },
  { code: 'repasse', libelle: 'Je repasse l’épreuve', conseil: 'Un examen blanc par jour, et l’entraînement sur les thèmes qui lâchent.', lien: '/examen' },
];

export interface Rythme {
  readonly questions: number;
  readonly nom: string;
  readonly detail: string;
}

/** Questions par jour. Le milieu est le rythme par défaut. */
export const RYTHMES: readonly Rythme[] = [
  { questions: 10, nom: 'Tranquille', detail: 'Dix questions, cinq minutes.' },
  { questions: 20, nom: 'Régulier', detail: 'Vingt questions, une leçon ou un demi-examen.' },
  { questions: 40, nom: 'Soutenu', detail: 'Un examen blanc entier chaque jour.' },
];

export const RYTHME_PAR_DEFAUT = RYTHMES[1]!.questions;

/* ------------------------------------------------------------------------ */
/* L'indice de préparation                                                   */

export type Palier = 'demarre' | 'en-route' | 'presque' | 'pret';

export interface Indice {
  /** De 0 à 100. */
  score: number;
  /** Les trois parts, arrondies, pour l'explication. */
  parts: { vu: number; retenu: number; examens: number };
  palier: Palier;
  /** Les examens complets pris dans la moyenne, le plus récent d'abord. */
  examensComptes: number;
  /** Le dernier examen complet, ou `null` : c'est lui qui nomme le palier. */
  dernier: { bonnes: number; total: number; reussi: boolean } | null;
}

const POIDS = { vu: 20, retenu: 35, examens: 45 } as const;
const EXAMENS_COMPTES = 3;

export const PALIERS: Record<Palier, { titre: string; phrase: string }> = {
  demarre: { titre: 'Tu démarres', phrase: 'L’indice part de ce que tu as vu et retenu. Une leçon ou une série de questions, et il bouge.' },
  'en-route': { titre: 'En route', phrase: 'Tu as vu une partie du programme. Les examens blancs pèsent maintenant le plus.' },
  presque: { titre: 'Presque', phrase: 'Il manque deux examens blancs reçus de suite pour se dire prêt.' },
  pret: { titre: 'Prêt', phrase: 'Deux des trois derniers examens blancs sont reçus. Garde le rythme jusqu’au jour J.' },
};

/** Au-delà de ce nombre d'erreurs, un recalé n'est plus « de peu ». */
const RECALE_DE_PEU = 10;

/**
 * La phrase sous le palier. Sans examen, celle du palier. Avec un examen,
 * elle part du dernier : c'est lui qui nomme le palier (voir `indice`).
 */
export function phraseDuPalier(ind: Indice): string {
  const d = ind.dernier;
  if (!d) return PALIERS[ind.palier].phrase;
  if (ind.palier === 'pret') return PALIERS.pret.phrase;
  if (d.reussi) return 'Ton dernier examen blanc est reçu. Un deuxième sur les trois derniers, et tu es prêt.';
  const erreurs = d.total - d.bonnes;
  return erreurs <= RECALE_DE_PEU
    ? `Ton dernier examen blanc est recalé de peu, ${erreurs} erreurs pour cinq admises. Les notions à reprendre en premier sont plus bas.`
    : `Ton dernier examen blanc est recalé, ${erreurs} erreurs pour cinq admises. Commence par les notions à reprendre en premier, plus bas.`;
}

/**
 * Trois parts : ce qu'on a vu de la banque, ce qu'on en retient, et les trois
 * derniers examens blancs complets. « Retenu » veut dire réussi deux jours
 * différents, pas réussi à la dernière rencontre : la seconde définition
 * comptait comme mémoire une correction relue dix secondes plus tôt. Dès qu'un
 * examen est terminé, le palier se lit sur les examens et non sur le nombre :
 * un nombre seul ne dit pas qu'on tient quarante questions en vingt secondes.
 */
export function indice(etat: Etat, banque: readonly QuestionConnue[]): Indice {
  const publiees = new Set(banque.map((q) => q.id));
  const vues = Object.entries(etat.questions).filter(([id]) => publiees.has(id));
  const retenues = vues.filter(([, e]) => estRetenue(e)).length;

  const partVu = banque.length > 0 ? (POIDS.vu * vues.length) / banque.length : 0;
  const partRetenu = vues.length > 0 ? (POIDS.retenu * retenues) / vues.length : 0;

  const complets = etat.examens.filter((x) => x.total > 0 && x.bonnes <= x.total).slice(0, EXAMENS_COMPTES);
  const points = complets.reduce((a, x) => a + x.bonnes, 0);
  const possibles = complets.reduce((a, x) => a + x.total, 0);
  const partExamens = possibles > 0 ? (POIDS.examens * points) / possibles : 0;

  const score = Math.round(partVu + partRetenu + partExamens);
  const recus = complets.filter((x) => x.reussi).length;

  // Sans examen, le palier suit l'indice. Avec un examen, il suit les
  // examens (décision d'Alexis, 4 octobre) : « 36 sur 100, tu démarres » au
  // lendemain d'un 31 sur 40 démentait le seul chiffre qui compte le jour de
  // l'épreuve. L'indice reste, en second.
  const dernier = complets[0] ?? null;
  let palier: Palier = 'demarre';
  if (dernier) {
    if (recus >= 2) palier = 'pret';
    else if (dernier.reussi) palier = 'presque';
    else if (dernier.total - dernier.bonnes <= RECALE_DE_PEU) palier = 'en-route';
  } else if (score >= 70) palier = 'presque';
  else if (score >= 40) palier = 'en-route';

  return {
    score,
    parts: { vu: Math.round(partVu), retenu: Math.round(partRetenu), examens: Math.round(partExamens) },
    palier,
    examensComptes: complets.length,
    dernier: dernier ? { bonnes: dernier.bonnes, total: dernier.total, reussi: dernier.reussi } : null,
  };
}

/* ------------------------------------------------------------------------ */
/* Les derniers examens blancs                                               */

const EXAMENS_AU_GRAPHIQUE = 10;
const EXAMENS_AU_RESUME = 5;

/** Les examens que l'indice prend lui aussi pour terminés, le plus récent d'abord. */
function examensTermines(etat: Etat): ExamenPasse[] {
  return etat.examens.filter((x) => x.total > 0 && x.bonnes <= x.total);
}

/**
 * Les dix derniers examens blancs, le plus récent en dernier : c'est l'ordre
 * du graphique, qui se lit de gauche à droite. L'historique est déjà gardé
 * avec sa date à la fin de chaque examen (`enregistrerExamen`), rien à ajouter.
 */
export function derniersExamens(etat: Etat): ExamenPasse[] {
  return examensTermines(etat).slice(0, EXAMENS_AU_GRAPHIQUE).reverse();
}

export interface ResumeExamens {
  /** Tous les examens terminés, pas seulement ceux du graphique. */
  passes: number;
  /** Score moyen des cinq derniers, sur 40, ou `null` sans examen. */
  moyenne: number | null;
  /** Combien des cinq derniers sont reçus. */
  recus: number;
  /** Combien d'examens ces cinq-là sont en réalité (moins de cinq au début). */
  sur: number;
}

export function resumeExamens(etat: Etat): ResumeExamens {
  const tous = examensTermines(etat);
  const derniers = tous.slice(0, EXAMENS_AU_RESUME);
  const somme = derniers.reduce((a, x) => a + x.bonnes, 0);
  return {
    passes: tous.length,
    moyenne: derniers.length > 0 ? Math.round((somme / derniers.length) * 10) / 10 : null,
    recus: derniers.filter((x) => x.reussi).length,
    sur: derniers.length,
  };
}

/* ------------------------------------------------------------------------ */
/* Les jours                                                                 */

/**
 * Jours consécutifs avec au moins une réponse, en remontant depuis
 * aujourd'hui. Un jour sans rien, hier, ne rompt pas encore : la série tient
 * jusqu'au soir, comme dans les applications qui l'ont popularisée. Elle est
 * rompue si avant-hier est vide.
 */
export function serieDeJours(etat: Etat, aujourdhui: string): { jours: number; aujourdhui: boolean } {
  const actif = (j: string) => (etat.activite[j] ?? 0) > 0;
  const ceJour = actif(aujourdhui);
  let curseur = ceJour ? aujourdhui : jourPlus(aujourdhui, -1);
  let jours = 0;
  while (actif(curseur) && jours < 10_000) {
    jours += 1;
    curseur = jourPlus(curseur, -1);
  }
  return { jours, aujourdhui: ceJour };
}

export interface Objectif {
  cible: number;
  faites: number;
  atteint: boolean;
}

export function objectifDuJour(etat: Etat, aujourdhui: string): Objectif {
  const cible = etat.profil.rythme ?? RYTHME_PAR_DEFAUT;
  const faites = etat.activite[aujourdhui] ?? 0;
  return { cible, faites, atteint: faites >= cible };
}

/** Les quatorze derniers jours, le plus ancien d'abord, avec le nombre de réponses. */
export function quatorzeJours(etat: Etat, aujourdhui: string): { date: string; reponses: number }[] {
  return Array.from({ length: 14 }, (_, i) => {
    const date = jourPlus(aujourdhui, i - 13);
    return { date, reponses: etat.activite[date] ?? 0 };
  });
}

/**
 * Jours entre aujourd'hui et une date, négatif si elle est passée, `null` si
 * elle est illisible. Le calcul vit dans `jour.ts`, avec les autres jours ;
 * la fiche le réexporte pour ceux qui l'importaient d'ici.
 */
export { joursAvant } from './jour';

/* ------------------------------------------------------------------------ */
/* Par thème                                                                 */

export interface MaitriseTheme {
  code: string;
  /** Questions publiées dans le thème. */
  total: number;
  vues: number;
  /** Vues et réussies deux jours différents. */
  retenues: number;
  /** Vues dont la dernière réponse est fausse. */
  ratees: number;
}

/**
 * Une question compte en ratée tant que sa dernière réponse est fausse. Pas
 * `ratees > 0`, qui garderait rouge à vie une faute reprise et réussie
 * depuis. Une faute remet `succes` à zéro : une question n'est jamais
 * retenue et ratée à la fois, d'où `retenues + ratees <= vues`.
 */
function estRatee(e: { derniereReussie: boolean }): boolean {
  return !e.derniereReussie;
}

/**
 * La clé de tri, la plus faible d'abord. Le premier jour rien n'est retenu,
 * puisque « retenu » demande deux jours : sans les ratées, tout vaudrait zéro
 * et l'ordre du programme déciderait. Retirer les ratées fait passer ce qui
 * a coûté devant ce qui a été réussi. Jamais vu vaut 2, derrière tout.
 */
function cleFaiblesse(m: { vues: number; retenues: number; ratees: number }): number {
  return m.vues === 0 ? 2 : (m.retenues - m.ratees) / m.vues;
}

/**
 * Les thèmes qui ont des questions, les plus faibles d'abord : d'abord ceux
 * qu'on travaille et qu'on rate, puis ceux jamais ouverts, dans l'ordre du
 * programme. Un trou connu passe devant l'inconnu, c'est celui qu'on peut
 * boucher ce soir.
 */
export function maitriseParTheme(etat: Etat, banque: readonly QuestionConnue[]): MaitriseTheme[] {
  const parTheme = new Map<string, MaitriseTheme>();
  for (const q of banque) {
    const t = parTheme.get(q.theme) ?? { code: q.theme, total: 0, vues: 0, retenues: 0, ratees: 0 };
    t.total += 1;
    const e = etat.questions[q.id];
    if (e) {
      t.vues += 1;
      if (estRetenue(e)) t.retenues += 1;
      if (estRatee(e)) t.ratees += 1;
    }
    parTheme.set(q.theme, t);
  }
  const rangProgramme = new Map(THEMES.map((t, i) => [t.code, i]));
  return [...parTheme.values()].sort(
    (a, b) => cleFaiblesse(a) - cleFaiblesse(b) || (rangProgramme.get(a.code) ?? 99) - (rangProgramme.get(b.code) ?? 99),
  );
}

export interface JaugeTheme extends MaitriseTheme {
  /** Retenues sur les questions du thème en banque, arrondi : la barre de la fiche. */
  pourcent: number;
}

/**
 * Les thèmes en jauges. Le pourcentage garde le sens de la barre d'avant :
 * les questions retenues (réussies deux jours différents) sur celles du thème
 * en banque. Les plus fragiles d'abord (pourcentage croissant, ratées devant à égalité),
 * les thèmes jamais ouverts à part, pour tomber en bas.
 */
export function jaugesParTheme(
  etat: Etat,
  banque: readonly QuestionConnue[],
): { travailles: JaugeTheme[]; neufs: JaugeTheme[] } {
  const jauges = maitriseParTheme(etat, banque).map((t) => ({
    ...t,
    pourcent: t.total > 0 ? Math.round((100 * t.retenues) / t.total) : 0,
  }));
  // Le tri stable garde l'ordre des ratées à pourcentage égal (le premier jour,
  // tout vaut zéro) : la liste descend sans qu'une barre plus courte suive une plus longue.
  const travailles = jauges.filter((t) => t.vues > 0).sort((a, b) => a.pourcent - b.pourcent);
  return { travailles, neufs: jauges.filter((t) => t.vues === 0) };
}

/* ------------------------------------------------------------------------ */
/* Par notion                                                                */

export interface MaitriseNotion {
  code: string;
  /** Le libellé de la notion, celui qu'on affiche. */
  nom: string;
  /** Code du thème de rattachement. */
  theme: string;
  /** Questions publiées dans la notion. */
  total: number;
  vues: number;
  /** Vues et réussies deux jours différents. */
  retenues: number;
  /** Vues dont la dernière réponse est fausse. */
  ratees: number;
  /** L'adresse de la leçon, pour aller boucher le trou tout de suite. */
  chemin: string;
}

/**
 * La même mesure que `maitriseParTheme`, un cran plus bas.
 *
 * Quatorze thèmes pour cent cinq notions : « feux-marques, 40 retenues sur
 * 61 » ne dit pas si le trou est le remorquage ou les marques de jour, et
 * c'est pourtant la seule chose que le candidat peut aller réviser ce soir.
 * D'où le chemin de la leçon dans le résultat : la mesure et le geste au même
 * endroit.
 *
 * Ordre identique à celui des thèmes : les notions travaillées et ratées
 * d'abord, les jamais ouvertes ensuite, dans l'ordre du programme. Une
 * question sans notion n'entre nulle part plutôt que d'ouvrir une ligne sans
 * nom ni leçon.
 */
export function maitriseParNotion(etat: Etat, banque: readonly QuestionConnue[]): MaitriseNotion[] {
  const parNotion = new Map<string, MaitriseNotion>();

  for (const q of banque) {
    if (!q.notion) continue;
    const notion = notionParCode(q.notion);
    if (!notion) continue;
    const n = parNotion.get(notion.code) ?? {
      code: notion.code,
      nom: notion.nom,
      theme: notion.theme,
      total: 0,
      vues: 0,
      retenues: 0,
      ratees: 0,
      chemin: cheminLecon(notion),
    };
    n.total += 1;
    const e = etat.questions[q.id];
    if (e) {
      n.vues += 1;
      if (estRetenue(e)) n.retenues += 1;
      if (estRatee(e)) n.ratees += 1;
    }
    parNotion.set(notion.code, n);
  }

  const rangProgramme = new Map(NOTIONS.map((n, i) => [n.code, i]));
  return [...parNotion.values()].sort(
    (a, b) => cleFaiblesse(a) - cleFaiblesse(b) || (rangProgramme.get(a.code) ?? 999) - (rangProgramme.get(b.code) ?? 999),
  );
}

/** Les notions les plus faibles, prêtes à être affichées telles quelles. */
export function notionsLesPlusFaibles(
  etat: Etat,
  banque: readonly QuestionConnue[],
  combien = 3,
): MaitriseNotion[] {
  return maitriseParNotion(etat, banque).slice(0, Math.max(0, combien));
}

/* ------------------------------------------------------------------------ */
/* Le profil rempli                                                         */

/** Le profil a-t-il été rempli, ne serait-ce qu'en partie ? */
export function profilRempli(profil: Profil): boolean {
  return profil.rempliLe !== null;
}
