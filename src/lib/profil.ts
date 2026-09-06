import type { Etat, Profil } from './progression';
import { THEMES } from './themes';

/**
 * Le moteur de la fiche du candidat : tout ce qui se déduit de la progression
 * locale sans rien lui ajouter. Fonctions pures, le composant ne fait que
 * les dessiner.
 *
 * Ce qu'on emprunte aux applications d'apprentissage : un objectif du jour
 * choisi, une série de jours, un indice lisible en un nombre, des jalons, et
 * le rappel de la raison de départ au moment où ça coince. Ce qu'on leur
 * laisse : tout ce qui punit, tout ce qui demande un compte.
 */

/** Une question de la banque, réduite à ce que la fiche a besoin de savoir. */
export interface QuestionConnue {
  readonly id: string;
  readonly theme: string;
}

export interface Motivation {
  readonly code: string;
  /** La case, à la première personne. */
  readonly libelle: string;
  /** Ce qu'on rappelle au candidat, à la deuxième. */
  readonly rappel: string;
}

export const MOTIVATIONS: readonly Motivation[] = [
  { code: 'famille', libelle: 'Emmener ma famille ou mes amis en mer', rappel: 'Emmener les tiens en mer, avec toi à la barre.' },
  { code: 'location', libelle: 'Louer un bateau en vacances', rappel: 'Louer un bateau cet été, sans demander à personne.' },
  { code: 'bateau', libelle: 'Avoir mon propre bateau', rappel: 'Ton bateau à toi, et la mer devant.' },
  { code: 'peche', libelle: 'Aller pêcher au large', rappel: 'Aller pêcher là où la côte ne se voit plus.' },
  { code: 'glisse', libelle: 'Tracter du ski, du wake, ou piloter un jet', rappel: 'Tracter, glisser, piloter : ça commence par ce permis.' },
  { code: 'plongee', libelle: 'Plonger ou pêcher sous l’eau loin de la plage', rappel: 'Mouiller au-dessus du bon tombant, par tes propres moyens.' },
  { code: 'travail', libelle: 'J’en ai besoin pour mon travail', rappel: 'Ce permis, c’est ton travail qui l’attend.' },
  { code: 'hauturier', libelle: 'C’est la première marche vers le hauturier', rappel: 'Le hauturier vient après. Celui-ci d’abord.' },
  { code: 'defi', libelle: 'Un vieux rêve, ou un défi que je me suis lancé', rappel: 'Tu t’es lancé ce défi. Il tient toujours.' },
];

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
}

const POIDS = { vu: 20, retenu: 35, examens: 45 } as const;
const EXAMENS_COMPTES = 3;

export const PALIERS: Record<Palier, { titre: string; phrase: string }> = {
  demarre: { titre: 'Tu démarres', phrase: 'Tout reste à voir. Une leçon ou une série de questions, et l’indice bouge.' },
  'en-route': { titre: 'En route', phrase: 'Tu as vu une partie du programme. Les examens blancs pèsent maintenant le plus.' },
  presque: { titre: 'Presque', phrase: 'Il manque deux examens blancs reçus de suite pour se dire prêt.' },
  pret: { titre: 'Prêt', phrase: 'Deux des trois derniers examens blancs sont reçus. Garde le rythme jusqu’au jour J.' },
};

/**
 * Trois parts : ce qu'on a vu de la banque, ce qu'on en retient, et les trois
 * derniers examens blancs complets. « Prêt » exige en plus deux examens reçus
 * sur les trois derniers : un nombre seul ne dit pas qu'on tient quarante
 * questions en vingt secondes chacune.
 */
export function indice(etat: Etat, banque: readonly QuestionConnue[]): Indice {
  const publiees = new Set(banque.map((q) => q.id));
  const vues = Object.entries(etat.questions).filter(([id]) => publiees.has(id));
  const retenues = vues.filter(([, e]) => e.derniereReussie).length;

  const partVu = banque.length > 0 ? (POIDS.vu * vues.length) / banque.length : 0;
  const partRetenu = vues.length > 0 ? (POIDS.retenu * retenues) / vues.length : 0;

  const complets = etat.examens.filter((x) => x.total > 0 && x.bonnes <= x.total).slice(0, EXAMENS_COMPTES);
  const points = complets.reduce((a, x) => a + x.bonnes, 0);
  const possibles = complets.reduce((a, x) => a + x.total, 0);
  const partExamens = possibles > 0 ? (POIDS.examens * points) / possibles : 0;

  const score = Math.round(partVu + partRetenu + partExamens);
  const recus = complets.filter((x) => x.reussi).length;

  let palier: Palier = 'demarre';
  if (score >= 85 && recus >= 2) palier = 'pret';
  else if (score >= 70) palier = 'presque';
  else if (score >= 40) palier = 'en-route';

  return {
    score,
    parts: { vu: Math.round(partVu), retenu: Math.round(partRetenu), examens: Math.round(partExamens) },
    palier,
    examensComptes: complets.length,
  };
}

/* ------------------------------------------------------------------------ */
/* Les jours                                                                 */

