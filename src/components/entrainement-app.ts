/**
 * La liste de l'écran Entraînement, dans l'app : ce que le serveur rend
 * (`EntrainementApp.astro`) est la liste sans progression, le script y pose
 * les erreurs en tête et, sous chaque thème ouvert, « n retenues sur m » avec
 * une jauge fine, comme le Cours. « Retenue » est celle de la Fiche : le
 * compte vient de `maitriseParTheme`, jamais recalculé ici.
 *
 * Un thème jamais ouvert garde « m questions » et sa jauge cachée : une barre
 * vide ne dirait rien. Chaque appel repart de la progression lue, sans rien
 * empiler : la liste est relancée à chaque écran et à `app:progression`.
 */
import { maitriseParTheme, type QuestionConnue } from '../lib/profil';
import { nombreDErreurs } from '../lib/accueil';
import type { Etat } from '../lib/progression';

const pluriel = (n: number) => (n > 1 ? 's' : '');

/** La banque que la page donne au script, en JSON sur la liste. */
function lireBanque(liste: HTMLElement): QuestionConnue[] {
  try {
    const lue: unknown = JSON.parse(liste.dataset.banque ?? '[]');
    return Array.isArray(lue) ? (lue as QuestionConnue[]) : [];
  } catch {
    return [];
  }
}

export function poserLaListe(doc: ParentNode, etat: Etat, jour: string): void {
  const liste = doc.querySelector<HTMLElement>('.choix[data-banque]');
  if (!liste) return;
  const banque = lireBanque(liste);

  const erreurs = liste.querySelector<HTMLLIElement>('.choix__erreurs');
  if (erreurs) {
    const n = nombreDErreurs(etat, banque.map((q) => q.id), jour);
    erreurs.hidden = n === 0;
    if (n > 0) erreurs.querySelector('.pastille')!.textContent = `${n} question${pluriel(n)}`;
  }

  const maitrise = new Map(maitriseParTheme(etat, banque).map((t) => [t.code, t]));
  for (const ligne of liste.querySelectorAll<HTMLLIElement>('li[data-theme]')) {
    const t = maitrise.get(ligne.dataset.theme ?? '');
    const pastille = ligne.querySelector('.pastille');
    const jauge = ligne.querySelector<HTMLElement>('.choix__jauge');
    if (!t || !pastille || !jauge) continue;
    const ouvert = t.vues > 0;
    pastille.textContent = ouvert
      ? `${t.retenues} retenue${pluriel(t.retenues)} sur ${t.total}`
      : `${t.total} question${pluriel(t.total)}`;
    jauge.hidden = !ouvert;
    jauge.querySelector<HTMLElement>('span')!.style.transform = `scaleX(${t.total > 0 ? t.retenues / t.total : 0})`;
  }
}
