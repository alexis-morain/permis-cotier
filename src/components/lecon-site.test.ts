/** @vitest-environment jsdom */
/**
 * L'écran de leçon en DOM nu : ce que l'îlot `Lecon` faisait une fois
 * hydraté, le script de la page le fait maintenant sans React. Mêmes textes,
 * même ARIA, mêmes attributs de mesure ; les tests reprennent ceux de l'îlot,
 * dans la cible du site. La variante de la coquille est tenue par
 * `lecon-site.app.test.ts`.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/dom';
import { ecransDe, libelleSuite, monterLecon, ID_LECON, type Suite } from './lecon-site';
import type { LeconAffichable } from '../lib/cours';
import type { QuestionAffichable } from '../lib/affichable';
import { charger } from '../lib/progression';
import { vibrer } from '../lib/natif';
import { evenement } from '../lib/mesure';

// Le retour d'un geste, vibration et son (`natif.ts`) : on regarde ce que la
// leçon demande, pas ce que le greffon en fait. La mesure de même.
vi.mock('../lib/natif', () => ({ vibrer: vi.fn() }));
vi.mock('../lib/mesure', () => ({ evenement: vi.fn() }));

function question(id: string, reponses = ['a']): QuestionAffichable {
  return {
    id,
    theme: 'balisage',
    notion: 'balisage-lateral',
    reponses,
    enonce: `Énoncé de ${id}`,
    explication: `Explication de ${id}`,
    difficulte: 1,
    propositions: [
      { id: 'a', texte: 'Première' },
      { id: 'b', texte: 'Deuxième' },
      { id: 'c', texte: 'Troisième' },
    ],
    sources: [{ texte: 'Balisage AISM', ref: 'aism-mbs', url: '/source/aism-mbs' }],
  };
}

const ecrite: LeconAffichable = {
  code: 'balisage-lateral',
  nom: 'Marques latérales',
  courte: false,
  duree: 3,
  accroche: 'Tu rentres au port en venant du large.',
  etapes: [
    { titre: 'Le sens conventionnel', paragraphes: ['Du large vers le port.', 'En sortant, tout s’inverse.'] },
    { titre: 'Bâbord', paragraphes: ['Rouge et cylindrique.'], visuel: 'balisage/laterale-babord.svg', alt: 'Une bouée rouge.' },
  ],
  piege: 'En sortant, la rouge est à droite.',
  retenir: ['Rouge à bâbord.', 'Vert à tribord.'],
  sources: [
    { texte: 'Balisage AISM, région A', ref: 'aism-mbs', provenance: 'fiche', url: '/source/aism-mbs' },
  ],
  questions: [question('balisage-0001'), question('balisage-0002', ['b'])],
};

const courte: LeconAffichable = {
  code: 'signaux-portuaires',
  nom: 'Signaux portuaires',
  courte: true,
  duree: 1,
  etapes: [{ titre: 'Signaux portuaires', paragraphes: ['Le résumé de la notion.'] }],
  retenir: [],
  sources: [],
  questions: [],
};

const cours = { code: 'balisage', titre: 'Lire le balisage', chemin: '/cours/balisage' };
const chenal: Suite = { type: 'lecon', chemin: '/cours/balisage/balisage-chenal-prefere', nom: 'Chenal préféré' };

/** La page telle que `Lecon.astro` et `[notion].astro` la rendent avant le script. */
function pageServeur(lecon: LeconAffichable, suite: Suite | null = chenal): string {
  const ecrans = ecransDe(lecon);
  const types = ecrans.map((e) => e.type);
  const n = lecon.questions.length;
  const sections = ecrans.map((e, i) => {
    if (e.type === 'fin') return '';
    let corps = '';
    if (e.type === 'accroche') corps = `<p class="ecran__accroche">${e.texte}</p>`;
    if (e.type === 'etape') {
      corps = `<h2 class="ecran__titre">${lecon.courte ? '' : `<span class="ecran__numero">${e.numero}</span>`}${e.etape.titre}</h2>`;
      if (e.etape.visuel) corps += `<figure class="ecran__visuel"><img src="/visuels/${e.etape.visuel}" alt="${e.etape.alt}"></figure>`;
      corps += e.etape.paragraphes.map((p) => `<p>${p}</p>`).join('');
    }
    if (e.type === 'piege') corps = `<div class="piege"><p class="piege__titre">Le piège</p><p>${e.texte}</p></div>`;
    if (e.type === 'retenir') corps = `<div class="retenir"><p class="retenir__titre">À retenir</p><ul>${e.lignes.map((l) => `<li>${l}</li>`).join('')}</ul></div>`;
    if (e.type === 'verification') {
      corps = `<h2 class="ecran__titre">Vérifie ce que tu as retenu</h2><p class="discret">${n} questions de la banque sur cette notion. La vérification a besoin de JavaScript.</p>`;
    }
    if (i === 0) corps += `<div class="lecon__suite"><button class="bouton bouton--principal" type="button">${libelleSuite(types, 0)}</button></div>`;
    return `<section class="ecran ecran--${e.type}${i === 0 ? ' ecran--courant' : ''}"${i === 0 ? ' tabindex="-1"' : ''}>${corps}</section>`;
  });
  const bloc = { code: lecon.code, cours, ...(suite ? { suite } : {}), questions: lecon.questions };
  return `
    <article>
      <div class="lecon lecon--pas-a-pas">
        <div class="lecon__entete">
          <p class="lecon__chapitre"><a href="/cours/balisage">Lire le balisage</a><span class="discret"> · leçon 1 sur 12 · ${lecon.duree} min</span></p>
          <div class="lecon__barre" aria-hidden="true"><span style="transform:scaleX(0)"></span></div>
          <p class="visuellement-cache" aria-live="polite">Écran 1 sur ${ecrans.length}</p>
        </div>
        ${sections.join('')}
        <p class="lecon__mode"><button type="button" class="bouton bouton--discret">Tout lire d’une traite</button></p>
      </div>
    </article>
    <script type="application/json" id="${ID_LECON}">${JSON.stringify(bloc)}</script>`;
}

