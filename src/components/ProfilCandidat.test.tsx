/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ProfilCandidat from './ProfilCandidat';
import {
  aujourdhui,
  enregistrerExamen,
  enregistrerProfil,
  enregistrerReponse,
  etatInitial,
  profilVide,
  sauvegarder,
  charger,
} from '../lib/progression';

// La banque telle que la page la donne : l'identifiant, le thème, et la
// notion — sans elle, la maîtrise par notion n'a rien à compter.
const banque = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `vhf-${i}`,
    theme: 'vhf',
    notion: i < 5 ? 'vhf-canaux' : 'vhf-emport',
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `feux-${i}`,
    theme: 'feux-marques',
    notion: i < 5 ? 'feux-remorquage' : 'feux-portee',
  })),
];

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
});
afterEach(() => cleanup());

describe('la fiche', () => {
  it('dit qu’elle est vide, propose un seul geste, et invite à répondre en lien de texte', () => {
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Rien encore sur ta fiche.');
    expect(screen.getByText(/Elle se remplit en jouant/)).toBeTruthy();
    // Une page de zéros ne dit rien : ni indice, ni thèmes, ni examens, ni jalons.
    expect(document.querySelectorAll('.bouton--principal')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Faire un examen blanc' }).className).toContain('bouton--principal');
    expect(document.querySelector('.fiche__indice')).toBeNull();
    expect(document.querySelector('.fiche__jour')).toBeNull();
    expect(document.querySelector('.maitrise')).toBeNull();
    expect(document.querySelector('.fiche__examens')).toBeNull();
    expect(document.querySelector('.jalon')).toBeNull();
    // L'invitation est une phrase avec un lien ; les réglages gardent « Répondre ».
    const invitation = screen.getByRole('link', { name: 'Dis en trente secondes pourquoi tu passes le permis' });
    expect(invitation.getAttribute('href')).toBe('/profil/depart');
    expect(invitation.getAttribute('data-mesure')).toBe('profil-invitation');
    expect(invitation.className).not.toContain('bouton');
    expect(invitation.parentElement!.textContent).toBe(
      'Dis en trente secondes pourquoi tu passes le permis : on te le rappellera le jour où un examen blanc est recalé.',
    );
    expect(screen.getAllByRole('link', { name: 'Répondre' }).map((a) => a.getAttribute('href'))).toEqual(['/profil/depart']);
    expect(screen.getByText('Rien à effacer pour l’instant.')).toBeTruthy();
  });

  it('appelle le candidat par son prénom, même vide', () => {
    sauvegarder(enregistrerProfil(etatInitial(), { ...profilVide(), prenom: 'Léa' }));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Léa, rien encore sur ta fiche.');
  });

  it('met le geste du jour juste sous le titre, seul, avant l’indice', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', false, '2026-09-20'));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const tete = document.querySelector('.fiche__tete')!;
    const actions = tete.nextElementSibling!;
    expect(actions.className).toContain('jeu__actions');
    expect(actions.nextElementSibling!.className).toContain('fiche__indice');
    // Examen blanc et cours sont dans la navigation : ici, un seul bouton.
    expect(actions.querySelectorAll('a')).toHaveLength(1);
    expect(actions.querySelector('a')!.className).toContain('bouton--principal');
    expect(screen.queryByRole('link', { name: 'Examen blanc' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Le cours' })).toBeNull();
  });

  it('parle au candidat, rappelle sa raison, et pousse sa série du jour en premier', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), prenom: 'Léa', phrase: 'Emmener mon père pêcher.', rempliLe: '2026-09-01' });
    e = enregistrerReponse(e, 'vhf-0', false, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', true, aujourdhui());
    e = enregistrerExamen(e, { date: '2026-09-04', bonnes: 36, total: 40, reussi: true });
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Léa, voilà où tu en es.');
    // Le dernier examen est reçu : la raison reste dans les réglages, pas en tête.
    expect(document.querySelector('.rappel')).toBeNull();
    expect(screen.getAllByText('Emmener mon père pêcher.')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Revoir ma question du jour' }).getAttribute('href')).toBe('/revoir');
    // Le thème raté passe devant, avec le lien vers son entraînement.
    const themes = screen.getAllByRole('link', { name: / en banque|jamais ouvert/ });
    expect(themes[0]!.getAttribute('href')).toBe('/entrainement/vhf');
    expect(screen.getByText('36 / 40')).toBeTruthy();
    expect(document.querySelector('.jour__serie .jour__chiffre')?.textContent).toBe('1 jour de suite');
  });

  it('mène à la relecture des erreurs, sans les rejouer', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', false, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByRole('link', { name: /Relire ce que j’ai raté/ }).getAttribute('href')).toBe(
      '/profil/erreurs',
    );
  });

  it('ne mène pas à la relecture quand rien n’a été raté', () => {
    // La page des erreurs serait vide : le lien n'y mène pas.
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.queryByRole('link', { name: /Relire ce que j’ai raté/ })).toBeNull();
  });

  it('rappelle la raison sous le titre quand le dernier examen est recalé', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), motivations: ['location'], rempliLe: '2026-09-01' });
    e = enregistrerReponse(e, 'vhf-0', false, aujourdhui());
    e = enregistrerExamen(e, { date: '2026-09-04', bonnes: 30, total: 40, reussi: false });
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const r = document.querySelector('.rappel')!;
    expect(r.textContent).toBe('Tu passes ce permis pour louer un bateau cet été, sans demander à personne.');
    expect(r.querySelector('q')!.textContent).toBe('louer un bateau cet été, sans demander à personne');
    expect(document.querySelector('.fiche__tete')!.contains(r)).toBe(true);
    // Pas de sur-titre, pas de second lien : les réglages ont « Modifier mes réponses ».
    expect(document.querySelector('.rappel__amorce')).toBeNull();
    expect(r.querySelector('a')).toBeNull();
  });

  it('ne double pas le point quand la phrase du candidat en porte un', () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), phrase: 'Emmener mon père pêcher.', rempliLe: '2026-09-01' });
    e = enregistrerExamen(e, { date: '2026-09-04', bonnes: 30, total: 40, reussi: false });
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(document.querySelector('.rappel')!.textContent).toBe('Tu passes ce permis pour Emmener mon père pêcher.');
  });

  it('change le rythme et la date depuis les réglages', () => {
    // Une réponse, sinon la fiche est vide et le bloc « Aujourd’hui », qui
    // compte les jours avant l'examen, n'est pas affiché.
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    fireEvent.click(screen.getByRole('button', { name: /^40/ }));
    expect(charger().profil.rythme).toBe(40);
    fireEvent.change(screen.getByLabelText('Date de l’examen'), { target: { value: '2027-02-01' } });
    expect(charger().dateExamen).toBe('2027-02-01');
    expect(screen.getByText(/Examen dans \d+ jours/)).toBeTruthy();
  });

  it('ne propose rien à effacer tant que rien n’est enregistré', () => {
    // Un bouton désactivé à demi-opacité se devine plus qu'il ne se lit :
    // quand il n'y a rien à effacer, la fiche le dit en toutes lettres.
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.queryByRole('button', { name: /Effacer ma progression/ })).toBeNull();
    expect(screen.getByText('Rien à effacer pour l’instant.')).toBeTruthy();
  });

  it('efface tout après confirmation, fiche comprise', () => {
    sauvegarder(enregistrerProfil(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()), { ...profilVide(), prenom: 'Léa', rempliLe: '2026-09-01' }));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    fireEvent.click(screen.getByRole('button', { name: /Effacer ma progression/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Oui, tout effacer' }));
    expect(charger()).toEqual(etatInitial());
    const titre = screen.getByRole('heading', { level: 1 });
    expect(titre.textContent).toBe('Rien encore sur ta fiche.');
    // Ce qui s'est passé est dit, et le focus repart du haut.
    expect(screen.getByRole('status').textContent).toBe('Fiche effacée.');
    expect(document.activeElement).toBe(titre);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it('demande confirmation avec Annuler d’abord, et dit ce qui part', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', false, aujourdhui());
    e = enregistrerExamen(e, { date: '2026-09-04', bonnes: 30, total: 40, reussi: false });
    e = enregistrerProfil(e, { ...profilVide(), motivations: ['peche'], rempliLe: '2026-09-01' });
    sauvegarder({ ...e, dateExamen: '2027-02-01' });
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    fireEvent.click(screen.getByRole('button', { name: /Effacer ma progression/ }));

    const zone = document.querySelector('.reglage--danger')!;
    expect(zone.textContent).toContain('2 questions, 1 examen blanc, ta raison et ta date.');
    const boutons = [...zone.querySelectorAll('button')];
    expect(boutons.map((b) => b.textContent)).toEqual(['Annuler', 'Oui, tout effacer']);
    expect(boutons[0]!.className).toBe('bouton');
    expect(boutons[1]!.className).toBe('bouton bouton--danger');
    // Le bouton d'ouverture disparaît au clic : le focus va sur Annuler, pas sur `body`.
    expect(document.activeElement).toBe(boutons[0]);
    // Annuler ne touche à rien.
    fireEvent.click(boutons[0]!);
    expect(charger().examens).toHaveLength(1);
  });

  it('omet ce qui vaut zéro dans ce qui part', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    fireEvent.click(screen.getByRole('button', { name: /Effacer ma progression/ }));
    expect(document.querySelector('.reglage--danger')!.textContent).toContain('1 question.');
    expect(document.querySelector('.reglage--danger')!.textContent).not.toContain('examen');
  });
});

