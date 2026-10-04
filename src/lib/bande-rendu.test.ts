/** @vitest-environment jsdom */
/**
 * Ce que la bande d'ouverture dit à qui revient, et comment elle se pose dans
 * la page avant le premier rendu.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { monterBande, rendreBande, rendrePanneau } from './bande-rendu';
import type { Bande, LeconBande } from './bande';
import { enregistrerExamen, enregistrerReponse, etatInitial, terminerLecon, type ExamenPasse } from './progression';
import { ERREURS_ADMISES } from './quiz';

const lecon: LeconBande = { code: 'balisage-cardinal', nom: 'Marques cardinales', chemin: '/cours/balisage/balisage-cardinal' };
const examen = { bonnes: 29, total: 40, erreurs: 11, depuis: 1 };

function colonne(bande: Bande): HTMLElement {
  const c = rendreBande(document, bande);
  if (!c) throw new Error('pas de colonne');
  return c;
}
const titre = (c: HTMLElement) => c.querySelector('h1')?.textContent;
const phrase = (c: HTMLElement) => c.querySelector('.ouverture__promesse')?.textContent ?? '';
const boutons = (c: HTMLElement) =>
  [...c.querySelectorAll<HTMLAnchorElement>('.ouverture__actions a')].map((a) => ({
    texte: a.textContent,
    href: a.getAttribute('href'),
    principal: a.classList.contains('bouton--principal'),
  }));

describe('le texte, cas par cas', () => {
  it('le nouveau venu n’a pas de colonne : la page garde la sienne', () => {
    expect(rendreBande(document, { cas: 'nouveau' })).toBeNull();
  });

  it('recalé avec des questions dues : revoir d’abord, l’examen ensuite', () => {
    const c = colonne({ cas: 'recale', examen, aRevoir: 12, prochaine: lecon, coursEntame: true });
    expect(titre(c)).toBe('Dernier examen blanc : 29\u00a0sur\u00a040, recalé.');
    expect(phrase(c)).toBe(
      'C’était hier, avec 11 erreurs : l’épreuve en admet cinq. Revois-les avant d’en repasser un : elles reviennent dans ta série du jour jusqu’à ce que tu les tiennes.',
    );
    expect(boutons(c)).toEqual([
      { texte: 'Faire la série du jour', href: '/revoir', principal: true },
      { texte: 'Refaire un examen blanc', href: '/examen', principal: false },
    ]);
    const suite = c.querySelector('.ouverture__deja');
    expect(suite?.textContent).toBe('Ou reprends le cours à Marques cardinales.');
    expect(suite?.querySelector('a')?.getAttribute('href')).toBe(lecon.chemin);
  });

  it('recalé sans rien de dû : l’examen passe en principal', () => {
    const c = colonne({ cas: 'recale', examen: { ...examen, depuis: 0 }, aRevoir: 0, prochaine: lecon, coursEntame: true });
    expect(phrase(c)).toBe(
      'C’était aujourd’hui, avec 11 erreurs : l’épreuve en admet cinq. Tes questions à revoir sont faites, refais un examen pour voir si ça tient.',
    );
    expect(boutons(c)).toEqual([
      { texte: 'Refaire un examen blanc', href: '/examen', principal: true },
      { texte: 'Reprendre le cours', href: lecon.chemin, principal: false },
    ]);
  });

  it('sans leçon faite, le cours se commence, il ne se reprend pas', () => {
    const recaleSans = colonne({ cas: 'recale', examen, aRevoir: 2, prochaine: lecon, coursEntame: false });
    expect(recaleSans.querySelector('.ouverture__deja')?.textContent).toBe('Ou commence le cours par Marques cardinales.');
    const recuSans = colonne({ cas: 'recu', examen, aRevoir: 0, prochaine: lecon, coursEntame: false });
    expect(boutons(recuSans)[1]).toEqual({ texte: 'Commencer le cours', href: lecon.chemin, principal: false });
  });

  it('reçu : le mot l’écrit, et l’examen se refait', () => {
    const c = colonne({ cas: 'recu', examen: { bonnes: 37, total: 40, erreurs: 3, depuis: 4 }, aRevoir: 0, prochaine: null, coursEntame: true });
    expect(titre(c)).toBe('Dernier examen blanc : 37\u00a0sur\u00a040, reçu.');
    expect(phrase(c)).toBe(
      'C’était il y a 4 jours, avec 3 erreurs sur les cinq admises. Un examen reçu ne dit rien du suivant : les quarante questions changent à chaque tirage.',
    );
    expect(boutons(c)).toEqual([
      { texte: 'Refaire un examen blanc', href: '/examen', principal: true },
      { texte: 'S’entraîner par thème', href: '/entrainement', principal: false },
    ]);
  });

  it('reçu sans faute, puis avec une seule', () => {
    const sans = colonne({ cas: 'recu', examen: { bonnes: 40, total: 40, erreurs: 0, depuis: 1 }, aRevoir: 1, prochaine: lecon, coursEntame: true });
    expect(phrase(sans)).toMatch(/^C’était hier, sans une erreur\. /);
    expect(boutons(sans)[1]).toEqual({ texte: 'Faire la série du jour', href: '/revoir', principal: false });
    const une = colonne({ cas: 'recu', examen: { bonnes: 39, total: 40, erreurs: 1, depuis: 1 }, aRevoir: 0, prochaine: lecon, coursEntame: true });
    expect(phrase(une)).toMatch(/^C’était hier, avec 1 erreur sur les cinq admises\. /);
    expect(boutons(une)[1]).toEqual({ texte: 'Reprendre le cours', href: lecon.chemin, principal: false });
  });

  it('l’épreuve demain : deux examens blancs ce soir', () => {
    const c = colonne({ cas: 'echeance', jours: 1, examen: { ...examen, reussi: false }, aRevoir: 3 });
    expect(titre(c)).toBe('Ton examen est demain.');
    expect(phrase(c)).toBe('Dernier examen blanc : 29\u00a0sur\u00a040, recalé. Fais deux examens blancs ce soir, au chrono.');
    expect(boutons(c)).toEqual([
      { texte: 'Passer un examen blanc', href: '/examen', principal: true },
      { texte: 'Faire la série du jour', href: '/revoir', principal: false },
    ]);
  });

  it('l’épreuve aujourd’hui, puis dans trois jours, sans examen passé', () => {
    const jourJ = colonne({ cas: 'echeance', jours: 0, examen: null, aRevoir: 0 });
    expect(titre(jourJ)).toBe('Ton examen, c’est aujourd’hui.');
    expect(phrase(jourJ)).toBe('Un examen blanc pour te mettre dans le rythme, puis bon vent.');
    expect(boutons(jourJ)).toEqual([{ texte: 'Passer un examen blanc', href: '/examen', principal: true }]);
    const trois = colonne({ cas: 'echeance', jours: 3, examen: null, aRevoir: 0 });
    expect(titre(trois)).toBe('Ton examen est dans 3 jours.');
    expect(phrase(trois)).toBe('Un examen blanc par jour d’ici là, et tes erreurs entre deux.');
  });

  it('le cours en cours : la leçon suivante, nommée', () => {
    const c = colonne({ cas: 'cours', faites: 12, total: 105, prochaine: lecon, examen: null, aRevoir: 4 });
    expect(titre(c)).toBe('12 leçons faites sur 105.');
    expect(phrase(c)).toBe('La suivante : Marques cardinales, trois minutes. L’examen blanc dira ce qui tient déjà.');
    expect(boutons(c)).toEqual([
      { texte: 'Reprendre le cours', href: lecon.chemin, principal: true },
      { texte: 'Passer un examen blanc', href: '/examen', principal: false },
    ]);
    const suite = c.querySelector('.ouverture__deja');
    expect(suite?.textContent).toBe('4 questions à revoir dans ta série du jour.');
    expect(suite?.querySelector('a')?.getAttribute('href')).toBe('/revoir');
  });

  it('le cours après un examen : l’examen est redit, et se refait', () => {
    const c = colonne({ cas: 'cours', faites: 1, total: 105, prochaine: lecon, examen: { ...examen, reussi: true }, aRevoir: 0 });
    expect(titre(c)).toBe('1 leçon faite sur 105.');
    expect(phrase(c)).toBe('La suivante : Marques cardinales, trois minutes. Dernier examen blanc : 29\u00a0sur\u00a040, reçu.');
    expect(boutons(c)[1]).toEqual({ texte: 'Refaire un examen blanc', href: '/examen', principal: false });
    expect(c.querySelector('.ouverture__deja')).toBeNull();
  });

  it('le cours fini, puis l’entraînement seul', () => {
    const fini = colonne({ cas: 'coursFini', total: 105, aRevoir: 0 });
    expect(titre(fini)).toBe('Les 105 leçons du cours sont faites.');
    expect(phrase(fini)).toBe(
      'Reste à te mesurer au format du jour J : quarante questions, vingt secondes chacune, cinq erreurs admises.',
    );
    expect(boutons(fini)).toEqual([
      { texte: 'Passer un examen blanc', href: '/examen', principal: true },
      { texte: 'S’entraîner par thème', href: '/entrainement', principal: false },
    ]);
    const seul = colonne({ cas: 'entrainement', vues: 1, aRevoir: 0, premiere: lecon });
    expect(titre(seul)).toBe('Tu as déjà répondu à 1 question.');
    expect(boutons(seul)).toEqual([
      { texte: 'Passer un examen blanc', href: '/examen', principal: true },
      { texte: 'Commencer le cours', href: lecon.chemin, principal: false },
    ]);
  });

  it('chaque bouton se compte, avec le cas et le geste', () => {
    const c = colonne({ cas: 'recale', examen, aRevoir: 2, prochaine: lecon, coursEntame: true });
    const [revoir, refaire] = c.querySelectorAll('.ouverture__actions a');
    expect(revoir?.getAttribute('data-mesure')).toBe('accueil-bande');
    expect(revoir?.getAttribute('data-mesure-cas')).toBe('recale');
    expect(revoir?.getAttribute('data-mesure-geste')).toBe('revoir');
    expect(refaire?.getAttribute('data-mesure-geste')).toBe('examen');
    expect(c.querySelector('.ouverture__deja a')?.getAttribute('data-mesure-geste')).toBe('cours');
  });

  it('les cinq erreurs admises écrites en lettres suivent la règle', () => {
    expect(ERREURS_ADMISES).toBe(5);
  });
});

/** La bande telle qu'`index.astro` la rend : données, grille, script, puis la colonne du nouveau venu. */
function page(donnees: unknown) {
  document.body.innerHTML = `
    <section class="ouverture">
      <script type="application/json" id="accueil-donnees">${JSON.stringify(donnees)}</script>
      <div class="page ouverture__grille" data-bande-grille>
        <div class="ouverture__texte ouverture__texte--nouveau"><h1>Révise le permis côtier</h1></div>
        <aside class="ouverture__cote"></aside>
      </div>
    </section>`;
}
const DONNEES = { lecons: [lecon], banque: [{ id: 'vhf-0', theme: 'vhf' }] };