/** Sans suite (`null`), la leçon est la dernière du parcours. */
function monter(lecon: LeconAffichable, suite: Suite | null = chenal) {
  document.body.innerHTML = pageServeur(lecon, suite);
  monterLecon();
}

const cliquer = (nom: string | RegExp) => fireEvent.click(screen.getByRole('button', { name: nom }));
const courant = () => document.querySelector('.ecran--courant');

/** Jusqu'à la vérification de la leçon écrite. */
function allerALaVerification() {
  for (let i = 0; i < 4; i += 1) cliquer('Continuer');
  cliquer('Vérifier ce que j’ai retenu');
}

beforeEach(() => {
  vi.mocked(vibrer).mockClear();
  vi.mocked(evenement).mockClear();
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('les écrans d’une leçon', () => {
  it('enchaînent accroche, étapes, piège, mémo, vérification, fin', () => {
    expect(ecransDe(ecrite).map((e) => e.type)).toEqual([
      'accroche', 'etape', 'etape', 'piege', 'retenir', 'verification', 'fin',
    ]);
  });

  it('se réduisent au résumé et à la fin pour une leçon courte sans question', () => {
    expect(ecransDe(courte).map((e) => e.type)).toEqual(['etape', 'fin']);
  });

  it('nomment le bouton d’avance selon ce qui suit', () => {
    const types = ecransDe(ecrite).map((e) => e.type);
    expect(libelleSuite(types, 0)).toBe('Continuer');
    expect(libelleSuite(types, 4)).toBe('Vérifier ce que j’ai retenu');
    expect(libelleSuite(['etape', 'fin'], 0)).toBe('Terminer la leçon');
    expect(libelleSuite(['accroche', 'etape', 'fin'], 1)).toBe('Terminer la leçon');
  });
});

describe('l’écran de leçon', () => {
  it('garde tout le texte du serveur, l’écran courant marqué, les autres tus', () => {
    monter(ecrite);
    expect(screen.getByText('Tu rentres au port en venant du large.')).toBeTruthy();
    expect(document.body.textContent).toContain('Du large vers le port.');
    expect(document.body.textContent).toContain('Rouge à bâbord.');
    expect(document.querySelectorAll('.ecran--courant')).toHaveLength(1);
    expect(courant()?.classList.contains('ecran--accroche')).toBe(true);
    expect(courant()?.getAttribute('tabindex')).toBe('-1');
    const tus = [...document.querySelectorAll('section.ecran')].filter((s) => s.getAttribute('aria-hidden') === 'true');
    expect(tus).toHaveLength(5);
    expect(document.querySelectorAll('.lecon__suite')).toHaveLength(1);
  });

  it('remplace l’annonce de la vérification par sa première question', () => {
    monter(ecrite);
    expect(document.body.textContent).not.toContain('besoin de JavaScript');
    expect(document.querySelector('.ecran--verification .verification__enonce')?.textContent).toBe('Énoncé de balisage-0001');
  });

  it('avance d’un écran à la fois avec « Continuer »', () => {
    monter(ecrite);
    cliquer('Continuer');
    expect(courant()?.classList.contains('ecran--etape')).toBe(true);
    cliquer('Revenir');
    expect(courant()?.classList.contains('ecran--accroche')).toBe(true);
  });

  it('suit l’avancement sur la barre et l’annonce, une seule fois', () => {
    monter(ecrite);
    const barre = document.querySelector<HTMLElement>('.lecon__barre span')!;
    const annonce = document.querySelector('[aria-live]')!;
    expect(annonce.textContent).toBe('Écran 1 sur 7');
    cliquer('Continuer');
    expect(barre.style.transform).toBe(`scaleX(${1 / 6})`);
    expect(annonce.textContent).toBe('Écran 2 sur 7');
  });

  it('donne le focus à l’écran où l’on arrive', () => {
    monter(ecrite);
    cliquer('Continuer');
    vi.runAllTimers();
    expect(document.activeElement).toBe(courant());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('annonce la vérification sur le bouton du dernier écran de contenu', () => {
    monter(ecrite);
    for (let i = 0; i < 4; i += 1) cliquer('Continuer');
    expect(screen.getByRole('button', { name: 'Vérifier ce que j’ai retenu' })).toBeTruthy();
  });

  it('corrige chaque question, compte le score et marque la leçon faite', () => {
    monter(ecrite);
    allerALaVerification();

    expect(screen.getByText('Énoncé de balisage-0001')).toBeTruthy();
    expect(screen.getByText(/Une ou deux bonnes réponses/)).toBeTruthy();
    cliquer(/Première/);
    cliquer('Valider');
    expect(screen.getByText('Bonne réponse')).toBeTruthy();
    expect(screen.queryByText(/Une ou deux bonnes réponses/)).toBeNull();
    cliquer('Question suivante');

    expect(screen.getByText('Énoncé de balisage-0002')).toBeTruthy();
    expect(screen.queryByText(/Une ou deux bonnes réponses/)).toBeNull();
    cliquer(/Première/);
    cliquer('Valider');
    expect(screen.getByText('Raté')).toBeTruthy();
    cliquer('Terminer la leçon');

    expect(screen.getByText('Leçon faite')).toBeTruthy();
    expect(screen.getByText(/à la vérification/).textContent).toContain('1 sur 2');
    expect(screen.getByRole('link', { name: /Leçon suivante/ }).getAttribute('href')).toBe('/cours/balisage/balisage-chenal-prefere');

    const etat = charger();
    expect(etat.lecons['balisage-lateral']).toMatchObject({ bonnes: 1, total: 2 });
    expect(etat.questions['balisage-0001']?.derniereReussie).toBe(true);
    expect(etat.questions['balisage-0002']?.derniereReussie).toBe(false);
  });

  it('garde le même bouton d’action de « Valider » à la question suivante', () => {
    monter(ecrite);
    allerALaVerification();
    const action = screen.getByRole('button', { name: 'Valider' }) as HTMLButtonElement;
    expect(action.disabled).toBe(true);
    cliquer(/Première/);
    expect(action.disabled).toBe(false);
    fireEvent.click(action);
    expect(action.textContent).toBe('Question suivante');
    fireEvent.click(action);
    expect(action.isConnected).toBe(true);
    expect(action.textContent).toBe('Valider');
  });

  it('ne laisse pas cocher plus de deux propositions', () => {
    monter(ecrite);
    allerALaVerification();
    cliquer(/Première/);
    cliquer(/Deuxième/);
    const troisieme = screen.getByRole('button', { name: /Troisième/ }) as HTMLButtonElement;
    expect(troisieme.disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Première/ }).getAttribute('aria-pressed')).toBe('true');
    expect(troisieme.getAttribute('aria-pressed')).toBe('false');
    cliquer(/Première/);
    expect(troisieme.disabled).toBe(false);
  });

  it('montre la bonne réponse et la fausse cochée à la correction', () => {
    monter(ecrite);
    allerALaVerification();
    cliquer(/Première/);
    cliquer('Valider');
    cliquer('Question suivante');
    cliquer(/Première/);
    cliquer('Valider');
    expect(screen.getByRole('button', { name: /Première/ }).className).toBe('proposition proposition--fausse');
    expect(screen.getByRole('button', { name: /Deuxième/ }).className).toBe('proposition proposition--juste');
    expect(screen.getByRole('button', { name: /Troisième/ }).className).toBe('proposition');
    const source = screen.getByRole('link', { name: 'Balisage AISM' });
    expect(source.getAttribute('data-mesure')).toBe('source-ouverte');
    expect(source.getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('link', { name: 'Signaler une erreur' }).getAttribute('href')).toBe('/signaler?question=balisage-0002');
  });

  it('termine une leçon courte sans question, marquée faite à zéro sur zéro', () => {
    monter(courte, null);
    cliquer('Terminer la leçon');
    expect(screen.getByText('Leçon faite')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Retour au cours' })).toBeTruthy();
    expect(charger().lecons['signaux-portuaires']).toMatchObject({ bonnes: 0, total: 0 });
  });

  it('tend le cours suivant après la dernière leçon d’un cours', () => {
    monter(courte, { type: 'cours', chemin: '/cours/barre-route', titre: 'Se croiser sans se toucher' });
    cliquer('Terminer la leçon');
    expect(screen.getByText(/dernière leçon de « Lire le balisage »/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cours suivant : Se croiser sans se toucher' }).getAttribute('href')).toBe('/cours/barre-route');
  });

  it('bascule en lecture continue et revient au pas à pas', () => {
    monter(ecrite);
    const racine = document.querySelector('.lecon')!;
    expect(racine.classList.contains('lecon--pas-a-pas')).toBe(true);
    cliquer('Tout lire d’une traite');
    expect(racine.classList.contains('lecon--pas-a-pas')).toBe(false);
    expect(document.querySelectorAll('section[aria-hidden]')).toHaveLength(0);
    cliquer('Reprendre pas à pas');
    expect(racine.classList.contains('lecon--pas-a-pas')).toBe(true);
  });

  it('se refait du début avec « Revoir la leçon », la vérification remise à zéro', () => {
    monter(ecrite);
    allerALaVerification();
    for (let i = 0; i < 2; i += 1) {
      cliquer(/Première/);
      cliquer('Valider');
      cliquer(/Question suivante|Terminer la leçon/);
    }
    cliquer('Revoir la leçon');
    expect(screen.queryByText('Leçon faite')).toBeNull();
    expect(courant()?.classList.contains('ecran--accroche')).toBe(true);
    expect(document.querySelector('.verification__enonce')?.textContent).toBe('Énoncé de balisage-0001');
    allerALaVerification();
    for (let i = 0; i < 2; i += 1) {
      cliquer(/Deuxième/);
      cliquer('Valider');
      cliquer(/Question suivante|Terminer la leçon/);
    }
    expect(screen.getByText(/à la vérification/).textContent).toContain('1 sur 2');
    expect(vi.mocked(vibrer).mock.calls.filter(([g]) => g === 'lecon')).toHaveLength(2);
  });

  it('ne monte rien deux fois sur la même page', () => {
    monter(ecrite);
    monterLecon();
    cliquer('Continuer');
    expect(courant()?.classList.contains('ecran--etape')).toBe(true);
    expect(document.querySelectorAll('.verification')).toHaveLength(1);
    expect(vi.mocked(evenement).mock.calls.filter(([n]) => n === 'lecon-commencee')).toHaveLength(1);
  });

  it('laisse la page du serveur telle quelle sans données lisibles', () => {
    document.body.innerHTML = pageServeur(ecrite).replace(/<script[^]*<\/script>/, '');
    const avant = document.body.innerHTML;
    monterLecon();
    expect(document.body.innerHTML).toBe(avant);
  });
});

describe('la mesure', () => {
  it('compte la leçon commencée puis terminée, avec son score', () => {
    monter(courte, null);
    expect(vi.mocked(evenement).mock.calls).toEqual([['lecon-commencee', { notion: 'signaux-portuaires', cours: 'balisage' }]]);
    cliquer('Terminer la leçon');
    expect(vi.mocked(evenement).mock.calls.at(-1)).toEqual([
      'lecon-terminee', { notion: 'signaux-portuaires', cours: 'balisage', bonnes: 0, total: 0 },
    ]);
  });

  it('porte chaque attribut de mesure de la fin sur un seul élément', () => {
    monter(ecrite);
    allerALaVerification();
    for (let i = 0; i < 2; i += 1) {
      cliquer(/Première/);
      cliquer('Valider');
      cliquer(/Question suivante|Terminer la leçon/);
    }
    const mesures = [...document.querySelectorAll('.ecran--fin [data-mesure]')].map((n) => n.getAttribute('data-mesure'));
    expect(mesures).toEqual(['lecon-suivante', 'lecon-entrainement']);
  });
});

describe('le retour de chaque geste', () => {
  it('fait vibrer et sonner cocher, juste, faux, puis la leçon finie, dans cet ordre', () => {
    monter(ecrite);
    allerALaVerification();
    expect(vibrer).not.toHaveBeenCalled();

    cliquer(/Première/);
    expect(vi.mocked(vibrer).mock.calls).toEqual([['choix']]);
    cliquer('Valider');
    expect(vi.mocked(vibrer).mock.calls.at(-1)).toEqual(['juste']);
    cliquer('Question suivante');

    cliquer(/Première/);
    cliquer('Valider');
    cliquer('Terminer la leçon');

    expect(vi.mocked(vibrer).mock.calls).toEqual([['choix'], ['juste'], ['choix'], ['faux'], ['lecon']]);
  });

  it('ne sonne qu’une fois la fin d’une leçon courte', () => {
    monter(courte, null);
    cliquer('Terminer la leçon');
    cliquer('Tout lire d’une traite');
    cliquer('Reprendre pas à pas');
    expect(vi.mocked(vibrer).mock.calls).toEqual([['lecon']]);
  });
});

describe('la lecture continue', () => {
  it('ne montre ni « Leçon faite » ni le bouton de suite avant la fin', () => {
    monter(ecrite);
    cliquer('Tout lire d’une traite');
    expect(screen.queryByText('Leçon faite')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continuer' })).toBeNull();
    expect(screen.getByText('Énoncé de balisage-0001')).toBeTruthy();
  });

  it('donne un bouton pour finir une leçon sans question', () => {
    monter(courte);
    cliquer('Tout lire d’une traite');
    cliquer('Terminer la leçon');
    expect(screen.getByText('Leçon faite')).toBeTruthy();
    expect(charger().lecons['signaux-portuaires']).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: 'Terminer la leçon' })).toHaveLength(0);
  });
});

describe('mélange des propositions de la vérification', () => {
  const lignes = () => [...document.querySelectorAll<HTMLElement>('.propositions .proposition')];
  const textes = () => lignes().map((n) => n.children[1]?.textContent ?? '');

  it('nomme les lignes dans l’ordre de l’écran', () => {
    monter(ecrite);
    allerALaVerification();
    expect(lignes().map((n) => n.querySelector('.proposition__lettre')?.textContent)).toEqual(['A', 'B', 'C']);
  });

  it('ne déplace pas les propositions quand on coche et qu’on corrige', () => {
    monter(ecrite);
    allerALaVerification();
    const depart = textes();
    fireEvent.click(lignes()[0]!);
    expect(textes()).toEqual(depart);
    cliquer('Valider');
    expect(textes()).toEqual(depart);
  });

  // Avec trois propositions, deux tirages se ressemblent une fois sur six :
  // il faut plusieurs tours pour que l'échec soit une information.
  it('change d’ordre d’une leçon à l’autre', () => {
    const ordres = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      monter(ecrite);
      ordres.add(textes().join('|'));
    }
    expect(ordres.size).toBeGreaterThan(1);
  });
});

describe('le retour vers la série', () => {
  afterEach(() => window.history.replaceState({}, '', '/'));

  it('ramène là d’où l’on vient, en tête et à la fin', () => {
    window.history.replaceState({}, '', '/cours/balisage/balisage-lateral?retour=%2Frevoir');
    monter(courte);

    const enTete = screen.getByRole('link', { name: 'Revenir à ta série du jour' });
    expect(enTete.getAttribute('href')).toBe('/revoir');
    expect(enTete.closest('.lecon__retour')?.nextElementSibling?.className).toBe('lecon__barre');

    cliquer('Terminer la leçon');
    expect(screen.getAllByRole('link', { name: 'Revenir à ta série du jour' }).length).toBe(2);
    expect(document.querySelector('.fin__actions a')?.className).toBe('bouton bouton--principal');
    expect(screen.getByRole('link', { name: /Leçon suivante/ }).className).toBe('bouton');
  });

  it('ne propose rien quand l’adresse ne dit pas d’où l’on vient', () => {
    monter(courte);
    expect(screen.queryByRole('link', { name: /Revenir/ })).toBeNull();
  });

  it('ne suit pas une adresse qui n’est pas du site', () => {
    window.history.replaceState({}, '', '/cours/balisage/balisage-lateral?retour=https%3A%2F%2Fexemple.fr');
    monter(courte);
    expect(screen.queryByRole('link', { name: /Revenir/ })).toBeNull();
  });

  it('renvoie sur les questions de la notion, pas sur tout le thème', () => {
    monter(ecrite);
    allerALaVerification();
    for (let i = 0; i < 2; i += 1) {
      cliquer(/Première/);
      cliquer('Valider');
      cliquer(/Question suivante|Terminer la leçon/);
    }
    const lien = screen.getByRole('link', { name: /S’entraîner sur cette notion/ });
    expect(lien.getAttribute('href')).toBe('/entrainement/notion/balisage-lateral');
  });
});