describe('les lignes de thème', () => {
  it('le premier jour, met en rouge les ratées, jamais ce qui n’est pas encore retenu', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0', false, aujourdhui());
    e = enregistrerReponse(e, 'feux-0', true, aujourdhui());
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const vhf = screen.getByRole('link', { name: /VHF/ }).querySelector('.maitrise__note')!;
    expect(vhf.textContent).toBe('1 ratée sur 1 vue, 10 en banque');
    expect(vhf.querySelector('.maitrise__faible')!.textContent).toBe('1');
    const feux = screen.getByRole('link', { name: /Feux/ }).querySelector('.maitrise__note')!;
    expect(feux.textContent).toBe('0 retenue sur 1 vue, 10 en banque');
    expect(feux.querySelector('.maitrise__faible')).toBeNull();
  });

  it('accorde au pluriel et garde le compte des retenues quand il y en a', () => {
    let e = etatInitial();
    for (const id of ['vhf-0', 'vhf-1']) e = enregistrerReponse(enregistrerReponse(e, id, true, '2026-09-01'), id, true, '2026-09-02');
    e = enregistrerReponse(e, 'vhf-2', false, '2026-09-02');
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const vhf = screen.getByRole('link', { name: /VHF/ }).querySelector('.maitrise__note')!;
    expect(vhf.textContent).toBe('2 retenues sur 3 vues, 10 en banque');
    // Une ratée parmi elles : le nombre passe en rouge.
    expect(vhf.querySelector('.maitrise__faible')!.textContent).toBe('2');
  });

  it('dit l’ordre en une phrase, et le rappel espacé sous « Comment c’est compté »', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', false, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const themes = document.querySelector('.fiche__themes > .discret')!;
    expect(themes.textContent).toBe('Les plus fragiles d’abord.');
    expect(document.querySelector('.fiche__details')!.textContent).toMatch(/un jour plus tard,\s+puis trois, puis sept, puis vingt et un/);
  });
});

