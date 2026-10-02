/**
 * Les trois blocs de l'accueil qui lisent la progression, sans React.
 *
 * Ils étaient trois îlots (`ReprendreCours`, `Reprise`, `DateExamen`) pour
 * trois kilooctets de logique, et les trois faisaient charger le runtime
 * React entier sur la page la plus vue du site : 50 Ko brotli, un tiers de
 * sa charge. Le script de `index.astro` les rend maintenant en DOM nu, à
 * partir du même `progression.ts` et des mêmes règles de `profil.ts`.
 *
 * Ce que la page sert avant le script est ce que l'îlot `client:load`
 * rendait côté serveur : « Commencer le cours » vers la première leçon. Les
 * deux autres blocs étaient `client:only` : vides jusqu'au script, ils le
 * restent. Les textes, les liens et les attributs `data-mesure` sont ceux
 * des îlots, un par clic, et jamais deux.
 *
 * Les données de la page (les leçons dans l'ordre du parcours, la banque
 * publiée) sont lues dans un `<script type="application/json">` : 570
 * questions sérialisées dans un attribut d'îlot faisaient 85 Ko de HTML.
 */
import { aujourdhui, charger, sauvegarder, type Etat } from '../lib/progression';
import { estDue } from '../lib/quiz';
import { evenement } from '../lib/mesure';
import { programmerRappels } from '../lib/natif';
import {
  PALIERS,
  indice,
  joursAvant,
  objectifDuJour,
  profilRempli,
  rappel,
  serieDeJours,
  type QuestionConnue,
} from '../lib/profil';

export interface LeconAccueil {
  code: string;
  nom: string;
  chemin: string;
}

export interface DonneesAccueil {
  lecons: LeconAccueil[];
  banque: QuestionConnue[];
}

/** L'identifiant du bloc JSON que la page écrit. */
export const ID_DONNEES = 'accueil-donnees';

type Enfant = Node | string | null | false | undefined;

/** Un élément, ses attributs, ses enfants. Jamais de HTML recollé : le prénom vient de l'utilisateur. */
function el(balise: string, attributs: Record<string, string> = {}, ...enfants: Enfant[]): HTMLElement {
  const e = document.createElement(balise);
  for (const [nom, valeur] of Object.entries(attributs)) e.setAttribute(nom, valeur);
  for (const enfant of enfants) {
    if (enfant === null || enfant === false || enfant === undefined) continue;
    e.append(typeof enfant === 'string' ? document.createTextNode(enfant) : enfant);
  }
  return e;
}

const b = (texte: string | number) => el('b', {}, String(texte));

/** Les données de la page, ou `null` si le bloc manque ou ne se lit pas. */
export function lireDonnees(doc: Document): DonneesAccueil | null {
  const bloc = doc.getElementById(ID_DONNEES);
  if (!bloc) return null;
  try {
    const brut = JSON.parse(bloc.textContent ?? '') as Partial<DonneesAccueil>;
    if (!Array.isArray(brut.lecons) || !Array.isArray(brut.banque)) return null;
    return { lecons: brut.lecons, banque: brut.banque };
  } catch {
    return null;
  }
}

/**
 * Où on en est dans le cours, et la leçon à faire maintenant. Le lien est
 * déjà dans la page : on le repointe, et on pose le compte devant.
 */
export function monterReprendreCours(racine: HTMLElement, lecons: readonly LeconAccueil[], etat: Etat): void {
  const faites = etat.lecons;
  const nombre = lecons.filter((l) => faites[l.code] !== undefined).length;
  const prochaine = lecons.find((l) => faites[l.code] === undefined) ?? lecons[0];
  const lien = racine.querySelector('a');
  if (!prochaine || !lien) return;

  lien.setAttribute('href', prochaine.chemin);
  lien.setAttribute('data-mesure-notion', prochaine.code);
  lien.textContent = nombre > 0 ? `Reprendre : ${prochaine.nom}` : 'Commencer le cours';

  racine.querySelector('.reprendreCours__compte')?.remove();
  if (nombre > 0) {
    const s = nombre > 1 ? 's' : '';
    racine.prepend(el('span', { class: 'reprendreCours__compte' }, b(nombre), ` leçon${s} faite${s} sur ${lecons.length}. `));
  }
}

/**
 * Où on en est, en deux lignes : l'indice, l'objectif du jour, la série, les
 * erreurs à revoir, le lien vers la fiche. Pour qui arrive pour la première
 * fois, l'invitation à dire pourquoi il passe le permis.
 */
