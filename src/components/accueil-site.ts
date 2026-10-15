/**
 * Les deux blocs de l'accueil qui lisent la progression, sans React.
 *
 * Ils étaient des îlots (`Reprise`, `DateExamen`, et `ReprendreCours` pour le
 * bouton du cours) qui faisaient charger le runtime React entier sur la page
 * la plus vue du site : 50 Ko brotli, un tiers de sa charge. Le script de
 * `index.astro` les rend maintenant en DOM nu, à partir du même
 * `progression.ts` et des mêmes règles de `profil.ts`. Vides jusqu'au script,
 * comme les îlots `client:only` qu'ils remplacent. Les textes, les liens et
 * les attributs `data-mesure` sont ceux des îlots, un par clic, et jamais deux.
 *
 * La bande d'ouverture n'est plus à ce script : elle se choisit avant la
 * première peinture, dans un script en ligne (`bande-rendu.ts`). Ce module
 * différé arrivait après, et changeait le bouton sous les yeux.
 *
 * Les données de la page (les leçons dans l'ordre du parcours, la banque
 * publiée) sont lues dans un `<script type="application/json">` : 570
 * questions sérialisées dans un attribut d'îlot faisaient 85 Ko de HTML.
 */
import { annoncerDateExamen, aujourdhui, charger, sauvegarder, type Etat } from '../lib/progression';
import { aRevoir, dernierExamen, echeanceDe, phraseDeLEcheance } from '../lib/accueil';
import { evenement } from '../lib/mesure';
import { ID_DONNEES } from '../lib/bande-rendu';
import {
  PALIERS,
  indice,
  objectifDuJour,
  pointFinal,
  profilRempli,
  rappel,
  serieDeJours,
  type QuestionConnue,
} from '../lib/profil';

export interface DonneesAccueil {
  banque: QuestionConnue[];
}

/** L'identifiant du bloc JSON que la page écrit, partagé avec la bande. */
export { ID_DONNEES };

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
    if (!Array.isArray(brut.banque)) return null;
    return { banque: brut.banque };
  } catch {
    return null;
  }
}

/**
 * Où on en est, en deux lignes : l'indice, l'objectif du jour, la série, les
 * erreurs à revoir, le lien vers la fiche. Pour qui arrive pour la première
 * fois, l'invitation à dire pourquoi il passe le permis.
 */
export function monterReprise(racine: HTMLElement, banque: readonly QuestionConnue[], etat: Etat, jour: string): void {
  racine.replaceChildren();

  // Le même filtre que la série de `/revoir` et que l'accueil de l'app : le
  // chiffre annoncé et la série jouée ne doivent pas diverger.
  const revoir = aRevoir(etat, banque.map((q) => q.id), jour);
  const dues = revoir.etat === 'du' ? revoir.nombre : 0;
  const rien = revoir.etat === 'jamais' && etat.examens.length === 0;
  const raison = rappel(etat.profil);

  if (rien && !profilRempli(etat.profil)) {
    racine.append(
      el('div', { class: 'reprise' },
        el('p', {},
          'Première fois ici ? ',
          el('a', { href: '/profil/depart', 'data-mesure': 'accueil-profil-depart' }, 'Dis en trente secondes pourquoi tu passes le permis'),
          ' : on te le rappellera le jour où un examen blanc est recalé.',
        ),
      ),
    );
    return;
  }

  const ind = indice(etat, banque);
  const objectif = objectifDuJour(etat, jour);
  const serie = serieDeJours(etat, jour);
  const prenom = etat.profil.prenom.trim();
  // Le dernier examen blanc terminé. La bande d'ouverture le dit déjà, en
  // tête de page, dans tous ses états : il ne sert plus ici qu'à savoir si
  // la raison doit revenir.
  const dernier = dernierExamen(etat, jour);

  // Sans prénom, la phrase commence à « Indice » : une minuscule en tête de
  // ligne fait cassé.
  const ligne = el('p', {},
    prenom ? `${prenom}, indice` : 'Indice',
    ' de préparation ', b(ind.score), ' sur 100, ', PALIERS[ind.palier].titre.toLowerCase(), '. ',
  );
  // L'objectif atteint se dit : « 20 sur 20 » après quarante réponses
  // plafonnait sans le dire.
  if (objectif.atteint) {
    ligne.append('Objectif du jour fait, ', b(objectif.faites), ` question${objectif.faites > 1 ? 's' : ''}`);
  } else {
    ligne.append('Aujourd’hui ', b(objectif.faites), ` question${objectif.faites > 1 ? 's' : ''} sur ${objectif.cible}`);
  }
  // Un jour n'est pas une série : elle se dit dès deux, et rien de plus.
  if (serie.jours > 1) ligne.append(', ', b(serie.jours), ' jours de suite');
  ligne.append('.');
  if (dues > 0) {
    ligne.append(
      ' ',
      el('a', { href: '/revoir', 'data-mesure': 'accueil-revoir' }, b(dues), ` question${dues > 1 ? 's' : ''} à revoir`),
      '.',
    );
  }
  ligne.append(' ', el('a', { href: '/profil', 'data-mesure': 'accueil-profil' }, 'Ta fiche'), '.');

  const bloc = el('div', { class: 'reprise' }, ligne);
  // La raison ne revient que quand ça coince : affichée à chaque visite, elle
  // devenait du décor, et perdait sa force pour le jour où elle sert.
  if (raison && dernier && !dernier.reussi) {
    bloc.append(el('p', { class: 'reprise__raison' }, 'Tu passes ce permis pour ', el('q', {}, raison), pointFinal(raison)));
  }
  racine.append(bloc);
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
    const phrase = phraseDeLEcheance(echeanceDe(date || null, jour), restantes);
    if (phrase) note.before(el('p', { class: 'discret dateExamen__compte' }, phrase));
  }

  champ.addEventListener('input', () => {
    const valeur = champ.value;
    sauvegarder({ ...charger(), dateExamen: valeur || null });
    // Une date posée est la meilleure intention que le site puisse lire :
    // elle dit qu'il reste des jours à réviser, pas qu'on passe en visiteur.
    if (valeur) evenement('date-examen-renseignee');
    // Dans l'app, la coquille arme sur cette annonce les rappels J-7, J-3,
    // J-1 et le matin même, et c'est là que la permission se demande : le
    // candidat vient de poser sa date, il voit à quoi elle sert. L'app ne
    // sert pas cette page ; l'annonce y reste pour que les trois écrans qui
    // posent la date fassent le même geste.
    annoncerDateExamen(valeur || null);
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
  const reprise = doc.querySelector<HTMLElement>('[data-reprise]');
  const date = doc.querySelector<HTMLElement>('[data-date-examen]');
  if (!reprise && !date) return;

  const donnees = lireDonnees(doc);
  if (!donnees) return;

  const etat = charger();
  const jour = aujourdhui();
  if (reprise) monterReprise(reprise, donnees.banque, etat, jour);
  if (date) monterDateExamen(date, donnees.banque.map((q) => q.id), etat, jour);
}