describe('ce que lit un lecteur d’écran', () => {
  it('dit les maxima de chaque part de l’indice', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(document.querySelector('.indice__jauge')!.getAttribute('aria-label')).toBe(
      '1 point sur 20 pour ce qui est vu, 0 sur 35 pour ce qui est retenu, 0 sur 45 pour les examens blancs',
    );
  });

  it('écrit chaque jour en texte caché, pas en aria-label sur un li sans rôle', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const cases = [...document.querySelectorAll('ol.jours > li')];
    expect(cases).toHaveLength(14);
    for (const c of cases) expect(c.hasAttribute('aria-label')).toBe(false);
    const derniere = cases[13]!;
    expect(derniere.querySelector('.visuellement-cache')!.textContent).toMatch(/ : 1 réponse$/);
    expect(derniere.querySelector('span[aria-hidden="true"]')!.textContent).toHaveLength(1);
  });
});

describe('les réglages', () => {
  it('dit ce qui efface vraiment la fiche, et nomme le lien de la date avec une majuscule', () => {
    sauvegarder({ ...enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()), dateExamen: '2027-02-01' });
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByText('Tout reste dans ce navigateur. Changer d’appareil, ou effacer les données du site, efface la fiche.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Effacer la date' }));
    expect(charger().dateExamen).toBeNull();
  });
});

