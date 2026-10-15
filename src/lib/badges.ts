import { dateLisible } from './jour';
import { notionsDuTheme } from './notions';
import type { BadgesTheme, Etat, ExamenPasse, PalierBadge, ScoreTheme } from './progression';
import type { QuestionConnue } from './profil';
import { estRetenue } from './quiz';
import { THEMES, themeParCode } from './themes';

/**
 * Les badges par thème : trois paliers, chacun un fait vérifiable, gagnés au
 * moment du geste et gardés. Une faute plus tard, une question retirée de la
 * banque ne les reprennent pas : le fait a eu lieu, il est daté. Seul
 * « Effacer ma progression » les retire, puisqu'il efface l'état entier.
 *
 * Décision du 14 octobre (plan « app solide », lot 3) : la récompense dit
 * « maintenant que », jamais « si… alors ». Rien ici pour la présence seule
 * (série, jours, connexions), aucun total de badges.
 *
 * Fonctions pures. L'écran appelle `attribuerBadges` après chaque geste qui
 * peut en faire gagner un, sauvegarde l'état rendu et annonce `nouveaux`.
 */

export type { PalierBadge } from './progression';

export const PALIERS_BADGE: readonly { code: PalierBadge; nom: string }[] = [
  { code: 'parcouru', nom: 'Parcouru' },
  { code: 'retenu', nom: 'Retenu' },
  { code: 'sur', nom: 'Sûr à l’examen' },
];

/**
 * La part des questions publiées du thème à avoir retenues. Le compte exigé
 * s'arrondit au supérieur : 87 sur 108, jamais 86 (79,6 %).
 */
export const SEUIL_RETENU = 0.8;

/** Examens blancs de suite sans faute sur le thème. */
export const EXAMENS_SANS_FAUTE = 3;

/** Ce que dit le fait : la date, et les nombres du jour où il a eu lieu. */
export interface ContexteFait {
  date: string;
  /** Leçons du thème, pour `parcouru`. */
  lecons?: number;
  /** Questions retenues et publiées du thème, pour `retenu`. */
  retenues?: number;
  total?: number;
}

export interface BadgeNouveau extends ContexteFait {
  theme: string;
  palier: PalierBadge;
}

const JOUR_RANGE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Les badges relus du stockage : un palier inconnu ou sans date lisible est
 * jeté, un thème resté vide aussi. `charger` ne vérifie que la forme générale,
 * pour que le script en ligne de l'accueil, qui l'embarque, n'en paie rien.
 */
export function badgesLisibles(brut: unknown): Record<string, BadgesTheme> {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return {};
  const propre: Record<string, BadgesTheme> = {};
  for (const [theme, valeur] of Object.entries(brut as Record<string, unknown>)) {
    if (!valeur || typeof valeur !== 'object') continue;
    const dates = valeur as Record<string, unknown>;
    const gardes: BadgesTheme = {};
    for (const { code } of PALIERS_BADGE) {
      const d = dates[code];
      if (typeof d === 'string' && JOUR_RANGE.test(d)) gardes[code] = d;
    }
    if (Object.keys(gardes).length > 0) propre[theme] = gardes;
  }
  return propre;
}

function estScoreTheme(v: unknown): v is ScoreTheme {
  if (!v || typeof v !== 'object') return false;
  const { bonnes, total } = v as Record<string, unknown>;
  return Number.isInteger(bonnes) && Number.isInteger(total) && (bonnes as number) >= 0 && (bonnes as number) <= (total as number);
}

/** Le détail par thème d'un examen, s'il est lisible en entier ; sinon l'examen ne compte pas. */
function detailLisible(x: ExamenPasse): Record<string, ScoreTheme> | null {
  const d: unknown = x?.parTheme;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  return Object.values(d).every(estScoreTheme) ? (d as Record<string, ScoreTheme>) : null;
}

/**
 * Le thème dans les examens où il est tombé, le plus récent d'abord. Seuls
 * comptent les examens complets portant leur détail : ceux d'avant le champ
 * n'en ont pas, et un examen arrêté en route n'entre jamais dans l'historique.
 * Un examen sans question du thème n'y figure pas : il ne casse ni ne compte
 * la suite, puisqu'il ne dit rien de ce thème.
 */