function jourPlus(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

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

/** La plus longue suite de jours avec activité, pour le jalon des sept jours. */
function plusLongueSerie(etat: Etat): number {
  const jours = Object.keys(etat.activite).filter((j) => (etat.activite[j] ?? 0) > 0).sort();
  let record = 0;
  let courante = 0;
  let precedent: string | null = null;
  for (const j of jours) {
    courante = precedent !== null && jourPlus(precedent, 1) === j ? courante + 1 : 1;
    record = Math.max(record, courante);
    precedent = j;
  }
  return record;
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

/** Jours entre aujourd'hui et une date, négatif si elle est passée, `null` si elle est illisible. */
export function joursAvant(date: string, aujourdhui: string): number | null {
  const cible = new Date(`${date}T00:00:00Z`).getTime();
  const ici = new Date(`${aujourdhui}T00:00:00Z`).getTime();
  if (Number.isNaN(cible) || Number.isNaN(ici)) return null;
  return Math.round((cible - ici) / 86_400_000);
}

/* ------------------------------------------------------------------------ */
/* Par thème                                                                 */

export interface MaitriseTheme {
  code: string;
  /** Questions publiées dans le thème. */
  total: number;
  vues: number;
  /** Vues et réussies à la dernière rencontre. */
  retenues: number;
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
    const t = parTheme.get(q.theme) ?? { code: q.theme, total: 0, vues: 0, retenues: 0 };
    t.total += 1;
    const e = etat.questions[q.id];
    if (e) {
      t.vues += 1;
      if (e.derniereReussie) t.retenues += 1;
    }
    parTheme.set(q.theme, t);
  }
  const rangProgramme = new Map(THEMES.map((t, i) => [t.code, i]));
  const cle = (t: MaitriseTheme) => (t.vues === 0 ? 2 : t.retenues / t.vues);
  return [...parTheme.values()].sort(
    (a, b) => cle(a) - cle(b) || (rangProgramme.get(a.code) ?? 99) - (rangProgramme.get(b.code) ?? 99),
  );
}

/* ------------------------------------------------------------------------ */
/* Les jalons                                                                */

export interface Jalon {
  code: string;
  titre: string;
  /** Ce qu'il reste à faire, ou ce qui a été fait. */
  detail: string;
  atteint: boolean;
}

/**
 * Des jalons qu'on atteint et qu'on garde : rien ne se perd, rien ne se
 * retire. Ils se calculent depuis la progression, pas depuis une liste
 * cochée, pour rester justes si la banque change.
 */
export function jalons(etat: Etat, banque: readonly QuestionConnue[], totalLecons: number): Jalon[] {
  const publiees = new Set(banque.map((q) => q.id));
  const vues = Object.keys(etat.questions).filter((id) => publiees.has(id));
  const themesBanque = new Set(banque.map((q) => q.theme));
  const themesTouches = new Set(
    banque.filter((q) => etat.questions[q.id] !== undefined).map((q) => q.theme),
  );
  const complets = etat.examens.filter((x) => x.total > 0);
  const recus = complets.filter((x) => x.reussi).length;
  const troisRecus = complets.length >= 3 && complets.slice(0, 3).every((x) => x.reussi);
  const lecons = Object.keys(etat.lecons).length;
  const serie = plusLongueSerie(etat);
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

  return [
    {
      code: 'dix-questions',
      titre: 'Dix questions vues',
      detail: vues.length >= 10 ? 'Fait.' : `${pluriel(vues.length, 'question')} sur 10.`,
      atteint: vues.length >= 10,
    },
    {
      code: 'premier-examen',
      titre: 'Un examen blanc terminé',
      detail: complets.length > 0 ? `${pluriel(complets.length, 'examen')} au compteur.` : 'Quarante questions, jusqu’au bout.',
      atteint: complets.length > 0,
    },
    {
      code: 'premier-recu',
      titre: 'Un examen blanc reçu',
      detail: recus > 0 ? `${pluriel(recus, 'examen')} reçu${recus > 1 ? 's' : ''}.` : 'Cinq erreurs au plus sur quarante.',
      atteint: recus > 0,
    },
    {
      code: 'cent-questions',
      titre: 'Cent questions vues',
      detail: vues.length >= 100 ? 'Fait.' : `${pluriel(vues.length, 'question')} sur 100.`,
      atteint: vues.length >= 100,
    },
    {
      code: 'tous-les-themes',
      titre: 'Tous les thèmes ouverts',
      detail: `${themesTouches.size} thème${themesTouches.size > 1 ? 's' : ''} sur ${themesBanque.size}.`,
      atteint: themesBanque.size > 0 && themesTouches.size === themesBanque.size,
    },
    {
      code: 'sept-jours',
      titre: 'Sept jours de suite',
      detail: serie >= 7 ? 'Fait.' : `Ta plus longue série : ${pluriel(serie, 'jour')}.`,
      atteint: serie >= 7,
    },
    {
      code: 'trois-recus',
      titre: 'Trois examens reçus d’affilée',
      detail: troisRecus ? 'Fait. C’est le signal qu’on attend avant le jour J.' : 'Les trois derniers, tous reçus.',
      atteint: troisRecus,
    },
    {
      code: 'cours-entier',
      titre: 'Le cours en entier',
      detail: totalLecons > 0 && lecons >= totalLecons ? 'Fait.' : `${pluriel(lecons, 'leçon')} sur ${totalLecons}.`,
      atteint: totalLecons > 0 && lecons >= totalLecons,
    },
  ];
}

/* ------------------------------------------------------------------------ */
/* Le rappel                                                                 */

/** La raison à rappeler : la phrase du candidat, sinon sa première case, sinon rien. */
export function rappel(profil: Profil): string | null {
  const phrase = profil.phrase.trim();
  if (phrase) return phrase;
  for (const code of profil.motivations) {
    const m = MOTIVATIONS.find((x) => x.code === code);
    if (m) return m.rappel;
  }
  return null;
}

/** Le profil a-t-il été rempli, ne serait-ce qu'en partie ? */
export function profilRempli(profil: Profil): boolean {
  return profil.rempliLe !== null;
}