describe('la jauge de l’indice', () => {
  it('donne ses parts en propriété personnalisée, pas en largeur', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', true, aujourdhui());
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);

    const parts = [...document.querySelectorAll('.indice__part')] as HTMLElement[];
    expect(parts.length).toBe(3);
    for (const part of parts) {
      // `width` est interdite d'animation par DESIGN.md : la part passe par
      // une propriété personnalisée, que la feuille de style met en `scaleX`.
      expect(part.style.width).toBe('');
      expect(part.style.getPropertyValue('--part')).not.toBe('');
    }
  });
});

describe('les notions faibles', () => {
  it('remonte les plus faibles en tête, avec leur leçon et leur série', () => {
    // Deux notions travaillées : « canaux » ratée, « portée » retenue.
    let e = enregistrerReponse(etatInitial(), 'vhf-0', false, aujourdhui());
    e = enregistrerReponse(e, 'feux-5', true, '2026-09-01');
    e = enregistrerReponse(e, 'feux-5', true, '2026-09-08');
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);

    const faibles = [...document.querySelectorAll('.faible')];
    expect(faibles.length).toBe(3);
    expect(faibles[0]!.textContent).toContain('Canaux');
    expect(faibles[0]!.querySelector('.faible__lecon')?.getAttribute('href')).toBe(
      '/cours/vhf/vhf-canaux',
    );
    expect(faibles[0]!.querySelector('.faible__serie')?.getAttribute('href')).toBe(
      '/entrainement/notion/vhf-canaux',
    );
    // La maîtrise par thème reste : on ajoute l'étage du dessous.
    expect(screen.getByRole('heading', { name: 'Thème par thème' })).toBeTruthy();
  });

  it('compte les ratées de la notion, et le dit en une phrase', () => {
    let e = enregistrerReponse(etatInitial(), 'vhf-0', false, aujourdhui());
    e = enregistrerReponse(e, 'vhf-1', false, aujourdhui());
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const premiere = document.querySelector('.faible')!;
    expect(premiere.querySelector('.faible__note')!.textContent).toBe('2 ratées sur 2 vues, 5 en banque');
    expect(premiere.querySelector('.maitrise__faible')!.textContent).toBe('2');
    expect(document.querySelector('.fiche__faibles > .discret')!.textContent).toBe(
      'Les trois notions qui ont le plus coûté. Une leçon de trois minutes chacune.',
    );
  });

  it('ne montre rien tant que la banque n’a pas de notion', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', false, aujourdhui()));
    render(<ProfilCandidat banque={banque.map(({ id, theme }) => ({ id, theme }))} totalLecons={105} />);
    expect(document.querySelector('.faible')).toBeNull();
  });
});

describe('le changement de comptage', () => {
  it('le dit une fois à qui révisait déjà, sans en faire un événement', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, '2026-09-05'));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByText(/on compte autrement/)).toBeTruthy();
  });

  it('ne dit rien à qui commence aujourd’hui', () => {
    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui()));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.queryByText(/on compte autrement/)).toBeNull();
  });
});