function passagesDuTheme(etat: Etat, theme: string): ScoreTheme[] {
  const passages: ScoreTheme[] = [];
  for (const x of etat.examens) {
    if (!x || !(x.total > 0)) continue;
    const s = detailLisible(x)?.[theme];
    if (s && s.total > 0) passages.push(s);
  }
  return passages;
}

/** Examens sans faute sur le thème, de suite, en remontant depuis le dernier. */
function sansFauteDeSuite(etat: Etat, theme: string): number {
  let n = 0;
  for (const s of passagesDuTheme(etat, theme)) {
    if (s.bonnes !== s.total) break;
    n += 1;
  }
  return n;
}

interface Mesure {
  lecons: number;
  suivies: number;
  total: number;
  retenues: number;
  seuil: number;
  sansFaute: number;
}

function mesurer(etat: Etat, banque: readonly QuestionConnue[], theme: string): Mesure {
  const notions = notionsDuTheme(theme);
  const publiees = banque.filter((q) => q.theme === theme);
  return {
    lecons: notions.length,
    suivies: notions.filter((n) => etat.lecons[n.code] !== undefined).length,
    total: publiees.length,
    retenues: publiees.filter((q) => estRetenue(etat.questions[q.id])).length,
    seuil: Math.ceil(publiees.length * SEUIL_RETENU),
    sansFaute: sansFauteDeSuite(etat, theme),
  };
}

/** Le palier est-il atteignable pour ce thème : pas de badge vide. */
function possible(palier: PalierBadge, m: Mesure): boolean {
  if (m.total === 0) return false;
  return palier !== 'parcouru' || m.lecons > 0;
}

function atteint(palier: PalierBadge, m: Mesure): boolean {
  if (palier === 'parcouru') return m.suivies === m.lecons;
  if (palier === 'retenu') return m.retenues >= m.seuil;
  return m.sansFaute >= EXAMENS_SANS_FAUTE;
}

function contexte(palier: PalierBadge, m: Mesure, date: string): ContexteFait {
  if (palier === 'parcouru') return { date, lecons: m.lecons };
  if (palier === 'retenu') return { date, retenues: m.retenues, total: m.total };
  return { date };
}

/** Les thèmes qui ont des questions publiées, dans l'ordre du programme. */
function themesDeLaBanque(banque: readonly QuestionConnue[]): string[] {
  const rang = new Map(THEMES.map((t, i) => [t.code, i]));
  return [...new Set(banque.map((q) => q.theme))].sort(
    (a, b) => (rang.get(a) ?? THEMES.length) - (rang.get(b) ?? THEMES.length) || a.localeCompare(b),
  );
}

/**
 * Les badges gagnés par le geste qui vient d'avoir lieu, datés de `date`.
 * Idempotente : rappelée sur son propre résultat, elle ne rend rien de neuf.
 * Elle ne retire rien, et ne redate jamais un badge déjà gagné.
 */
export function attribuerBadges(
  etat: Etat,
  banque: readonly QuestionConnue[],
  date: string,
): { etat: Etat; nouveaux: BadgeNouveau[] } {
  const badges = badgesLisibles(etat.badges);
  const nouveaux: BadgeNouveau[] = [];
  for (const theme of themesDeLaBanque(banque)) {
    const m = mesurer(etat, banque, theme);
    for (const { code } of PALIERS_BADGE) {
      if (badges[theme]?.[code] || !possible(code, m) || !atteint(code, m)) continue;
      badges[theme] = { ...badges[theme], [code]: date };
      nouveaux.push({ theme, palier: code, ...contexte(code, m, date) });
    }
  }
  return { etat: { ...etat, badges }, nouveaux };
}

/* ------------------------------------------------------------------------ */
/* Les phrases                                                               */