export function monterReprise(racine: HTMLElement, banque: readonly QuestionConnue[], etat: Etat, jour: string): void {
  racine.replaceChildren();

  const publiees = new Set(banque.map((q) => q.id));
  const vues = Object.entries(etat.questions).filter(([id]) => publiees.has(id));
  // Le même filtre que la série de `/revoir` : le chiffre annoncé et la série
  // jouée ne doivent pas diverger.
  const aRevoir = vues.filter(([, e]) => estDue(e, jour)).length;
  const rien = vues.length === 0 && etat.examens.length === 0;
  const raison = rappel(etat.profil);

  if (rien && !profilRempli(etat.profil)) {
    racine.append(
      el('div', { class: 'reprise' },
        el('p', {},
          'Première fois ici ? ',
          el('a', { href: '/profil/depart', 'data-mesure': 'accueil-profil-depart' }, 'Dis en trente secondes pourquoi tu passes le permis'),
          ' : le site se règle à ta main, et te le rappelle quand ça coince.',
        ),
      ),
    );
    return;
  }

  const ind = indice(etat, banque);
  const objectif = objectifDuJour(etat, jour);
  const serie = serieDeJours(etat, jour);
  const prenom = etat.profil.prenom.trim();
  const faites = Math.min(objectif.faites, objectif.cible);

  const ligne = el('p', {},
    prenom ? `${prenom}, ` : '',
    'indice de préparation ', b(ind.score), ' sur 100, ', PALIERS[ind.palier].titre.toLowerCase(),
    '. Aujourd’hui ', b(faites), ` question${faites > 1 ? 's' : ''} sur ${objectif.cible}`,
  );
  if (serie.jours > 0) ligne.append(', ', b(serie.jours), ` jour${serie.jours > 1 ? 's' : ''} de suite`);
  ligne.append('.');
  if (aRevoir > 0) {
    ligne.append(
      ' ',
      el('a', { href: '/revoir', 'data-mesure': 'accueil-revoir' }, b(aRevoir), ` question${aRevoir > 1 ? 's' : ''} à revoir`),
      '.',
    );
  }
  ligne.append(' ', el('a', { href: '/profil', 'data-mesure': 'accueil-profil' }, 'Ta fiche'), '.');

  const bloc = el('div', { class: 'reprise' }, ligne);
  if (raison) bloc.append(el('p', { class: 'reprise__raison' }, 'Tu passes ce permis pour ', el('q', {}, raison)));
  racine.append(bloc);
}

/** La phrase sous la date, ou `null` sans date. */
function compteARebours(date: string, restantes: number, jour: string): string | null {
  const jours = date ? joursAvant(date, jour) : null;
  if (jours === null) return null;
  if (jours > 1) {
    return restantes > 0
      ? `Dans ${jours} jours. Environ ${Math.max(1, Math.ceil(restantes / jours))} questions par jour pour voir les ${restantes} qui restent.`
      : `Dans ${jours} jours. Tu as tout vu une fois : place aux examens blancs.`;
  }
  if (jours === 1) return 'Demain. Fais deux examens blancs ce soir.';
  if (jours === 0) return 'Aujourd’hui. Bon vent.';
  return 'C’est passé. Tu peux effacer la date dans les réglages.';
}

/**
 * « Ton examen est quand ? » Facultative, gardée dans le navigateur, jamais
 * envoyée nulle part. Elle sert au compte à rebours, et à savoir si les gens
 * révisent la veille ou trois semaines avant.
 */
export function monterDateExamen(racine: HTMLElement, ids: readonly string[], etat: Etat, jour: string): void {
  racine.replaceChildren();
  // Le même compte que la fiche : ce qui est publié et jamais rencontré.
  const restantes = ids.filter((id) => etat.questions[id] === undefined).length;

  const champ = el('input', { id: 'date-examen', class: 'champ', type: 'date' }) as HTMLInputElement;
  champ.value = etat.dateExamen ?? '';
  const note = el('p', { class: 'discret dateExamen__note' }, 'Gardée dans ce navigateur, rien n’est envoyé.');
  const bloc = el('div', { class: 'dateExamen' },
    el('label', { for: 'date-examen' }, 'Ton examen est quand ?'),
    champ,
    note,
  );

  function poserCompte(date: string): void {
    bloc.querySelector('.dateExamen__compte')?.remove();
    const phrase = compteARebours(date, restantes, jour);
    if (phrase) note.before(el('p', { class: 'discret dateExamen__compte' }, phrase));
  }

  champ.addEventListener('input', () => {
    const valeur = champ.value;
    sauvegarder({ ...charger(), dateExamen: valeur || null });
    // Une date posée est la meilleure intention que le site puisse lire :
    // elle dit qu'il reste des jours à réviser, pas qu'on passe en visiteur.
    if (valeur) evenement('date-examen-renseignee');
    // Dans l'app, la date arme les rappels J-7, J-3, J-1 et le matin même.
    // C'est le seul moment où la permission se demande : le candidat vient de
    // poser sa date, il voit à quoi elle sert. Sur le site, sans effet.
    void programmerRappels(valeur || null);
    poserCompte(valeur);
  });

  poserCompte(champ.value);
  racine.append(bloc);
}

/**
 * Le point d'entrée du script de la page. Sur une page sans ces blocs, ou
 * dont les données ne se lisent pas, il ne touche à rien : la page reste ce
 * que le serveur a rendu.
 */
export function monterAccueil(doc: Document = document): void {
  const reprendre = doc.querySelector<HTMLElement>('[data-reprendre-cours]');
  const reprise = doc.querySelector<HTMLElement>('[data-reprise]');
  const date = doc.querySelector<HTMLElement>('[data-date-examen]');
  if (!reprendre && !reprise && !date) return;

  const donnees = lireDonnees(doc);
  if (!donnees) return;

  const etat = charger();
  const jour = aujourdhui();
  if (reprendre) monterReprendreCours(reprendre, donnees.lecons, etat);
  if (reprise) monterReprise(reprise, donnees.banque, etat, jour);
  if (date) monterDateExamen(date, donnees.banque.map((q) => q.id), etat, jour);
}