describe('la bande posée dans la page', () => {
  beforeEach(() => page(DONNEES));

  it('pose la colonne de qui revient en tête de grille, et le dit à la section', () => {
    const etat = enregistrerExamen(etatInitial(), { date: '2026-10-03', bonnes: 29, total: 40, reussi: false });
    monterBande(document, etat, '2026-10-04');
    const grille = document.querySelector('[data-bande-grille]')!;
    expect(grille.firstElementChild?.classList.contains('ouverture__texte--retour')).toBe(true);
    expect(document.querySelector('.ouverture')?.getAttribute('data-bande')).toBe('recale');
    expect(document.querySelectorAll('h1')).toHaveLength(2);
  });

  it('ne touche à rien pour le nouveau venu', () => {
    const avant = document.body.innerHTML;
    monterBande(document, etatInitial(), '2026-10-04');
    expect(document.body.innerHTML).toBe(avant);
  });

  it('ne touche à rien si les données manquent ou ne se lisent pas', () => {
    const etat = enregistrerReponse(etatInitial(), 'vhf-0', false, '2026-10-03');
    document.getElementById('accueil-donnees')!.textContent = '{pas du json';
    const avant = document.body.innerHTML;
    monterBande(document, etat, '2026-10-04');
    expect(document.body.innerHTML).toBe(avant);
    document.body.innerHTML = '<p>une autre page</p>';
    expect(() => monterBande(document, etat, '2026-10-04')).not.toThrow();
  });

  it('n’écrit jamais de HTML recollé : un nom de leçon reste du texte', () => {
    page({ lecons: [{ ...lecon, nom: '<img src=x onerror=alert(1)>' }], banque: [{ id: 'vhf-0', theme: 'vhf' }] });
    const etat = enregistrerReponse(etatInitial(), 'vhf-0', false, '2026-10-03');
    monterBande(document, etat, '2026-10-04');
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('le panneau des derniers examens blancs', () => {
  const trois: ExamenPasse[] = [
    { date: '2026-10-03', bonnes: 29, total: 40, reussi: false },
    { date: '2026-09-28', bonnes: 36, total: 40, reussi: true },
    { date: '2026-09-20', bonnes: 30, total: 40, reussi: false },
  ];
  const panneau = (examens: ExamenPasse[]) => {
    const p = rendrePanneau(document, examens, 'recale');
    if (!p) throw new Error('pas de panneau');
    return p;
  };
  const lignes = (p: HTMLElement) =>
    [...p.querySelectorAll('li')].map((li) => [...li.children].map((c) => c.textContent).join(' | '));

  it('rien sans examen', () => {
    expect(rendrePanneau(document, [], 'recale')).toBeNull();
  });

  it('un titre, puis une ligne par examen : la date, le score, le verdict en mots', () => {
    const p = panneau(trois);
    expect(p.tagName).toBe('ASIDE');
    expect(p.querySelector('h2')?.textContent).toBe('Tes derniers examens blancs');
    expect(lignes(p)).toEqual([
      '3 octobre | 29 / 40 | recalé',
      '28 septembre | 36 / 40 | reçu',
      '20 septembre | 30 / 40 | recalé',
    ]);
  });

  it('un seul examen, une seule ligne', () => {
    expect(lignes(panneau(trois.slice(0, 1)))).toEqual(['3 octobre | 29 / 40 | recalé']);
  });

  it('la barre lit sa part du score dans --part', () => {
    const [premier, second] = panneau(trois).querySelectorAll('li');
    expect(premier?.style.getPropertyValue('--part')).toBe('0.725');
    expect(second?.style.getPropertyValue('--part')).toBe('0.9');
  });

  it('dit ce que marque le trait, et renvoie à la fiche, compté', () => {
    const p = panneau(trois);
    const note = p.querySelector('p');
    expect(note?.textContent).toBe('Le trait marque 35 sur 40, la barre d’admission. Ta\u00a0fiche les garde tous.');
    const lien = note?.querySelector('a');
    expect(lien?.getAttribute('href')).toBe('/profil');
    expect(lien?.getAttribute('data-mesure')).toBe('accueil-bande');
    expect(lien?.getAttribute('data-mesure-cas')).toBe('recale');
    expect(lien?.getAttribute('data-mesure-geste')).toBe('fiche');
  });

  it('une date illisible reste du texte, jamais du HTML', () => {
    const p = panneau([{ date: '<img src=x onerror=alert(1)>', bonnes: 29, total: 40, reussi: false }]);
    expect(p.querySelector('img')).toBeNull();
    expect(p.querySelector('li')?.firstElementChild?.textContent).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('le panneau posé dans la page', () => {
  beforeEach(() => page(DONNEES));
  const avecExamens = (n: number) => {
    let etat = etatInitial();
    for (let i = n; i >= 1; i--) etat = enregistrerExamen(etat, { date: `2026-09-2${i}`, bonnes: 30 + i, total: 40, reussi: i >= 5 });
    return etat;
  };

  it('chez qui a des examens : juste après sa colonne, et la section le dit', () => {
    monterBande(document, avecExamens(4), '2026-10-04');
    const retour = document.querySelector('.ouverture__texte--retour');
    const panneau = retour?.nextElementSibling;
    expect(panneau?.classList.contains('ouverture__examens')).toBe(true);
    expect(panneau?.querySelectorAll('li')).toHaveLength(3);
    expect(document.querySelector('.ouverture')?.getAttribute('data-panneau')).toBe('examens');
    // Le panneau des comptes reste dans la page : la feuille le cache.
    expect(document.querySelector('.ouverture__cote')).not.toBeNull();
  });

  it('le nom d’une leçon contenant du HTML reste du texte, panneau compris', () => {
    page({ lecons: [{ ...lecon, nom: '<img src=x onerror=alert(1)>' }], banque: [{ id: 'vhf-0', theme: 'vhf' }] });
    const etat = terminerLecon(avecExamens(1), lecon.code, { bonnes: 3, total: 3 }, '2026-10-02');
    monterBande(document, enregistrerReponse(etat, 'vhf-0', false, '2026-10-03'), '2026-10-04');
    expect(document.querySelector('.ouverture__examens')).not.toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('rien pour qui revient sans examen terminé', () => {
    const etat = enregistrerExamen(enregistrerReponse(etatInitial(), 'vhf-0', false, '2026-10-03'), { date: '2026-10-03', bonnes: 0, total: 0, reussi: false });
    monterBande(document, etat, '2026-10-04');
    expect(document.querySelector('.ouverture')?.getAttribute('data-bande')).toBe('entrainement');
    expect(document.querySelector('.ouverture__examens')).toBeNull();
    expect(document.querySelector('.ouverture')?.hasAttribute('data-panneau')).toBe(false);
  });

  it('rien pour le nouveau venu', () => {
    monterBande(document, etatInitial(), '2026-10-04');
    expect(document.querySelector('.ouverture__examens')).toBeNull();
    expect(document.querySelector('.ouverture')?.hasAttribute('data-panneau')).toBe(false);
  });
});