/** Chaque thème en groupe nominal, avec son article : ce qui suit « sur ». */
const THEME_EN_PHRASE: Record<string, string> = {
  balisage: 'le balisage',
  'balisage-region-b': 'le balisage de la région B',
  'barre-route': 'les règles de barre et de route',
  signaux: 'les signaux',
  'feux-marques': 'les feux et marques',
  securite: 'la navigation et la sécurité',
  'titre-conduite': 'le titre de conduite',
  vhf: 'la VHF et le SMDSM',
  'ski-responsabilites': 'le ski nautique et les responsabilités',
  carburant: 'l’autonomie en carburant',
  environnement: 'l’environnement',
  meteo: 'la météorologie',
  'carte-marine': 'la carte marine et les marées',
  ecluses: 'les écluses',
};

function enPhrase(theme: string): string {
  return THEME_EN_PHRASE[theme] ?? `le thème « ${themeParCode(theme)?.nom ?? theme} »`;
}

/** « de » plus l'article : des, du, de la, de l’. */
function complement(theme: string): string {
  const p = enPhrase(theme);
  if (p.startsWith('les ')) return `des ${p.slice(4)}`;
  if (p.startsWith('le ')) return `du ${p.slice(3)}`;
  return `de ${p}`;
}

/** « 12 octobre », « 1er octobre ». */
function leJour(date: string): string {
  return dateLisible(date).replace(/^1 /, '1er ');
}

/** Le fait qui a gagné le badge, à afficher tel quel. */
export function faitDuBadge(theme: string, palier: PalierBadge, ctx: ContexteFait): string {
  const le = `le ${leJour(ctx.date)}`;
  if (palier === 'parcouru') {
    if (ctx.lecons === undefined) return `Toutes les leçons ${complement(theme)} suivies, ${le}.`;
    if (ctx.lecons === 1) return `La leçon ${complement(theme)} suivie, ${le}.`;
    return `Les ${ctx.lecons} leçons ${complement(theme)} suivies, ${le}.`;
  }
  if (palier === 'retenu') {
    if (ctx.retenues === undefined || ctx.total === undefined) {
      return `Au moins quatre questions sur cinq retenues, ${le}.`;
    }
    const s = ctx.retenues > 1 ? 's' : '';
    return `${ctx.retenues} question${s} sur ${ctx.total} retenue${s}, ${le}.`;
  }
  return `Trois examens blancs de suite sans faute sur ${enPhrase(theme)}, ${le}.`;
}

/**
 * Ce qui mène au prochain palier du thème, dit comme un fait : jamais un
 * compte à rebours. Les paliers se prennent dans l'ordre, un palier
 * impossible (thème sans leçon) est sauté. `null` quand tout est gagné, ou
 * que le thème n'a aucune question publiée.
 */
export function prochainPalier(
  etat: Etat,
  banque: readonly QuestionConnue[],
  theme: string,
): { palier: PalierBadge; fait: string } | null {
  const gagnes = badgesLisibles(etat.badges)[theme] ?? {};
  const m = mesurer(etat, banque, theme);
  const suivant = PALIERS_BADGE.find(({ code }) => !gagnes[code] && possible(code, m));
  if (!suivant) return null;
  const nom = `le palier ${suivant.nom}`;
  if (suivant.code === 'parcouru') {
    const s = m.suivies > 1 ? 's' : '';
    return { palier: 'parcouru', fait: `${m.suivies} leçon${s} suivie${s} sur ${m.lecons} ; à ${m.lecons}, ${nom}.` };
  }
  if (suivant.code === 'retenu') {
    const s = m.retenues > 1 ? 's' : '';
    return { palier: 'retenu', fait: `${m.retenues} retenue${s} sur ${m.total} ; à ${m.seuil}, ${nom}.` };
  }
  const n = Math.min(m.sansFaute, EXAMENS_SANS_FAUTE - 1);
  const fait =
    n === 0
      ? `Aucun examen blanc sans faute sur ce thème pour l’instant ; à ${EXAMENS_SANS_FAUTE} de suite, ${nom}.`
      : `${n} examen${n > 1 ? 's' : ''} blanc${n > 1 ? 's' : ''} de suite sans faute sur ce thème ; à ${EXAMENS_SANS_FAUTE}, ${nom}.`;
  return { palier: 'sur', fait };
}