describe('la remesure du 4 octobre', () => {
  const recaleHier = () => {
    let e = enregistrerProfil(etatInitial(), { ...profilVide(), motivations: ['peche'], rempliLe: '2026-09-01' });
    const hier = new Date(`${aujourdhui()}T00:00:00Z`);
    hier.setUTCDate(hier.getUTCDate() - 1);
    e = enregistrerExamen(e, { date: hier.toISOString().slice(0, 10), bonnes: 31, total: 40, reussi: false });
    return e;
  };

  it('dit le score du recalé sous le titre, avec la barre, raison ou pas', () => {
    sauvegarder(recaleHier());
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(document.querySelector('.fiche__tete .fiche__dernier')!.textContent).toBe('Hier, 31 sur 40, recalé : il en fallait 35.');
    cleanup();
    sauvegarder({ ...recaleHier(), profil: profilVide() });
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(document.querySelector('.fiche__tete .fiche__dernier')).not.toBeNull();
  });

  it('ne dit rien de tel après un reçu', () => {
    sauvegarder(enregistrerExamen(etatInitial(), { date: aujourdhui(), bonnes: 37, total: 40, reussi: true }));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(document.querySelector('.fiche__dernier')).toBeNull();
  });

  it('range les examens blancs avant les thèmes', () => {
    sauvegarder(enregistrerReponse(recaleHier(), 'vhf-0', false, '2026-09-20'));
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const sections = [...document.querySelectorAll('section')].map((s) => s.className);
    expect(sections.indexOf('fiche__examens')).toBeGreaterThan(-1);
    expect(sections.indexOf('fiche__examens')).toBeLessThan(sections.indexOf('fiche__themes'));
  });

  it('explique un indice bas par ce qui manque, quand un examen pèse déjà', () => {
    sauvegarder(recaleHier());
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const texte = document.querySelector('.indice__texte')!.textContent!;
    expect(texte).not.toContain('Une leçon ou une série de questions, et il bouge');
    expect(texte).toContain('Tes examens blancs pèsent déjà 35 points sur 45.');
  });

  it('écrit les parts de l’indice en points', () => {
    sauvegarder(recaleHier());
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    const legende = [...document.querySelectorAll('.indice__legende li')].map((li) => li.textContent);
    expect(legende).toEqual(['Vu : 0 point sur 20', 'Retenu : 0 point sur 35', 'Examens : 35 points sur 45']);
  });

  it('annonce la série que /revoir joue, pas tout le stock dû', () => {
    let e = banque.reduce((etat, q) => enregistrerReponse(etat, q.id, false, '2026-09-20'), etatInitial());
    e = { ...e, profil: { ...profilVide(), rythme: 10 } };
    sauvegarder(e);
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(document.querySelector('.jeu__actions a')!.textContent).toBe('Revoir mes 10 questions du jour');
    expect(screen.getByText(/20 questions à revoir en tout/).textContent).toBe(
      '20 questions à revoir en tout : la série du jour en prend 10, les plus anciennes d’abord.',
    );
  });

  it('montre ce qui est fait au-delà de l’objectif, plutôt qu’un plafond', () => {
    const e = banque.slice(0, 12).reduce((etat, q) => enregistrerReponse(etat, q.id, true, aujourdhui()), etatInitial());
    sauvegarder({ ...e, profil: { ...profilVide(), rythme: 10 } });
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(document.querySelector('.jour__objectif .jour__chiffre')!.textContent).toBe('12 questions');
    expect(document.querySelector('.jour__objectif .jour__note')!.textContent).toBe('Objectif du jour fait, et 2 de plus.');
  });

  it('compare le rythme qu’exige la date à l’objectif, au lieu d’en poser un second', () => {
    const dans = (n: number) => {
      const d = new Date(`${aujourdhui()}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    const e = enregistrerReponse(etatInitial(), 'vhf-0', true, aujourdhui());
    sauvegarder({ ...e, dateExamen: dans(2), profil: { ...profilVide(), rythme: 5 } });
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(document.querySelector('.jour__examen')!.textContent).toContain(
      'Il te reste 19 questions jamais vues : environ 10 par jour pour toutes les voir, plus que ton objectif de 5. Il se règle plus bas.',
    );
    cleanup();
    sauvegarder({ ...e, dateExamen: dans(10), profil: { ...profilVide(), rythme: 5 } });
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(document.querySelector('.jour__examen')!.textContent).toContain(
      'Il te reste 19 questions jamais vues : ton objectif de 5 par jour suffit pour toutes les voir.',
    );
  });
});
